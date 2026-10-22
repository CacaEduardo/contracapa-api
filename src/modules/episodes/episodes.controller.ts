import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  createEpisodeSchema,
  type CreateEpisodeDto,
} from 'src/modules/episodes/dto/create-episode.dto';
import {
  listEpisodesQuerySchema,
  type ListEpisodesQueryDto,
} from 'src/modules/episodes/dto/list-episodes-query.dto';
import {
  lookupEpisodeQuerySchema,
  type LookupEpisodeQueryDto,
} from 'src/modules/episodes/dto/lookup-episode-query.dto';
import {
  updateEpisodeSchema,
  type UpdateEpisodeDto,
} from 'src/modules/episodes/dto/update-episode.dto';
import { EpisodesService } from 'src/modules/episodes/episodes.service';

@Controller('episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get()
  @Public()
  findAll(
    @Query({ schema: listEpisodesQuerySchema }) query: ListEpisodesQueryDto,
  ) {
    return this.episodesService.findAll(query);
  }

  @Get('lookup')
  @Roles('admin')
  lookup(
    @Query({ schema: lookupEpisodeQuerySchema }) query: LookupEpisodeQueryDto,
  ) {
    return this.episodesService.lookup(query.url);
  }

  @Get('admin')
  @Roles('admin')
  findAllAdmin(
    @Query({ schema: listEpisodesQuerySchema }) query: ListEpisodesQueryDto,
  ) {
    return this.episodesService.findAllAdmin(query);
  }

  @Get('admin/:id')
  @Roles('admin')
  findOneAdmin(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.episodesService.findOneAdmin(id);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.episodesService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createEpisodeSchema }) body: CreateEpisodeDto) {
    return this.episodesService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateEpisodeSchema }) body: UpdateEpisodeDto,
  ) {
    return this.episodesService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.episodesService.remove(id);
  }
}
