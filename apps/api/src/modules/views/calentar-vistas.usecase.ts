import { Injectable } from '@nestjs/common';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { logJson } from '../../shared/observability.js';
import { ViewsService } from './views.service.js';

/** Mismos plazos que declara el controlador: una vista calentada vale lo mismo que una pedida. */
const FRESCURA_S = { competition: 300, team: 300, player: 600, match: 3600 } as const;

export type VistaCalentable =
  | { tipo: 'competition'; slug: string }
  | { tipo: 'team'; slug: string }
  | { tipo: 'player'; slug: string }
  | { tipo: 'match'; id: string };

/**
 * Calcula una vista antes de que alguien la pida.
 *
 * El worker es el único que sabe cuándo cambió algo: cuando un partido termina, la tabla de su
 * competencia y las páginas de los dos equipos quedaron viejas. Recalcularlas acá cuesta lo mismo
 * que le costaría al primer visitante, con la diferencia de que él ya no lo paga.
 */
@Injectable()
export class CalentarVistasUseCase {
  constructor(
    private readonly views: ViewsService,
    private readonly cache: ViewCacheService,
  ) {}

  async ejecutar(vistas: VistaCalentable[]): Promise<number> {
    let calentadas = 0;
    for (const vista of vistas) {
      try {
        await this.calentarUna(vista);
        calentadas++;
      } catch (error) {
        logJson('warn', 'calentado_fallido', {
          vista: JSON.stringify(vista),
          error: String(error).slice(0, 160),
        });
      }
    }
    logJson('info', 'vistas_calentadas', { pedidas: vistas.length, calentadas });
    return calentadas;
  }

  private async calentarUna(vista: VistaCalentable): Promise<void> {
    switch (vista.tipo) {
      case 'competition':
        return this.guardar(`competition:${vista.slug}:actual`, FRESCURA_S.competition, () =>
          this.views.competition(vista.slug),
        );
      case 'team':
        return this.guardar(`team:${vista.slug}`, FRESCURA_S.team, () => this.views.team(vista.slug));
      case 'player':
        return this.guardar(`player:${vista.slug}`, FRESCURA_S.player, () =>
          this.views.player(vista.slug),
        );
      case 'match':
        return this.guardar(`match:${vista.id}`, FRESCURA_S.match, () => this.views.match(vista.id));
    }
  }

  /* Se borra primero y se recalcula después: el objetivo es reemplazar lo viejo, no servirlo. */
  private async guardar(
    clave: string,
    frescura: number,
    calcular: () => Promise<unknown>,
  ): Promise<void> {
    this.cache.borrar(clave);
    await this.cache.wrap(clave, frescura, calcular);
  }
}
