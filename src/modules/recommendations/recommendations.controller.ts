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
  createRecommendationSchema,
  type CreateRecommendationDto,
} from 'src/modules/recommendations/dto/create-recommendation.dto';
import {
  listRecommendationsQuerySchema,
  type ListRecommendationsQueryDto,
} from 'src/modules/recommendations/dto/list-recommendations-query.dto';
import {
  updateRecommendationSchema,
  type UpdateRecommendationDto,
} from 'src/modules/recommendations/dto/update-recommendation.dto';
import { RecommendationsService } from 'src/modules/recommendations/recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  @Public()
  findAll(
    @Query({ schema: listRecommendationsQuerySchema })
    query: ListRecommendationsQueryDto,
  ) {
    return this.recommendationsService.findAll(query);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.recommendationsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body({ schema: createRecommendationSchema }) body: CreateRecommendationDto,
  ) {
    return this.recommendationsService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateRecommendationSchema }) body: UpdateRecommendationDto,
  ) {
    return this.recommendationsService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.recommendationsService.remove(id);
  }
}
