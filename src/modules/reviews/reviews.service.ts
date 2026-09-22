import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BooksService } from 'src/modules/books/books.service';
import type { BookResponse } from 'src/modules/books/book-response';
import type { CreateReviewDto } from 'src/modules/reviews/dto/create-review.dto';
import type { UpdateReviewDto } from 'src/modules/reviews/dto/update-review.dto';
import {
  Review,
  type ReviewDocument,
} from 'src/modules/reviews/schemas/review.schema';

export type WeeklyHighlight = {
  review: ReviewDocument;
  book: BookResponse;
};

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    private readonly booksService: BooksService,
  ) {}

  async create(dto: CreateReviewDto): Promise<ReviewDocument> {
    await this.booksService.findById(dto.bookId);

    const existing = await this.reviewModel
      .findOne({ bookId: dto.bookId })
      .exec();

    if (existing) {
      throw new ConflictException('Este livro já possui uma resenha');
    }

    const publishedAt = new Date();
    const weekly = dto.weekly ?? false;
    const podcast = dto.podcast ?? {};

    const created = await this.reviewModel.create({
      bookId: dto.bookId,
      editorialTitle: dto.editorialTitle ?? null,
      excerpt: dto.excerpt,
      content: dto.content,
      verdict: dto.verdict,
      weekly,
      podcast,
      publishedAt,
    });

    if (weekly) {
      await this.clearOtherWeeklyFlags(created._id.toString());
    }

    await this.booksService.setReviewSnapshot(dto.bookId, {
      reviewId: created._id.toString(),
      verdict: created.verdict,
      weekly: created.weekly,
      publishedAt,
    });

    return created;
  }

  async findAll(): Promise<ReviewDocument[]> {
    return this.reviewModel.find().sort({ publishedAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id).exec();

    if (!review) {
      throw new NotFoundException('Resenha não encontrada');
    }

    return review;
  }

  async findByBookId(bookId: string): Promise<ReviewDocument | null> {
    return this.reviewModel.findOne({ bookId }).exec();
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewDocument> {
    const review = await this.findOne(id);

    const payload: Partial<Review> = {
      ...(dto.editorialTitle !== undefined && {
        editorialTitle: dto.editorialTitle,
      }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.verdict !== undefined && { verdict: dto.verdict }),
      ...(dto.weekly !== undefined && { weekly: dto.weekly }),
      ...(dto.podcast !== undefined && { podcast: dto.podcast }),
    };

    const updated = await this.reviewModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Resenha não encontrada');
    }

    if (dto.weekly === true) {
      await this.clearOtherWeeklyFlags(id);
    }

    await this.booksService.setReviewSnapshot(review.bookId, {
      reviewId: id,
      verdict: updated.verdict,
      weekly: updated.weekly,
      publishedAt: updated.publishedAt,
    });

    return updated;
  }

  async remove(id: string): Promise<void> {
    const review = await this.findOne(id);

    await this.reviewModel.findByIdAndDelete(id).exec();
    await this.booksService.clearReviewSnapshot(review.bookId);
  }

  async getWeeklyHighlight(): Promise<WeeklyHighlight | null> {
    const review = await this.reviewModel.findOne({ weekly: true }).exec();

    if (!review) {
      return null;
    }

    const book = await this.booksService.findByIdResponse(review.bookId);

    return { review, book };
  }

  async count(): Promise<number> {
    return this.reviewModel.countDocuments().exec();
  }

  private async clearOtherWeeklyFlags(excludeReviewId: string): Promise<void> {
    const previouslyWeekly = await this.reviewModel
      .findOne({ weekly: true, _id: { $ne: excludeReviewId } })
      .exec();

    if (!previouslyWeekly) {
      return;
    }

    await this.reviewModel
      .updateMany(
        { _id: { $ne: excludeReviewId }, weekly: true },
        { weekly: false },
      )
      .exec();

    await this.booksService.setWeeklyFlag(previouslyWeekly.bookId, false);
  }
}
