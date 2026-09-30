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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  createExpertSchema,
  type CreateExpertDto,
} from 'src/modules/experts/dto/create-expert.dto';
import {
  listExpertsQuerySchema,
  type ListExpertsQueryDto,
} from 'src/modules/experts/dto/list-experts-query.dto';
import {
  updateExpertSchema,
  type UpdateExpertDto,
} from 'src/modules/experts/dto/update-expert.dto';
import { ExpertsService } from 'src/modules/experts/experts.service';
import { imageUploadInterceptorOptions } from 'src/modules/storage/multer-options';

@Controller('experts')
@Roles('admin')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get()
  findAll(
    @Query({ schema: listExpertsQuerySchema }) query: ListExpertsQueryDto,
  ) {
    return this.expertsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.expertsService.findByIdResponse(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createExpertSchema }) body: CreateExpertDto) {
    return this.expertsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateExpertSchema }) body: UpdateExpertDto,
  ) {
    return this.expertsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.expertsService.remove(id);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', imageUploadInterceptorOptions))
  uploadAvatar(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Envie um arquivo de imagem no campo "avatar"',
      );
    }

    return this.expertsService.uploadAvatar(id, file);
  }

  @Delete(':id/avatar')
  removeAvatar(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.expertsService.removeAvatar(id);
  }
}
