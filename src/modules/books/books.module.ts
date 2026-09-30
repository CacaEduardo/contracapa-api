import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksController } from 'src/modules/books/books.controller';
import { BooksService } from 'src/modules/books/books.service';
import { Book, BookSchema } from 'src/modules/books/schemas/book.schema';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { WishlistsModule } from 'src/modules/wishlists/wishlists.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
    CategoriesModule,
    StorageModule,
    forwardRef(() => WishlistsModule),
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
