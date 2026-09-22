import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const mockAuthService = {
    signIn: jest.fn().mockResolvedValue({
      user: { _id: '1', name: 'Ana', email: 'ana@example.com' },
      token: 'token.jwt',
    }),
    getMe: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/signin valida o body e autentica', async () => {
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'ana@example.com', password: 'senha123' })
      .expect(201)
      .expect({
        user: { _id: '1', name: 'Ana', email: 'ana@example.com' },
        token: 'token.jwt',
      });
  });

  it('POST /auth/signin rejeita body inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: 'nao-e-email' })
      .expect(400);
  });
});
