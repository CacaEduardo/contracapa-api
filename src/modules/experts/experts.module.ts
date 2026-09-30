import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpertsController } from 'src/modules/experts/experts.controller';
import { ExpertsService } from 'src/modules/experts/experts.service';
import {
  Expert,
  ExpertSchema,
} from 'src/modules/experts/schemas/expert.schema';
import { StorageModule } from 'src/modules/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expert.name, schema: ExpertSchema }]),
    StorageModule,
  ],
  controllers: [ExpertsController],
  providers: [ExpertsService],
  exports: [ExpertsService],
})
export class ExpertsModule {}
