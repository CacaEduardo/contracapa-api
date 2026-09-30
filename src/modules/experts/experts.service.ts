import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { escapeRegExp } from 'src/common/lib/escape-regexp';
import { slugify } from 'src/common/lib/slugify';
import type { CreateExpertDto } from 'src/modules/experts/dto/create-expert.dto';
import type { ListExpertsQueryDto } from 'src/modules/experts/dto/list-experts-query.dto';
import type { UpdateExpertDto } from 'src/modules/experts/dto/update-expert.dto';
import {
  toExpertResponse,
  type ExpertResponse,
} from 'src/modules/experts/expert-response';
import {
  Expert,
  type ExpertDocument,
} from 'src/modules/experts/schemas/expert.schema';
import { StorageService } from 'src/modules/storage/storage.service';

const NOT_FOUND_MESSAGE = 'Especialista não encontrado';

@Injectable()
export class ExpertsService {
  constructor(
    @InjectModel(Expert.name)
    private readonly expertModel: Model<ExpertDocument>,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateExpertDto): Promise<ExpertResponse> {
    await this.assertEmailAvailable(dto.email);
    const slug = await this.generateUniqueSlug(dto.fullName);

    const created = await this.expertModel.create({
      fullName: dto.fullName,
      email: dto.email,
      company: dto.company ?? null,
      phone: dto.phone ?? null,
      podcastUrl: dto.podcastUrl ?? null,
      socialLinks: dto.socialLinks ?? [],
      slug,
    });

    return toExpertResponse(created);
  }

  async findAll(query: ListExpertsQueryDto): Promise<ExpertResponse[]> {
    const filter: Record<string, unknown> = {};

    if (query.q) {
      const regex = new RegExp(escapeRegExp(query.q), 'i');
      filter.$or = [{ fullName: regex }, { company: regex }, { email: regex }];
    }

    const experts = await this.expertModel
      .find(filter)
      .sort({ fullName: 1 })
      .exec();

    return experts.map(toExpertResponse);
  }

  async findByIdResponse(id: string): Promise<ExpertResponse> {
    const expert = await this.findById(id);
    return toExpertResponse(expert);
  }

  async update(id: string, dto: UpdateExpertDto): Promise<ExpertResponse> {
    const expert = await this.findById(id);

    if (dto.email !== undefined && dto.email !== expert.email) {
      await this.assertEmailAvailable(dto.email);
    }

    // O slug não acompanha o nome: links públicos da página do especialista precisam ser estáveis.
    const payload: Partial<Expert> = {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.company !== undefined && { company: dto.company }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.podcastUrl !== undefined && { podcastUrl: dto.podcastUrl }),
      ...(dto.socialLinks !== undefined && { socialLinks: dto.socialLinks }),
    };

    return this.updateOrFail(id, payload);
  }

  async remove(id: string): Promise<void> {
    const expert = await this.findById(id);

    await this.expertModel.findByIdAndDelete(id).exec();

    if (expert.avatarKey) {
      await this.storageService.deleteImage(expert.avatarKey);
    }
  }

  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<ExpertResponse> {
    const expert = await this.findById(id);
    const uploaded = await this.storageService.uploadImage(file, 'experts');

    if (expert.avatarKey) {
      await this.storageService.deleteImage(expert.avatarKey);
    }

    return this.updateOrFail(id, {
      avatarSrc: uploaded.url,
      avatarKey: uploaded.key,
    });
  }

  async removeAvatar(id: string): Promise<ExpertResponse> {
    const expert = await this.findById(id);

    if (expert.avatarKey) {
      await this.storageService.deleteImage(expert.avatarKey);
    }

    return this.updateOrFail(id, { avatarSrc: null, avatarKey: null });
  }

  private async findById(id: string): Promise<ExpertDocument> {
    const expert = await this.expertModel.findById(id).exec();

    if (!expert) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return expert;
  }

  private async updateOrFail(
    id: string,
    payload: Partial<Expert>,
  ): Promise<ExpertResponse> {
    const updated = await this.expertModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return toExpertResponse(updated);
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.expertModel.exists({ email }).exec()) {
      throw new ConflictException('Já existe um especialista com este e-mail');
    }
  }

  private async generateUniqueSlug(fullName: string): Promise<string> {
    const base = slugify(fullName);
    let candidate = base;
    let suffix = 2;

    while (await this.expertModel.exists({ slug: candidate }).exec()) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
