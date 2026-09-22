import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from 'src/modules/categories/categories.controller';
import { CategoriesService } from 'src/modules/categories/categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;

  const mockCategoriesService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    controller = module.get(CategoriesController);
    jest.clearAllMocks();
  });

  it('deve listar categorias via service', async () => {
    const categories = [{ _id: '1', name: 'Ficção', slug: 'ficcao' }];
    mockCategoriesService.findAll.mockResolvedValue(categories);

    await expect(controller.findAll()).resolves.toEqual(categories);
  });

  it('deve criar categoria via service', async () => {
    const created = { _id: '1', name: 'Ficção', slug: 'ficcao', bookCount: 0 };
    mockCategoriesService.create.mockResolvedValue(created);

    await expect(controller.create({ name: 'Ficção' })).resolves.toEqual(
      created,
    );
    expect(mockCategoriesService.create).toHaveBeenCalledWith({
      name: 'Ficção',
    });
  });

  it('deve atualizar categoria via service', async () => {
    const updated = { _id: '1', name: 'Romance', slug: 'ficcao' };
    mockCategoriesService.update.mockResolvedValue(updated);

    await expect(controller.update('1', { name: 'Romance' })).resolves.toEqual(
      updated,
    );
    expect(mockCategoriesService.update).toHaveBeenCalledWith('1', {
      name: 'Romance',
    });
  });

  it('deve remover categoria via service', async () => {
    mockCategoriesService.remove.mockResolvedValue(undefined);

    await expect(controller.remove('1')).resolves.toBeUndefined();
    expect(mockCategoriesService.remove).toHaveBeenCalledWith('1');
  });
});
