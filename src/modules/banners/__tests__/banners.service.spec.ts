import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BannersService } from 'src/modules/banners/banners.service';
import { Banner } from 'src/modules/banners/schemas/banner.schema';
import { StorageService } from 'src/modules/storage/storage.service';

describe('BannersService', () => {
  let service: BannersService;

  const mockBannerModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
  };

  const mockStorageService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  const banner = {
    _id: { toString: () => 'b1' },
    title: 'Livros de mercado',
    alt: 'O que o mercado está lendo',
    href: '/biblioteca',
    order: 0,
    active: true,
    imageSrc: 'https://bucket/desktop.jpg',
    imageKey: 'public/images/banners/desktop.jpg',
    mobileImageSrc: null,
    mobileImageKey: null,
  };

  function execOf<T>(value: T) {
    return { exec: jest.fn().mockResolvedValue(value) };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannersService,
        { provide: getModelToken(Banner.name), useValue: mockBannerModel },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get(BannersService);
    jest.clearAllMocks();
  });

  describe('findPublic', () => {
    it('lista só ativos com imagem e usa a arte 3:1 quando falta a mobile', async () => {
      const sort = jest.fn().mockReturnValue(execOf([banner]));
      mockBannerModel.find.mockReturnValue({ sort });

      const result = await service.findPublic();

      expect(mockBannerModel.find).toHaveBeenCalledWith({
        active: true,
        imageSrc: { $ne: null },
      });
      expect(sort).toHaveBeenCalledWith({ order: 1, createdAt: 1 });
      expect(result).toEqual([
        {
          _id: 'b1',
          alt: banner.alt,
          href: banner.href,
          imageSrc: banner.imageSrc,
          mobileImageSrc: banner.imageSrc,
        },
      ]);
    });
  });

  describe('findAll', () => {
    it('não expõe as chaves do bucket', async () => {
      mockBannerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(execOf([banner])),
      });

      const [result] = await service.findAll();

      expect(result).not.toHaveProperty('imageKey');
      expect(result).toMatchObject({ _id: 'b1', title: banner.title });
    });
  });

  describe('findOne', () => {
    it('lança 404 quando o destaque não existe', async () => {
      mockBannerModel.findById.mockReturnValue(execOf(null));

      await expect(service.findOne('b1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('lança 404 quando o destaque não existe', async () => {
      mockBannerModel.findByIdAndUpdate.mockReturnValue(execOf(null));

      await expect(service.update('b1', { order: 2 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('remove o destaque e as imagens do bucket', async () => {
      mockBannerModel.findByIdAndDelete.mockReturnValue(
        execOf({ ...banner, mobileImageKey: 'public/images/banners/m.jpg' }),
      );

      await service.remove('b1');

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        banner.imageKey,
      );
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'public/images/banners/m.jpg',
      );
    });

    it('lança 404 quando o destaque não existe', async () => {
      mockBannerModel.findByIdAndDelete.mockReturnValue(execOf(null));

      await expect(service.remove('b1')).rejects.toThrow(NotFoundException);
      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('uploadImage', () => {
    const file = { mimetype: 'image/jpeg' } as Express.Multer.File;

    it('troca a arte desktop e apaga a anterior', async () => {
      mockBannerModel.findById.mockReturnValue(execOf(banner));
      mockStorageService.uploadImage.mockResolvedValue({
        url: 'https://bucket/new.jpg',
        key: 'public/images/banners/new.jpg',
      });
      mockBannerModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...banner, imageSrc: 'https://bucket/new.jpg' }),
      );

      const result = await service.uploadImage('b1', 'desktop', file);

      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(
        file,
        'banners',
      );
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        banner.imageKey,
      );
      expect(mockBannerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'b1',
        {
          imageSrc: 'https://bucket/new.jpg',
          imageKey: 'public/images/banners/new.jpg',
        },
        { new: true },
      );
      expect(result.imageSrc).toBe('https://bucket/new.jpg');
    });

    it('grava a arte mobile sem apagar nada quando não havia', async () => {
      mockBannerModel.findById.mockReturnValue(execOf(banner));
      mockStorageService.uploadImage.mockResolvedValue({
        url: 'https://bucket/m.jpg',
        key: 'public/images/banners/m.jpg',
      });
      mockBannerModel.findByIdAndUpdate.mockReturnValue(execOf(banner));

      await service.uploadImage('b1', 'mobile', file);

      expect(mockStorageService.deleteImage).not.toHaveBeenCalled();
      expect(mockBannerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'b1',
        {
          mobileImageSrc: 'https://bucket/m.jpg',
          mobileImageKey: 'public/images/banners/m.jpg',
        },
        { new: true },
      );
    });

    it('lança 404 sem subir arquivo quando o destaque não existe', async () => {
      mockBannerModel.findById.mockReturnValue(execOf(null));

      await expect(service.uploadImage('b1', 'desktop', file)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStorageService.uploadImage).not.toHaveBeenCalled();
    });
  });
});
