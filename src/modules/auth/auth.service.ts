import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { Env } from 'src/config/env.schema';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import type { ChangePasswordDto } from 'src/modules/auth/dto/change-password.dto';
import type { ForgotPasswordDto } from 'src/modules/auth/dto/forgot-password.dto';
import type { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';
import type { SignInDto } from 'src/modules/auth/dto/signin.dto';
import type { UpdateProfileDto } from 'src/modules/auth/dto/update-profile.dto';
import { MailService } from 'src/modules/mail/mail.service';
import { toPublicUser, type PublicUser } from 'src/modules/users/user-response';
import { UsersService } from 'src/modules/users/users.service';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciais incorretas';
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async signIn(data: SignInDto): Promise<{ user: PublicUser; token: string }> {
    const user = await this.usersService.findByEmailWithPassword(data.email);

    if (!user || !user.password || !user.active) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return {
      user: toPublicUser(user),
      token: this.jwtService.sign(payload),
    };
  }

  async getMe(payload: JwtPayload): Promise<PublicUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return toPublicUser(user);
  }

  async updateProfile(
    payload: JwtPayload,
    data: UpdateProfileDto,
  ): Promise<PublicUser> {
    const user = await this.usersService.update(payload.sub, {
      name: data.name,
    });

    this.logger.log(`Perfil atualizado: userId=${payload.sub}`);

    return user;
  }

  async changePassword(
    payload: JwtPayload,
    data: ChangePasswordDto,
  ): Promise<{ user: PublicUser; token: string }> {
    const user = await this.usersService.findByIdWithPassword(payload.sub);

    if (!user?.password) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isValidPassword = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const publicUser = await this.usersService.setPassword(
      payload.sub,
      data.newPassword,
    );

    const newPayload: JwtPayload = {
      sub: publicUser._id,
      email: publicUser.email,
      role: publicUser.role,
      mustChangePassword: false,
    };

    this.logger.log(`Senha alterada: userId=${payload.sub}`);

    return {
      user: publicUser,
      token: this.jwtService.sign(newPayload),
    };
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(data.email);

    if (user) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

      await this.usersService.setPasswordResetToken(
        user._id.toString(),
        this.hashToken(token),
        expiresAt,
      );

      const resetUrl = `${this.config.get('FRONTEND_URL', { infer: true })}/admin/redefinir-senha?token=${token}`;

      try {
        await this.mailService.sendPasswordReset(user.email, resetUrl);
      } catch (error) {
        this.logger.warn(
          `Falha ao enviar e-mail de redefinição de senha: ${String(error)}`,
        );
      }
    }

    return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(data: ResetPasswordDto): Promise<{ user: PublicUser }> {
    const user = await this.usersService.findByValidResetToken(
      this.hashToken(data.token),
    );

    if (!user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const publicUser = await this.usersService.setPassword(
      user._id.toString(),
      data.newPassword,
    );

    this.logger.log(
      `Senha redefinida via token: userId=${user._id.toString()}`,
    );

    return { user: publicUser };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
