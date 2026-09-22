import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { generateTemporaryPassword } from 'src/modules/users/generate-temporary-password';
import type { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import type { ListUsersQueryDto } from 'src/modules/users/dto/list-users-query.dto';
import type { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { User, type UserDocument } from 'src/modules/users/schemas/user.schema';
import { toPublicUser, type PublicUser } from 'src/modules/users/user-response';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();

    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const created = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      avatarUrl: dto.avatarUrl,
      phone: dto.phone,
      role: dto.role ?? 'user',
      active: true,
      mustChangePassword: false,
      password: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
    });

    return toPublicUser(created);
  }

  async findAll({ role, active }: ListUsersQueryDto = {}): Promise<
    PublicUser[]
  > {
    const query: Partial<Pick<User, 'role' | 'active'>> = {};

    if (role) {
      query.role = role;
    }

    if (active !== undefined) {
      query.active = active;
    }

    const users = await this.userModel.find(query).exec();
    return users.map(toPublicUser);
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const payload: UpdateUserDto = { ...dto };

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
}
