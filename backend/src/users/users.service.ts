import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { User } from './users.entity.js';

export type CreateUserInput = Omit<User, 'id' | 'criadoEm'>;

@Injectable()
export class UsersService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL não configurada. Crie o arquivo backend/.env a partir de .env.example.',
      );
    }

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        telefone VARCHAR(30),
        data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async createUser(user: CreateUserInput): Promise<User> {
    const result = await this.pool.query<User>(
      `INSERT INTO usuario (nome, email, senha_hash, telefone)
       VALUES ($1, $2, $3, $4)
       RETURNING id_usuario AS id, nome, email, senha_hash AS "senhaHash",
                 telefone, data_cadastro AS "criadoEm"`,
      [user.nome, user.email, user.senhaHash, user.telefone],
    );
    return this.mapUser(result.rows[0])!;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await this.pool.query<User>(
      `SELECT id_usuario AS id, nome, email, senha_hash AS "senhaHash",
              telefone, data_cadastro AS "criadoEm"
       FROM usuario WHERE id_usuario = $1`,
      [id],
    );
    return this.mapUser(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.pool.query<User>(
      `SELECT id_usuario AS id, nome, email, senha_hash AS "senhaHash",
              telefone, data_cadastro AS "criadoEm"
       FROM usuario WHERE email = $1`,
      [email],
    );
    return this.mapUser(result.rows[0]);
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.pool.query<User>(
      `SELECT id_usuario AS id, nome, email, senha_hash AS "senhaHash",
              telefone, data_cadastro AS "criadoEm"
       FROM usuario ORDER BY data_cadastro DESC`,
    );
    return result.rows.map((user) => this.mapUser(user)!);
  }

  private mapUser(user: User | undefined): User | undefined {
    return user ? { ...user, id: String(user.id) } : undefined;
  }
}
