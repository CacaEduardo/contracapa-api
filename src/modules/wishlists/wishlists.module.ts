import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksModule } from 'src/modules/books/books.module';
import {
  Wishlist,
  WishlistSchema,
} from 'src/modules/wishlists/schemas/wishlist.schema';
import { WishlistsController } from 'src/modules/wishlists/wishlists.controller';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
    ]),
    forwardRef(() => BooksModule),
  ],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
