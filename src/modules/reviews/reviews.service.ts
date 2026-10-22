import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { slugify } from 'src/common/lib/slugify';
import {
  toBookSummary,
  type BookSummary,
} from 'src/modules/books/book-response';
import { BooksService } from 'src/modules/books/books.service';
import { ExpertsService } from 'src/modules/experts/experts.service';
import type { PublicExpert } from 'src/modules/experts/expert-response';
import type { CreateReviewDto } from 'src/modules/reviews/dto/create-review.dto';
import type { ListReviewsQueryDto } from 'src/modules/reviews/dto/list-reviews-query.dto';
import type { UpdateReviewDto } from 'src/modules/reviews/dto/update-review.dto';
import {
  toReviewResponse,
  type ListReviewsResult,
  type ReviewResponse,
} from 'src/modules/reviews/review-response';
import {
  Review,
  type ReviewDocument,
} from 'src/modules/reviews/schemas/review.schema';

const NOT_FOUND_MESSAGE = 'Resenha não encontrada';
const SLUG_FALLBACK = 'resenha';

const unique = (values: string[]) => [...new Set(values)];

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    private readonly booksService: BooksService,
    private readonly expertsService: ExpertsService,
  ) {}

  async create(dto: CreateReviewDto): Promise<ReviewResponse> {
    await this.expertsService.findById(dto.expertId);
    await this.booksService.findById(dto.bookId);

    const weekly = dto.weekly ?? false;

    const created = await this.reviewModel.create({
      slug: await this.generateUniqueSlug(dto.editorialTitle),
      expertId: dto.expertId,
      bookId: dto.bookId,
      editorialTitle: dto.editorialTitle,
      excerpt: dto.excerpt,
      content: dto.content,
      weekly,
      publishedAt: new Date(),
    });

    if (weekly) {
      await this.clearOtherWeeklyFlags(created._id.toString());
    }

    await this.syncSnapshots([dto.bookId], [dto.expertId]);

    return this.toResponse(created);
  }

  async findAll(query: ListReviewsQueryDto): Promise<ListReviewsResult> {
    const filter: Record<string, unknown> = {};

    if (query.experts?.length) {
      const experts = await this.expertsService.findBySlugs(query.experts);
      filter.expertId = { $in: experts.map((expert) => expert._id.toString()) };
    }

    const total = await this.reviewModel.countDocuments(filter).exec();
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    const reviews = await this.reviewModel
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .exec();

    return {
      items: await this.toResponseList(reviews),
      total,
      totalPages,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string): Promise<ReviewResponse> {
    return this.toResponse(await this.findDocument(id));
  }

  async findBySlug(slug: string): Promise<ReviewResponse> {
    const review = await this.reviewModel.findOne({ slug }).exec();

    if (!review) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return this.toResponse(review);
  }

  async findByBookId(bookId: string): Promise<ReviewResponse[]> {
    const reviews = await this.reviewModel
      .find({ bookId })
      .sort({ publishedAt: -1 })
      .exec();

    return this.toResponseList(reviews);
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewResponse> {
    const review = await this.findDocument(id);

    if (dto.expertId !== undefined) {
      await this.expertsService.findById(dto.expertId);
    }

    if (dto.bookId !== undefined) {
      await this.booksService.findById(dto.bookId);
    }

    // O slug não acompanha o título: links públicos da resenha precisam ser estáveis.
    const payload: Partial<Review> = {
      ...(dto.expertId !== undefined && { expertId: dto.expertId }),
      ...(dto.bookId !== undefined && { bookId: dto.bookId }),
      ...(dto.editorialTitle !== undefined && {
        editorialTitle: dto.editorialTitle,
      }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.weekly !== undefined && { weekly: dto.weekly }),
    };

    const updated = await this.reviewModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    if (dto.weekly === true) {
      await this.clearOtherWeeklyFlags(id);
    }

    await this.syncSnapshots(
      [review.bookId, updated.bookId],
      [review.expertId, updated.expertId],
    );

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const review = await this.findDocument(id);

    await this.reviewModel.findByIdAndDelete(id).exec();
    await this.syncSnapshots([review.bookId], [review.expertId]);
  }

  async getWeeklyHighlight(): Promise<ReviewResponse | null> {
    const review = await this.reviewModel.findOne({ weekly: true }).exec();

    return review ? this.toResponse(review) : null;
  }

  async count(): Promise<number> {
    return this.reviewModel.countDocuments().exec();
  }

  private async findDocument(id: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id).exec();

    if (!review) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return review;
  }

  private async clearOtherWeeklyFlags(excludeReviewId: string): Promise<void> {
    await this.reviewModel
      .updateMany(
        { _id: { $ne: excludeReviewId }, weekly: true },
        { weekly: false },
      )
      .exec();
  }

  // Recalcula os snapshots de resenha em livros e especialistas afetados.
  private async syncSnapshots(
    bookIds: string[],
    expertIds: string[],
  ): Promise<void> {
    await Promise.all([
      ...unique(bookIds).map((bookId) => this.syncBookSnapshot(bookId)),
      ...unique(expertIds).map(async (expertId) =>
        this.expertsService.setCounter(
          expertId,
          'reviewCount',
          await this.reviewModel.countDocuments({ expertId }).exec(),
        ),
      ),
    ]);
  }

  private async syncBookSnapshot(bookId: string): Promise<void> {
    const reviews = await this.reviewModel.find({ bookId }).exec();
    const experts = await this.expertsService.findByIds(
      unique(reviews.map(({ expertId }) => expertId)),
    );

    await this.booksService.setReviewSnapshot(bookId, {
      reviewerSlugs: experts.map(({ slug }) => slug),
      reviewCount: reviews.length,
    });
  }

  private async toResponse(review: ReviewDocument): Promise<ReviewResponse> {
    const [response] = await this.toResponseList([review]);
    return response;
  }

  private async toResponseList(
    reviews: ReviewDocument[],
  ): Promise<ReviewResponse[]> {
    const [experts, books] = await Promise.all([
      this.resolveExperts(reviews.map(({ expertId }) => expertId)),
      this.resolveBooks(reviews.map(({ bookId }) => bookId)),
    ]);

    return reviews.map((review) => toReviewResponse(review, experts, books));
  }

  private async resolveExperts(
    expertIds: string[],
  ): Promise<Map<string, PublicExpert>> {
    const experts = await this.expertsService.findByIds(unique(expertIds));
    return new Map(experts.map((expert) => [expert._id, expert]));
  }

  private async resolveBooks(
    bookIds: string[],
  ): Promise<Map<string, BookSummary>> {
    const books = await this.booksService.findByIds(unique(bookIds));
    return new Map(books.map((book) => [book._id, toBookSummary(book)]));
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || SLUG_FALLBACK;
    let candidate = base;
    let suffix = 2;

    while (await this.reviewModel.exists({ slug: candidate }).exec()) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
