import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ExpertsService } from 'src/modules/experts/experts.service';
import { Expert } from 'src/modules/experts/schemas/expert.schema';
import { StorageService } from 'src/modules/storage/storage.service';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('ExpertsService', () => {
  let service: ExpertsService;

  const mockExpertModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockStorageService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  const expert = {
    _id: { toString: () => 'expert-1' },
    fullName: 'Ana Souza',
    slug: 'ana-souza',
    email: 'ana@exemplo.com',
    company: null,
    phone: null,
    podcastUrl: null,
    socialLinks: [],
    avatarSrc: null,
    avatarKey: null,
    active: true,
    reviewCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpertsService,
        { provide: getModelToken(Expert.name), useValue: mockExpertModel },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get(ExpertsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve gerar slug a partir do nome e criar o especialista', async () => {
      mockExpertModel.exists.mockReturnValue(execOf(null));
      mockExpertModel.create.mockResolvedValue(expert);

      const result = await service.create({
        fullName: 'Ana Souza',
        email: 'ana@exemplo.com',
      });

      expect(mockExpertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'ana-souza',
          company: null,
          socialLinks: [],
        }),
      );
      expect(result._id).toBe('expert-1');
      expect(result).not.toHaveProperty('avatarKey');
    });

    it('deve sufixar o slug quando já existir especialista com o mesmo nome', async () => {
      mockExpertModel.exists
        .mockReturnValueOnce(execOf(null))
        .mockReturnValueOnce(execOf({ _id: 'outro' }))
        .mockReturnValueOnce(execOf(null));
      mockExpertModel.create.mockResolvedValue({
        ...expert,
        slug: 'ana-souza-2',
      });

      await service.create({ fullName: 'Ana Souza', email: 'ana@exemplo.com' });

      expect(mockExpertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'ana-souza-2' }),
      );
    });

    it('deve lançar ConflictException quando o e-mail já estiver em uso', async () => {
      mockExpertModel.exists.mockReturnValue(execOf({ _id: 'outro' }));

      await expect(
        service.create({ fullName: 'Ana', email: 'ana@exemplo.com' }),
      ).rejects.toThrow(ConflictException);
      expect(mockExpertModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve buscar por nome, empresa ou e-mail ordenando por nome', async () => {
      const sort = jest.fn().mockReturnValue(execOf([expert]));
      mockExpertModel.find.mockReturnValue({ sort });

      const result = await service.findAll({ q: 'ana' });

      expect(mockExpertModel.find).toHaveBeenCalledWith({
        $or: [{ fullName: /ana/i }, { company: /ana/i }, { email: /ana/i }],
      });
      expect(sort).toHaveBeenCalledWith({ fullName: 1 });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByIdResponse', () => {
    it('deve lançar NotFoundException quando o especialista não existir', async () => {
      mockExpertModel.findById.mockReturnValue(execOf(null));

      await expect(service.findByIdResponse('id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('não verifica e-mail quando ele não mudou e mantém o slug', async () => {
      mockExpertModel.findById.mockReturnValue(execOf(expert));
      mockExpertModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...expert, fullName: 'Ana S.' }),
      );

      await service.update('expert-1', {
        fullName: 'Ana S.',
        email: 'ana@exemplo.com',
      });

      expect(mockExpertModel.exists).not.toHaveBeenCalled();
      expect(mockExpertModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'expert-1',
        { fullName: 'Ana S.', email: 'ana@exemplo.com' },
        { new: true },
      );
    });

    it('deve inativar o especialista', async () => {
      mockExpertModel.findById.mockReturnValue(execOf(expert));
      mockExpertModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...expert, active: false }),
      );

      const result = await service.update('expert-1', { active: false });

      expect(mockExpertModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'expert-1',
        { active: false },
        { new: true },
      );
      expect(result.active).toBe(false);
    });

    it('deve lançar ConflictException ao trocar para e-mail já usado', async () => {
      mockExpertModel.findById.mockReturnValue(execOf(expert));
      mockExpertModel.exists.mockReturnValue(execOf({ _id: 'outro' }));

      await expect(
        service.update('expert-1', { email: 'outro@exemplo.com' }),
      ).rejects.toThrow(ConflictException);
      expect(mockExpertModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('findAllPublic / findBySlugPublic', () => {
    it('deve listar só ativos com resenha, A–Z, sem e-mail nem telefone', async () => {
      const sortMock = jest
        .fn()
        .mockReturnValue(
          execOf([{ ...expert, phone: '11999999999', reviewCount: 2 }]),
        );
      mockExpertModel.find.mockReturnValue({ sort: sortMock });

      const [result] = await service.findAllPublic();

      expect(mockExpertModel.find).toHaveBeenCalledWith({
        active: true,
        reviewCount: { $gt: 0 },
      });
      expect(sortMock).toHaveBeenCalledWith({ fullName: 1 });
      expect(result).toMatchObject({ slug: 'ana-souza', reviewCount: 2 });
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
    });

    it('deve lançar NotFoundException para especialista inativo ou sem resenha', async () => {
      mockExpertModel.findOne.mockReturnValue(execOf(null));

      await expect(service.findBySlugPublic('ana-souza')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockExpertModel.findOne).toHaveBeenCalledWith({
        active: true,
        reviewCount: { $gt: 0 },
        slug: 'ana-souza',
      });
    });

    it('deve devolver o perfil público sem e-mail nem telefone', async () => {
      mockExpertModel.findOne.mockReturnValue(
        execOf({ ...expert, reviewCount: 1 }),
      );

      const result = await service.findBySlugPublic('ana-souza');

      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
    });
  });

  describe('setReviewCount', () => {
    it('deve gravar a quantidade de resenhas', async () => {
      mockExpertModel.findByIdAndUpdate.mockReturnValue(execOf(expert));

      await service.setReviewCount('expert-1', 3);

      expect(mockExpertModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'expert-1',
        { reviewCount: 3 },
      );
    });

    it('não deve lançar quando a sincronização falhar', async () => {
      mockExpertModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('falha de rede')),
      });

      await expect(
        service.setReviewCount('expert-1', 1),
      ).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('deve bloquear a exclusão e sugerir inativar quando assinar resenhas', async () => {
      mockExpertModel.findById.mockReturnValue(
        execOf({ ...expert, reviewCount: 1 }),
      );

      await expect(service.remove('expert-1')).rejects.toThrow(
        new ConflictException(
          'Este especialista assina resenhas. Inative-o para ocultá-lo do site.',
        ),
      );
      expect(mockExpertModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('deve excluir e apagar o avatar do storage', async () => {
      mockExpertModel.findById.mockReturnValue(
        execOf({ ...expert, avatarKey: 'experts/a.png' }),
      );
      mockExpertModel.findByIdAndDelete.mockReturnValue(execOf(expert));

      await service.remove('expert-1');

      expect(mockExpertModel.findByIdAndDelete).toHaveBeenCalledWith(
        'expert-1',
      );
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'experts/a.png',
      );
    });
  });

  describe('uploadAvatar', () => {
    it('deve enviar o novo avatar e apagar o anterior', async () => {
      const file = { mimetype: 'image/png' } as Express.Multer.File;
      mockExpertModel.findById.mockReturnValue(
        execOf({ ...expert, avatarKey: 'experts/old.png' }),
      );
      mockStorageService.uploadImage.mockResolvedValue({
        url: 'https://bucket/experts/new.png',
        key: 'experts/new.png',
      });
      mockExpertModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...expert, avatarSrc: 'https://bucket/experts/new.png' }),
      );

      const result = await service.uploadAvatar('expert-1', file);

      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(
        file,
        'experts',
      );
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'experts/old.png',
      );
      expect(mockExpertModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'expert-1',
        {
          avatarSrc: 'https://bucket/experts/new.png',
          avatarKey: 'experts/new.png',
        },
        { new: true },
      );
      expect(result.avatarSrc).toBe('https://bucket/experts/new.png');
    });
  });

  describe('removeAvatar', () => {
    it('deve apagar o avatar e limpar os campos', async () => {
      mockExpertModel.findById.mockReturnValue(
        execOf({ ...expert, avatarKey: 'experts/a.png' }),
      );
      mockExpertModel.findByIdAndUpdate.mockReturnValue(execOf(expert));

      await service.removeAvatar('expert-1');

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'experts/a.png',
      );
      expect(mockExpertModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'expert-1',
        { avatarSrc: null, avatarKey: null },
        { new: true },
      );
    });
  });
});
