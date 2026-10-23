import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  toBannerResponse,
  toPublicBanner,
  type BannerResponse,
  type PublicBanner,
} from 'src/modules/banners/banner-response';
import type { BannerImageVariant } from 'src/modules/banners/dto/banner-image-variant.dto';
import type { CreateBannerDto } from 'src/modules/banners/dto/create-banner.dto';
import type { UpdateBannerDto } from 'src/modules/banners/dto/update-banner.dto';
import {
  Banner,
  type BannerDocument,
} from 'src/modules/banners/schemas/banner.schema';
import { StorageService } from 'src/modules/storage/storage.service';

const NOT_FOUND_MESSAGE = 'Destaque não encontrado';
const SORT = { order: 1, createdAt: 1 } as const;

const IMAGE_FIELDS = {
  desktop: { src: 'imageSrc', key: 'imageKey' },
  mobile: { src: 'mobileImageSrc', key: 'mobileImageKey' },
} as const;

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name)
    private readonly bannerModel: Model<BannerDocument>,
    private readonly storageService: StorageService,
  ) {}

  async findPublic(): Promise<PublicBanner[]> {
    const banners = await this.bannerModel
      .find({ active: true, imageSrc: { $ne: null } })
      .sort(SORT)
      .exec();

    return banners.map((banner) =>
      toPublicBanner(banner as BannerDocument & { imageSrc: string }),
    );
  }

  async findAll(): Promise<BannerResponse[]> {
    const banners = await this.bannerModel.find().sort(SORT).exec();
    return banners.map(toBannerResponse);
  }

  async findOne(id: string): Promise<BannerResponse> {
    const banner = await this.bannerModel.findById(id).exec();

    if (!banner) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return toBannerResponse(banner);
  }

  async create(dto: CreateBannerDto): Promise<BannerResponse> {
    const created = await this.bannerModel.create(dto);
    return toBannerResponse(created);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerResponse> {
    const updated = await this.bannerModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return toBannerResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.bannerModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    for (const key of [deleted.imageKey, deleted.mobileImageKey]) {
      if (key) {
        await this.storageService.deleteImage(key);
      }
    }
  }

  async uploadImage(
    id: string,
    variant: BannerImageVariant,
    file: Express.Multer.File,
  ): Promise<BannerResponse> {
    const banner = await this.bannerModel.findById(id).exec();

    if (!banner) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    const fields = IMAGE_FIELDS[variant];
    const previousKey = banner[fields.key];
    const uploaded = await this.storageService.uploadImage(file, 'banners');

    if (previousKey) {
      await this.storageService.deleteImage(previousKey);
    }

    const updated = await this.bannerModel
      .findByIdAndUpdate(
        id,
        { [fields.src]: uploaded.url, [fields.key]: uploaded.key },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return toBannerResponse(updated);
  }
}
