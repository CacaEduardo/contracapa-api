import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { escapeRegExp } from 'src/common/lib/escape-regexp';
import { slugify } from 'src/common/lib/slugify';
import {
  toBookResponse,
  type BookResponse,
} from 'src/modules/books/book-response';
import type { CreateBookDto } from 'src/modules/books/dto/create-book.dto';
import type {
  ListBooksAdminQueryDto,
  ListBooksQueryDto,
} from 'src/modules/books/dto/list-books-query.dto';
import type { UpdateBookDto } from 'src/modules/books/dto/update-book.dto';
import type { Editoria } from 'src/modules/books/editorias';
import {
  Book,
  type BookDocument,
  type BookRecommendedAt,
} from 'src/modules/books/schemas/book.schema';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { StorageService } from 'src/modules/storage/storage.service';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

export type ListBooksResult = {
  items: BookResponse[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

// Escrito só pelo RecommendationsService.
export type RecommendationSnapshot = {
  editorias: Editoria[];
  recommenderSlugs: string[];
  recommendationCount: number;
  disrecommendationCount: number;
  recommendedAt: BookRecommendedAt;
};

// Escrito só pelo ReviewsService.
export type ReviewSnapshot = {
  reviewerSlugs: string[];
  reviewCount: number;
};

type CatalogQuery = Omit<ListBooksQueryDto, 'pageSize'> & { pageSize: number };

type BookQueryFilter = {
  active?: boolean;
  categorySlugs?: { $in: string[] };
  editorias?: { $in: Editoria[] };
  reviewCount?: { $gt: number };
  $and?: Record<string, unknown>[];
};

const IN_USE_MESSAGE =
  'Este livro tem resenhas ou recomendações. Inative-o para tirá-lo do catálogo.';

const RELATED_BOOKS_LIMIT = 12;

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>,
    private readonly categoriesService: CategoriesService,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => WishlistsService))
    private readonly wishlistsService: WishlistsService,
  ) {}

  async create(dto: CreateBookDto): Promise<BookResponse> {
    const categorySlugs = dto.categorySlugs ?? [];
    await this.assertCategoriesExist(categorySlugs);
    const slug = await this.generateUniqueSlug(dto.title);

    const created = await this.bookModel.create({
      title: dto.title,
      author: dto.author,
      description: dto.description ?? null,
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
    return this.listCatalog(query, { active: true });
  }

  async findAllAdmin(query: ListBooksAdminQueryDto): Promise<ListBooksResult> {
    const { status, ...catalogQuery } = query;
    const filter: BookQueryFilter =
      status === 'all' ? {} : { active: status === 'active' };

    return this.listCatalog(catalogQuery, filter);
  }

  async findBySlug(slug: string): Promise<BookResponse> {
    const book = await this.bookModel.findOne({ slug, active: true }).exec();

    if (!book) {
      throw new NotFoundException('Livro não encontrado');
    }

    return this.toResponse(book);
  }

  async findBySlugAdmin(slug: string): Promise<BookResponse> {
    const book = await this.bookModel.findOne({ slug }).exec();

    if (!book) {
      throw new NotFoundException('Livro não encontrado');
    }

    return this.toResponse(book);
  }

  async findRelated(slug: string): Promise<BookResponse[]> {
    const book = await this.bookModel.findOne({ slug, active: true }).exec();

    if (!book || book.categorySlugs.length === 0) {
      return [];
    }

    const related = await this.bookModel
      .find({
        slug: { $ne: slug },
        active: true,
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

  async findByIds(ids: string[]): Promise<BookResponse[]> {
    const validIds = ids.filter((id) => isValidObjectId(id));

    if (validIds.length === 0) {
      return [];
    }

    const books = await this.bookModel.find({ _id: { $in: validIds } }).exec();
    return this.toResponseList(books);
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
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.year !== undefined && { year: dto.year }),
      ...(dto.pages !== undefined && { pages: dto.pages }),
      ...(dto.amazonUrl !== undefined && { amazonUrl: dto.amazonUrl }),
      ...(dto.categorySlugs !== undefined && {
        categorySlugs: dto.categorySlugs,
      }),
      ...(dto.active !== undefined && { active: dto.active }),
    };

    const updated = await this.bookModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Livro não encontrado');
    }

    // A contagem de livros por categoria só considera livros ativos.
    await this.syncCategoryCounts(
      book.active ? previousSlugs : [],
      updated.active ? updated.categorySlugs : [],
    );

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const book = await this.findById(id);

    if (
      book.reviewCount +
        book.recommendationCount +
        book.disrecommendationCount >
      0
    ) {
      throw new ConflictException(IN_USE_MESSAGE);
    }

    await this.bookModel.findByIdAndDelete(id).exec();

    if (book.active) {
      await this.syncCategoryCounts(book.categorySlugs, []);
    }

    await this.wishlistsService.pullBook(id);

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

  async setRecommendationSnapshot(
    bookId: string,
    snapshot: RecommendationSnapshot,
  ): Promise<void> {
    await this.setSnapshot(bookId, snapshot, 'recomendações');
  }

  async setReviewSnapshot(
    bookId: string,
    snapshot: ReviewSnapshot,
  ): Promise<void> {
    await this.setSnapshot(bookId, snapshot, 'resenhas');
  }

  async count(): Promise<number> {
    return this.bookModel.countDocuments().exec();
  }

  private async listCatalog(
    query: CatalogQuery,
    baseFilter: BookQueryFilter,
  ): Promise<ListBooksResult> {
    const filter: BookQueryFilter = { ...baseFilter };

    const conditions: Record<string, unknown>[] = [];

    if (query.q) {
      const regex = new RegExp(escapeRegExp(query.q), 'i');
      conditions.push({ $or: [{ title: regex }, { author: regex }] });
    }

    if (query.categories?.length) {
      filter.categorySlugs = { $in: query.categories };
    }

    if (query.editorias?.length) {
      filter.editorias = { $in: query.editorias };
    }

    // Especialista filtra tanto o que ele recomendou quanto o que resenhou.
    if (query.experts?.length) {
      conditions.push({
        $or: [
          { recommenderSlugs: { $in: query.experts } },
          { reviewerSlugs: { $in: query.experts } },
        ],
      });
    }

    if (query.hasReviews) {
      filter.reviewCount = { $gt: 0 };
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const sortOption = this.sortOptionFor(query);

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

  private sortOptionFor(query: CatalogQuery): Record<string, 1 | -1> {
    switch (query.sort) {
      case 'az':
        return { title: 1 };
      case 'za':
        return { title: -1 };
      case 'recomendados':
        // O DTO garante exatamente uma editoria neste caso.
        return { [`recommendedAt.${query.editorias![0]}`]: -1, createdAt: -1 };
      default:
        return { createdAt: -1 };
    }
  }

  private async setSnapshot(
    bookId: string,
    snapshot: RecommendationSnapshot | ReviewSnapshot,
    origin: string,
  ): Promise<void> {
    try {
      await this.bookModel.findByIdAndUpdate(bookId, snapshot).exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao sincronizar ${origin} do livro: bookId=${bookId} ${String(error)}`,
      );
    }
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
