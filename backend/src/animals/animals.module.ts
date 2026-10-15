import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AnimalsController } from './animals.controller.js';
import { AnimalsService } from './animals.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AnimalsController],
  providers: [AnimalsService],
})
export class AnimalsModule {}
