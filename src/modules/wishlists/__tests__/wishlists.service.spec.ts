import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BooksService } from 'src/modules/books/books.service';
import { Wishlist } from 'src/modules/wishlists/schemas/wishlist.schema';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

function execOf<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

const OWNER_ID = '507f1f77bcf86cd799439011';
const LIST_ID = '507f1f77bcf86cd799439012';
const TARGET_ID = '507f1f77bcf86cd799439013';
const BOOK_A = '507f1f77bcf86cd7994390aa';
const BOOK_B = '507f1f77bcf86cd7994390bb';
const BOOK_C = '507f1f77bcf86cd7994390cc';

const bookResponse = (
  id: string,
  title: string,
  verdict: 'positive' | 'negative' | null,
) => ({
  _id: id,
  title,
  author: 'Autor',
  coverSrc: null,
  verdict,
});

const makeList = (
  overrides: Partial<{
    _id: string;
    isDefault: boolean;
    items: Array<{ book: string; addedAt: Date }>;
  }> = {},
) => {
  const items = (overrides.items ?? []).map((item) => ({
    book: new Types.ObjectId(item.book),
    addedAt: item.addedAt,
  }));

  return {
    _id: { toString: () => overrides._id ?? LIST_ID },
    name: 'Presentes',
    description: undefined,
    isDefault: overrides.isDefault ?? false,
    items,
    updatedAt: new Date('2026-09-01'),
    save: jest.fn(),
    deleteOne: jest.fn(),
  };
};

