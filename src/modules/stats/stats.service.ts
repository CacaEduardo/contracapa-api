import { Injectable } from '@nestjs/common';
import { BooksService } from 'src/modules/books/books.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { ReviewsService } from 'src/modules/reviews/reviews.service';
import { UsersService } from 'src/modules/users/users.service';

export type StatsResponse = {
  books: number;
  categories: number;
  reviews: number;
  readers: number;
};

@Injectable()
export class StatsService {
  constructor(
    private readonly booksService: BooksService,
    private readonly categoriesService: CategoriesService,
    private readonly reviewsService: ReviewsService,
    private readonly usersService: UsersService,
  ) {}

  async getStats(): Promise<StatsResponse> {
    const [books, categories, reviews, readers] = await Promise.all([
      this.booksService.count(),
      this.categoriesService.count(),
      this.reviewsService.count(),
      this.usersService.countReaders(),
    ]);

    return { books, categories, reviews, readers };
  }
}
