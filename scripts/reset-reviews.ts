import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../src/app.module';

// Migração única para o modelo de resenhas por especialista: descarta as resenhas
// com veredito e prepara livros e especialistas com os novos campos. Remova este
// script depois de executá-lo em todos os ambientes.
async function bootstrap() {
  const logger = new Logger('ResetReviews');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;

    if (!db) {
      throw new Error('Conexão com o banco indisponível');
    }

    const hasReviews = await db
      .listCollections({ name: 'reviews' })
      .hasNext();

    if (hasReviews) {
      await db.dropCollection('reviews');
      logger.log('Coleção de resenhas descartada.');
    }

    await connection.syncIndexes();

    const books = await db.collection('books').updateMany(
      {},
      {
        $unset: {
          reviewId: '',
          reviewVerdict: '',
          reviewWeekly: '',
          reviewPublishedAt: '',
        },
        $set: {
          editorias: [],
          expertSlugs: [],
          recommendationCount: 0,
          disrecommendationCount: 0,
        },
      },
    );
    await db
      .collection('books')
      .updateMany(
        { active: { $exists: false } },
        { $set: { active: true, description: null } },
      );
    logger.log(`Livros atualizados: ${books.modifiedCount}.`);

    const experts = await db
      .collection('experts')
      .updateMany({}, { $set: { reviewCount: 0 } });
    await db
      .collection('experts')
      .updateMany({ active: { $exists: false } }, { $set: { active: true } });
    logger.log(`Especialistas atualizados: ${experts.modifiedCount}.`);
  } finally {
    await app.close();
  }
}

void bootstrap();