describe('WishlistsService', () => {
  let service: WishlistsService;

  const mockWishlistModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockBooksService = {
    findById: jest.fn(),
    findByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistsService,
        { provide: getModelToken(Wishlist.name), useValue: mockWishlistModel },
        { provide: BooksService, useValue: mockBooksService },
      ],
    }).compile();

    service = module.get(WishlistsService);
    jest.clearAllMocks();
    mockWishlistModel.updateOne.mockReturnValue(execOf({}));
    mockBooksService.findByIds.mockResolvedValue([]);
  });

  describe('ensureDefault', () => {
    it('deve fazer upsert idempotente da lista "Quero ler"', async () => {
      await service.ensureDefault(OWNER_ID);
      await service.ensureDefault(OWNER_ID);

      expect(mockWishlistModel.updateOne).toHaveBeenCalledTimes(2);
      expect(mockWishlistModel.updateOne).toHaveBeenCalledWith(
        { owner: new Types.ObjectId(OWNER_ID), isDefault: true },
        { $setOnInsert: { name: 'Quero ler', items: [] } },
        { upsert: true },
      );
    });
  });

  describe('findAllByOwner', () => {
    it('deve garantir a lista padrão e montar prévia com até 4 livros recentes', async () => {
      const list = makeList({
        isDefault: true,
        items: [
          { book: BOOK_A, addedAt: new Date('2026-01-01') },
          { book: BOOK_B, addedAt: new Date('2026-03-01') },
        ],
      });
      mockWishlistModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(execOf([list])),
      });
      mockBooksService.findByIds.mockResolvedValue([
        bookResponse(BOOK_A, 'Alfa', null),
        bookResponse(BOOK_B, 'Beta', null),
      ]);

      const [summary] = await service.findAllByOwner(OWNER_ID);

      expect(mockWishlistModel.updateOne).toHaveBeenCalled();
      expect(summary).toMatchObject({
        _id: LIST_ID,
        isDefault: true,
        bookCount: 2,
        description: null,
      });
      expect(summary.previewBooks.map((book) => book.title)).toEqual([
        'Beta',
        'Alfa',
      ]);
    });
  });

  describe('getMembership', () => {
    it('deve mapear cada livro para as listas que o contêm', async () => {
      mockWishlistModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue(
          execOf([
            makeList({
              _id: LIST_ID,
              items: [{ book: BOOK_A, addedAt: new Date() }],
            }),
            makeList({
              _id: TARGET_ID,
              items: [{ book: BOOK_A, addedAt: new Date() }],
            }),
          ]),
        ),
      });

      await expect(service.getMembership(OWNER_ID)).resolves.toEqual({
        [BOOK_A]: [LIST_ID, TARGET_ID],
      });
    });
  });

  describe('create', () => {
    it('deve lançar 409 quando já existe lista com o mesmo nome', async () => {
      mockWishlistModel.exists.mockReturnValue(execOf({ _id: LIST_ID }));

      await expect(
        service.create(OWNER_ID, { name: 'Presentes' }),
      ).rejects.toThrow(ConflictException);
      expect(mockWishlistModel.create).not.toHaveBeenCalled();
    });

    it('deve criar a lista vazia', async () => {
      mockWishlistModel.exists.mockReturnValue(execOf(null));
      mockWishlistModel.create.mockResolvedValue(makeList());

      const result = await service.create(OWNER_ID, {
        name: 'Presentes',
        description: 'Para o Natal',
      });

      expect(mockWishlistModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Presentes',
          description: 'Para o Natal',
          isDefault: false,
          items: [],
        }),
      );
      expect(result.bookCount).toBe(0);
    });
  });

  describe('remove', () => {
    it('deve devolver 404 para lista de outra pessoa', async () => {
      mockWishlistModel.findOne.mockReturnValue(execOf(null));

      await expect(service.remove(OWNER_ID, LIST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('não deve excluir a lista padrão', async () => {
      const list = makeList({ isDefault: true });
      mockWishlistModel.findOne.mockReturnValue(execOf(list));

      await expect(service.remove(OWNER_ID, LIST_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(list.deleteOne).not.toHaveBeenCalled();
    });

    it('deve excluir uma lista comum', async () => {
      const list = makeList();
      mockWishlistModel.findOne.mockReturnValue(execOf(list));

      await service.remove(OWNER_ID, LIST_ID);

      expect(list.deleteOne).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const items = [
      { book: BOOK_A, addedAt: new Date('2026-01-01') },
      { book: BOOK_B, addedAt: new Date('2026-02-01') },
      { book: BOOK_C, addedAt: new Date('2026-03-01') },
    ];

    beforeEach(() => {
      mockWishlistModel.findOne.mockReturnValue(execOf(makeList({ items })));
      mockBooksService.findByIds.mockResolvedValue([
        bookResponse(BOOK_A, 'Carvão', 'negative'),
        bookResponse(BOOK_B, 'Amora', null),
        bookResponse(BOOK_C, 'Brasa', 'positive'),
      ]);
    });

    it('deve ordenar por adicionados recentemente', async () => {
      const result = await service.findOne(OWNER_ID, LIST_ID, 'recent');

      expect(result.items.map((item) => item.book.title)).toEqual([
        'Brasa',
        'Amora',
        'Carvão',
      ]);
    });

    it('deve ordenar de A a Z', async () => {
      const result = await service.findOne(OWNER_ID, LIST_ID, 'az');

      expect(result.items.map((item) => item.book.title)).toEqual([
        'Amora',
        'Brasa',
        'Carvão',
      ]);
    });

    it('deve ordenar por veredito: positivo, negativo e sem resenha', async () => {
      const result = await service.findOne(OWNER_ID, LIST_ID, 'verdict');

      expect(result.items.map((item) => item.book.title)).toEqual([
        'Brasa',
        'Carvão',
        'Amora',
      ]);
    });
  });

  describe('addBook', () => {
    it('deve devolver 404 quando o livro não existe', async () => {
      mockWishlistModel.findOne.mockReturnValue(execOf(makeList()));
      mockBooksService.findById.mockRejectedValue(
        new NotFoundException('Livro não encontrado'),
      );

      await expect(service.addBook(OWNER_ID, LIST_ID, BOOK_A)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockWishlistModel.updateOne).not.toHaveBeenCalled();
    });

    it('deve adicionar com filtro que impede duplicidade', async () => {
      mockWishlistModel.findOne.mockReturnValue(execOf(makeList()));
      mockBooksService.findById.mockResolvedValue({});

      await service.addBook(OWNER_ID, LIST_ID, BOOK_A);

      const [filter, update] = mockWishlistModel.updateOne.mock.calls[0] as [
        { 'items.book': { $ne: Types.ObjectId } },
        { $push: { items: { book: Types.ObjectId; addedAt: Date } } },
      ];
      expect(filter['items.book'].$ne.toString()).toBe(BOOK_A);
      expect(update.$push.items.book.toString()).toBe(BOOK_A);
      expect(update.$push.items.addedAt).toBeInstanceOf(Date);
    });
  });

  describe('copyBook / moveBook', () => {
    const addedAt = new Date('2026-01-15');

    it('deve recusar origem igual ao destino', async () => {
      await expect(
        service.copyBook(OWNER_ID, LIST_ID, BOOK_A, LIST_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve devolver 404 quando o livro não está na origem', async () => {
      mockWishlistModel.findOne.mockReturnValue(execOf(makeList()));

      await expect(
        service.copyBook(OWNER_ID, LIST_ID, BOOK_A, TARGET_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve copiar preservando a data de adição original', async () => {
      mockWishlistModel.findOne
        .mockReturnValueOnce(
          execOf(makeList({ items: [{ book: BOOK_A, addedAt }] })),
        )
        .mockReturnValueOnce(execOf(makeList({ _id: TARGET_ID })));

      await service.copyBook(OWNER_ID, LIST_ID, BOOK_A, TARGET_ID);

      expect(mockWishlistModel.updateOne).toHaveBeenCalledTimes(1);
      const [filter, update] = mockWishlistModel.updateOne.mock.calls[0] as [
        { _id: string },
        { $push: { items: { addedAt: Date } } },
      ];
      expect(filter._id).toBe(TARGET_ID);
      expect(update.$push.items.addedAt).toBe(addedAt);
    });

    it('deve mover: copiar para o destino e tirar da origem', async () => {
      mockWishlistModel.findOne
        .mockReturnValueOnce(
          execOf(makeList({ items: [{ book: BOOK_A, addedAt }] })),
        )
        .mockReturnValueOnce(execOf(makeList({ _id: TARGET_ID })));

      await service.moveBook(OWNER_ID, LIST_ID, BOOK_A, TARGET_ID);

      expect(mockWishlistModel.updateOne).toHaveBeenCalledTimes(2);
      const [pullFilter, pullUpdate] = mockWishlistModel.updateOne.mock
        .calls[1] as [
        { _id: string },
        { $pull: { items: { book: Types.ObjectId } } },
      ];
      expect(pullFilter._id).toBe(LIST_ID);
      expect(pullUpdate.$pull.items.book.toString()).toBe(BOOK_A);
    });
  });

  describe('pullBook', () => {
    it('deve tirar o livro de todas as listas', async () => {
      mockWishlistModel.updateMany.mockReturnValue(execOf({}));

      await service.pullBook(BOOK_A);

      const [filter] = mockWishlistModel.updateMany.mock.calls[0] as [
        { 'items.book': Types.ObjectId },
      ];
      expect(filter['items.book'].toString()).toBe(BOOK_A);
    });
  });
});
