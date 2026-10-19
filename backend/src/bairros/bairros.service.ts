import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
export interface Bairro {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
}
@Injectable()
export class BairrosService {
  constructor(private readonly db: UsersService) {}
  async list(cidade?: unknown, uf?: unknown): Promise<Bairro[]> {
    if (
      (cidade !== undefined && typeof cidade !== 'string') ||
      (uf !== undefined && typeof uf !== 'string')
    ) {
      throw new BadRequestException('Cidade e UF devem ser textos.');
    }
    const city = typeof cidade === 'string' ? cidade.trim() : '';
    const state = typeof uf === 'string' ? uf.trim().toUpperCase() : '';
    if (city.length > 100 || (state && !/^[A-Z]{2}$/.test(state))) {
      throw new BadRequestException(
        'Cidade deve ter até 100 caracteres e UF deve ter duas letras.',
      );
    }
    const result = await this.db.requirePool().query<Bairro>(
      `SELECT id_bairro::text AS id, nome, cidade, uf FROM bairro
       WHERE ($1::text = '' OR lower(cidade) = lower($1)) AND ($2::text = '' OR uf = $2)
       ORDER BY cidade, uf, nome, id_bairro`,
      [city, state],
    );
    return result.rows;
  }
  async find(id: unknown): Promise<Bairro> {
    if (
      (typeof id !== 'string' && typeof id !== 'number') ||
      !/^[1-9]\d*$/.test(String(id)) ||
      Number(id) > 2147483647
    ) {
      throw new BadRequestException('idBairro deve ser um inteiro positivo.');
    }
    const result = await this.db
      .requirePool()
      .query<Bairro>(
        'SELECT id_bairro::text AS id, nome, cidade, uf FROM bairro WHERE id_bairro = $1',
        [id],
      );
    if (!result.rows[0]) throw new NotFoundException('Bairro não encontrado.');
    return result.rows[0];
  }
}
