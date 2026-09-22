import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from 'src/modules/books/books.service';
import { Book } from 'src/modules/books/schemas/book.schema';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { StorageService } from 'src/modules/storage/storage.service';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('BooksService', () => {
  let service: BooksService;

  const mockBookModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockCategoriesService = {
    existsAllSlugs: jest.fn(),
    incrementBookCount: jest.fn(),
    decrementBookCount: jest.fn(),
    findBySlugs: jest.fn(),
  };

  const mockStorageService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  const book = {
    _id: { toString: () => 'book-1' },
    title: 'O Nome da Rosa',
    slug: 'o-nome-da-rosa',
    author: 'Umberto Eco',
    year: 1980,
    pages: 512,
    coverSrc: null,
    coverKey: null,
    amazonUrl: null,
    categorySlugs: ['ficcao'],
    reviewId: null,
    reviewVerdict: null,
    reviewWeekly: false,
    reviewPublishedAt: null,
    createdAt: undefined,
    updatedAt: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getModelToken(Book.name), useValue: mockBookModel },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get(BooksService);
    jest.clearAllMocks();
    mockCategoriesService.findBySlugs.mockResolvedValue([]);
  });

  describe('create', () => {
    it('deve lançar BadRequestException quando alguma categoria não existir', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue(['inexistente']);

      await expect(
        service.create({
          title: 'Livro',
          author: 'Autor',
          year: 2000,
          pages: 100,
          categorySlugs: ['inexistente'],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockBookModel.create).not.toHaveBeenCalled();
    });

    it('deve gerar slug único e criar o livro, incrementando as categorias', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockBookModel.exists.mockReturnValue(execOf(null));
      mockBookModel.create.mockResolvedValue(book);

      const result = await service.create({
        title: 'O Nome da Rosa',
        author: 'Umberto Eco',
        year: 1980,
        pages: 512,
        categorySlugs: ['ficcao'],
      });

      expect(mockBookModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'o-nome-da-rosa' }),
      );
      expect(mockCategoriesService.incrementBookCount).toHaveBeenCalledWith(
        'ficcao',
      );
      expect(result.slug).toBe('o-nome-da-rosa');
    });

    it('deve sufixar o slug quando já existir um livro com o mesmo título', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockBookModel.exists
        .mockReturnValueOnce(execOf({ _id: 'outro' }))
        .mockReturnValueOnce(execOf(null));
      mockBookModel.create.mockResolvedValue({ ...book, slug: 'livro-2' });

      await service.create({
        title: 'Livro',
        author: 'Autor',
        year: 2000,
        pages: 100,
        categorySlugs: [],
      });

      expect(mockBookModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'livro-2' }),
      );
    });

    it('deve criar com categorySlugs vazio quando o campo for omitido no DTO', async () => {
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockBookModel.exists.mockReturnValue(execOf(null));
      mockBookModel.create.mockResolvedValue({ ...book, categorySlugs: [] });

      await service.create({
        title: 'Livro sem categoria',
        author: 'Autor',
        year: 2000,
        pages: 100,
      });

      expect(mockBookModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ categorySlugs: [] }),
      );
    });
  });

  describe('findAll', () => {
    it('deve filtrar por busca textual, categorias e vereditos, paginando o resultado', async () => {
      const limitMock = jest.fn().mockReturnValue(execOf([book]));
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      mockBookModel.find.mockReturnValue({ sort: sortMock });
      mockBookModel.countDocuments.mockReturnValue(execOf(1));

      const result = await service.findAll({
        q: 'rosa',
        categories: ['ficcao'],
        verdicts: ['positive'],
        sort: 'az',
        page: 1,
        pageSize: 12,
      });

      expect(mockBookModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          categorySlugs: { $in: ['ficcao'] },
          reviewVerdict: { $in: ['positive'] },
        }),
      );
      expect(sortMock).toHaveBeenCalledWith({ title: 1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(12);
      expect(result).toEqual({
        items: [expect.objectContaining({ slug: 'o-nome-da-rosa' })],
        total: 1,
        totalPages: 1,
        page: 1,
        pageSize: 12,
      });
    });

    it('deve filtrar livros sem resenha quando o veredito "none" for selecionado', async () => {
      const limitMock = jest.fn().mockReturnValue(execOf([]));
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      mockBookModel.find.mockReturnValue({ sort: sortMock });
      mockBookModel.countDocuments.mockReturnValue(execOf(0));

      await service.findAll({
        verdicts: ['none'],
        sort: 'recentes',
        page: 1,
        pageSize: 12,
      });

      expect(mockBookModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ reviewVerdict: null }),
      );
    });

    it('deve combinar veredito concreto e "none" num $or dentro de $and', async () => {
      const limitMock = jest.fn().mockReturnValue(execOf([]));
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      mockBookModel.find.mockReturnValue({ sort: sortMock });
      mockBookModel.countDocuments.mockReturnValue(execOf(0));

      await service.findAll({
        verdicts: ['positive', 'none'],
        sort: 'recentes',
        page: 1,
        pageSize: 12,
      });

      const [filter] = mockBookModel.find.mock.calls[0] as [
        { $and: Array<{ $or: unknown[] }> },
      ];

      expect(filter.$and).toEqual([
        {
          $or: [
            { reviewVerdict: { $in: ['positive'] } },
            { reviewVerdict: null },
          ],
        },
      ]);
    });

    it('deve ordenar por data de publicação da resenha quando sort=recentes', async () => {
      const limitMock = jest.fn().mockReturnValue(execOf([]));
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      mockBookModel.find.mockReturnValue({ sort: sortMock });
      mockBookModel.countDocuments.mockReturnValue(execOf(0));

      await service.findAll({ sort: 'recentes', page: 1, pageSize: 12 });

      expect(sortMock).toHaveBeenCalledWith({
        reviewPublishedAt: -1,
        createdAt: -1,
      });
    });
  });

  describe('findBySlug', () => {
    it('deve lançar NotFoundException se o livro não existir', async () => {
      mockBookModel.findOne.mockReturnValue(execOf(null));

      await expect(service.findBySlug('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve retornar o livro com as categorias resolvidas', async () => {
      mockBookModel.findOne.mockReturnValue(execOf(book));
      mockCategoriesService.findBySlugs.mockResolvedValue([
        { slug: 'ficcao', name: 'Ficção' },
      ]);

      const result = await service.findBySlug('o-nome-da-rosa');

      expect(result.categories).toEqual([{ slug: 'ficcao', name: 'Ficção' }]);
    });
  });

  describe('findRelated', () => {
    it('deve devolver array vazio quando o livro não existir', async () => {
      mockBookModel.findOne.mockReturnValue(execOf(null));

      await expect(service.findRelated('inexistente')).resolves.toEqual([]);
    });

    it('deve devolver array vazio quando o livro não tiver categorias', async () => {
      mockBookModel.findOne.mockReturnValue(
        execOf({ ...book, categorySlugs: [] }),
      );

      await expect(service.findRelated('o-nome-da-rosa')).resolves.toEqual([]);
    });

    it('deve buscar livros da mesma categoria excluindo o próprio', async () => {
      mockBookModel.findOne.mockReturnValue(execOf(book));
      const limitMock = jest.fn().mockReturnValue(execOf([]));
      mockBookModel.find.mockReturnValue({ limit: limitMock });

      await service.findRelated('o-nome-da-rosa');

      expect(mockBookModel.find).toHaveBeenCalledWith({
        slug: { $ne: 'o-nome-da-rosa' },
        categorySlugs: { $in: ['ficcao'] },
      });
      expect(limitMock).toHaveBeenCalledWith(4);
    });
  });

  describe('update', () => {
    it('deve lançar BadRequestException quando alguma categoria for desconhecida', async () => {
      mockBookModel.findById.mockReturnValue(execOf(book));
      mockCategoriesService.existsAllSlugs.mockResolvedValue(['romance']);

      await expect(
        service.update('book-1', { categorySlugs: ['romance'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve sincronizar contagem de categorias ao trocar categorias', async () => {
      mockBookModel.findById.mockReturnValue(execOf(book));
      mockCategoriesService.existsAllSlugs.mockResolvedValue([]);
      mockBookModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...book, categorySlugs: ['romance'] }),
      );

      await service.update('book-1', { categorySlugs: ['romance'] });

      expect(mockCategoriesService.decrementBookCount).toHaveBeenCalledWith(
        'ficcao',
      );
      expect(mockCategoriesService.incrementBookCount).toHaveBeenCalledWith(
        'romance',
      );
    });

    it('deve lançar NotFoundException se o livro não existir', async () => {
      mockBookModel.findById.mockReturnValue(execOf(null));

      await expect(
        service.update('inexistente', { title: 'Novo título' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve lançar ConflictException se houver resenha vinculada', async () => {
      mockBookModel.findById.mockReturnValue(
        execOf({ ...book, reviewId: 'review-1' }),
      );

      await expect(service.remove('book-1')).rejects.toThrow(ConflictException);
      expect(mockBookModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('deve remover o livro, decrementar categorias e apagar a capa do S3', async () => {
      mockBookModel.findById.mockReturnValue(
        execOf({ ...book, coverKey: 'books/capa.jpg' }),
      );
      mockBookModel.findByIdAndDelete.mockReturnValue(execOf(book));

      await service.remove('book-1');

      expect(mockCategoriesService.decrementBookCount).toHaveBeenCalledWith(
        'ficcao',
      );
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'books/capa.jpg',
      );
    });
  });

  describe('uploadCover', () => {
    it('deve enviar a nova capa e apagar a anterior quando existir', async () => {
      mockBookModel.findById.mockReturnValue(
        execOf({ ...book, coverKey: 'books/antiga.jpg' }),
      );
      mockStorageService.uploadImage.mockResolvedValue({
        url: 'https://bucket.s3.amazonaws.com/books/nova.jpg',
        key: 'books/nova.jpg',
      });
      mockBookModel.findByIdAndUpdate.mockReturnValue(
        execOf({
          ...book,
          coverSrc: 'https://bucket.s3.amazonaws.com/books/nova.jpg',
          coverKey: 'books/nova.jpg',
        }),
      );

      const result = await service.uploadCover('book-1', {
        buffer: Buffer.from('fake'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File);

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'books/antiga.jpg',
      );
      expect(result.coverSrc).toBe(
        'https://bucket.s3.amazonaws.com/books/nova.jpg',
      );
    });
  });

  describe('removeCover', () => {
    it('deve apagar a capa do S3 e limpar os campos do livro', async () => {
      mockBookModel.findById.mockReturnValue(
        execOf({ ...book, coverSrc: 'url', coverKey: 'books/capa.jpg' }),
      );
      mockBookModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...book, coverSrc: null, coverKey: null }),
      );

      const result = await service.removeCover('book-1');

      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'books/capa.jpg',
      );
      expect(result.coverSrc).toBeNull();
    });
  });

  describe('setReviewSnapshot / clearReviewSnapshot / setWeeklyFlag', () => {
    it('não deve lançar quando a sincronização falhar', async () => {
      mockBookModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('falha de rede')),
      });

      await expect(
        service.setReviewSnapshot('book-1', {
          reviewId: 'review-1',
          verdict: 'positive',
          weekly: true,
          publishedAt: new Date(),
        }),
      ).resolves.toBeUndefined();
      await expect(
        service.clearReviewSnapshot('book-1'),
      ).resolves.toBeUndefined();
      await expect(
        service.setWeeklyFlag('book-1', false),
      ).resolves.toBeUndefined();
    });

    it('deve gravar o snapshot da resenha no livro', async () => {
      mockBookModel.findByIdAndUpdate.mockReturnValue(execOf(book));

      const publishedAt = new Date('2024-01-01');
      await service.setReviewSnapshot('book-1', {
        reviewId: 'review-1',
        verdict: 'positive',
        weekly: true,
        publishedAt,
      });

      expect(mockBookModel.findByIdAndUpdate).toHaveBeenCalledWith('book-1', {
        reviewId: 'review-1',
        reviewVerdict: 'positive',
        reviewWeekly: true,
        reviewPublishedAt: publishedAt,
      });
    });
  });

  describe('findByIdResponse', () => {
    it('deve devolver o livro enriquecido pelo id', async () => {
      mockBookModel.findById.mockReturnValue(execOf(book));
      mockCategoriesService.findBySlugs.mockResolvedValue([
        { slug: 'ficcao', name: 'Ficção' },
      ]);

      const result = await service.findByIdResponse('book-1');

      expect(result.slug).toBe('o-nome-da-rosa');
      expect(result.categories).toEqual([{ slug: 'ficcao', name: 'Ficção' }]);
    });
  });

  describe('count', () => {
    it('deve devolver o total de livros', async () => {
      mockBookModel.countDocuments.mockReturnValue(execOf(8));

      await expect(service.count()).resolves.toBe(8);
    });
  });
});
