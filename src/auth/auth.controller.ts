import { Controller, Post, Body } from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/create-auth.dto';
import { LoginDTO } from './dto/login-auth.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async register(@Body() dto: RegisterDTO) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDTO) {
    return this.authService.login(dto);
  }
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDTO) {
    return this.authService.forgotPassword(dto);
  }
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  async logout() {
    return this.authService.logout();
  }
}
