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
import { Model, Types } from 'mongoose';
import type { BookResponse } from 'src/modules/books/book-response';
import { BooksService } from 'src/modules/books/books.service';
import type { CreateWishlistDto } from 'src/modules/wishlists/dto/create-wishlist.dto';
import type { WishlistSort } from 'src/modules/wishlists/dto/get-wishlist-query.dto';
import type { UpdateWishlistDto } from 'src/modules/wishlists/dto/update-wishlist.dto';
import {
  Wishlist,
  type WishlistDocument,
  type WishlistItem,
} from 'src/modules/wishlists/schemas/wishlist.schema';
import {
  toWishlistSummary,
  type WishlistDetail,
  type WishlistItemResponse,
  type WishlistSummary,
} from 'src/modules/wishlists/wishlist-response';

const DEFAULT_WISHLIST_NAME = 'Quero ler';

const PREVIEW_SIZE = 4;
const NOT_FOUND_MESSAGE = 'Lista não encontrada';
const DUPLICATE_NAME_MESSAGE = 'Você já tem uma lista com este nome';

const VERDICT_ORDER: Record<string, number> = {
  positive: 0,
  negative: 1,
};

const byAddedAtDesc = (a: { addedAt: Date }, b: { addedAt: Date }) =>
  b.addedAt.getTime() - a.addedAt.getTime();

const verdictRank = (book: BookResponse) =>
  book.verdict ? VERDICT_ORDER[book.verdict] : 2;

const ITEM_SORTERS: Record<
  WishlistSort,
  (a: WishlistItemResponse, b: WishlistItemResponse) => number
> = {
  recent: byAddedAtDesc,
  az: (a, b) => a.book.title.localeCompare(b.book.title, 'pt-BR'),
  verdict: (a, b) =>
    verdictRank(a.book) - verdictRank(b.book) || byAddedAtDesc(a, b),
};

@Injectable()
export class WishlistsService {
  private readonly logger = new Logger(WishlistsService.name);

  constructor(
    @InjectModel(Wishlist.name)
    private readonly wishlistModel: Model<WishlistDocument>,
    @Inject(forwardRef(() => BooksService))
    private readonly booksService: BooksService,
  ) {}

  async ensureDefault(ownerId: string): Promise<void> {
    await this.wishlistModel
      .updateOne(
        { owner: new Types.ObjectId(ownerId), isDefault: true },
        { $setOnInsert: { name: DEFAULT_WISHLIST_NAME, items: [] } },
        { upsert: true },
      )
      .exec();
  }

  async findAllByOwner(ownerId: string): Promise<WishlistSummary[]> {
    await this.ensureDefault(ownerId);

    const wishlists = await this.wishlistModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .sort({ isDefault: -1, updatedAt: -1 })
      .exec();

    return this.toSummaries(wishlists);
  }

  async getMembership(ownerId: string): Promise<Record<string, string[]>> {
    await this.ensureDefault(ownerId);

    const wishlists = await this.wishlistModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .select('items.book')
      .exec();

    const membership: Record<string, string[]> = {};

    for (const wishlist of wishlists) {
      for (const item of wishlist.items) {
        const bookId = item.book.toString();
        membership[bookId] = [
          ...(membership[bookId] ?? []),
          wishlist._id.toString(),
        ];
      }
    }

    return membership;
  }

  async create(
    ownerId: string,
    dto: CreateWishlistDto,
  ): Promise<WishlistSummary> {
    await this.assertNameAvailable(ownerId, dto.name);

    const created = await this.wishlistModel.create({
      owner: new Types.ObjectId(ownerId),
      name: dto.name,
      description: dto.description || undefined,
      isDefault: false,
      items: [],
    });

    return toWishlistSummary(created, []);
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateWishlistDto,
  ): Promise<WishlistSummary> {
    const wishlist = await this.findOwned(ownerId, id);

    if (dto.name !== undefined && dto.name !== wishlist.name) {
      await this.assertNameAvailable(ownerId, dto.name);
      wishlist.name = dto.name;
    }

    if (dto.description !== undefined) {
      wishlist.description = dto.description || undefined;
    }

    const saved = await wishlist.save();
    const [summary] = await this.toSummaries([saved]);

    return summary;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const wishlist = await this.findOwned(ownerId, id);

    if (wishlist.isDefault) {
      throw new BadRequestException(
        `A lista ${wishlist.name} é a sua lista padrão e não pode ser excluída`,
      );
    }

    await wishlist.deleteOne();
    this.logger.log(`Lista excluída: wishlistId=${id} ownerId=${ownerId}`);
  }

  async findOne(
    ownerId: string,
    id: string,
    sort: WishlistSort,
  ): Promise<WishlistDetail> {
    const wishlist = await this.findOwned(ownerId, id);
    const [detail] = await this.toDetails([wishlist], sort);

    return detail;
  }

