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
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { BooksService } from 'src/modules/books/books.service';
import {
  createBookSchema,
  type CreateBookDto,
} from 'src/modules/books/dto/create-book.dto';
import {
  listBooksQuerySchema,
  type ListBooksQueryDto,
} from 'src/modules/books/dto/list-books-query.dto';
import {
  updateBookSchema,
  type UpdateBookDto,
} from 'src/modules/books/dto/update-book.dto';
import { imageUploadInterceptorOptions } from 'src/modules/storage/multer-options';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @Public()
  findAll(@Query({ schema: listBooksQuerySchema }) query: ListBooksQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get(':slug/related')
  @Public()
  findRelated(@Param('slug') slug: string) {
    return this.booksService.findRelated(slug);
  }

  @Get(':slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.booksService.findBySlug(slug);
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createBookSchema }) body: CreateBookDto) {
    return this.booksService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateBookSchema }) body: UpdateBookDto,
  ) {
    return this.booksService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.booksService.remove(id);
  }

  @Post(':id/cover')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('cover', imageUploadInterceptorOptions))
  uploadCover(
    @Param('id', { schema: mongoIdSchema }) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Envie um arquivo de imagem no campo "cover"',
      );
    }

    return this.booksService.uploadCover(id, file);
  }

  @Delete(':id/cover')
  @Roles('admin')
  removeCover(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.booksService.removeCover(id);
  }
}
