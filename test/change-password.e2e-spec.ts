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
import type { JwtPayload } from 'src/common/types/jwt-payload';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useValue: {
        changePassword: jest.fn(),
      },
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
class ChangePasswordTestModule {}

describe('POST /auth/change-password (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authService: { changePassword: jest.Mock };

  const signToken = (payload: JwtPayload) =>
    jwtService.sign(payload, { secret: 'test-secret' });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ChangePasswordTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();

    jwtService = moduleFixture.get(JwtService);
    authService = moduleFixture.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({
        currentPassword: 'atual',
        newPassword: 'novaSenha123',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: 'Token não fornecido',
    });
  });

  it('após troca bem-sucedida, o token devolvido carrega mustChangePassword false', async () => {
    const oldToken = signToken({
      sub: 'user-1',
      email: 'usuario@example.com',
      role: 'user',
      mustChangePassword: true,
    });

    authService.changePassword.mockImplementation(() => {
      const newToken = signToken({
        sub: 'user-1',
        email: 'usuario@example.com',
        role: 'user',
        mustChangePassword: false,
      });

      return Promise.resolve({
        user: {
          _id: 'user-1',
          name: 'Cliente',
          email: 'usuario@example.com',
          role: 'user',
          active: true,
          mustChangePassword: false,
        },
        token: newToken,
      });
    });

    const response = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({
        currentPassword: 'senhaAtual',
        newPassword: 'novaSenha123',
      })
      .expect(201);

    const body = response.body as {
      token: string;
      user: { mustChangePassword: boolean };
    };
    const decoded = jwtService.verify<JwtPayload>(body.token, {
      secret: 'test-secret',
    });

    expect(decoded.mustChangePassword).toBe(false);
    expect(body.user.mustChangePassword).toBe(false);
  });
});
