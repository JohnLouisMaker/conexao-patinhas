import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { BairrosService } from './bairros.service.js';
import { BairrosController } from './bairros.controller.js';
@Module({
  imports: [UsersModule],
  providers: [BairrosService],
  controllers: [BairrosController],
  exports: [BairrosService],
})
export class BairrosModule {}
