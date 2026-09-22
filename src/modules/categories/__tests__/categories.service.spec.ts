import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { Category } from 'src/modules/categories/schemas/category.schema';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockCategoryModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  const category = {
    _id: '1',
    name: 'Ficção',
    slug: 'ficcao',
    bookCount: 0,
  };

  function execOf<T>(value: T) {
    return { exec: jest.fn().mockResolvedValue(value) };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getModelToken(Category.name), useValue: mockCategoryModel },
      ],
    }).compile();

    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve gerar slug a partir do nome e criar a categoria', async () => {
      mockCategoryModel.findOne.mockReturnValue(execOf(null));
      mockCategoryModel.create.mockResolvedValue(category);

      const result = await service.create({ name: 'Ficção' });

      expect(mockCategoryModel.findOne).toHaveBeenCalledWith({
        $or: [{ name: 'Ficção' }, { slug: 'ficcao' }],
      });
      expect(mockCategoryModel.create).toHaveBeenCalledWith({
        name: 'Ficção',
        slug: 'ficcao',
        bookCount: 0,
      });
      expect(result).toEqual(category);
    });

    it('deve lançar ConflictException se nome ou slug já existirem', async () => {
      mockCategoryModel.findOne.mockReturnValue(execOf(category));

      await expect(service.create({ name: 'Ficção' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar todas as categorias ordenadas por nome', async () => {
      const sortMock = jest.fn().mockReturnValue(execOf([category]));
      mockCategoryModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.findAll();

      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual([category]);
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se a categoria não existir', async () => {
      mockCategoryModel.findById.mockReturnValue(execOf(null));

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('deve retornar a categoria encontrada', async () => {
      mockCategoryModel.findById.mockReturnValue(execOf(category));

      await expect(service.findOne('1')).resolves.toEqual(category);
    });
  });

  describe('update', () => {
    it('deve lançar ConflictException se o novo nome já pertencer a outra categoria', async () => {
      mockCategoryModel.findOne.mockReturnValue(execOf(category));

      await expect(service.update('2', { name: 'Ficção' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockCategoryModel.findOne).toHaveBeenCalledWith({
        name: 'Ficção',
        _id: { $ne: '2' },
      });
    });

    it('deve lançar NotFoundException se a categoria não existir', async () => {
      mockCategoryModel.findOne.mockReturnValue(execOf(null));
      mockCategoryModel.findByIdAndUpdate.mockReturnValue(execOf(null));

      await expect(service.update('1', { name: 'Romance' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve atualizar o nome mantendo o slug original', async () => {
      mockCategoryModel.findOne.mockReturnValue(execOf(null));
      mockCategoryModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...category, name: 'Romance' }),
      );

      const result = await service.update('1', { name: 'Romance' });

      expect(mockCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { name: 'Romance' },
        { new: true },
      );
      expect(result.slug).toBe('ficcao');
    });
  });

  describe('remove', () => {
    it('deve lançar NotFoundException se a categoria não existir', async () => {
      mockCategoryModel.findByIdAndDelete.mockReturnValue(execOf(null));

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });

    it('deve remover a categoria existente', async () => {
      mockCategoryModel.findByIdAndDelete.mockReturnValue(execOf(category));

      await expect(service.remove('1')).resolves.toBeUndefined();
    });
  });

  describe('incrementBookCount / decrementBookCount', () => {
    it('deve incrementar o bookCount da categoria pelo slug', async () => {
      mockCategoryModel.updateOne.mockReturnValue(execOf({}));

      await service.incrementBookCount('ficcao');

      expect(mockCategoryModel.updateOne).toHaveBeenCalledWith(
        { slug: 'ficcao' },
        { $inc: { bookCount: 1 } },
      );
    });

    it('deve decrementar o bookCount sem deixá-lo negativo', async () => {
      mockCategoryModel.updateOne.mockReturnValue(execOf({}));

      await service.decrementBookCount('ficcao');

      expect(mockCategoryModel.updateOne).toHaveBeenCalledWith(
        { slug: 'ficcao', bookCount: { $gt: 0 } },
        { $inc: { bookCount: -1 } },
      );
    });

    it('não deve lançar quando a atualização falhar', async () => {
      mockCategoryModel.updateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('falha de rede')),
      });

      await expect(
        service.incrementBookCount('ficcao'),
      ).resolves.toBeUndefined();
    });
  });

  describe('findBySlugs', () => {
    it('deve devolver array vazio quando não há slugs para buscar', async () => {
      await expect(service.findBySlugs([])).resolves.toEqual([]);
      expect(mockCategoryModel.find).not.toHaveBeenCalled();
    });

    it('deve buscar categorias pelos slugs informados', async () => {
      mockCategoryModel.find.mockReturnValue(execOf([category]));

      const result = await service.findBySlugs(['ficcao']);

      expect(mockCategoryModel.find).toHaveBeenCalledWith({
        slug: { $in: ['ficcao'] },
      });
      expect(result).toEqual([category]);
    });
  });

  describe('count', () => {
    it('deve devolver o total de categorias', async () => {
      mockCategoryModel.countDocuments.mockReturnValue(execOf(3));

      await expect(service.count()).resolves.toBe(3);
    });
  });

  describe('existsAllSlugs', () => {
    it('deve devolver array vazio quando não há slugs para checar', async () => {
      await expect(service.existsAllSlugs([])).resolves.toEqual([]);
      expect(mockCategoryModel.find).not.toHaveBeenCalled();
    });

    it('deve devolver os slugs que não existem', async () => {
      const selectMock = jest
        .fn()
        .mockReturnValue(execOf([{ slug: 'ficcao' }]));
      mockCategoryModel.find.mockReturnValue({ select: selectMock });

      const result = await service.existsAllSlugs(['ficcao', 'inexistente']);

      expect(mockCategoryModel.find).toHaveBeenCalledWith({
        slug: { $in: ['ficcao', 'inexistente'] },
      });
      expect(result).toEqual(['inexistente']);
    });

    it('deve devolver array vazio quando todos os slugs existirem', async () => {
      const selectMock = jest
        .fn()
        .mockReturnValue(execOf([{ slug: 'ficcao' }, { slug: 'romance' }]));
      mockCategoryModel.find.mockReturnValue({ select: selectMock });

      await expect(
        service.existsAllSlugs(['ficcao', 'romance']),
      ).resolves.toEqual([]);
    });
  });
});
