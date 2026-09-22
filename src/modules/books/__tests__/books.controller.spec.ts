import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from 'src/modules/books/books.controller';
import { BooksService } from 'src/modules/books/books.service';

describe('BooksController', () => {
  let controller: BooksController;

  const mockBooksService = {
    findAll: jest.fn(),
    findRelated: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadCover: jest.fn(),
    removeCover: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: mockBooksService }],
    }).compile();

    controller = module.get(BooksController);
    jest.clearAllMocks();
  });

  it('deve listar livros via service', async () => {
    const result = {
      items: [],
      total: 0,
      totalPages: 1,
      page: 1,
      pageSize: 12,
    };
    mockBooksService.findAll.mockResolvedValue(result);

    await expect(
      controller.findAll({ sort: 'recentes', page: 1, pageSize: 12 }),
    ).resolves.toEqual(result);
  });

  it('deve buscar livros relacionados via service', async () => {
    mockBooksService.findRelated.mockResolvedValue([]);

    await expect(controller.findRelated('slug')).resolves.toEqual([]);
    expect(mockBooksService.findRelated).toHaveBeenCalledWith('slug');
  });

  it('deve buscar livro por slug via service', async () => {
    const book = { _id: '1', slug: 'slug' };
    mockBooksService.findBySlug.mockResolvedValue(book);

    await expect(controller.findBySlug('slug')).resolves.toEqual(book);
  });

  it('deve criar livro via service', async () => {
    const dto = {
      title: 'Livro',
      author: 'Autor',
      year: 2000,
      pages: 100,
      categorySlugs: [],
    };
    const created = { _id: '1', ...dto };
    mockBooksService.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toEqual(created);
  });

  it('deve atualizar livro via service', async () => {
    const updated = { _id: '1', title: 'Novo título' };
    mockBooksService.update.mockResolvedValue(updated);

    await expect(
      controller.update('1', { title: 'Novo título' }),
    ).resolves.toEqual(updated);
  });

  it('deve remover livro via service', async () => {
    mockBooksService.remove.mockResolvedValue(undefined);

    await expect(controller.remove('1')).resolves.toBeUndefined();
    expect(mockBooksService.remove).toHaveBeenCalledWith('1');
  });

  it('deve lançar BadRequestException ao enviar capa sem arquivo', () => {
    expect(() => controller.uploadCover('1', undefined)).toThrow(
      BadRequestException,
    );
    expect(mockBooksService.uploadCover).not.toHaveBeenCalled();
  });

  it('deve enviar a capa via service quando o arquivo estiver presente', async () => {
    const file = { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' };
    const updated = { _id: '1', coverSrc: 'https://bucket/cover.jpg' };
    mockBooksService.uploadCover.mockResolvedValue(updated);

    await expect(
      controller.uploadCover('1', file as Express.Multer.File),
    ).resolves.toEqual(updated);
    expect(mockBooksService.uploadCover).toHaveBeenCalledWith('1', file);
  });

  it('deve remover a capa via service', async () => {
    const updated = { _id: '1', coverSrc: null };
    mockBooksService.removeCover.mockResolvedValue(updated);

    await expect(controller.removeCover('1')).resolves.toEqual(updated);
  });
});
