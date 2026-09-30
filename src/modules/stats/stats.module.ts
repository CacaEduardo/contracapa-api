import { Module } from '@nestjs/common';
import { BooksModule } from 'src/modules/books/books.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { ReviewsModule } from 'src/modules/reviews/reviews.module';
import { StatsController } from 'src/modules/stats/stats.controller';
import { StatsService } from 'src/modules/stats/stats.service';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [BooksModule, CategoriesModule, ReviewsModule, UsersModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
