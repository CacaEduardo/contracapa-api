import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { slugify } from 'src/common/lib/slugify';
import type { CreateCategoryDto } from 'src/modules/categories/dto/create-category.dto';
import type { UpdateCategoryDto } from 'src/modules/categories/dto/update-category.dto';
import {
  Category,
  type CategoryDocument,
} from 'src/modules/categories/schemas/category.schema';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const slug = slugify(dto.name);
    const existing = await this.categoryModel
      .findOne({ $or: [{ name: dto.name }, { slug }] })
      .exec();

    if (existing) {
      throw new ConflictException('Já existe uma categoria com este nome');
    }

    return this.categoryModel.create({ name: dto.name, slug, bookCount: 0 });
  }

  async findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    if (dto.name) {
      const existing = await this.categoryModel
        .findOne({ name: dto.name, _id: { $ne: id } })
        .exec();

      if (existing) {
        throw new ConflictException('Já existe uma categoria com este nome');
      }
    }

    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { name: dto.name }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.categoryModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }

  async incrementBookCount(slug: string): Promise<void> {
    try {
      await this.categoryModel
        .updateOne({ slug }, { $inc: { bookCount: 1 } })
        .exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao incrementar bookCount da categoria slug=${slug}: ${String(error)}`,
      );
    }
  }

  async decrementBookCount(slug: string): Promise<void> {
    try {
      await this.categoryModel
        .updateOne({ slug, bookCount: { $gt: 0 } }, { $inc: { bookCount: -1 } })
        .exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao decrementar bookCount da categoria slug=${slug}: ${String(error)}`,
      );
    }
  }

  async findBySlugs(slugs: string[]): Promise<CategoryDocument[]> {
    if (slugs.length === 0) {
      return [];
    }

    return this.categoryModel.find({ slug: { $in: slugs } }).exec();
  }

  async count(): Promise<number> {
    return this.categoryModel.countDocuments().exec();
  }

  async existsAllSlugs(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) {
      return [];
    }

    const found = await this.categoryModel
      .find({ slug: { $in: slugs } })
      .select('slug')
      .exec();
    const foundSlugs = new Set(found.map((category) => category.slug));

    return slugs.filter((slug) => !foundSlugs.has(slug));
  }
}
