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
} from '@nestjs/common';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  createReviewSchema,
  type CreateReviewDto,
} from 'src/modules/reviews/dto/create-review.dto';
import {
  updateReviewSchema,
  type UpdateReviewDto,
} from 'src/modules/reviews/dto/update-review.dto';
import { ReviewsService } from 'src/modules/reviews/reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('weekly')
  @Public()
  getWeeklyHighlight() {
    return this.reviewsService.getWeeklyHighlight();
  }

  @Get('book/:bookId')
  @Public()
  findByBookId(@Param('bookId', { schema: mongoIdSchema }) bookId: string) {
    return this.reviewsService.findByBookId(bookId);
  }

  @Get()
  @Roles('admin')
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.reviewsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createReviewSchema }) body: CreateReviewDto) {
    return this.reviewsService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateReviewSchema }) body: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.reviewsService.remove(id);
  }
}
