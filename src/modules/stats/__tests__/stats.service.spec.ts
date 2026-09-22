import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from 'src/modules/books/books.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';
import { ReviewsService } from 'src/modules/reviews/reviews.service';
import { StatsService } from 'src/modules/stats/stats.service';

describe('StatsService', () => {
  let service: StatsService;

  const mockBooksService = { count: jest.fn() };
  const mockCategoriesService = { count: jest.fn() };
  const mockReviewsService = { count: jest.fn() };
  const mockNewsletterService = { count: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: BooksService, useValue: mockBooksService },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: ReviewsService, useValue: mockReviewsService },
        { provide: NewsletterService, useValue: mockNewsletterService },
      ],
    }).compile();

    service = module.get(StatsService);
    jest.clearAllMocks();
  });

  it('deve agregar as contagens de todos os domínios', async () => {
    mockBooksService.count.mockResolvedValue(8);
    mockCategoriesService.count.mockResolvedValue(5);
    mockReviewsService.count.mockResolvedValue(6);
    mockNewsletterService.count.mockResolvedValue(3);

    await expect(service.getStats()).resolves.toEqual({
      books: 8,
      categories: 5,
      reviews: 6,
      subscribers: 3,
    });
  });
});
