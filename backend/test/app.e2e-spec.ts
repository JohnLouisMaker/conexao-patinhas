import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('registers, logs in and retrieves the authenticated profile', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Ana Patinhas',
        email: 'ana@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);

    expect(registration.body.user).toMatchObject({
      nome: 'Ana Patinhas',
      email: 'ana@example.com',
    });
    expect(registration.body.user).not.toHaveProperty('senhaHash');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', senha: 'senha-segura-123' })
      .expect(201);

    const profile = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(profile.body).toMatchObject({
      nome: 'Ana Patinhas',
      email: 'ana@example.com',
    });
  });

  it('rejects access to the profile without a valid token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
