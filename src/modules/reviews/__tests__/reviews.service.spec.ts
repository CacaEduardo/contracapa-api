import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from 'src/modules/books/books.service';
import { ExpertsService } from 'src/modules/experts/experts.service';
import { ReviewsService } from 'src/modules/reviews/reviews.service';
import { Review } from 'src/modules/reviews/schemas/review.schema';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

// Query encadeável do Mongoose (sort/skip/limit) que resolve no exec.
function queryOf<T>(value: T) {
  const query = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

const BOOK_A = '507f1f77bcf86cd799439011';
const BOOK_B = '507f1f77bcf86cd799439012';
const EXPERT = '507f1f77bcf86cd799439099';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockReviewModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
  };

  const mockBooksService = {
    findById: jest.fn(),
    findByIds: jest.fn(),
    setReviewSnapshot: jest.fn(),
  };

  const mockExpertsService = {
    findById: jest.fn(),
    findByIds: jest.fn(),
    findBySlugs: jest.fn(),
    setCounter: jest.fn(),
  };

  const bookResponse = (id: string, active = true) => ({
    _id: id,
    slug: `livro-${id}`,
    title: `Livro ${id}`,
    author: 'Autor',
    coverSrc: null,
    active,
    categories: [],
  });

  const publicExpert = {
    _id: EXPERT,
    slug: 'ana-souza',
    fullName: 'Ana Souza',
    active: true,
  };

  const review = {
    _id: { toString: () => 'review-1' },
    slug: 'titulo',
    expertId: EXPERT,
    bookId: BOOK_A,
    editorialTitle: 'Título',
    excerpt: 'Resumo',
    content: '<p>Conteúdo</p>',
    publishedAt: new Date('2024-01-01'),
    weekly: false,
  };

  const dto = {
    expertId: EXPERT,
    bookId: BOOK_A,
    editorialTitle: 'Título',
    excerpt: 'Resumo',
    content: '<p>Conteúdo</p>',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: BooksService, useValue: mockBooksService },
        { provide: ExpertsService, useValue: mockExpertsService },
      ],
    }).compile();

    service = module.get(ReviewsService);
    jest.clearAllMocks();

    mockExpertsService.findById.mockResolvedValue(publicExpert);
    mockExpertsService.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(ids.includes(EXPERT) ? [publicExpert] : []),
    );
    mockBooksService.findById.mockResolvedValue({ _id: BOOK_A });
    mockBooksService.findByIds.mockImplementation((ids: string[]) =>
      Promise.resolve(ids.map((id) => bookResponse(id))),
    );
    mockReviewModel.exists.mockReturnValue(execOf(null));
    mockReviewModel.countDocuments.mockReturnValue(execOf(1));
    mockReviewModel.find.mockReturnValue(queryOf([review]));
    mockReviewModel.updateMany.mockReturnValue(execOf({}));
  });

  describe('create', () => {
    it('deve lançar NotFoundException se o especialista não existir', async () => {
      mockExpertsService.findById.mockRejectedValue(
        new NotFoundException('Especialista não encontrado'),
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockReviewModel.create).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se o livro não existir', async () => {
      mockBooksService.findById.mockRejectedValue(
        new NotFoundException('Livro não encontrado'),
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockReviewModel.create).not.toHaveBeenCalled();
    });

    it('deve gerar slug pelo título, sufixando quando já existir', async () => {
      mockReviewModel.exists
        .mockReturnValueOnce(execOf({ _id: 'outra' }))
        .mockReturnValueOnce(execOf(null));
      mockReviewModel.create.mockResolvedValue(review);

      await service.create({ ...dto, editorialTitle: 'Ótimo Título' });

      expect(mockReviewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'otimo-titulo-2',
          expertId: EXPERT,
          bookId: BOOK_A,
          weekly: false,
        }),
      );
    });

    it('deve recalcular o snapshot de resenhas do livro e do especialista', async () => {
      mockReviewModel.create.mockResolvedValue(review);
      mockReviewModel.find.mockReturnValue(queryOf([review, review]));
      mockReviewModel.countDocuments.mockReturnValue(execOf(3));

      await service.create(dto);

      expect(mockReviewModel.find).toHaveBeenCalledWith({ bookId: BOOK_A });
      expect(mockBooksService.setReviewSnapshot).toHaveBeenCalledWith(BOOK_A, {
        reviewerSlugs: ['ana-souza'],
        reviewCount: 2,
      });
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT,
        'reviewCount',
        3,
      );
    });

    it('deve desmarcar a resenha da semana anterior ao marcar a nova', async () => {
      mockReviewModel.create.mockResolvedValue({ ...review, weekly: true });

      await service.create({ ...dto, weekly: true });

      expect(mockReviewModel.updateMany).toHaveBeenCalledWith(
        { _id: { $ne: 'review-1' }, weekly: true },
        { weekly: false },
      );
    });

    it('deve devolver a resenha com especialista e livro resolvidos', async () => {
      mockReviewModel.create.mockResolvedValue(review);

      const result = await service.create(dto);

      expect(result.expert).toEqual(publicExpert);
      expect(result).toMatchObject({
        bookId: BOOK_A,
        book: { _id: BOOK_A, slug: `livro-${BOOK_A}`, active: true },
      });
    });
  });

  describe('findAll', () => {
    it('deve paginar pelas mais recentes', async () => {
      const query = queryOf([review]);
      mockReviewModel.find.mockReturnValue(query);
      mockReviewModel.countDocuments.mockReturnValue(execOf(11));

      const result = await service.findAll({ page: 2, pageSize: 10 });

      expect(mockReviewModel.find).toHaveBeenCalledWith({});
      expect(query.sort).toHaveBeenCalledWith({ publishedAt: -1 });
      expect(query.skip).toHaveBeenCalledWith(10);
      expect(query.limit).toHaveBeenCalledWith(10);
      expect(result).toMatchObject({ total: 11, totalPages: 2, page: 2 });
    });

    it('deve filtrar pelos slugs dos especialistas', async () => {
      const other = '507f1f77bcf86cd799439088';
      mockExpertsService.findBySlugs.mockResolvedValue([
        { _id: { toString: () => EXPERT } },
        { _id: { toString: () => other } },
      ]);

      await service.findAll({
        experts: ['ana-souza', 'bruno-lima'],
        page: 1,
        pageSize: 10,
      });

      expect(mockReviewModel.find).toHaveBeenCalledWith({
        expertId: { $in: [EXPERT, other] },
      });
    });

    it('deve manter livro inativo na resenha, sinalizado como inativo', async () => {
      mockBooksService.findByIds.mockImplementation((ids: string[]) =>
        Promise.resolve(ids.map((id) => bookResponse(id, false))),
      );

      const { items } = await service.findAll({ page: 1, pageSize: 10 });

      expect(items[0].book).toMatchObject({ _id: BOOK_A, active: false });
    });
  });

  describe('findBySlug', () => {
    it('deve lançar NotFoundException quando não existir', async () => {
      mockReviewModel.findOne.mockReturnValue(execOf(null));

      await expect(service.findBySlug('nada')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByBookId', () => {
    it('deve devolver as resenhas do livro, mais recentes primeiro', async () => {
      const query = queryOf([review]);
      mockReviewModel.find.mockReturnValue(query);

      const result = await service.findByBookId(BOOK_A);

      expect(mockReviewModel.find).toHaveBeenCalledWith({ bookId: BOOK_A });
      expect(query.sort).toHaveBeenCalledWith({ publishedAt: -1 });
      expect(result).toMatchObject([
        { slug: 'titulo', expert: publicExpert, book: { _id: BOOK_A } },
      ]);
    });
  });

  describe('update', () => {
    it('deve lançar NotFoundException se a resenha não existir', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(null));

      await expect(
        service.update('inexistente', { excerpt: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve manter o slug e recalcular o livro antigo e o novo', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(review));
      mockReviewModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...review, bookId: BOOK_B }),
      );
      mockReviewModel.find.mockReturnValue(queryOf([]));

      await service.update('review-1', {
        editorialTitle: 'Outro título',
        bookId: BOOK_B,
      });

      expect(mockBooksService.findById).toHaveBeenCalledWith(BOOK_B);
      expect(mockReviewModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'review-1',
        { editorialTitle: 'Outro título', bookId: BOOK_B },
        { new: true },
      );
      expect(mockBooksService.setReviewSnapshot).toHaveBeenCalledWith(BOOK_A, {
        reviewerSlugs: [],
        reviewCount: 0,
      });
      expect(mockBooksService.setReviewSnapshot).toHaveBeenCalledWith(
        BOOK_B,
        expect.anything(),
      );
    });

    it('deve recalcular o especialista antigo e o novo ao trocar o especialista', async () => {
      const OTHER = '507f1f77bcf86cd799439098';
      mockReviewModel.findById.mockReturnValue(execOf(review));
      mockReviewModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...review, expertId: OTHER }),
      );

      await service.update('review-1', { expertId: OTHER });

      expect(mockExpertsService.findById).toHaveBeenCalledWith(OTHER);
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT,
        'reviewCount',
        1,
      );
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        OTHER,
        'reviewCount',
        1,
      );
    });
  });

  describe('remove', () => {
    it('deve excluir e recalcular livro e especialista', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(review));
      mockReviewModel.findByIdAndDelete.mockReturnValue(execOf(review));
      mockReviewModel.find.mockReturnValue(queryOf([]));
      mockReviewModel.countDocuments.mockReturnValue(execOf(0));

      await service.remove('review-1');

      expect(mockReviewModel.findByIdAndDelete).toHaveBeenCalledWith(
        'review-1',
      );
      expect(mockBooksService.setReviewSnapshot).toHaveBeenCalledWith(BOOK_A, {
        reviewerSlugs: [],
        reviewCount: 0,
      });
      expect(mockExpertsService.setCounter).toHaveBeenCalledWith(
        EXPERT,
        'reviewCount',
        0,
      );
    });
  });

  describe('getWeeklyHighlight', () => {
    it('deve devolver null quando não houver resenha da semana', async () => {
      mockReviewModel.findOne.mockReturnValue(execOf(null));

      await expect(service.getWeeklyHighlight()).resolves.toBeNull();
    });

    it('deve devolver a resenha da semana resolvida', async () => {
      mockReviewModel.findOne.mockReturnValue(
        execOf({ ...review, weekly: true }),
      );

      const result = await service.getWeeklyHighlight();

      expect(mockReviewModel.findOne).toHaveBeenCalledWith({ weekly: true });
      expect(result).toMatchObject({ slug: 'titulo', weekly: true });
    });
  });

  it('count deve contar as resenhas', async () => {
    mockReviewModel.countDocuments.mockReturnValue(execOf(5));

    await expect(service.count()).resolves.toBe(5);
  });
});
