export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  criadoEm: Date;
}

export type PublicUser = Omit<User, 'senhaHash'>;
