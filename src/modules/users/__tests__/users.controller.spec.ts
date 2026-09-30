import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateByAdmin: jest.fn(),
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

  it('deve listar usuários com filtros e paginação via service', async () => {
    const result = {
      items: [{ _id: '1', name: 'Ana', role: 'user', active: true }],
      total: 1,
      totalPages: 1,
      page: 1,
      pageSize: 20,
    };
    mockUsersService.findAll.mockResolvedValue(result);
    const query = {
      role: 'user' as const,
      active: true,
      q: 'ana',
      page: 1,
      pageSize: 20,
    };

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
  });

  it('deve atualizar como admin repassando o id de quem age', async () => {
    const updated = { _id: '507f1f77bcf86cd799439011', active: false };
    mockUsersService.updateByAdmin.mockResolvedValue(updated);

    await expect(
      controller.update(
        {
          sub: 'admin-1',
          email: 'admin@example.com',
          role: 'admin',
          mustChangePassword: false,
        },
        '507f1f77bcf86cd799439011',
        { active: false },
      ),
    ).resolves.toEqual(updated);
    expect(mockUsersService.updateByAdmin).toHaveBeenCalledWith(
      'admin-1',
      '507f1f77bcf86cd799439011',
      { active: false },
    );
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
