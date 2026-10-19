import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import type { Animal, AnimalFilters } from './animal.entity.js';
const SELECT = `SELECT a.id_animal::text AS id, a.nome, a.tipo AS especie,
 a.idade_meses AS "idadeMeses",
 b.id_bairro::text AS "idBairro", b.nome AS bairro, b.cidade, b.uf AS estado,
 a.foto_url AS "fotoUrl", a.caracteristicas,
 upper(a.status_adocao) AS status, a.id_responsavel::text AS "responsavelId",
 a.data_cadastro AS "criadoEm"
 FROM animal a JOIN bairro b ON a.id_bairro = b.id_bairro`;
@Injectable()
export class AnimalsRepository {
  constructor(private readonly db: UsersService) {}
  get enabled() {
    return this.db.databaseEnabled;
  }
  async list(
    filters: AnimalFilters = {},
    responsibleId?: string,
  ): Promise<Animal[]> {
    const result = await this.db.requirePool().query(
      SELECT +
        `
     WHERE ($1::text = '' OR lower(a.tipo) = lower($1))
       AND ($2::text = '' OR lower(b.nome) = lower($2))
       AND ($3::text = '' OR a.status_adocao = $3)
       AND ($4::integer IS NULL OR a.id_responsavel = $4)
     ORDER BY a.data_cadastro DESC, a.id_animal DESC`,
      [
        filters.especie?.trim() || '',
        filters.bairro?.trim() || '',
        responsibleId
          ? ''
          : filters.status?.trim().toLowerCase() || 'disponivel',
        responsibleId ?? null,
      ],
    );
    return result.rows;
  }
  async find(id: string): Promise<Animal | undefined> {
    if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) return undefined;
    const result = await this.db
      .requirePool()
      .query(SELECT + ' WHERE a.id_animal=$1', [id]);
    const row = result.rows[0];
    return row;
  }
  async updateStatus(animal: Animal): Promise<void> {
    await this.db
      .requirePool()
      .query(
        'UPDATE animal SET status_adocao=$2 WHERE id_animal=$1 AND id_responsavel=$3',
        [animal.id, animal.status.toLowerCase(), animal.responsavelId],
      );
  }
  async insert(animal: Animal): Promise<Animal> {
    const result = await this.db.requirePool().query(
      `INSERT INTO animal (id_responsavel,id_bairro,nome,idade_meses,tipo,caracteristicas,foto_url,data_cadastro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
       RETURNING id_animal::text AS id, data_cadastro`,
      [
        animal.responsavelId,
        animal.idBairro,
        animal.nome,
        animal.idadeMeses,
        animal.especie,
        animal.caracteristicas,
        animal.fotoUrl,
      ],
    );
    return {
      ...animal,
      id: result.rows[0].id,
      criadoEm: result.rows[0].data_cadastro,
    };
  }
  async update(animal: Animal): Promise<void> {
    await this.db.requirePool().query(
      `UPDATE animal SET id_bairro=$2,nome=$3,idade_meses=$4,tipo=$5,caracteristicas=$6,foto_url=$7
       WHERE id_animal=$1 AND id_responsavel=$8`,
      [
        animal.id,
        animal.idBairro,
        animal.nome,
        animal.idadeMeses,
        animal.especie,
        animal.caracteristicas,
        animal.fotoUrl,
        animal.responsavelId,
      ],
    );
  }
  async delete(animal: Animal): Promise<void> {
    await this.db
      .requirePool()
      .query('DELETE FROM animal WHERE id_animal=$1 AND id_responsavel=$2', [
        animal.id,
        animal.responsavelId,
      ]);
  }
}
