import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';
import type { User } from './users.entity.js';

export type CreateUserInput = Omit<User, 'id' | 'criadoEm'>;

type UserRow = Partial<User> & { id?: string | number };

@Injectable()
export class UsersService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool | null;
  private readonly memoryUsers = new Map<string, User>();
  private nextMemoryId = 1;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL não configurada. Crie o arquivo backend/.env a partir de .env.example.',
      );
    }

    this.pool = null;
  }

  get databaseEnabled(): boolean {
    return this.pool !== null;
  }

  requirePool(): Pool {
    if (!this.pool) {
      throw new ServiceUnavailableException('Conexão com o banco não configurada.');
    }
    return this.pool;
  }

  async onModuleInit(): Promise<void> {
    if (!this.pool) return;

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
    if (!this.pool) return;
    await this.pool.end();
  }

  async createUser(user: CreateUserInput): Promise<User> {
    if (!this.pool) {
      return this.createMemoryUser(user);
    }

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
    if (!this.pool) {
      return this.memoryUsers.get(id);
    }

    const result = await this.pool.query<User>(
      `SELECT id_usuario AS id, nome, email, senha_hash AS "senhaHash",
              telefone, data_cadastro AS "criadoEm"
       FROM usuario WHERE id_usuario = $1`,
      [id],
    );
    return this.mapUser(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.pool) {
      return this.findMemoryUser(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      );
    }

    const result = await this.pool.query<User>(
      `SELECT id_usuario AS id, nome, email, senha_hash AS "senhaHash",
              telefone, data_cadastro AS "criadoEm"
       FROM usuario WHERE email = $1`,
      [email],
    );
    return this.mapUser(result.rows[0]);
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.pool) {
      return Array.from(this.memoryUsers.values()).sort(
        (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime(),
      );
    }

    const result = await this.pool.query<User>(
      `SELECT id_usuario AS id, nome, email, senha_hash AS "senhaHash",
              telefone, data_cadastro AS "criadoEm"
       FROM usuario ORDER BY data_cadastro DESC`,
    );
    return result.rows.map((user) => this.mapUser(user)!);
  }

  private createMemoryUser(user: CreateUserInput): User {
    const id = String(this.nextMemoryId++);
    const createdUser: User = {
      id,
      nome: user.nome,
      email: user.email,
      senhaHash: user.senhaHash,
      telefone: user.telefone,
      criadoEm: new Date(),
    };

    this.memoryUsers.set(id, createdUser);
    return createdUser;
  }

  private findMemoryUser(predicate: (user: User) => boolean): User | undefined {
    return Array.from(this.memoryUsers.values()).find(predicate);
  }

  private mapUser(user: UserRow | undefined): User | undefined {
    if (!user) {
      return undefined;
    }

    return {
      ...user,
      id: String(user.id),
      criadoEm: user.criadoEm ? new Date(user.criadoEm) : new Date(),
    } as User;
  }
}
