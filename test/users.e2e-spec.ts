import {
  INestApplication,
  Module,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: UsersService,
      useValue: {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        resetPassword: jest.fn(),
      },
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
class UsersTestModule {}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let usersService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    resetPassword: jest.Mock;
  };

  const signToken = (payload: JwtPayload) =>
    jwtService.sign(payload, { secret: 'test-secret' });

  const adminToken = () =>
    signToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      mustChangePassword: false,
    });

  const userToken = () =>
    signToken({
      sub: 'user-1',
      email: 'usuario@example.com',
      role: 'user',
      mustChangePassword: false,
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    usersService = moduleFixture.get(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /users sem sessão de admin retorna 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Cliente',
        email: 'usuario@example.com',
        role: 'user',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: 'Token não fornecido',
    });
  });

  it('POST /users com token de usuário retorna 403', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({
        name: 'Cliente',
        email: 'usuario@example.com',
        role: 'user',
      })
      .expect(403);

    expect(response.body).toMatchObject({
      statusCode: 403,
      message: 'Acesso negado para este papel',
    });
  });

  it('POST /users com token de admin cria usuário sem senha na resposta', async () => {
    usersService.create.mockResolvedValue({
      _id: 'user-1',
      name: 'Cliente',
      email: 'usuario@example.com',
      role: 'user',
      active: true,
      mustChangePassword: false,
    });

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        name: 'Cliente',
        email: 'usuario@example.com',
        role: 'user',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      _id: 'user-1',
      role: 'user',
      active: true,
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('temporaryPassword');
  });

  it('GET /users/:id após reset não expõe a senha provisória', async () => {
    usersService.resetPassword.mockResolvedValue({
      temporaryPassword: 'senha-provisoria-secreta',
    });
    usersService.findOne.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Cliente',
      email: 'usuario@example.com',
      role: 'user',
      active: true,
      mustChangePassword: true,
    });

    const resetResponse = await request(app.getHttpServer())
      .post('/users/507f1f77bcf86cd799439011/reset-password')
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    expect(resetResponse.body).toEqual({
      temporaryPassword: 'senha-provisoria-secreta',
    });

    const getResponse = await request(app.getHttpServer())
      .get('/users/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    expect(getResponse.body).not.toHaveProperty('password');
    expect(getResponse.body).not.toHaveProperty('temporaryPassword');
    expect(getResponse.body).toMatchObject({
      mustChangePassword: true,
    });
  });

  it('DELETE /users/:id retorna 404 de rota inexistente', async () => {
    await request(app.getHttpServer())
      .delete('/users/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(404);
  });
});
