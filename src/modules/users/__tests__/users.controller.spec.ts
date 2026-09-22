import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get(UsersController);
    jest.clearAllMocks();
  });

  it('deve criar um usuário via service', async () => {
    const dto = {
      name: 'Ana',
      email: 'ana@example.com',
      password: 'senha123',
      role: 'user' as const,
    };
    const created = {
      _id: '1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'user',
      active: true,
      mustChangePassword: false,
    };
    mockUsersService.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toEqual(created);
    expect(mockUsersService.create).toHaveBeenCalledWith(dto);
  });

  it('deve listar usuários com filtros via service', async () => {
    const users = [{ _id: '1', name: 'Ana', role: 'user', active: true }];
    mockUsersService.findAll.mockResolvedValue(users);

    await expect(
      controller.findAll({ role: 'user', active: true }),
    ).resolves.toEqual(users);
    expect(mockUsersService.findAll).toHaveBeenCalledWith({
      role: 'user',
      active: true,
    });
  });

  it('deve buscar um usuário por id', async () => {
    const user = { _id: '507f1f77bcf86cd799439011', name: 'Ana' };
    mockUsersService.findOne.mockResolvedValue(user);

    await expect(
      controller.findOne('507f1f77bcf86cd799439011'),
    ).resolves.toEqual(user);
  });

  it('deve resetar senha via service', async () => {
    mockUsersService.resetPassword.mockResolvedValue({
      temporaryPassword: 'senha-provisoria',
    });

    await expect(
      controller.resetPassword('507f1f77bcf86cd799439011'),
    ).resolves.toEqual({ temporaryPassword: 'senha-provisoria' });
    expect(mockUsersService.resetPassword).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
  });
});
