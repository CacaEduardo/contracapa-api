import { Module } from '@nestjs/common';
import { BooksModule } from 'src/modules/books/books.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { EpisodesModule } from 'src/modules/episodes/episodes.module';
import { RecommendationsModule } from 'src/modules/recommendations/recommendations.module';
import { ReviewsModule } from 'src/modules/reviews/reviews.module';
import { StatsController } from 'src/modules/stats/stats.controller';
import { StatsService } from 'src/modules/stats/stats.service';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [
    BooksModule,
    CategoriesModule,
    EpisodesModule,
    RecommendationsModule,
    ReviewsModule,
    UsersModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
