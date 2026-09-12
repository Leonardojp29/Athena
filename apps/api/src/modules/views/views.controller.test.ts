import { describe, expect, it } from 'vitest';
import { ViewCacheService } from '../../shared/view-cache.service.js';
import { ViewsController } from './views.controller.js';
import type { MundoService } from './mundo.service.js';
import type { ViewsService } from './views.service.js';

describe('ViewsController', () => {
  it('el contador de vivos no vuelve a consultar dentro de su ventana', async () => {
    let consultas = 0;
    const views = {
      enVivo: async () => {
        consultas++;
        return { live: 3 };
      },
    } as unknown as ViewsService;
    const controller = new ViewsController(views, {} as MundoService, new ViewCacheService());

    expect(await controller.enVivo()).toEqual({ live: 3 });
    expect(await controller.enVivo()).toEqual({ live: 3 });
    expect(consultas).toBe(1);
  });

  /*
   * La calculadora se mira mientras se juega la fecha: si hay un partido en curso la tabla cambia
   * cada minuto, y si no, la próxima está a días. Guardarla cinco minutos durante un partido es
   * mostrar una tabla vieja al que la abrió justo para ver cómo quedaba.
   */
  it('la calculadora caduca en un minuto mientras haya un partido en curso', async () => {
    const cache = { wrap: (_clave: string, _ttl: unknown, calcular: () => unknown) => calcular() };
    const cabeceras: Record<string, string> = {};
    const respuesta = {
      setHeader: (nombre: string, valor: string) => {
        cabeceras[nombre] = valor;
      },
    };

    const conVivo = new ViewsController(
      { calculadora: async () => ({ hayEnVivo: true }) } as unknown as ViewsService,
      {} as MundoService,
      cache as unknown as ViewCacheService,
    );
    await conVivo.calculadora('primera-division', respuesta as never);
    expect(cabeceras['Cache-Control']).toContain('s-maxage=60');

    const sinVivo = new ViewsController(
      { calculadora: async () => ({ hayEnVivo: false }) } as unknown as ViewsService,
      {} as MundoService,
      cache as unknown as ViewCacheService,
    );
    await sinVivo.calculadora('primera-division', respuesta as never);
    expect(cabeceras['Cache-Control']).toContain('s-maxage=300');
  });
});
