import { Test, TestingModule } from '@nestjs/testing';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import { WishlistsController } from 'src/modules/wishlists/wishlists.controller';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

describe('WishlistsController', () => {
  let controller: WishlistsController;

  const user: JwtPayload = {
    sub: 'user-1',
    email: 'ana@example.com',
    role: 'user',
    mustChangePassword: false,
  };

  const mockWishlistsService = {
    findAllByOwner: jest.fn(),
    getMembership: jest.fn(),
    findByOwnerForAdmin: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addBook: jest.fn(),
    removeBook: jest.fn(),
    copyBook: jest.fn(),
    moveBook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistsController],
      providers: [
        { provide: WishlistsService, useValue: mockWishlistsService },
      ],
    }).compile();

    controller = module.get(WishlistsController);
    jest.clearAllMocks();
  });

  it('deve listar as listas da pessoa logada', async () => {
    mockWishlistsService.findAllByOwner.mockResolvedValue([]);

    await expect(controller.findAll(user)).resolves.toEqual([]);
    expect(mockWishlistsService.findAllByOwner).toHaveBeenCalledWith('user-1');
  });

  it('deve buscar uma lista com a ordenação pedida', async () => {
    await controller.findOne(user, 'list-1', { sort: 'az' });

    expect(mockWishlistsService.findOne).toHaveBeenCalledWith(
      'user-1',
      'list-1',
      'az',
    );
  });

  it('deve adicionar e remover livros no escopo da pessoa logada', async () => {
    await controller.addBook(user, 'list-1', 'book-1');
    await controller.removeBook(user, 'list-1', 'book-1');

    expect(mockWishlistsService.addBook).toHaveBeenCalledWith(
      'user-1',
      'list-1',
      'book-1',
    );
    expect(mockWishlistsService.removeBook).toHaveBeenCalledWith(
      'user-1',
      'list-1',
      'book-1',
    );
  });

  it('deve mover e copiar para a lista de destino', async () => {
    await controller.moveBook(user, 'list-1', 'book-1', { targetId: 'list-2' });
    await controller.copyBook(user, 'list-1', 'book-1', { targetId: 'list-2' });

    expect(mockWishlistsService.moveBook).toHaveBeenCalledWith(
      'user-1',
      'list-1',
      'book-1',
      'list-2',
    );
    expect(mockWishlistsService.copyBook).toHaveBeenCalledWith(
      'user-1',
      'list-1',
      'book-1',
      'list-2',
    );
  });

  it('deve listar as listas de um usuário para o admin', async () => {
    await controller.findByOwner('user-2');

    expect(mockWishlistsService.findByOwnerForAdmin).toHaveBeenCalledWith(
      'user-2',
    );
  });
});
