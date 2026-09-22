import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import type { JwtPayload } from 'src/common/types/jwt-payload';
import { AuthService } from 'src/modules/auth/auth.service';
import {
  changePasswordSchema,
  type ChangePasswordDto,
} from 'src/modules/auth/dto/change-password.dto';
import {
  forgotPasswordSchema,
  type ForgotPasswordDto,
} from 'src/modules/auth/dto/forgot-password.dto';
import {
  resetPasswordSchema,
  type ResetPasswordDto,
} from 'src/modules/auth/dto/reset-password.dto';
import { signInSchema, type SignInDto } from 'src/modules/auth/dto/signin.dto';
import {
  updateProfileSchema,
  type UpdateProfileDto,
} from 'src/modules/auth/dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @Public()
  signIn(@Body({ schema: signInSchema }) body: SignInDto) {
    return this.authService.signIn(body);
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user, body);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body({ schema: changePasswordSchema }) body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, body);
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(
    @Body({ schema: forgotPasswordSchema }) body: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @Public()
  resetPassword(@Body({ schema: resetPasswordSchema }) body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
