export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  telefone: string | null;
  criadoEm: Date;
}

export type PublicUser = Omit<User, 'senhaHash'>;
