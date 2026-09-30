import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { mongoIdSchema } from 'src/common/dto/mongo-id.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import {
  createUserSchema,
  type CreateUserDto,
} from 'src/modules/users/dto/create-user.dto';
import {
  listUsersQuerySchema,
  type ListUsersQueryDto,
} from 'src/modules/users/dto/list-users-query.dto';
import {
  updateUserSchema,
  type UpdateUserDto,
} from 'src/modules/users/dto/update-user.dto';
import { UsersService } from 'src/modules/users/users.service';

@Controller('users')
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body({ schema: createUserSchema }) body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Get()
  findAll(@Query({ schema: listUsersQuerySchema }) query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', { schema: mongoIdSchema }) id: string,
    @Body({ schema: updateUserSchema }) body: UpdateUserDto,
  ) {
    return this.usersService.updateByAdmin(actor.sub, id, body);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param('id', { schema: mongoIdSchema }) id: string) {
    return this.usersService.resetPassword(id);
  }
}
