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

  it('creates animals, filters public listings, and protects owner actions', async () => {
    const owner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Protetora',
        email: 'protetora@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);
    const adopter = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Adotante',
        email: 'adotante@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);
    const animalInput = {
      nome: 'Bidu',
      especie: 'Cachorro',
      raca: 'SRD',
      idade: '2 anos',
      porte: 'Médio',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      fotoUrl: 'https://example.com/bidu.jpg',
      caracteristicas: ['Dócil', 'Vacinado'],
      descricao: 'Procura uma família responsável.',
    };

    await request(app.getHttpServer())
      .post('/animals')
      .send(animalInput)
      .expect(401);

    const created = await request(app.getHttpServer())
      .post('/animals')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send(animalInput)
      .expect(201);

    expect(created.body).toMatchObject({
      nome: 'Bidu',
      especie: 'Cachorro',
      bairro: 'Centro',
      status: 'DISPONIVEL',
    });

    await request(app.getHttpServer())
      .get('/animals?especie=Cachorro&bairro=Centro')
      .expect(200)
      .expect(({ body }) => expect(body.animals).toHaveLength(1));

    await request(app.getHttpServer())
      .get('/animals/mine')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.animals[0].id).toBe(created.body.id));

    await request(app.getHttpServer())
      .patch(`/animals/${created.body.id}/status`)
      .set('Authorization', `Bearer ${adopter.body.accessToken}`)
      .send({ status: 'ADOTADO' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/animals/${created.body.id}/status`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ status: 'ADOTADO' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('ADOTADO'));

    await request(app.getHttpServer())
      .get('/animals')
      .expect(200)
      .expect(({ body }) => expect(body.animals).toHaveLength(0));
  });

  it('records interests, exposes them only to the responsible, and blocks adopted animals', async () => {
    const owner = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Responsável',
        email: 'responsavel@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);
    const adopter = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        nome: 'Interessada',
        email: 'interessada@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);
    const animal = await request(app.getHttpServer())
      .post('/animals')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({
        nome: 'Mimi',
        especie: 'Gato',
        raca: 'SRD',
        idade: '1 ano',
        porte: 'Pequeno',
        bairro: 'Vila Nova',
        cidade: 'Campinas',
        estado: 'SP',
        fotoUrl: 'https://example.com/mimi.jpg',
        descricao: 'Carinhosa e tranquila.',
      })
      .expect(201);
    const interestInput = {
      nome: 'Interessada',
      email: 'interessada@example.com',
      telefone: '11999999999',
      experiencia: 'Já cuidei de gatos.',
      tipoResidencia: 'Apartamento telado',
      motivacao: 'Quero oferecer um lar seguro.',
    };

    await request(app.getHttpServer())
      .post(`/animals/${animal.body.id}/interests`)
      .set('Authorization', `Bearer ${adopter.body.accessToken}`)
      .send(interestInput)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/animals/${animal.body.id}/interests`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.interests).toHaveLength(1);
        expect(body.interests[0]).toMatchObject({
          nome: 'Interessada',
          email: 'interessada@example.com',
        });
      });

    await request(app.getHttpServer())
      .get(`/animals/${animal.body.id}/interests`)
      .set('Authorization', `Bearer ${adopter.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/animals/${animal.body.id}/interests`)
      .set('Authorization', `Bearer ${adopter.body.accessToken}`)
      .send(interestInput)
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/animals/${animal.body.id}/status`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ status: 'ADOTADO' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/animals/${animal.body.id}/interests`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send(interestInput)
      .expect(409);
  });

  afterEach(async () => {
    if (app) await app.close();
  });
});
