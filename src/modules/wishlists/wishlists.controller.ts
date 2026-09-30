import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import {
  createWishlistSchema,
  type CreateWishlistDto,
} from 'src/modules/wishlists/dto/create-wishlist.dto';
import {
  getWishlistQuerySchema,
  type GetWishlistQueryDto,
} from 'src/modules/wishlists/dto/get-wishlist-query.dto';
import {
  transferBookSchema,
  type TransferBookDto,
} from 'src/modules/wishlists/dto/transfer-book.dto';
import {
  updateWishlistSchema,
  type UpdateWishlistDto,
} from 'src/modules/wishlists/dto/update-wishlist.dto';
import { WishlistsService } from 'src/modules/wishlists/wishlists.service';

@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.wishlistsService.findAllByOwner(user.sub);
  }

  @Get('membership')
  getMembership(@CurrentUser() user: JwtPayload) {
    return this.wishlistsService.getMembership(user.sub);
  }

  @Get('owner/:ownerId')
  @Roles('admin')
  findByOwner(@Param('ownerId', { schema: mongoIdSchema }) ownerId: string) {
    return this.wishlistsService.findByOwnerForAdmin(ownerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: JwtPayload,
    @Body({ schema: createWishlistSchema }) body: CreateWishlistDto,
  ) {
    return this.wishlistsService.create(user.sub, body);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Query({ schema: getWishlistQuerySchema }) query: GetWishlistQueryDto,
  ) {
    return this.wishlistsService.findOne(user.sub, id, query.sort);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateWishlistSchema }) body: UpdateWishlistDto,
  ) {
    return this.wishlistsService.update(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
  ) {
    return this.wishlistsService.remove(user.sub, id);
  }

  @Put(':id/books/:bookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  addBook(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Param('bookId', { schema: mongoIdSchema }) bookId: string,
  ) {
    return this.wishlistsService.addBook(user.sub, id, bookId);
  }

  @Delete(':id/books/:bookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBook(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Param('bookId', { schema: mongoIdSchema }) bookId: string,
  ) {
    return this.wishlistsService.removeBook(user.sub, id, bookId);
  }

  @Post(':id/books/:bookId/copy')
  @HttpCode(HttpStatus.NO_CONTENT)
  copyBook(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Param('bookId', { schema: mongoIdSchema }) bookId: string,
    @Body({ schema: transferBookSchema }) body: TransferBookDto,
  ) {
    return this.wishlistsService.copyBook(user.sub, id, bookId, body.targetId);
  }

  @Post(':id/books/:bookId/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  moveBook(
    @CurrentUser() user: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Param('bookId', { schema: mongoIdSchema }) bookId: string,
    @Body({ schema: transferBookSchema }) body: TransferBookDto,
  ) {
    return this.wishlistsService.moveBook(user.sub, id, bookId, body.targetId);
  }
}
