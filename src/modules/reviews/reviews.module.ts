import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksModule } from 'src/modules/books/books.module';
import { ReviewsController } from 'src/modules/reviews/reviews.controller';
import { ReviewsService } from 'src/modules/reviews/reviews.service';
import {
  Review,
  ReviewSchema,
} from 'src/modules/reviews/schemas/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    BooksModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
