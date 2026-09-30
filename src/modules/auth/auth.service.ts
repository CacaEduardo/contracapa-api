import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { Env } from 'src/config/env.schema';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import type { ChangePasswordDto } from 'src/modules/auth/dto/change-password.dto';
import type { ForgotPasswordDto } from 'src/modules/auth/dto/forgot-password.dto';
import type { GoogleSignInDto } from 'src/modules/auth/dto/google-signin.dto';
import type { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';
import type { SignInDto } from 'src/modules/auth/dto/signin.dto';
import type { SignUpDto } from 'src/modules/auth/dto/signup.dto';
import type { UpdateProfileDto } from 'src/modules/auth/dto/update-profile.dto';
import {
  GoogleIdentityService,
  type GoogleProfile,
} from 'src/modules/auth/google-identity.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { MailService } from 'src/modules/mail/mail.service';
import { toPublicUser, type PublicUser } from 'src/modules/users/user-response';
import { UsersService } from 'src/modules/users/users.service';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

const INVALID_CREDENTIALS_MESSAGE = 'Credenciais incorretas';
const GOOGLE_ONLY_ACCOUNT_MESSAGE = 'Esta conta usa login com Google';
const INACTIVE_ACCOUNT_MESSAGE = 'Conta desativada';
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
type AuthResult = { user: PublicUser; token: string };

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'Se este e-mail estiver cadastrado, enviamos um link de redefinição de senha';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly categoriesService: CategoriesService,
    private readonly wishlistsService: WishlistsService,
    private readonly googleIdentityService: GoogleIdentityService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async signIn(data: SignInDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(data.email);

    if (!user || !user.active) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!user.password) {
      throw new UnauthorizedException(
        user.authProvider === 'google'
          ? GOOGLE_ONLY_ACCOUNT_MESSAGE
          : INVALID_CREDENTIALS_MESSAGE,
      );
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.issue(toPublicUser(user));
  }

  async signUp(data: SignUpDto): Promise<AuthResult> {
    await this.assertCategoriesExist(data.favoriteCategorySlugs);

    const user = await this.usersService.create({
      name: data.name,
      email: data.email,
      password: data.password,
      company: data.company || undefined,
      favoriteCategorySlugs: data.favoriteCategorySlugs,
      role: 'user',
      authProvider: 'password',
      onboardingCompleted: true,
    });

    await this.wishlistsService.ensureDefault(user._id);
    this.logger.log(`Cadastro de leitor: userId=${user._id}`);

    return this.issue(user);
  }

  async signInWithGoogle(data: GoogleSignInDto): Promise<AuthResult> {
    const profile = await this.googleIdentityService.verify(data.idToken);
    const user = await this.findOrCreateGoogleUser(profile);

    if (!user.active) {
      throw new UnauthorizedException(INACTIVE_ACCOUNT_MESSAGE);
    }

    return this.issue(user);
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
    if (data.favoriteCategorySlugs) {
      await this.assertCategoriesExist(data.favoriteCategorySlugs);
    }

    const user = await this.usersService.update(payload.sub, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.company !== undefined && { company: data.company }),
      ...(data.favoriteCategorySlugs !== undefined && {
        favoriteCategorySlugs: data.favoriteCategorySlugs,
      }),
      ...(data.onboardingCompleted && { onboardingCompleted: true }),
    });

    this.logger.log(`Perfil atualizado: userId=${payload.sub}`);

    return user;
  }

  async changePassword(
    payload: JwtPayload,
    data: ChangePasswordDto,
  ): Promise<AuthResult> {
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

    this.logger.log(`Senha alterada: userId=${payload.sub}`);

    return this.issue(publicUser);
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

      const resetUrl = `${this.config.get('FRONTEND_URL', { infer: true })}/redefinir-senha?token=${token}`;

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

  private async findOrCreateGoogleUser(
    profile: GoogleProfile,
  ): Promise<PublicUser> {
    const linked = await this.usersService.findByGoogleId(profile.googleId);

    if (linked) {
      return toPublicUser(linked);
    }

    const existing = await this.usersService.findByEmail(profile.email);

    if (existing) {
      const updated = await this.usersService.linkGoogleAccount(
        existing._id.toString(),
        profile.googleId,
        profile.picture,
      );
      return toPublicUser(updated);
    }

    const created = await this.usersService.create({
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.picture,
      googleId: profile.googleId,
      role: 'user',
      authProvider: 'google',
      onboardingCompleted: false,
    });

    await this.wishlistsService.ensureDefault(created._id);
    this.logger.log(`Cadastro via Google: userId=${created._id}`);

    return created;
  }

  private async assertCategoriesExist(slugs: string[]): Promise<void> {
    const unknown = await this.categoriesService.existsAllSlugs(slugs);

    if (unknown.length > 0) {
      throw new BadRequestException(
        `Categoria(s) inexistente(s): ${unknown.join(', ')}`,
      );
    }
  }

  private issue(user: PublicUser): AuthResult {
    const payload: JwtPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return { user, token: this.jwtService.sign(payload) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
