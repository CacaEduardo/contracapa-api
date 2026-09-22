import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';
import { Subscriber } from 'src/modules/newsletter/schemas/subscriber.schema';
import { MailService } from 'src/modules/mail/mail.service';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

jest.mock('node:crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('token-fixo')),
  createHash: jest.fn(),
}));

describe('NewsletterService', () => {
  let service: NewsletterService;

  const mockSubscriberModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  const mockMailService = {
    sendNewsletterConfirmation: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn(() => 'https://contracapa.com'),
  };

  const subscriber = {
    _id: { toString: () => 'sub-1' },
    name: 'Ana',
    email: 'ana@example.com',
    consent: true,
    status: 'pending' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: getModelToken(Subscriber.name),
          useValue: mockSubscriberModel,
        },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(NewsletterService);
    jest.clearAllMocks();

    (createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hash-fixo'),
    });
  });

  describe('subscribe', () => {
    it('deve lançar ConflictException se o e-mail já existir', async () => {
      mockSubscriberModel.findOne.mockReturnValue(execOf(subscriber));

      await expect(
        service.subscribe({
          name: 'Ana',
          email: 'ana@example.com',
          consent: true,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockSubscriberModel.create).not.toHaveBeenCalled();
    });

    it('deve criar o assinante pendente e enviar e-mail de confirmação', async () => {
      mockSubscriberModel.findOne.mockReturnValue(execOf(null));
      mockSubscriberModel.create.mockResolvedValue(subscriber);

      const result = await service.subscribe({
        name: 'Ana',
        email: 'ana@example.com',
        consent: true,
      });

      expect(mockSubscriberModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          confirmationTokenHash: 'hash-fixo',
        }),
      );
      expect(mockMailService.sendNewsletterConfirmation).toHaveBeenCalledWith(
        'ana@example.com',
        'Ana',
        expect.stringContaining(
          'https://contracapa.com/newsletter/confirmar?token=',
        ),
      );
      expect(result).toEqual({
        _id: 'sub-1',
        name: 'Ana',
        email: 'ana@example.com',
        consent: true,
        status: 'pending',
        createdAt: undefined,
        updatedAt: undefined,
      });
    });

    it('não deve lançar quando o envio de e-mail falhar', async () => {
      mockSubscriberModel.findOne.mockReturnValue(execOf(null));
      mockSubscriberModel.create.mockResolvedValue(subscriber);
      mockMailService.sendNewsletterConfirmation.mockRejectedValue(
        new Error('falha no provedor'),
      );

      await expect(
        service.subscribe({
          name: 'Ana',
          email: 'ana@example.com',
          consent: true,
        }),
      ).resolves.toMatchObject({ _id: 'sub-1' });
    });
  });

  describe('confirm', () => {
    it('deve lançar BadRequestException quando o token for inválido ou expirado', async () => {
      mockSubscriberModel.findOne.mockReturnValue(execOf(null));

      await expect(service.confirm({ token: 'invalido' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve confirmar o assinante e limpar os campos de token', async () => {
      mockSubscriberModel.findOne.mockReturnValue(execOf(subscriber));
      mockSubscriberModel.findByIdAndUpdate.mockReturnValue(execOf(subscriber));

      await service.confirm({ token: 'valido' });

      expect(mockSubscriberModel.findByIdAndUpdate).toHaveBeenCalledWith(
        subscriber._id,
        {
          status: 'confirmed',
          confirmationTokenHash: null,
          confirmationExpiresAt: null,
        },
      );
    });
  });

  describe('findAll', () => {
    it('deve listar todos quando não houver busca', async () => {
      const sortMock = jest.fn().mockReturnValue(execOf([subscriber]));
      mockSubscriberModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAll({});

      expect(mockSubscriberModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual([
        {
          _id: 'sub-1',
          name: 'Ana',
          email: 'ana@example.com',
          consent: true,
          status: 'pending',
          createdAt: undefined,
          updatedAt: undefined,
        },
      ]);
    });

    it('deve filtrar por nome ou e-mail quando q for informado', async () => {
      const sortMock = jest.fn().mockReturnValue(execOf([]));
      mockSubscriberModel.find.mockReturnValue({ sort: sortMock });

      await service.findAll({ q: 'ana' });

      const [filter] = mockSubscriberModel.find.mock.calls[0] as [
        { $or: Array<{ name?: RegExp; email?: RegExp }> },
      ];

      expect(filter.$or[0].name).toBeInstanceOf(RegExp);
      expect(filter.$or[1].email).toBeInstanceOf(RegExp);
    });
  });

  describe('count', () => {
    it('deve devolver o total de assinantes', async () => {
      mockSubscriberModel.countDocuments.mockReturnValue(execOf(3));

      await expect(service.count()).resolves.toBe(3);
    });
  });
});
