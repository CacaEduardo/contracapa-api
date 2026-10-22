import { Injectable } from '@nestjs/common';
import { BooksService } from 'src/modules/books/books.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { EpisodesService } from 'src/modules/episodes/episodes.service';
import { RecommendationsService } from 'src/modules/recommendations/recommendations.service';
import { ReviewsService } from 'src/modules/reviews/reviews.service';
import { UsersService } from 'src/modules/users/users.service';

export type StatsResponse = {
  books: number;
  categories: number;
  reviews: number;
  episodes: number;
  recommendations: number;
  readers: number;
};

@Injectable()
export class StatsService {
  constructor(
    private readonly booksService: BooksService,
    private readonly categoriesService: CategoriesService,
    private readonly episodesService: EpisodesService,
    private readonly recommendationsService: RecommendationsService,
    private readonly reviewsService: ReviewsService,
    private readonly usersService: UsersService,
  ) {}

  async getStats(): Promise<StatsResponse> {
    const [books, categories, reviews, episodes, recommendations, readers] =
      await Promise.all([
        this.booksService.count(),
        this.categoriesService.count(),
        this.reviewsService.count(),
        this.episodesService.count(),
        this.recommendationsService.count(),
        this.usersService.countReaders(),
      ]);

    return { books, categories, reviews, episodes, recommendations, readers };
  }
}
