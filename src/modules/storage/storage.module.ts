import { Module } from '@nestjs/common';
import { StorageService } from 'src/modules/storage/storage.service';

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
