import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { InternalAccessGuard } from './common/guards/internal-access.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { envSchema, Env } from './config/env.schema';
import { AuthModule } from './modules/auth/auth.module';
import { BooksModule } from './modules/books/books.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { StatsModule } from './modules/stats/stats.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get('MONGO_URL', { infer: true }),
      }),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    BooksModule,
    ReviewsModule,
    NewsletterModule,
    StatsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: InternalAccessGuard,
    },
    // JwtAuthGuard deve vir antes do RolesGuard: o segundo depende de request.user preenchido pelo JWT.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: MongoExceptionFilter,
    },
  ],
})
export class AppModule {}
