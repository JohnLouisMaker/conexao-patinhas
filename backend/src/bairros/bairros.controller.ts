import { Controller, Get, Query } from '@nestjs/common';
import { BairrosService } from './bairros.service.js';
@Controller('bairros')
export class BairrosController {
  constructor(private readonly bairros: BairrosService) {}
  @Get()
  async list(@Query('cidade') cidade?: string, @Query('uf') uf?: string) {
    return { bairros: await this.bairros.list(cidade, uf) };
  }
}
