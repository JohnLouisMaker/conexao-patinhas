import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnimalsRepository } from './animals.repository.js';
import { BairrosService } from '../bairros/bairros.service.js';
import { randomBytes } from 'node:crypto';
import {
  ANIMAL_SPECIES,
  ANIMAL_STATUSES,
  type AdoptionInterest,
  type Animal,
  type AnimalFilters,
  type AnimalStatus,
  type CreateAnimalInput,
  type CreateInterestInput,
} from './animal.entity.js';

const REQUIRED_ANIMAL_FIELDS = [
  'nome',
  'raca',
  'idade',
  'porte',
  'bairro',
  'cidade',
  'estado',
  'fotoUrl',
  'descricao',
] as const;

@Injectable()
export class AnimalsService {
  constructor(
    private readonly repository: AnimalsRepository,
    private readonly bairros: BairrosService,
  ) {}
  private async prepareInput(input: CreateAnimalInput) {
    if (!this.repository.enabled) return this.validateAnimalInput(input);
    if (!input || typeof input !== 'object')
      throw new BadRequestException('Dados do animal inválidos.');
    if (
      typeof input.idadeMeses !== 'number' ||
      !Number.isInteger(input.idadeMeses) ||
      input.idadeMeses < 0 ||
      input.idadeMeses > 2147483647
    ) {
      throw new BadRequestException(
        'idadeMeses deve ser um inteiro não negativo.',
      );
    }
    const nome = typeof input.nome === 'string' ? input.nome.trim() : '';
    if (!nome || nome.length > 100)
      throw new BadRequestException(
        'Nome é obrigatório e deve ter até 100 caracteres.',
      );
    if (
      typeof input.especie !== 'string' ||
      !ANIMAL_SPECIES.includes(input.especie as (typeof ANIMAL_SPECIES)[number])
    ) {
      throw new BadRequestException(
        `Espécie inválida. Use: ${ANIMAL_SPECIES.join(', ')}.`,
      );
    }
    if (
      typeof input.caracteristicas !== 'string' ||
      !input.caracteristicas.trim()
    ) {
      throw new BadRequestException(
        'Características devem ser um texto não vazio.',
      );
    }
    if (
      typeof input.fotoUrl !== 'string' ||
      !this.isValidUrl(input.fotoUrl.trim())
    ) {
      throw new BadRequestException('Informe uma URL válida para a foto.');
    }
    const bairro = await this.bairros.find(input.idBairro);
    return {
      nome,
      especie: input.especie as (typeof ANIMAL_SPECIES)[number],
      idadeMeses: input.idadeMeses,
      idBairro: bairro.id,
      bairro: bairro.nome,
      cidade: bairro.cidade,
      estado: bairro.uf,
      fotoUrl: input.fotoUrl.trim(),
      caracteristicas: input.caracteristicas.trim(),
    };
  }

  private readonly animals: Animal[] = [];
  private readonly interests: AdoptionInterest[] = [];

  async list(filters: AnimalFilters = {}): Promise<Animal[]> {
    const species = filters.especie?.trim().toLowerCase();
    const neighborhood = filters.bairro?.trim().toLowerCase();
    const status = filters.status?.trim().toUpperCase();

    if (status && !ANIMAL_STATUSES.includes(status as AnimalStatus)) {
      throw new BadRequestException('Status de adoção inválido.');
    }

    if (this.repository.enabled) return this.repository.list(filters);
    return this.animals.filter((animal) => {
      const matchesSpecies =
        !species || animal.especie.toLowerCase() === species;
      const matchesNeighborhood =
        !neighborhood || animal.bairro.toLowerCase() === neighborhood;
      const matchesStatus = status
        ? animal.status === status
        : animal.status === 'DISPONIVEL';
      return matchesSpecies && matchesNeighborhood && matchesStatus;
    });
  }

  async listForResponsible(responsibleId: string): Promise<Animal[]> {
    if (this.repository.enabled) return this.repository.list({}, responsibleId);
    return this.animals.filter(
      (animal) => animal.responsavelId === responsibleId,
    );
  }

  async findById(id: string): Promise<Animal> {
    const animal = this.repository.enabled
      ? await this.repository.find(id)
      : this.animals.find((item) => item.id === id);
    if (!animal) throw new NotFoundException('Animal não encontrado.');
    return animal;
  }

  async create(
    input: CreateAnimalInput,
    responsibleId: string,
  ): Promise<Animal> {
    const animalData = await this.prepareInput(input);
    const now = new Date();
    const animal: Animal = {
      ...animalData,
      id: randomBytes(16).toString('hex'),
      status: 'DISPONIVEL',
      responsavelId: responsibleId,
      criadoEm: now,
      ...(!this.repository.enabled ? { atualizadoEm: now } : {}),
    };
    if (this.repository.enabled) return this.repository.insert(animal);
    this.animals.push(animal);
    return animal;
  }

  async update(
    id: string,
    input: CreateAnimalInput,
    responsibleId: string,
  ): Promise<Animal> {
    const animal = await this.findById(id);
    this.assertResponsible(animal, responsibleId);
    Object.assign(animal, await this.prepareInput(input), {
      ...(!this.repository.enabled ? { atualizadoEm: new Date() } : {}),
    });
    if (this.repository.enabled) await this.repository.update(animal);
    return animal;
  }

