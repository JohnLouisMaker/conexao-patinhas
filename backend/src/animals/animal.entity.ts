export const ANIMAL_STATUSES = [
  'DISPONIVEL',
  'EM_PROCESSO',
  'ADOTADO',
] as const;

export type AnimalStatus = (typeof ANIMAL_STATUSES)[number];

export const ANIMAL_SPECIES = ['Cachorro', 'Gato', 'Outro'] as const;

export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number];

export interface Animal {
  idBairro?: string;
  idadeMeses?: number;
  id: string;
  nome: string;
  especie: AnimalSpecies;
  raca?: string;
  idade?: string;
  porte?: string;
  bairro: string;
  cidade: string;
  estado: string;
  fotoUrl: string;
  caracteristicas: string | string[];
  descricao?: string;
  status: AnimalStatus;
  responsavelId: string;
  criadoEm: Date;
  atualizadoEm?: Date;
}

export interface CreateAnimalInput {
  idBairro?: unknown;
  idadeMeses?: unknown;
  nome?: unknown;
  especie?: unknown;
  raca?: unknown;
  idade?: unknown;
  porte?: unknown;
  bairro?: unknown;
  cidade?: unknown;
  estado?: unknown;
  fotoUrl?: unknown;
  caracteristicas?: unknown;
  descricao?: unknown;
}

export interface AnimalFilters {
  especie?: string;
  bairro?: string;
  status?: string;
}

export interface CreateInterestInput {
  nome?: unknown;
  email?: unknown;
  telefone?: unknown;
  experiencia?: unknown;
  tipoResidencia?: unknown;
  motivacao?: unknown;
}

export interface AdoptionInterest {
  id: string;
  animalId: string;
  adotanteId: string;
  nome: string;
  email: string;
  telefone: string;
  experiencia: string;
  tipoResidencia: string;
  motivacao: string;
  criadoEm: Date;
}
