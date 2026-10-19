import { UsersModule } from '../users/users.module.js';
import { BairrosModule } from '../bairros/bairros.module.js';
import { AnimalsRepository } from './animals.repository.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AnimalsController } from './animals.controller.js';
import { AnimalsService } from './animals.service.js';

@Module({
  imports: [AuthModule, UsersModule, BairrosModule],
  controllers: [AnimalsController],
  providers: [AnimalsService, AnimalsRepository],
})
export class AnimalsModule {}
