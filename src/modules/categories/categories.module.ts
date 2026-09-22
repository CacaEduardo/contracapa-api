import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from 'src/modules/categories/categories.controller';
import { CategoriesService } from 'src/modules/categories/categories.service';
import {
  Category,
  CategorySchema,
} from 'src/modules/categories/schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
