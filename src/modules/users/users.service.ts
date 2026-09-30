import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, type QueryFilter } from 'mongoose';
import { escapeRegExp } from 'src/common/lib/escape-regexp';
import { generateTemporaryPassword } from 'src/modules/users/generate-temporary-password';
import type { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import type { ListUsersQueryDto } from 'src/modules/users/dto/list-users-query.dto';
import type { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import {
  User,
  type AuthProvider,
  type UserDocument,
} from 'src/modules/users/schemas/user.schema';
import { toPublicUser, type PublicUser } from 'src/modules/users/user-response';

export type CreateUserInput = CreateUserDto & {
  company?: string;
  favoriteCategorySlugs?: string[];
  googleId?: string;
  authProvider?: AuthProvider;
  onboardingCompleted?: boolean;
};

export type UpdateUserInput = UpdateUserDto &
  Partial<
    Pick<User, 'company' | 'favoriteCategorySlugs' | 'onboardingCompleted'>
  >;

export type ListUsersResult = {
  items: PublicUser[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserInput): Promise<PublicUser> {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();

    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const created = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      avatarUrl: dto.avatarUrl,
      phone: dto.phone,
      company: dto.company,
      favoriteCategorySlugs: dto.favoriteCategorySlugs ?? [],
      googleId: dto.googleId,
      authProvider: dto.authProvider ?? 'password',
      onboardingCompleted: dto.onboardingCompleted ?? true,
      role: dto.role ?? 'user',
      active: true,
      mustChangePassword: false,
      password: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
    });

    return toPublicUser(created);
  }

  async findAll({
    role,
    active,
    q,
    page,
    pageSize,
  }: ListUsersQueryDto): Promise<ListUsersResult> {
    const query: QueryFilter<User> = {};

    if (role) {
      query.role = role;
    }

    if (active !== undefined) {
      query.active = active;
    }

    if (q) {
      const regex = new RegExp(escapeRegExp(q), 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    const total = await this.userModel.countDocuments(query).exec();
    const users = await this.userModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    return {
      items: users.map(toPublicUser),
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserInput): Promise<PublicUser> {
    const payload: UpdateUserInput = { ...dto };

    if (dto.password) {
      payload.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return toPublicUser(updated);
  }

  async updateByAdmin(
    actorId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUser> {
    const isSelf = actorId === id;

    if (isSelf && dto.active === false) {
      throw new BadRequestException('Você não pode desativar a própria conta');
    }

    if (isSelf && dto.role === 'user') {
      throw new BadRequestException(
        'Você não pode remover o seu próprio acesso de admin',
      );
    }

    if (dto.role === 'user' || dto.active === false) {
      await this.assertNotLastAdmin(id);
    }

    return this.update(id, dto);
  }

  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await this.userModel
      .findByIdAndUpdate(id, {
        password: hashedPassword,
        mustChangePassword: true,
      })
      .exec();

    this.logger.log(`Senha provisória resetada para userId=${id}`);

    return { temporaryPassword };
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+password').exec();
  }

  async setPassword(id: string, plainPassword: string): Promise<PublicUser> {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          password: await bcrypt.hash(plainPassword, 10),
          mustChangePassword: false,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return toPublicUser(updated);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async setPasswordResetToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      })
      .exec();
  }

  async findByValidResetToken(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async linkGoogleAccount(
    id: string,
    googleId: string,
    avatarUrl?: string,
  ): Promise<UserDocument> {
    const current = await this.userModel.findById(id).exec();

    if (!current) {
      throw new NotFoundException('Usuário não encontrado');
    }

    current.googleId = googleId;

    if (!current.avatarUrl && avatarUrl) {
      current.avatarUrl = avatarUrl;
    }

    return current.save();
  }

  async countReaders(): Promise<number> {
    return this.userModel.countDocuments({ role: 'user' }).exec();
  }

  async pullFavoriteCategory(slug: string): Promise<void> {
    await this.userModel
      .updateMany(
        { favoriteCategorySlugs: slug },
        { $pull: { favoriteCategorySlugs: slug } },
      )
      .exec();
  }

  private async assertNotLastAdmin(id: string): Promise<void> {
    const target = await this.userModel.findById(id).exec();

    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (target.role !== 'admin' || !target.active) {
      return;
    }

    const activeAdmins = await this.userModel
      .countDocuments({ role: 'admin', active: true })
      .exec();

    if (activeAdmins <= 1) {
      throw new BadRequestException('É preciso manter ao menos um admin ativo');
    }
  }
}
