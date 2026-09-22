import { Injectable } from '@nestjs/common';
import { BooksService } from 'src/modules/books/books.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { NewsletterService } from 'src/modules/newsletter/newsletter.service';
import { ReviewsService } from 'src/modules/reviews/reviews.service';

export type StatsResponse = {
  books: number;
  categories: number;
  reviews: number;
  subscribers: number;
};

@Injectable()
export class StatsService {
  constructor(
    private readonly booksService: BooksService,
    private readonly categoriesService: CategoriesService,
    private readonly reviewsService: ReviewsService,
    private readonly newsletterService: NewsletterService,
  ) {}

  async getStats(): Promise<StatsResponse> {
    const [books, categories, reviews, subscribers] = await Promise.all([
      this.booksService.count(),
      this.categoriesService.count(),
      this.reviewsService.count(),
      this.newsletterService.count(),
    ]);

    return { books, categories, reviews, subscribers };
  }
}
