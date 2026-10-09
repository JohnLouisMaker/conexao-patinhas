import { Injectable } from '@nestjs/common';
import { User } from './users.entity.js';
@Injectable()
export class UsersService {
  users: User[] = [];

  createUser(user: User): User {
    this.users.push(user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email === email);
  }

  getAllUsers(): User[] {
    return this.users;
  }
}
