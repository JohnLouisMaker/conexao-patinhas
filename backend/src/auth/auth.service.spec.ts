import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UsersService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user and returns a token without exposing the password hash', async () => {
    const result = await service.register({
      nome: 'Ana Patinhas',
      email: 'ANA@example.com',
      senha: 'senha-segura-123',
    });

    expect(result.user.email).toBe('ana@example.com');
    expect(result.user).not.toHaveProperty('senhaHash');
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.tokenType).toBe('Bearer');
  });

  it('authenticates with the registered password and resolves the profile token', async () => {
    await service.register({
      nome: 'Ana',
      email: 'ana@example.com',
      senha: 'senha-segura-123',
    });

    const result = await service.login({
      email: 'ANA@example.com',
      senha: 'senha-segura-123',
    });
    const profile = service.getUserFromAccessToken(result.accessToken);

    expect(profile).toMatchObject({ nome: 'Ana', email: 'ana@example.com' });
    expect(profile).not.toHaveProperty('senhaHash');
  });

  it('rejects an incorrect password', async () => {
    await service.register({
      nome: 'Ana',
      email: 'ana@example.com',
      senha: 'senha-segura-123',
    });

    await expect(
      service.login({ email: 'ana@example.com', senha: 'senha-errada-123' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('rejects duplicate email addresses', async () => {
    await service.register({
      nome: 'Ana',
      email: 'ana@example.com',
      senha: 'senha-segura-123',
    });

    await expect(
      service.register({
        nome: 'Outra Ana',
        email: 'ANA@example.com',
        senha: 'senha-segura-456',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
