import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EpisodesController } from 'src/modules/episodes/episodes.controller';
import { EpisodesService } from 'src/modules/episodes/episodes.service';
import {
  Episode,
  EpisodeSchema,
} from 'src/modules/episodes/schemas/episode.schema';
import { YoutubeOembedService } from 'src/modules/episodes/youtube-oembed.service';
import { ExpertsModule } from 'src/modules/experts/experts.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Episode.name, schema: EpisodeSchema }]),
    ExpertsModule,
  ],
  controllers: [EpisodesController],
  providers: [EpisodesService, YoutubeOembedService],
  exports: [EpisodesService],
})
export class EpisodesModule {}
