import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BannersController } from 'src/modules/banners/banners.controller';
import { BannersService } from 'src/modules/banners/banners.service';

describe('BannersController', () => {
  let controller: BannersController;

  const mockBannersService = {
    findPublic: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BannersController],
      providers: [{ provide: BannersService, useValue: mockBannersService }],
    }).compile();

    controller = module.get(BannersController);
    jest.clearAllMocks();
  });

  it('deve rejeitar upload sem arquivo', () => {
    expect(() => controller.uploadImage('b1', 'desktop')).toThrow(
      BadRequestException,
    );
    expect(mockBannersService.uploadImage).not.toHaveBeenCalled();
  });

  it('deve repassar a variante da imagem ao service', async () => {
    const file = { mimetype: 'image/png' } as Express.Multer.File;
    mockBannersService.uploadImage.mockResolvedValue({ _id: 'b1' });

    await controller.uploadImage('b1', 'mobile', file);

    expect(mockBannersService.uploadImage).toHaveBeenCalledWith(
      'b1',
      'mobile',
      file,
    );
  });
});
