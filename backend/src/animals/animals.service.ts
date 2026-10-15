import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  private readonly animals: Animal[] = [];
  private readonly interests: AdoptionInterest[] = [];

  list(filters: AnimalFilters = {}): Animal[] {
    const species = filters.especie?.trim().toLowerCase();
    const neighborhood = filters.bairro?.trim().toLowerCase();
    const status = filters.status?.trim().toUpperCase();

    if (status && !ANIMAL_STATUSES.includes(status as AnimalStatus)) {
      throw new BadRequestException('Status de adoção inválido.');
    }

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

  listForResponsible(responsibleId: string): Animal[] {
    return this.animals.filter(
      (animal) => animal.responsavelId === responsibleId,
    );
  }

  findById(id: string): Animal {
    const animal = this.animals.find((item) => item.id === id);
    if (!animal) throw new NotFoundException('Animal não encontrado.');
    return animal;
  }

  create(input: CreateAnimalInput, responsibleId: string): Animal {
    const animalData = this.validateAnimalInput(input);
    const now = new Date();
    const animal: Animal = {
      ...animalData,
      id: randomBytes(16).toString('hex'),
      status: 'DISPONIVEL',
      responsavelId: responsibleId,
      criadoEm: now,
      atualizadoEm: now,
    };
    this.animals.push(animal);
    return animal;
  }

  update(id: string, input: CreateAnimalInput, responsibleId: string): Animal {
    const animal = this.findById(id);
    this.assertResponsible(animal, responsibleId);
    Object.assign(animal, this.validateAnimalInput(input), {
      atualizadoEm: new Date(),
    });
    return animal;
  }

  updateStatus(
    id: string,
    statusInput: unknown,
    responsibleId: string,
  ): Animal {
    const animal = this.findById(id);
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
    animal.atualizadoEm = new Date();
    return animal;
  }

  delete(id: string, responsibleId: string): void {
    const animal = this.findById(id);
    this.assertResponsible(animal, responsibleId);
    this.animals.splice(this.animals.indexOf(animal), 1);
    for (let index = this.interests.length - 1; index >= 0; index -= 1) {
      if (this.interests[index].animalId === id)
        this.interests.splice(index, 1);
    }
  }

  createInterest(
    animalId: string,
    input: CreateInterestInput,
    adopterId: string,
  ): AdoptionInterest {
    const animal = this.findById(animalId);
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

  listInterests(animalId: string, responsibleId: string): AdoptionInterest[] {
    const animal = this.findById(animalId);
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
