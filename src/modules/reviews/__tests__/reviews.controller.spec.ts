import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from 'src/modules/reviews/reviews.controller';
import { ReviewsService } from 'src/modules/reviews/reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;

  const mockReviewsService = {
    getWeeklyHighlight: jest.fn(),
    findByBookId: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    }).compile();

    controller = module.get(ReviewsController);
    jest.clearAllMocks();
  });

  it('deve buscar a resenha da semana via service', async () => {
    mockReviewsService.getWeeklyHighlight.mockResolvedValue(null);

    await expect(controller.getWeeklyHighlight()).resolves.toBeNull();
  });

  it('deve buscar resenha por livro via service', async () => {
    const review = { _id: '1', bookId: 'book-1' };
    mockReviewsService.findByBookId.mockResolvedValue(review);

    await expect(controller.findByBookId('book-1')).resolves.toEqual(review);
  });

  it('deve criar resenha via service', async () => {
    const dto = {
      bookId: 'book-1',
      excerpt: 'Resumo',
      content: 'Conteúdo',
      verdict: 'positive' as const,
      weekly: false,
      podcast: {},
    };
    const created = { _id: '1', ...dto };
    mockReviewsService.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toEqual(created);
  });

  it('deve remover resenha via service', async () => {
    mockReviewsService.remove.mockResolvedValue(undefined);

    await expect(controller.remove('1')).resolves.toBeUndefined();
    expect(mockReviewsService.remove).toHaveBeenCalledWith('1');
  });
});
