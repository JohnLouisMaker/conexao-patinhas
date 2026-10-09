import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PublicUser } from '../users/users.entity.js';
import { AuthService } from './auth.service.js';

type AuthenticatedRequest = Request & { user: PublicUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acesso não informado.');
    }

    const user = this.authService.getUserFromAccessToken(token);
    if (!user)
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');

    request.user = user;
    return true;
  }
}
