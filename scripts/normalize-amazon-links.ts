import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { toAmazonAffiliateUrl } from '../src/modules/books/amazon-link';
import { AppModule } from '../src/app.module';

// Migração única: reescreve amazonUrl dos livros para o link de associado.
// Remova este script depois de executá-lo em todos os ambientes.
async function bootstrap() {
  const logger = new Logger('NormalizeAmazonLinks');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;

    if (!db) {
      throw new Error('Conexão com o banco indisponível');
    }

    const books = db.collection('books');
    const cursor = books.find({
      amazonUrl: { $type: 'string', $ne: '' },
    });

    let updated = 0;
    let skipped = 0;

    for await (const book of cursor) {
      const current = book.amazonUrl as string;
      const next = toAmazonAffiliateUrl(current);

      if (!next || next === current) {
        skipped += 1;
        continue;
      }

      await books.updateOne({ _id: book._id }, { $set: { amazonUrl: next } });
      updated += 1;
    }

    logger.log(`Livros atualizados: ${updated}. Pulados: ${skipped}.`);
  } finally {
    await app.close();
  }
}

void bootstrap();
