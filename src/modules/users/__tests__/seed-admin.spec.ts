import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { seedAdmin } from 'src/modules/users/seed-admin';
import { UsersService } from 'src/modules/users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('seedAdmin', () => {
  const findByEmailWithPassword = jest.fn();
  const create = jest.fn();

  const mockUsersService = {
    findByEmailWithPassword,
    create,
  } as unknown as UsersService;

  function configWith(values: Record<string, string | undefined>) {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria admin quando o e-mail não existe', async () => {
    findByEmailWithPassword.mockResolvedValue(null);
    create.mockResolvedValue({});

    const result = await seedAdmin(
      mockUsersService,
      configWith({
        SEED_ADMIN_EMAIL: 'admin@example.com',
        SEED_ADMIN_NAME: 'Admin',
        SEED_ADMIN_PASSWORD: 'senha-segura',
      }),
    );

    expect(result).toBe('created');
    expect(create).toHaveBeenCalledWith({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'senha-segura',
      role: 'admin',
    });
  });

  it('não cria duplicata nem altera senha quando o e-mail já existe', async () => {
    findByEmailWithPassword.mockResolvedValue({
      email: 'admin@example.com',
      password: 'hash-existente',
    });

    const result = await seedAdmin(
      mockUsersService,
      configWith({
        SEED_ADMIN_EMAIL: 'admin@example.com',
        SEED_ADMIN_NAME: 'Admin',
        SEED_ADMIN_PASSWORD: 'nova-senha',
      }),
    );

    expect(result).toBe('skipped');
    expect(create).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('falha com mensagem explícita sem SEED_ADMIN_EMAIL', async () => {
    await expect(
      seedAdmin(
        mockUsersService,
        configWith({
          SEED_ADMIN_NAME: 'Admin',
          SEED_ADMIN_PASSWORD: 'senha-segura',
        }),
      ),
    ).rejects.toThrow('SEED_ADMIN_EMAIL não está definido');

    expect(create).not.toHaveBeenCalled();
  });

  it('falha quando name ou password estão ausentes', async () => {
    await expect(
      seedAdmin(
        mockUsersService,
        configWith({
          SEED_ADMIN_EMAIL: 'admin@example.com',
          SEED_ADMIN_NAME: '',
          SEED_ADMIN_PASSWORD: 'senha-segura',
        }),
      ),
    ).rejects.toThrow('SEED_ADMIN_NAME e SEED_ADMIN_PASSWORD são obrigatórios');

    expect(create).not.toHaveBeenCalled();
  });
});

describe('seedAdmin integração com UsersService.create', () => {
  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  let usersService: UsersService;

  function execOf<T>(value: T) {
    return { exec: jest.fn().mockResolvedValue(value) };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    usersService = new UsersService(mockUserModel as never);
  });

  it('persiste admin com senha em hash via create', async () => {
    mockUserModel.findOne.mockReturnValue(execOf(null));
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockUserModel.create.mockResolvedValue({
      _id: { toString: () => '1' },
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      active: true,
      mustChangePassword: false,
    });

    const created = await usersService.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'senha-segura',
      role: 'admin',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('senha-segura', 10);
    expect(mockUserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'admin',
        password: 'hashed-password',
        active: true,
        mustChangePassword: false,
      }),
    );
    expect(created.role).toBe('admin');
    expect(created).not.toHaveProperty('password');
  });
});
