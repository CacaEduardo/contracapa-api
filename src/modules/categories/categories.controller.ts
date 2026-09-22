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
import { CategoriesService } from 'src/modules/categories/categories.service';
import {
  createCategorySchema,
  type CreateCategoryDto,
} from 'src/modules/categories/dto/create-category.dto';
import {
  updateCategorySchema,
  type UpdateCategoryDto,
} from 'src/modules/categories/dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createCategorySchema }) body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateCategorySchema }) body: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.categoriesService.remove(id);
  }
}
