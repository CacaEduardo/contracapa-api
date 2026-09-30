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
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

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

  const mockWishlistsService = {
    pullBook: jest.fn(),
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
    description: null,
    active: true,
    editorias: [],
    expertSlugs: [],
    recommendationCount: 0,
    disrecommendationCount: 0,
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
        { provide: WishlistsService, useValue: mockWishlistsService },
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
    const mockListQuery = (items: unknown[], total: number) => {
      const limitMock = jest.fn().mockReturnValue(execOf(items));
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      mockBookModel.find.mockReturnValue({ sort: sortMock });
      mockBookModel.countDocuments.mockReturnValue(execOf(total));
      return { sortMock, skipMock, limitMock };
    };

    it('deve filtrar por busca, categorias, editorias e especialistas, só entre livros ativos', async () => {
      const { sortMock, skipMock, limitMock } = mockListQuery([book], 1);

      const result = await service.findAll({
        q: 'rosa',
        categories: ['ficcao'],
        editorias: ['market', 'do_not_read'],
        experts: ['ana-lima'],
        sort: 'az',
        page: 1,
        pageSize: 15,
      });

      expect(mockBookModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          active: true,
          categorySlugs: { $in: ['ficcao'] },
          editorias: { $in: ['market', 'do_not_read'] },
          expertSlugs: { $in: ['ana-lima'] },
        }),
      );
      expect(sortMock).toHaveBeenCalledWith({ title: 1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(15);
      expect(result).toEqual({
        items: [expect.objectContaining({ slug: 'o-nome-da-rosa' })],
        total: 1,
        totalPages: 1,
        page: 1,
        pageSize: 15,
      });
    });

    it('deve ordenar pelos mais recentes cadastrados quando sort=recentes', async () => {
      const { sortMock } = mockListQuery([], 0);

      await service.findAll({ sort: 'recentes', page: 1, pageSize: 15 });

      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('findAllAdmin deve incluir inativos quando status=all', async () => {
      mockListQuery([], 0);

      await service.findAllAdmin({
        status: 'all',
        sort: 'az',
        page: 1,
        pageSize: 200,
      });

      const [filter] = mockBookModel.find.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(filter).not.toHaveProperty('active');
    });

    it('findAllAdmin deve filtrar só inativos quando status=inactive', async () => {
      mockListQuery([], 0);

      await service.findAllAdmin({
        status: 'inactive',
        sort: 'az',
        page: 1,
        pageSize: 12,
      });

      expect(mockBookModel.find).toHaveBeenCalledWith({ active: false });
    });
  });

  describe('findBySlug', () => {
    it('deve lançar NotFoundException se o livro não existir ou estiver inativo', async () => {
      mockBookModel.findOne.mockReturnValue(execOf(null));

      await expect(service.findBySlug('inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBookModel.findOne).toHaveBeenCalledWith({
        slug: 'inexistente',
        active: true,
      });
    });

    it('findBySlugAdmin deve encontrar livro inativo', async () => {
      mockBookModel.findOne.mockReturnValue(execOf({ ...book, active: false }));

      const result = await service.findBySlugAdmin('o-nome-da-rosa');

      expect(mockBookModel.findOne).toHaveBeenCalledWith({
        slug: 'o-nome-da-rosa',
      });
      expect(result.active).toBe(false);
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
        active: true,
        categorySlugs: { $in: ['ficcao'] },
      });
      expect(limitMock).toHaveBeenCalledWith(12);
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

    it('deve tirar o livro da contagem das categorias ao inativá-lo', async () => {
      mockBookModel.findById.mockReturnValue(execOf(book));
      mockBookModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...book, active: false }),
      );

      const result = await service.update('book-1', { active: false });

      expect(mockBookModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'book-1',
        { active: false },
        { new: true },
      );
      expect(mockCategoriesService.decrementBookCount).toHaveBeenCalledWith(
        'ficcao',
      );
      expect(result.active).toBe(false);
    });

    it('deve devolver o livro à contagem das categorias ao reativá-lo', async () => {
      mockBookModel.findById.mockReturnValue(
        execOf({ ...book, active: false }),
      );
      mockBookModel.findByIdAndUpdate.mockReturnValue(execOf(book));

      await service.update('book-1', { active: true });

      expect(mockCategoriesService.incrementBookCount).toHaveBeenCalledWith(
        'ficcao',
      );
    });

    it('deve gravar a descrição', async () => {
      mockBookModel.findById.mockReturnValue(execOf(book));
      mockBookModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...book, description: 'Um mistério medieval.' }),
      );

      const result = await service.update('book-1', {
        description: 'Um mistério medieval.',
      });

      expect(result.description).toBe('Um mistério medieval.');
    });

    it('deve lançar NotFoundException se o livro não existir', async () => {
      mockBookModel.findById.mockReturnValue(execOf(null));

      await expect(
        service.update('inexistente', { title: 'Novo título' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it.each([
      ['recomendado', { recommendationCount: 1 }],
      ['desrecomendado', { disrecommendationCount: 1 }],
    ])(
      'deve bloquear a exclusão e sugerir inativar quando o livro for %s em resenhas',
      async (_, counts) => {
        mockBookModel.findById.mockReturnValue(execOf({ ...book, ...counts }));

        await expect(service.remove('book-1')).rejects.toThrow(
          new ConflictException(
            'Este livro está indicado em resenhas. Inative-o para tirá-lo do catálogo.',
          ),
        );
        expect(mockBookModel.findByIdAndDelete).not.toHaveBeenCalled();
      },
    );

    it('deve remover o livro, decrementar categorias, tirar das listas e apagar a capa do S3', async () => {
      mockBookModel.findById.mockReturnValue(
        execOf({ ...book, coverKey: 'books/capa.jpg' }),
      );
      mockBookModel.findByIdAndDelete.mockReturnValue(execOf(book));

      await service.remove('book-1');

      expect(mockCategoriesService.decrementBookCount).toHaveBeenCalledWith(
        'ficcao',
      );
      expect(mockWishlistsService.pullBook).toHaveBeenCalledWith('book-1');
      expect(mockStorageService.deleteImage).toHaveBeenCalledWith(
        'books/capa.jpg',
      );
    });
  });

  describe('findByIds', () => {
    it('deve ignorar ids inválidos sem consultar o banco', async () => {
      await expect(service.findByIds(['nao-e-id'])).resolves.toEqual([]);
      expect(mockBookModel.find).not.toHaveBeenCalled();
    });

    it('deve buscar os livros pelos ids válidos', async () => {
      mockBookModel.find.mockReturnValue(execOf([book]));

      const result = await service.findByIds([
        '507f1f77bcf86cd799439011',
        'invalido',
      ]);

      expect(mockBookModel.find).toHaveBeenCalledWith({
        _id: { $in: ['507f1f77bcf86cd799439011'] },
      });
      expect(result[0]).toMatchObject({
        _id: 'book-1',
        slug: 'o-nome-da-rosa',
      });
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

  describe('setIndicationSnapshot', () => {
    const snapshot = {
      editorias: ['market' as const],
      expertSlugs: ['ana-lima'],
      recommendationCount: 1,
      disrecommendationCount: 0,
    };

    it('deve gravar o snapshot de indicações no livro', async () => {
      mockBookModel.findByIdAndUpdate.mockReturnValue(execOf(book));

      await service.setIndicationSnapshot('book-1', snapshot);

      expect(mockBookModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'book-1',
        snapshot,
      );
    });

    it('não deve lançar quando a sincronização falhar', async () => {
      mockBookModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('falha de rede')),
      });

      await expect(
        service.setIndicationSnapshot('book-1', snapshot),
      ).resolves.toBeUndefined();
    });
  });

  describe('count', () => {
    it('deve devolver o total de livros', async () => {
      mockBookModel.countDocuments.mockReturnValue(execOf(8));

      await expect(service.count()).resolves.toBe(8);
    });
  });
});
