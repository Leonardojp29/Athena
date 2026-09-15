import { Controller, Get, Header, Query } from '@nestjs/common';
import {
  RetosDelImpostorService,
  type RondaDelImpostor,
} from './retos-del-impostor.service.js';

/* Las claves ya jugadas que manda el cliente. Más que el catálogo entero no tiene sentido. */
const TOPE_DE_EXCLUIDOS = 60;

@Controller('juegos/impostor')
export class ImpostorController {
  constructor(private readonly retos: RetosDelImpostorService) {}

  /*
   * Sin caché: cada tanda es un sorteo distinto, y guardarla sería darle a todo el mundo las mismas
   * diez rondas en el mismo orden durante cinco minutos.
   */
  @Get('tanda')
  @Header('Cache-Control', 'no-store')
  async tanda(@Query('excluir') excluir = ''): Promise<{ rondas: RondaDelImpostor[] }> {
    const jugados = excluir.split(',').filter(Boolean).slice(0, TOPE_DE_EXCLUIDOS);
    return { rondas: await this.retos.tanda(jugados) };
  }
}
