import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthInput } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: AuthInput) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: AuthInput) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: Request & { user: object }) {
    return request.user;
  }
}
