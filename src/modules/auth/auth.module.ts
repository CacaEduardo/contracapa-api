import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Env } from 'src/config/env.schema';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { GoogleIdentityService } from 'src/modules/auth/google-identity.service';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { MailModule } from 'src/modules/mail/mail.module';
import { UsersModule } from 'src/modules/users/users.module';
import { WishlistsModule } from 'src/modules/wishlists/wishlists.module';

@Module({
  imports: [
    UsersModule,
    MailModule,
    CategoriesModule,
    WishlistsModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleIdentityService],
})
export class AuthModule {}
