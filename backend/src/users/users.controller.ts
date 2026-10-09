import { Controller, Get } from '@nestjs/common';
import type { PublicUser } from './users.entity.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    const allUsers: PublicUser[] = this.usersService
      .getAllUsers()
      .map(({ senhaHash: _senhaHash, ...user }) => user);
    return {
      users: allUsers,
    };
  }
}
