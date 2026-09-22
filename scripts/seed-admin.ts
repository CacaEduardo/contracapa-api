import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Env } from '../src/config/env.schema';
import { seedAdmin } from '../src/modules/users/seed-admin';
import { UsersService } from '../src/modules/users/users.service';

async function bootstrap() {
  const logger = new Logger('SeedAdmin');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    const config = app.get(ConfigService<Env, true>);
    const result = await seedAdmin(usersService, config);

    if (result === 'created') {
      logger.log('Conta de admin criada com sucesso.');
      return;
    }

    logger.log('Conta de admin já existe; seed ignorado (idempotente).');
  } finally {
    await app.close();
  }
}

void bootstrap();
