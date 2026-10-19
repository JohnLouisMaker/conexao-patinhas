import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { PublicUser } from '../users/users.entity.js';
import type {
  CreateAnimalInput,
  CreateInterestInput,
} from './animal.entity.js';
import { AnimalsService } from './animals.service.js';

type AuthenticatedRequest = Request & { user: PublicUser };

@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Get()
  async list(
    @Query('especie') especie?: string,
    @Query('bairro') bairro?: string,
    @Query('status') status?: string,
  ) {
    return {
      animals: await this.animalsService.list({ especie, bairro, status }),
    };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async listMine(@Req() request: AuthenticatedRequest) {
    return {
      animals: await this.animalsService.listForResponsible(request.user.id),
    };
  }

  @Get(':id/interests')
  @UseGuards(JwtAuthGuard)
  async listInterests(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      interests: await this.animalsService.listInterests(id, request.user.id),
    };
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.animalsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: CreateAnimalInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.animalsService.create(body, request.user.id);
  }

  @Post(':id/interests')
  @UseGuards(JwtAuthGuard)
  createInterest(
    @Param('id') id: string,
    @Body() body: CreateInterestInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.animalsService.createInterest(id, body, request.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: unknown },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.animalsService.updateStatus(id, body?.status, request.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: CreateAnimalInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.animalsService.update(id, body, request.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.animalsService.delete(id, request.user.id);
    return { message: 'Anúncio removido com sucesso.' };
  }
}
