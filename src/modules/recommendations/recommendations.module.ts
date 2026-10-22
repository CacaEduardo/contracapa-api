import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksModule } from 'src/modules/books/books.module';
import { EpisodesModule } from 'src/modules/episodes/episodes.module';
import { ExpertsModule } from 'src/modules/experts/experts.module';
import { RecommendationsController } from 'src/modules/recommendations/recommendations.controller';
import { RecommendationsService } from 'src/modules/recommendations/recommendations.service';
import {
  Recommendation,
  RecommendationSchema,
} from 'src/modules/recommendations/schemas/recommendation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recommendation.name, schema: RecommendationSchema },
    ]),
    BooksModule,
    ExpertsModule,
    EpisodesModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
