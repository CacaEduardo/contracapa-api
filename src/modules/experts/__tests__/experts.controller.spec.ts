import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExpertsController } from 'src/modules/experts/experts.controller';
import { ExpertsService } from 'src/modules/experts/experts.service';

describe('ExpertsController', () => {
  let controller: ExpertsController;

  const mockExpertsService = {
    findAll: jest.fn(),
    findByIdResponse: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpertsController],
      providers: [{ provide: ExpertsService, useValue: mockExpertsService }],
    }).compile();

    controller = module.get(ExpertsController);
    jest.clearAllMocks();
  });

  it('deve listar especialistas via service', async () => {
    mockExpertsService.findAll.mockResolvedValue([]);

    await expect(controller.findAll({ q: 'ana' })).resolves.toEqual([]);
    expect(mockExpertsService.findAll).toHaveBeenCalledWith({ q: 'ana' });
  });

  it('deve criar especialista via service', async () => {
    const body = { fullName: 'Ana', email: 'ana@exemplo.com' };
    mockExpertsService.create.mockResolvedValue({ _id: '1', ...body });

    await controller.create(body);

    expect(mockExpertsService.create).toHaveBeenCalledWith(body);
  });

  it('deve lançar BadRequestException quando o avatar não for enviado', () => {
    expect(() => controller.uploadAvatar('id')).toThrow(BadRequestException);
    expect(mockExpertsService.uploadAvatar).not.toHaveBeenCalled();
  });

  it('deve delegar o upload do avatar ao service', async () => {
    const file = { originalname: 'a.png' } as Express.Multer.File;
    mockExpertsService.uploadAvatar.mockResolvedValue({ _id: 'id' });

    await controller.uploadAvatar('id', file);

    expect(mockExpertsService.uploadAvatar).toHaveBeenCalledWith('id', file);
  });
});