  async updateStatus(
    id: string,
    statusInput: unknown,
    responsibleId: string,
  ): Promise<Animal> {
    const animal = await this.findById(id);
    this.assertResponsible(animal, responsibleId);
    if (
      typeof statusInput !== 'string' ||
      !ANIMAL_STATUSES.includes(statusInput as AnimalStatus)
    ) {
      throw new BadRequestException(
        `Status inválido. Use: ${ANIMAL_STATUSES.join(', ')}.`,
      );
    }

    animal.status = statusInput as AnimalStatus;
    if (!this.repository.enabled) animal.atualizadoEm = new Date();
    if (this.repository.enabled) await this.repository.updateStatus(animal);
    return animal;
  }

  async delete(id: string, responsibleId: string): Promise<void> {
    const animal = await this.findById(id);
    this.assertResponsible(animal, responsibleId);
    if (this.repository.enabled) await this.repository.delete(animal);
    else this.animals.splice(this.animals.indexOf(animal), 1);
    for (let index = this.interests.length - 1; index >= 0; index -= 1) {
      if (this.interests[index].animalId === id)
        this.interests.splice(index, 1);
    }
  }

  async createInterest(
    animalId: string,
    input: CreateInterestInput,
    adopterId: string,
  ): Promise<AdoptionInterest> {
    const animal = await this.findById(animalId);
    if (animal.status !== 'DISPONIVEL') {
      throw new ConflictException(
        'Este animal não está aceitando novas manifestações de interesse.',
      );
    }
    if (animal.responsavelId === adopterId) {
      throw new ForbiddenException(
        'O responsável pelo anúncio não pode demonstrar interesse no próprio animal.',
      );
    }
    if (
      this.interests.some(
        (interest) =>
          interest.animalId === animalId && interest.adotanteId === adopterId,
      )
    ) {
      throw new ConflictException('Você já demonstrou interesse neste animal.');
    }

    const interestData = this.validateInterestInput(input);
    const interest: AdoptionInterest = {
      ...interestData,
      id: randomBytes(16).toString('hex'),
      animalId,
      adotanteId: adopterId,
      criadoEm: new Date(),
    };
    this.interests.push(interest);
    return interest;
  }

  async listInterests(
    animalId: string,
    responsibleId: string,
  ): Promise<AdoptionInterest[]> {
    const animal = await this.findById(animalId);
    this.assertResponsible(animal, responsibleId);
    return this.interests.filter((interest) => interest.animalId === animalId);
  }

  private assertResponsible(animal: Animal, userId: string): void {
    if (animal.responsavelId !== userId) {
      throw new ForbiddenException(
        'Somente o responsável pelo anúncio pode realizar esta ação.',
      );
    }
  }

  private validateAnimalInput(input: CreateAnimalInput) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Dados do animal inválidos.');
    }

    const values = Object.fromEntries(
      REQUIRED_ANIMAL_FIELDS.map((field) => [
        field,
        typeof input[field] === 'string' ? input[field].trim() : '',
      ]),
    ) as Record<(typeof REQUIRED_ANIMAL_FIELDS)[number], string>;

    if (Object.values(values).some((value) => !value)) {
      throw new BadRequestException(
        'Preencha todos os campos obrigatórios do animal.',
      );
    }
    if (
      typeof input.especie !== 'string' ||
      !ANIMAL_SPECIES.includes(input.especie as (typeof ANIMAL_SPECIES)[number])
    ) {
      throw new BadRequestException(
        `Espécie inválida. Use: ${ANIMAL_SPECIES.join(', ')}.`,
      );
    }
    if (typeof input.fotoUrl !== 'string' || !this.isValidUrl(values.fotoUrl)) {
      throw new BadRequestException('Informe uma URL válida para a foto.');
    }
    if (
      input.caracteristicas !== undefined &&
      (!Array.isArray(input.caracteristicas) ||
        input.caracteristicas.some((item) => typeof item !== 'string'))
    ) {
      throw new BadRequestException(
        'As características devem ser uma lista de textos.',
      );
    }

    return {
      ...values,
      especie: input.especie as (typeof ANIMAL_SPECIES)[number],
      caracteristicas: Array.isArray(input.caracteristicas)
        ? input.caracteristicas.map((item) => (item as string).trim())
        : [],
    };
  }

  private validateInterestInput(input: CreateInterestInput) {
    if (!input || typeof input !== 'object') {
      throw new BadRequestException('Dados do interesse inválidos.');
    }

    const fields = [
      'nome',
      'email',
      'telefone',
      'experiencia',
      'tipoResidencia',
      'motivacao',
    ] as const;
    const values = Object.fromEntries(
      fields.map((field) => [
        field,
        typeof input[field] === 'string' ? input[field].trim() : '',
      ]),
    ) as Record<(typeof fields)[number], string>;

    if (Object.values(values).some((value) => !value)) {
      throw new BadRequestException(
        'Preencha todos os campos da manifestação de interesse.',
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      throw new BadRequestException('Informe um e-mail válido.');
    }

    return values;
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
