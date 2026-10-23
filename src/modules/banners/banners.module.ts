import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BannersController } from 'src/modules/banners/banners.controller';
import { BannersService } from 'src/modules/banners/banners.service';
import {
  Banner,
  BannerSchema,
} from 'src/modules/banners/schemas/banner.schema';
import { StorageModule } from 'src/modules/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
    StorageModule,
  ],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
