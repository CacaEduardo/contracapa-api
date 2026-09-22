import {
  Controller,
  Get,
  INestApplication,
  Module,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import type { JwtPayload } from 'src/common/types/jwt-payload';

@Controller('auth-matrix')
class AuthMatrixController {
  @Get('public')
  @Public()
  publicRoute() {
    return { scope: 'public' };
  }

  @Get('authenticated')
  authenticatedRoute() {
    return { scope: 'authenticated' };
  }

  @Get('admin')
  @Roles('admin')
  adminRoute() {
    return { scope: 'admin' };
  }
}

@Module({
  imports: [
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthMatrixController],
  providers: [
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
class AuthMatrixModule {}

describe('Matriz de autorização (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const signToken = (payload: JwtPayload) =>
    jwtService.sign(payload, { secret: 'test-secret' });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthMatrixModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requisição sem token a rota restrita retorna 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth-matrix/admin')
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: 'Token não fornecido',
    });
  });

  it('requisição com token de usuário a rota restrita retorna 403', async () => {
    const token = signToken({
      sub: 'user-1',
      email: 'usuario@example.com',
      role: 'user',
      mustChangePassword: false,
    });

    const response = await request(app.getHttpServer())
      .get('/auth-matrix/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toMatchObject({
      statusCode: 403,
      message: 'Acesso negado para este papel',
    });
  });

  it('requisição com token de admin a rota restrita retorna 200', async () => {
    const token = signToken({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      mustChangePassword: false,
    });

    await request(app.getHttpServer())
      .get('/auth-matrix/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ scope: 'admin' });
  });

  it('rota pública responde sem token', async () => {
    await request(app.getHttpServer())
      .get('/auth-matrix/public')
      .expect(200)
      .expect({ scope: 'public' });
  });

  it('rota autenticada sem @Roles() aceita qualquer papel', async () => {
    const token = signToken({
      sub: 'user-1',
      email: 'usuario@example.com',
      role: 'user',
      mustChangePassword: false,
    });

    await request(app.getHttpServer())
      .get('/auth-matrix/authenticated')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ scope: 'authenticated' });
  });
});
