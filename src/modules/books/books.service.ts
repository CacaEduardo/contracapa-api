import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { escapeRegExp } from 'src/common/lib/escape-regexp';
import { slugify } from 'src/common/lib/slugify';
import {
  toBookResponse,
  type BookResponse,
} from 'src/modules/books/book-response';
import type { CreateBookDto } from 'src/modules/books/dto/create-book.dto';
import type { ListBooksQueryDto } from 'src/modules/books/dto/list-books-query.dto';
import type { UpdateBookDto } from 'src/modules/books/dto/update-book.dto';
import {
  Book,
  type BookDocument,
  type BookVerdict,
} from 'src/modules/books/schemas/book.schema';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { StorageService } from 'src/modules/storage/storage.service';

export type ListBooksResult = {
  items: BookResponse[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type ReviewSnapshot = {
  reviewId: string;
  verdict: BookVerdict;
  weekly: boolean;
  publishedAt: Date;
};

type BookQueryFilter = {
  categorySlugs?: { $in: string[] };
  reviewVerdict?: { $in: BookVerdict[] } | null;
  $and?: Record<string, unknown>[];
};

const RELATED_BOOKS_LIMIT = 4;

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    private readonly categoriesService: CategoriesService,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateBookDto): Promise<BookResponse> {
    const categorySlugs = dto.categorySlugs ?? [];
    await this.assertCategoriesExist(categorySlugs);
    const slug = await this.generateUniqueSlug(dto.title);

    const created = await this.bookModel.create({
      title: dto.title,
      author: dto.author,
      year: dto.year,
      pages: dto.pages,
      amazonUrl: dto.amazonUrl ?? null,
      categorySlugs,
      slug,
    });

    await this.syncCategoryCounts([], created.categorySlugs);

    return this.toResponse(created);
  }

  async findAll(query: ListBooksQueryDto): Promise<ListBooksResult> {
    const filter: BookQueryFilter = {};
    const andConditions: Record<string, unknown>[] = [];

    if (query.q) {
      const regex = new RegExp(escapeRegExp(query.q), 'i');
      andConditions.push({ $or: [{ title: regex }, { author: regex }] });
    }

    if (query.categories?.length) {
      filter.categorySlugs = { $in: query.categories };
    }

    if (query.verdicts?.length) {
      const concreteVerdicts = query.verdicts.filter(
        (verdict): verdict is BookVerdict => verdict !== 'none',
      );
      const includesNone = query.verdicts.includes('none');

      if (includesNone && concreteVerdicts.length > 0) {
        andConditions.push({
          $or: [
            { reviewVerdict: { $in: concreteVerdicts } },
            { reviewVerdict: null },
          ],
        });
      } else if (includesNone) {
        filter.reviewVerdict = null;
      } else {
        filter.reviewVerdict = { $in: concreteVerdicts };
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const sortOption: Record<string, 1 | -1> =
      query.sort === 'az'
        ? { title: 1 }
        : query.sort === 'za'
          ? { title: -1 }
          : { reviewPublishedAt: -1, createdAt: -1 };

    const total = await this.bookModel.countDocuments(filter).exec();
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    const books = await this.bookModel
      .find(filter)
      .sort(sortOption)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .exec();

    return {
      items: await this.toResponseList(books),
      total,
      totalPages,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findBySlug(slug: string): Promise<BookResponse> {
    const book = await this.bookModel.findOne({ slug }).exec();

    if (!book) {
      throw new NotFoundException('Livro não encontrado');
    }

    return this.toResponse(book);
  }

  async findRelated(slug: string): Promise<BookResponse[]> {
    const book = await this.bookModel.findOne({ slug }).exec();

    if (!book || book.categorySlugs.length === 0) {
      return [];
    }

    const related = await this.bookModel
      .find({
        slug: { $ne: slug },
        categorySlugs: { $in: book.categorySlugs },
      })
      .limit(RELATED_BOOKS_LIMIT)
      .exec();

    return this.toResponseList(related);
  }

  async findById(id: string): Promise<BookDocument> {
    const book = await this.bookModel.findById(id).exec();

    if (!book) {
      throw new NotFoundException('Livro não encontrado');
    }

    return book;
  }

  async findByIdResponse(id: string): Promise<BookResponse> {
    const book = await this.findById(id);
    return this.toResponse(book);
  }

  async update(id: string, dto: UpdateBookDto): Promise<BookResponse> {
    const book = await this.findById(id);

    if (dto.categorySlugs) {
      await this.assertCategoriesExist(dto.categorySlugs);
    }

    const previousSlugs = book.categorySlugs;

    const payload: Partial<Book> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.author !== undefined && { author: dto.author }),
      ...(dto.year !== undefined && { year: dto.year }),
      ...(dto.pages !== undefined && { pages: dto.pages }),
      ...(dto.amazonUrl !== undefined && { amazonUrl: dto.amazonUrl }),
      ...(dto.categorySlugs !== undefined && {
        categorySlugs: dto.categorySlugs,
      }),
    };

    const updated = await this.bookModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Livro não encontrado');
    }

    if (dto.categorySlugs) {
      await this.syncCategoryCounts(previousSlugs, dto.categorySlugs);
    }

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const book = await this.findById(id);

    if (book.reviewId) {
      throw new ConflictException('Remova a resenha antes de excluir o livro');
    }

    await this.bookModel.findByIdAndDelete(id).exec();
    await this.syncCategoryCounts(book.categorySlugs, []);

    if (book.coverKey) {
      await this.storageService.deleteImage(book.coverKey);
    }
  }

  async uploadCover(
    id: string,
    file: Express.Multer.File,
  ): Promise<BookResponse> {
    const book = await this.findById(id);
    const uploaded = await this.storageService.uploadImage(file, 'books');

    if (book.coverKey) {
      await this.storageService.deleteImage(book.coverKey);
    }

    const updated = await this.bookModel
      .findByIdAndUpdate(
        id,
        { coverSrc: uploaded.url, coverKey: uploaded.key },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Livro não encontrado');
    }

    return this.toResponse(updated);
  }

  async removeCover(id: string): Promise<BookResponse> {
    const book = await this.findById(id);

    if (book.coverKey) {
      await this.storageService.deleteImage(book.coverKey);
    }

    const updated = await this.bookModel
      .findByIdAndUpdate(id, { coverSrc: null, coverKey: null }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Livro não encontrado');
    }

    return this.toResponse(updated);
  }

  async setReviewSnapshot(
    bookId: string,
    snapshot: ReviewSnapshot,
  ): Promise<void> {
    try {
      await this.bookModel
        .findByIdAndUpdate(bookId, {
          reviewId: snapshot.reviewId,
          reviewVerdict: snapshot.verdict,
          reviewWeekly: snapshot.weekly,
          reviewPublishedAt: snapshot.publishedAt,
        })
        .exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao sincronizar snapshot de resenha: bookId=${bookId} ${String(error)}`,
      );
    }
  }

  async clearReviewSnapshot(bookId: string): Promise<void> {
    try {
      await this.bookModel
        .findByIdAndUpdate(bookId, {
          reviewId: null,
          reviewVerdict: null,
          reviewWeekly: false,
          reviewPublishedAt: null,
        })
        .exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao limpar snapshot de resenha: bookId=${bookId} ${String(error)}`,
      );
    }
  }

  async setWeeklyFlag(bookId: string, weekly: boolean): Promise<void> {
    try {
      await this.bookModel
        .findByIdAndUpdate(bookId, { reviewWeekly: weekly })
        .exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao atualizar flag de resenha semanal: bookId=${bookId} ${String(error)}`,
      );
    }
  }

  async count(): Promise<number> {
    return this.bookModel.countDocuments().exec();
  }

  private async assertCategoriesExist(slugs: string[]): Promise<void> {
    if (slugs.length === 0) {
      return;
    }

    const unknown = await this.categoriesService.existsAllSlugs(slugs);

    if (unknown.length > 0) {
      throw new BadRequestException(
        `Categoria(s) inexistente(s): ${unknown.join(', ')}`,
      );
    }
  }

  private async syncCategoryCounts(
    previousSlugs: string[],
    nextSlugs: string[],
  ): Promise<void> {
    const removed = previousSlugs.filter((slug) => !nextSlugs.includes(slug));
    const added = nextSlugs.filter((slug) => !previousSlugs.includes(slug));

    await Promise.all([
      ...removed.map((slug) => this.categoriesService.decrementBookCount(slug)),
      ...added.map((slug) => this.categoriesService.incrementBookCount(slug)),
    ]);
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;

    while (await this.bookModel.exists({ slug: candidate }).exec()) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async toResponse(book: BookDocument): Promise<BookResponse> {
    const categoryNames = await this.resolveCategoryNames(book.categorySlugs);
    return toBookResponse(book, categoryNames);
  }

  private async toResponseList(books: BookDocument[]): Promise<BookResponse[]> {
    const allSlugs = [...new Set(books.flatMap((book) => book.categorySlugs))];
    const categoryNames = await this.resolveCategoryNames(allSlugs);

    return books.map((book) => toBookResponse(book, categoryNames));
  }

  private async resolveCategoryNames(
    slugs: string[],
  ): Promise<Map<string, string>> {
    if (slugs.length === 0) {
      return new Map();
    }

    const categories = await this.categoriesService.findBySlugs(slugs);
    return new Map(
      categories.map((category) => [category.slug, category.name]),
    );
  }
}
