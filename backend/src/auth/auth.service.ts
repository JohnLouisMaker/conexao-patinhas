import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { PublicUser, User } from '../users/users.entity.js';
import { UsersService } from '../users/users.service.js';

const scryptAsync = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

export interface AuthInput {
  nome?: unknown;
  email?: unknown;
  senha?: unknown;
  telefone?: unknown;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(input: AuthInput) {
    const { nome, email, senha, telefone } = this.validateInput(input, true);

    if (await this.usersService.getUserByEmail(email)) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const user = {
      nome,
      email,
      senhaHash: await this.hashPassword(senha),
      telefone,
    };

    try {
      const createdUser = await this.usersService.createUser(user);
      return this.createAuthResponse(createdUser);
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }

  async login(input: AuthInput) {
    const { email, senha } = this.validateInput(input, false);
    const user = await this.usersService.getUserByEmail(email);

    if (!user || !(await this.verifyPassword(senha, user.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.createAuthResponse(user);
  }

  async getUserFromAccessToken(token: string): Promise<PublicUser | null> {
    const payload = this.verifyAccessToken(token);
    if (!payload) return null;

    const user = await this.usersService.getUserById(payload.sub);
    return user ? this.toPublicUser(user) : null;
  }

  private validateInput(
    input: AuthInput,
    requiresName: boolean,
  ): { nome: string; email: string; senha: string; telefone: string | null } {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Dados de autenticação inválidos.');
    }

    const nome = typeof input.nome === 'string' ? input.nome.trim() : '';
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const senha = typeof input.senha === 'string' ? input.senha : '';
    const telefone =
      typeof input.telefone === 'string' && input.telefone.trim()
        ? input.telefone.trim()
        : null;

    if (
      (requiresName && !nome) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      senha.length < 8
    ) {
      throw new BadRequestException(
        requiresName
          ? 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.'
          : 'Informe e-mail válido e senha com pelo menos 8 caracteres.',
      );
    }

    if (telefone && telefone.length > 30) {
      throw new BadRequestException('O telefone deve ter no máximo 30 caracteres.');
    }

    return { nome, email, senha, telefone };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scryptAsync(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
    )) as Buffer;
    return `${salt}:${hash.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [salt, hashHex] = storedHash.split(':');
    if (!salt || !hashHex || !/^[\da-f]+$/i.test(hashHex)) return false;

    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== PASSWORD_KEY_LENGTH) return false;

    const actual = (await scryptAsync(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
    )) as Buffer;
    return timingSafeEqual(actual, expected);
  }

  private createAuthResponse(user: User) {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL_SECONDS,
    };
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const encodedPayload = this.encode(payload);
    const unsignedToken = `${header}.${encodedPayload}`;
    const accessToken = `${unsignedToken}.${this.sign(unsignedToken)}`;

    return {
      user: this.toPublicUser(user),
      accessToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private verifyAccessToken(token: string): AccessTokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = Buffer.from(
      this.sign(unsignedToken),
      'base64url',
    );
    const receivedSignature = Buffer.from(signature, 'base64url');

    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      return null;
    }

    try {
      const header = JSON.parse(
        Buffer.from(encodedHeader, 'base64url').toString(),
      ) as {
        alg?: string;
      };
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString(),
      ) as Partial<AccessTokenPayload>;
      if (
        header.alg !== 'HS256' ||
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        return null;
      }

      return payload as AccessTokenPayload;
    } catch {
      return null;
    }
  }

  private sign(value: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET precisa estar configurado em produção.');
    }

    return createHmac(
      'sha256',
      secret || 'conexao-patinhas-local-development-secret',
    )
      .update(value)
      .digest('base64url');
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private toPublicUser(user: User): PublicUser {
    const { senhaHash: _senhaHash, ...publicUser } = user;
    return publicUser;
  }
}
