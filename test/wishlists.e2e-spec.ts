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
import { WishlistsController } from 'src/modules/wishlists/wishlists.controller';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

const LIST_ID = '507f1f77bcf86cd799439012';
const TARGET_ID = '507f1f77bcf86cd799439013';
const BOOK_ID = '507f1f77bcf86cd7994390aa';

@Module({
  imports: [
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [WishlistsController],
  providers: [
    {
      provide: WishlistsService,
      useValue: {
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
      },
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
class WishlistsTestModule {}

describe('Wishlists (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let wishlistsService: Record<string, jest.Mock>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WishlistsTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.init();

    token = moduleFixture.get(JwtService).sign(
      {
        sub: 'user-1',
        email: 'ana@example.com',
        role: 'user',
        mustChangePassword: false,
      },
      { secret: 'test-secret' },
    );
    wishlistsService = moduleFixture.get(WishlistsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /wishlists sem token retorna 401', async () => {
    await request(app.getHttpServer()).get('/wishlists').expect(401);
  });

  it('GET /wishlists/owner/:id com token de leitor retorna 403', async () => {
    await request(app.getHttpServer())
      .get(`/wishlists/owner/${LIST_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('POST /wishlists valida o nome', async () => {
    await request(app.getHttpServer())
      .post('/wishlists')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' })
      .expect(400);
  });

  it('percorre o fluxo criar → adicionar → mover → excluir', async () => {
    wishlistsService.create.mockResolvedValue({ _id: LIST_ID, name: 'Férias' });
    const server = app.getHttpServer();
    const auth = { Authorization: `Bearer ${token}` };

    await request(server)
      .post('/wishlists')
      .set(auth)
      .send({ name: 'Férias', description: 'Para ler na praia' })
      .expect(201)
      .expect({ _id: LIST_ID, name: 'Férias' });

    await request(server)
      .put(`/wishlists/${LIST_ID}/books/${BOOK_ID}`)
      .set(auth)
      .expect(204);

    await request(server)
      .post(`/wishlists/${LIST_ID}/books/${BOOK_ID}/move`)
      .set(auth)
      .send({ targetId: TARGET_ID })
      .expect(204);

    await request(server).delete(`/wishlists/${LIST_ID}`).set(auth).expect(204);

    expect(wishlistsService.create).toHaveBeenCalledWith('user-1', {
      name: 'Férias',
      description: 'Para ler na praia',
    });
    expect(wishlistsService.addBook).toHaveBeenCalledWith(
      'user-1',
      LIST_ID,
      BOOK_ID,
    );
    expect(wishlistsService.moveBook).toHaveBeenCalledWith(
      'user-1',
      LIST_ID,
      BOOK_ID,
      TARGET_ID,
    );
    expect(wishlistsService.remove).toHaveBeenCalledWith('user-1', LIST_ID);
  });

  it('POST /wishlists/:id/books/:bookId/move recusa destino inválido', async () => {
    await request(app.getHttpServer())
      .post(`/wishlists/${LIST_ID}/books/${BOOK_ID}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetId: 'nao-e-id' })
      .expect(400);
  });
});
