import { Module } from '@nestjs/common';
import { BooksModule } from 'src/modules/books/books.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { NewsletterModule } from 'src/modules/newsletter/newsletter.module';
import { ReviewsModule } from 'src/modules/reviews/reviews.module';
import { StatsController } from 'src/modules/stats/stats.controller';
import { StatsService } from 'src/modules/stats/stats.service';

@Module({
  imports: [BooksModule, CategoriesModule, ReviewsModule, NewsletterModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
