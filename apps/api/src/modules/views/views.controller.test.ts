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
});
