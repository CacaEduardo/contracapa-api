import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { BannersService } from 'src/modules/banners/banners.service';
import {
  bannerImageVariantSchema,
  type BannerImageVariant,
} from 'src/modules/banners/dto/banner-image-variant.dto';
import {
  createBannerSchema,
  type CreateBannerDto,
} from 'src/modules/banners/dto/create-banner.dto';
import {
  updateBannerSchema,
  type UpdateBannerDto,
} from 'src/modules/banners/dto/update-banner.dto';
import { imageUploadInterceptorOptions } from 'src/modules/storage/multer-options';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @Public()
  findPublic() {
    return this.bannersService.findPublic();
  }

  @Get('admin')
  @Roles('admin')
  findAll() {
    return this.bannersService.findAll();
  }

  @Get('admin/:id')
  @Roles('admin')
  findOne(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createBannerSchema }) body: CreateBannerDto) {
    return this.bannersService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateBannerSchema }) body: UpdateBannerDto,
  ) {
    return this.bannersService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.bannersService.remove(id);
  }

  @Post(':id/image/:variant')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', imageUploadInterceptorOptions))
  uploadImage(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Param('variant', { schema: bannerImageVariantSchema })
    variant: BannerImageVariant,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Envie um arquivo de imagem no campo "image"',
      );
    }

    return this.bannersService.uploadImage(id, variant, file);
  }
}
