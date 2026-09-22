import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from 'src/modules/books/books.service';
import { ReviewsService } from 'src/modules/reviews/reviews.service';
import { Review } from 'src/modules/reviews/schemas/review.schema';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

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
    create: jest.fn(),
  };

  const mockBooksService = {
    findById: jest.fn(),
    findByIdResponse: jest.fn(),
    setReviewSnapshot: jest.fn(),
    clearReviewSnapshot: jest.fn(),
    setWeeklyFlag: jest.fn(),
  };

  const review = {
    _id: { toString: () => 'review-1' },
    bookId: 'book-1',
    editorialTitle: null,
    excerpt: 'Resumo',
    content: '<p>Conteúdo</p>',
    verdict: 'positive' as const,
    publishedAt: new Date('2024-01-01'),
    weekly: false,
    podcast: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: BooksService, useValue: mockBooksService },
      ],
    }).compile();

    service = module.get(ReviewsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve lançar NotFoundException se o livro não existir', async () => {
      mockBooksService.findById.mockRejectedValue(
        new NotFoundException('Livro não encontrado'),
      );

      await expect(
        service.create({
          bookId: 'inexistente',
          excerpt: 'Resumo',
          content: 'Conteúdo',
          verdict: 'positive',
          weekly: false,
          podcast: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException se o livro já tiver resenha', async () => {
      mockBooksService.findById.mockResolvedValue({});
      mockReviewModel.findOne.mockReturnValue(execOf(review));

      await expect(
        service.create({
          bookId: 'book-1',
          excerpt: 'Resumo',
          content: 'Conteúdo',
          verdict: 'positive',
          weekly: false,
          podcast: {},
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockReviewModel.create).not.toHaveBeenCalled();
    });

    it('deve criar a resenha e sincronizar o snapshot no livro', async () => {
      mockBooksService.findById.mockResolvedValue({});
      mockReviewModel.findOne.mockReturnValue(execOf(null));
      mockReviewModel.create.mockResolvedValue(review);

      const result = await service.create({
        bookId: 'book-1',
        excerpt: 'Resumo',
        content: 'Conteúdo',
        verdict: 'positive',
        weekly: false,
        podcast: {},
      });

      expect(mockBooksService.setReviewSnapshot).toHaveBeenCalledWith(
        'book-1',
        expect.objectContaining({
          reviewId: 'review-1',
          verdict: 'positive',
          weekly: false,
        }),
      );
      expect(result).toEqual(review);
    });

    it('deve criar com weekly=false e podcast={} quando ambos forem omitidos no DTO', async () => {
      mockBooksService.findById.mockResolvedValue({});
      mockReviewModel.findOne.mockReturnValue(execOf(null));
      mockReviewModel.create.mockResolvedValue(review);

      await service.create({
        bookId: 'book-1',
        excerpt: 'Resumo',
        content: 'Conteúdo',
        verdict: 'positive',
      });

      expect(mockReviewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ weekly: false, podcast: {} }),
      );
    });

    it('deve desmarcar a resenha semanal anterior ao criar uma nova marcada como semanal', async () => {
      mockBooksService.findById.mockResolvedValue({});
      mockReviewModel.findOne
        .mockReturnValueOnce(execOf(null))
        .mockReturnValueOnce(
          execOf({
            ...review,
            _id: { toString: () => 'review-antiga' },
            bookId: 'book-antigo',
          }),
        );
      mockReviewModel.create.mockResolvedValue({ ...review, weekly: true });
      mockReviewModel.updateMany.mockReturnValue(execOf({}));

      await service.create({
        bookId: 'book-1',
        excerpt: 'Resumo',
        content: 'Conteúdo',
        verdict: 'positive',
        weekly: true,
        podcast: {},
      });

      expect(mockReviewModel.updateMany).toHaveBeenCalledWith(
        { _id: { $ne: 'review-1' }, weekly: true },
        { weekly: false },
      );
      expect(mockBooksService.setWeeklyFlag).toHaveBeenCalledWith(
        'book-antigo',
        false,
      );
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se a resenha não existir', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(null));

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve lançar NotFoundException se a resenha não existir', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(null));

      await expect(
        service.update('inexistente', { excerpt: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve atualizar a resenha e ressincronizar o snapshot no livro', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(review));
      mockReviewModel.findByIdAndUpdate.mockReturnValue(
        execOf({ ...review, excerpt: 'Atualizado' }),
      );

      const result = await service.update('review-1', {
        excerpt: 'Atualizado',
      });

      expect(mockBooksService.setReviewSnapshot).toHaveBeenCalledWith(
        'book-1',
        expect.objectContaining({ reviewId: 'review-1' }),
      );
      expect(result.excerpt).toBe('Atualizado');
    });
  });

  describe('remove', () => {
    it('deve remover a resenha e limpar o snapshot do livro', async () => {
      mockReviewModel.findById.mockReturnValue(execOf(review));
      mockReviewModel.findByIdAndDelete.mockReturnValue(execOf(review));

      await service.remove('review-1');

      expect(mockBooksService.clearReviewSnapshot).toHaveBeenCalledWith(
        'book-1',
      );
    });
  });

  describe('getWeeklyHighlight', () => {
    it('deve devolver null quando não houver resenha semanal', async () => {
      mockReviewModel.findOne.mockReturnValue(execOf(null));

      await expect(service.getWeeklyHighlight()).resolves.toBeNull();
    });

    it('deve compor a resenha semanal com o livro correspondente', async () => {
      mockReviewModel.findOne.mockReturnValue(
        execOf({ ...review, weekly: true }),
      );
      mockBooksService.findByIdResponse.mockResolvedValue({
        _id: 'book-1',
        slug: 'o-nome-da-rosa',
      });

      const result = await service.getWeeklyHighlight();

      expect(mockBooksService.findByIdResponse).toHaveBeenCalledWith('book-1');
      expect(result).toEqual({
        review: { ...review, weekly: true },
        book: { _id: 'book-1', slug: 'o-nome-da-rosa' },
      });
    });
  });

  describe('count', () => {
    it('deve devolver o total de resenhas', async () => {
      mockReviewModel.countDocuments.mockReturnValue(execOf(6));

      await expect(service.count()).resolves.toBe(6);
    });
  });
});
