import { Controller, Get, Header } from '@nestjs/common';
import {
  PreguntasDel60Service,
  type PreguntaParaJugar,
} from './preguntas-del-60.service.js';

@Controller('juegos/60-segundos')
export class SesentaController {
  constructor(private readonly preguntas: PreguntasDel60Service) {}

  /*
   * Las cincuenta de una vez, barajadas. Son unos doce kilobytes y evitan un viaje a la red entre
   * pregunta y pregunta, que en un juego de sesenta segundos se nota más que el peso.
   *
   * Sin caché: cada partida es un sorteo distinto, y guardarlo sería servirle a todo el mundo el
   * mismo orden durante minutos.
   */
  @Get('preguntas')
  @Header('Cache-Control', 'no-store')
  async catalogo(): Promise<{ preguntas: PreguntaParaJugar[] }> {
    return { preguntas: await this.preguntas.paraJugar() };
  }
}
