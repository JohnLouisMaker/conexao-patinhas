import { Module } from '@nestjs/common';
import { AnimalsModule } from './animals/animals.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [AuthModule, UsersModule, AnimalsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