  async findByOwnerForAdmin(ownerId: string): Promise<WishlistDetail[]> {
    const wishlists = await this.wishlistModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .sort({ isDefault: -1, updatedAt: -1 })
      .exec();

    return this.toDetails(wishlists, 'recent');
  }

  async addBook(ownerId: string, id: string, bookId: string): Promise<void> {
    await this.findOwned(ownerId, id);
    await this.booksService.findById(bookId);
    await this.pushItem(id, { book: new Types.ObjectId(bookId) });
  }

  async removeBook(ownerId: string, id: string, bookId: string): Promise<void> {
    await this.findOwned(ownerId, id);
    await this.pullItem(id, bookId);
  }

  async copyBook(
    ownerId: string,
    id: string,
    bookId: string,
    targetId: string,
  ): Promise<void> {
    if (id === targetId) {
      throw new BadRequestException('Escolha uma lista diferente da atual');
    }

    const source = await this.findOwned(ownerId, id);
    const item = source.items.find((entry) => entry.book.toString() === bookId);

    if (!item) {
      throw new NotFoundException('Este livro não está nesta lista');
    }

    await this.findOwned(ownerId, targetId);
    await this.pushItem(targetId, { book: item.book, addedAt: item.addedAt });
  }

  async moveBook(
    ownerId: string,
    id: string,
    bookId: string,
    targetId: string,
  ): Promise<void> {
    await this.copyBook(ownerId, id, bookId, targetId);
    await this.pullItem(id, bookId);
  }

  async pullBook(bookId: string): Promise<void> {
    await this.wishlistModel
      .updateMany(
        { 'items.book': new Types.ObjectId(bookId) },
        { $pull: { items: { book: new Types.ObjectId(bookId) } } },
      )
      .exec();
  }

  private async findOwned(
    ownerId: string,
    id: string,
  ): Promise<WishlistDocument> {
    const wishlist = await this.wishlistModel
      .findOne({ _id: id, owner: new Types.ObjectId(ownerId) })
      .exec();

    if (!wishlist) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return wishlist;
  }

  private async assertNameAvailable(
    ownerId: string,
    name: string,
  ): Promise<void> {
    const existing = await this.wishlistModel
      .exists({ owner: new Types.ObjectId(ownerId), name })
      .exec();

    if (existing) {
      throw new ConflictException(DUPLICATE_NAME_MESSAGE);
    }
  }

  // O filtro com $ne torna a inclusão idempotente e atômica.
  private async pushItem(
    id: string,
    item: Pick<WishlistItem, 'book'> & Partial<Pick<WishlistItem, 'addedAt'>>,
  ): Promise<void> {
    await this.wishlistModel
      .updateOne(
        { _id: id, 'items.book': { $ne: item.book } },
        {
          $push: {
            items: { book: item.book, addedAt: item.addedAt ?? new Date() },
          },
        },
      )
      .exec();
  }

  private async pullItem(id: string, bookId: string): Promise<void> {
    await this.wishlistModel
      .updateOne(
        { _id: id },
        { $pull: { items: { book: new Types.ObjectId(bookId) } } },
      )
      .exec();
  }

  private async resolveBooks(
    bookIds: Types.ObjectId[],
  ): Promise<Map<string, BookResponse>> {
    const uniqueIds = [...new Set(bookIds.map((id) => id.toString()))];
    const books = await this.booksService.findByIds(uniqueIds);

    return new Map(books.map((book) => [book._id, book]));
  }

  private async toSummaries(
    wishlists: WishlistDocument[],
  ): Promise<WishlistSummary[]> {
    const books = await this.resolveBooks(
      wishlists.flatMap((wishlist) =>
        this.previewItems(wishlist).map((item) => item.book),
      ),
    );

    return wishlists.map((wishlist) => this.toSummary(wishlist, books));
  }

  private async toDetails(
    wishlists: WishlistDocument[],
    sort: WishlistSort,
  ): Promise<WishlistDetail[]> {
    const books = await this.resolveBooks(
      wishlists.flatMap((wishlist) => wishlist.items.map((item) => item.book)),
    );

    return wishlists.map((wishlist) => ({
      ...this.toSummary(wishlist, books),
      items: wishlist.items
        .map((item) => ({
          book: books.get(item.book.toString()),
          addedAt: item.addedAt,
        }))
        .filter((item): item is WishlistItemResponse => Boolean(item.book))
        .sort(ITEM_SORTERS[sort]),
    }));
  }

  private previewItems(wishlist: WishlistDocument): WishlistItem[] {
    return [...wishlist.items].sort(byAddedAtDesc).slice(0, PREVIEW_SIZE);
  }

  private toSummary(
    wishlist: WishlistDocument,
    books: Map<string, BookResponse>,
  ): WishlistSummary {
    const previewBooks = this.previewItems(wishlist)
      .map((item) => books.get(item.book.toString()))
      .filter((book): book is BookResponse => Boolean(book))
      .map(({ _id, title, author, coverSrc }) => ({
        _id,
        title,
        author,
        coverSrc,
      }));

    return toWishlistSummary(wishlist, previewBooks);
  }
}
