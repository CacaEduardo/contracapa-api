import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../src/app.module';

// Migração única para resenhas de um livro + recomendações em episódios: descarta
// resenhas, episódios e recomendações e zera os snapshots de livros e
// especialistas. Remova este script depois de executá-lo em todos os ambientes.
const DROPPED_COLLECTIONS = ['reviews', 'episodes', 'recommendations'];

async function bootstrap() {
  const logger = new Logger('ResetRecommendations');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;

    if (!db) {
      throw new Error('Conexão com o banco indisponível');
    }

    for (const name of DROPPED_COLLECTIONS) {
      if (await db.listCollections({ name }).hasNext()) {
        await db.dropCollection(name);
        logger.log(`Coleção ${name} descartada.`);
      }
    }

    await connection.syncIndexes();

    const books = await db.collection('books').updateMany(
      {},
      {
        $unset: { expertSlugs: '' },
        $set: {
          editorias: [],
          recommenderSlugs: [],
          recommendationCount: 0,
          disrecommendationCount: 0,
          recommendedAt: {},
          reviewerSlugs: [],
          reviewCount: 0,
        },
      },
    );
    logger.log(`Livros atualizados: ${books.modifiedCount}.`);

    const experts = await db
      .collection('experts')
      .updateMany(
        {},
        { $set: { reviewCount: 0, episodeCount: 0, recommendationCount: 0 } },
      );
    logger.log(`Especialistas atualizados: ${experts.modifiedCount}.`);
  } finally {
    await app.close();
  }
}

void bootstrap();
