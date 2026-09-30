import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from 'src/modules/reviews/reviews.controller';
import { ReviewsService } from 'src/modules/reviews/reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;

  const mockReviewsService = {
    getWeeklyHighlight: jest.fn(),
    findByBookId: jest.fn(),
    findBySlug: jest.fn(),
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

  it('deve listar resenhas paginadas via service', async () => {
    const query = { expert: 'ana-souza', page: 2, pageSize: 10 };
    mockReviewsService.findAll.mockResolvedValue({ items: [] });

    await controller.findAll(query);

    expect(mockReviewsService.findAll).toHaveBeenCalledWith(query);
  });

  it('deve buscar a resenha da semana via service', async () => {
    mockReviewsService.getWeeklyHighlight.mockResolvedValue(null);

    await expect(controller.getWeeklyHighlight()).resolves.toBeNull();
  });

  it('deve buscar resenha por slug via service', async () => {
    mockReviewsService.findBySlug.mockResolvedValue({ slug: 'titulo' });

    await expect(controller.findBySlug('titulo')).resolves.toEqual({
      slug: 'titulo',
    });
  });

  it('deve buscar as indicações de um livro via service', async () => {
    mockReviewsService.findByBookId.mockResolvedValue([]);

    await expect(controller.findByBookId('book-1')).resolves.toEqual([]);
    expect(mockReviewsService.findByBookId).toHaveBeenCalledWith('book-1');
  });

  it('deve criar resenha via service', async () => {
    const dto = {
      expertId: 'expert-1',
      editorialTitle: 'Título',
      excerpt: 'Resumo',
      content: 'Conteúdo',
      indications: [{ editoria: 'market' as const, bookId: 'book-1' }],
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
