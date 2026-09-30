import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { slugify } from 'src/common/lib/slugify';
import { BooksService } from 'src/modules/books/books.service';
import { isRecommendation } from 'src/modules/books/editorias';
import { ExpertsService } from 'src/modules/experts/experts.service';
import type { PublicExpert } from 'src/modules/experts/expert-response';
import type { CreateReviewDto } from 'src/modules/reviews/dto/create-review.dto';
import type { ListReviewsQueryDto } from 'src/modules/reviews/dto/list-reviews-query.dto';
import type { UpdateReviewDto } from 'src/modules/reviews/dto/update-review.dto';
import {
  toIndicatedBook,
  toReviewResponse,
  toReviewSummary,
  type BookIndicationResponse,
  type IndicatedBook,
  type ListReviewsResult,
  type ReviewResponse,
} from 'src/modules/reviews/review-response';
import {
  Review,
  type ReviewDocument,
  type ReviewIndication,
} from 'src/modules/reviews/schemas/review.schema';

const NOT_FOUND_MESSAGE = 'Resenha não encontrada';
const SLUG_FALLBACK = 'resenha';

const unique = (values: string[]) => [...new Set(values)];

const bookIdsOf = (indications: ReviewIndication[]) =>
  indications.map(({ bookId }) => bookId);

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
    await this.assertBooksExist(bookIdsOf(dto.indications));

    const weekly = dto.weekly ?? false;

    const created = await this.reviewModel.create({
      slug: await this.generateUniqueSlug(dto.editorialTitle),
      expertId: dto.expertId,
      editorialTitle: dto.editorialTitle,
      excerpt: dto.excerpt,
      content: dto.content,
      indications: dto.indications,
      weekly,
      podcast: dto.podcast ?? {},
      publishedAt: new Date(),
    });

    if (weekly) {
      await this.clearOtherWeeklyFlags(created._id.toString());
    }

    await this.syncSnapshots(bookIdsOf(dto.indications), [dto.expertId]);

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

  async findByBookId(bookId: string): Promise<BookIndicationResponse[]> {
    const reviews = await this.reviewModel
      .find({ 'indications.bookId': bookId })
      .sort({ publishedAt: -1 })
      .exec();

    const experts = await this.resolveExperts(
      reviews.map(({ expertId }) => expertId),
    );

    return reviews.flatMap((review) =>
      review.indications
        .filter((indication) => indication.bookId === bookId)
        .map(({ editoria }) => ({
          editoria,
          review: toReviewSummary(review),
          expert: experts.get(review.expertId) ?? null,
        })),
    );
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewResponse> {
    const review = await this.findDocument(id);

    if (dto.expertId !== undefined) {
      await this.expertsService.findById(dto.expertId);
    }

    if (dto.indications !== undefined) {
      await this.assertBooksExist(bookIdsOf(dto.indications));
    }

    // O slug não acompanha o título: links públicos da resenha precisam ser estáveis.
    const payload: Partial<Review> = {
      ...(dto.expertId !== undefined && { expertId: dto.expertId }),
      ...(dto.editorialTitle !== undefined && {
        editorialTitle: dto.editorialTitle,
      }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.indications !== undefined && { indications: dto.indications }),
      ...(dto.weekly !== undefined && { weekly: dto.weekly }),
      ...(dto.podcast !== undefined && { podcast: dto.podcast }),
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
      [...bookIdsOf(review.indications), ...bookIdsOf(updated.indications)],
      [review.expertId, updated.expertId],
    );

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const review = await this.findDocument(id);

    await this.reviewModel.findByIdAndDelete(id).exec();
    await this.syncSnapshots(bookIdsOf(review.indications), [review.expertId]);
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

  private async assertBooksExist(bookIds: string[]): Promise<void> {
    const ids = unique(bookIds);
    const books = await this.booksService.findByIds(ids);

    if (books.length !== ids.length) {
      throw new NotFoundException('Livro não encontrado');
    }
  }

  private async clearOtherWeeklyFlags(excludeReviewId: string): Promise<void> {
    await this.reviewModel
      .updateMany(
        { _id: { $ne: excludeReviewId }, weekly: true },
        { weekly: false },
      )
      .exec();
  }

  // Recalcula os contadores desnormalizados em livros e especialistas afetados.
  private async syncSnapshots(
    bookIds: string[],
    expertIds: string[],
  ): Promise<void> {
    await Promise.all([
      ...unique(bookIds).map((bookId) => this.syncBookSnapshot(bookId)),
      ...unique(expertIds).map(async (expertId) =>
        this.expertsService.setReviewCount(
          expertId,
          await this.reviewModel.countDocuments({ expertId }).exec(),
        ),
      ),
    ]);
  }

  private async syncBookSnapshot(bookId: string): Promise<void> {
    const reviews = await this.reviewModel
      .find({ 'indications.bookId': bookId })
      .exec();

    const indications = reviews.flatMap((review) =>
      review.indications
        .filter((indication) => indication.bookId === bookId)
        .map(({ editoria }) => ({ editoria, expertId: review.expertId })),
    );

    const experts = await this.expertsService.findByIds(
      unique(indications.map(({ expertId }) => expertId)),
    );
    const recommendationCount = indications.filter(({ editoria }) =>
      isRecommendation(editoria),
    ).length;

    await this.booksService.setIndicationSnapshot(bookId, {
      editorias: [...new Set(indications.map(({ editoria }) => editoria))],
      expertSlugs: experts.map(({ slug }) => slug),
      recommendationCount,
      disrecommendationCount: indications.length - recommendationCount,
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
      this.resolveBooks(reviews.flatMap(({ indications }) => indications)),
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
    indications: ReviewIndication[],
  ): Promise<Map<string, IndicatedBook>> {
    const books = await this.booksService.findByIds(
      unique(bookIdsOf(indications)),
    );
    return new Map(books.map((book) => [book._id, toIndicatedBook(book)]));
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
