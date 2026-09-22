import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { User } from 'src/modules/users/schemas/user.schema';
import { UsersService } from 'src/modules/users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('node:crypto', () => ({
  randomBytes: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockUserModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  };

  const publicDoc = {
    _id: { toString: () => '1' },
    name: 'Ana',
    email: 'ana@example.com',
    avatarUrl: undefined,
    role: 'user',
    active: true,
    mustChangePassword: false,
    createdAt: undefined,
    updatedAt: undefined,
  };

  function execOf<T>(value: T) {
    return { exec: jest.fn().mockResolvedValue(value) };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar com hash e não retornar password', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(null));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockUserModel.create.mockResolvedValue({
        ...publicDoc,
        password: 'hashed',
      });

      const result = await service.create({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senha123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        name: 'Ana',
        email: 'ana@example.com',
        avatarUrl: undefined,
        phone: undefined,
        role: 'user',
        active: true,
        mustChangePassword: false,
        password: 'hashed',
      });
      expect(result).toEqual({
        _id: '1',
        name: 'Ana',
        email: 'ana@example.com',
        avatarUrl: undefined,
        role: 'user',
        active: true,
        mustChangePassword: false,
        createdAt: undefined,
        updatedAt: undefined,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('deve criar usuário quando role user é informada', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(null));
      mockUserModel.create.mockResolvedValue(publicDoc);

      const result = await service.create({
        name: 'Ana',
        email: 'ana@example.com',
        role: 'user',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' }),
      );
      expect(result).not.toHaveProperty('password');
      expect(result.role).toBe('user');
    });

    it('deve persistir phone e manter active true por padrão', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(null));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockUserModel.create.mockResolvedValue({
        ...publicDoc,
        phone: '11999999999',
      });

      const result = await service.create({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senha123',
        phone: '11999999999',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '11999999999',
          active: true,
        }),
      );
      expect(result.active).toBe(true);
    });

    it('deve nascer com mustChangePassword false quando omitido', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(null));
      mockUserModel.create.mockResolvedValue(publicDoc);

      await service.create({
        name: 'Ana',
        email: 'ana@example.com',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mustChangePassword: false,
        }),
      );
    });

    it('deve lançar ConflictException se o e-mail já existir', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(publicDoc));

      await expect(
        service.create({
          name: 'Ana',
          email: 'ana@example.com',
          password: 'senha123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de usuários públicos', async () => {
      mockUserModel.find.mockReturnValue(execOf([publicDoc]));

      const result = await service.findAll();

      expect(mockUserModel.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ _id: '1', email: 'ana@example.com' });
    });

    it('deve filtrar por role user', async () => {
      mockUserModel.find.mockReturnValue(execOf([publicDoc]));

      await service.findAll({ role: 'user' });

      expect(mockUserModel.find).toHaveBeenCalledWith({ role: 'user' });
    });

    it('deve filtrar por active true', async () => {
      mockUserModel.find.mockReturnValue(execOf([publicDoc]));

      await service.findAll({ active: true });

      expect(mockUserModel.find).toHaveBeenCalledWith({ active: true });
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se o usuário não existir', async () => {
      mockUserModel.findById.mockReturnValue(execOf(null));

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('deve retornar o usuário público', async () => {
      mockUserModel.findById.mockReturnValue(execOf(publicDoc));

      await expect(service.findOne('1')).resolves.toMatchObject({
        _id: '1',
        email: 'ana@example.com',
        role: 'user',
        active: true,
        mustChangePassword: false,
      });
    });
  });

  describe('findByEmailWithPassword', () => {
    it('deve buscar usuário com campo password', async () => {
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue(execOf(publicDoc)),
      });

      const result = await service.findByEmailWithPassword('ana@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'ana@example.com',
      });
      expect(result).toEqual(publicDoc);
    });
  });

  describe('findById', () => {
    it('deve retornar documento do usuário', async () => {
      mockUserModel.findById.mockReturnValue(execOf(publicDoc));

      await expect(service.findById('1')).resolves.toEqual(publicDoc);
    });
  });

  describe('findByIdWithPassword', () => {
    it('deve buscar usuário por id com campo password', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue(execOf(publicDoc)),
      });

      const result = await service.findByIdWithPassword('1');

      expect(mockUserModel.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(publicDoc);
    });
  });

  describe('setPassword', () => {
    it('deve gravar hash da nova senha e zerar mustChangePassword', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...publicDoc, mustChangePassword: false }),
      );

      const result = await service.setPassword('1', 'novaSenha123');

      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha123', 10);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        {
          password: 'new-hash',
          mustChangePassword: false,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
        { new: true },
      );
      expect(result.mustChangePassword).toBe(false);
      expect(result).not.toHaveProperty('password');
    });

    it('deve lançar NotFoundException se o usuário não existir', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(null));

      await expect(service.setPassword('1', 'novaSenha123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('deve buscar usuário pelo e-mail', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(publicDoc));

      const result = await service.findByEmail('ana@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'ana@example.com',
      });
      expect(result).toEqual(publicDoc);
    });
  });

  describe('setPasswordResetToken', () => {
    it('deve gravar o hash do token e a expiração no usuário', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(publicDoc));
      const expiresAt = new Date('2024-01-02');

      await service.setPasswordResetToken('1', 'hash-token', expiresAt);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('1', {
        passwordResetTokenHash: 'hash-token',
        passwordResetExpiresAt: expiresAt,
      });
    });
  });

  describe('findByValidResetToken', () => {
    it('deve buscar usuário com token válido e não expirado', async () => {
      mockUserModel.findOne.mockReturnValue(execOf(publicDoc));

      const result = await service.findByValidResetToken('hash-token');

      const [filter] = mockUserModel.findOne.mock.calls[0] as [
        {
          passwordResetTokenHash: string;
          passwordResetExpiresAt: { $gt: Date };
        },
      ];

      expect(filter.passwordResetTokenHash).toBe('hash-token');
      expect(filter.passwordResetExpiresAt.$gt).toBeInstanceOf(Date);
      expect(result).toEqual(publicDoc);
    });
  });

  describe('update', () => {
    it('deve lançar NotFoundException se o usuário não existir', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(null));

      await expect(service.update('1', { name: 'Novo nome' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve re-hash da senha quando ela vier no payload', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(publicDoc));

      await service.update('1', { password: 'novaSenha' });

      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha', 10);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { password: 'new-hash' },
        { new: true },
      );
    });

    it('deve persistir active false sem apagar o documento', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...publicDoc, active: false }),
      );

      const result = await service.update('1', { active: false });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { active: false },
        { new: true },
      );
      expect(result.active).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('deve devolver temporaryPassword em texto e persistir apenas o hash', async () => {
      (randomBytes as jest.Mock)
        .mockReturnValueOnce(Buffer.from('senha-um-xxx'))
        .mockReturnValueOnce(Buffer.from('senha-dois-yy'));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-temp');
      mockUserModel.findById.mockReturnValue(execOf(publicDoc));
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(publicDoc));

      const result = await service.resetPassword('1');

      expect(result.temporaryPassword).toBeTruthy();
      expect(bcrypt.hash).toHaveBeenCalledWith(result.temporaryPassword, 10);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('1', {
        password: 'hashed-temp',
        mustChangePassword: true,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('deve ligar mustChangePassword no usuário alvo', async () => {
      (randomBytes as jest.Mock).mockReturnValue(Buffer.from('senha-temp-abc'));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-temp');
      mockUserModel.findById.mockReturnValue(execOf(publicDoc));
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(publicDoc));

      await service.resetPassword('1');

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ mustChangePassword: true }),
      );
    });

    it('deve lançar NotFoundException com id inexistente', async () => {
      mockUserModel.findById.mockReturnValue(execOf(null));

      await expect(service.resetPassword('1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve gerar senhas diferentes em chamadas consecutivas', async () => {
      (randomBytes as jest.Mock)
        .mockReturnValueOnce(Buffer.from('senha-um-xxx'))
        .mockReturnValueOnce(Buffer.from('senha-dois-yy'));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-temp');
      mockUserModel.findById.mockReturnValue(execOf(publicDoc));
      mockUserModel.findByIdAndUpdate.mockReturnValue(execOf(publicDoc));

      const first = await service.resetPassword('1');
      const second = await service.resetPassword('1');

      expect(first.temporaryPassword).not.toBe(second.temporaryPassword);
    });
  });
});
