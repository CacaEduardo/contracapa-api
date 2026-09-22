import { NestFactory } from '@nestjs/core';
import { Logger, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Env } from './config/env.schema';
import { parseAllowedOrigins } from './common/lib/internal-access';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const allowedOrigins = parseAllowedOrigins(
    config.get('ALLOWED_ORIGINS', { infer: true }),
  );

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token'],
  });

  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on port ${port}`);
}

void bootstrap();
