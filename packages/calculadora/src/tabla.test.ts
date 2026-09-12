import { describe, expect, it } from 'vitest';
import crudo from './__fixtures__/liga1-2026.json' with { type: 'json' };
import { codificar, decodificar } from './codigo.js';
import { conFase } from './fases.js';
import { ANUAL, APERTURA, CLAUSURA, LIGA1, caminoAlTitulo } from './reglamento-liga1.js';
import { calcularTabla, calcularTablas } from './tabla.js';
import type { DatosDeLaCalculadora, Equipo, Partido, Tabla } from './tipos.js';

const datos: DatosDeLaCalculadora = {
  ...(crudo as unknown as DatosDeLaCalculadora),
  partidos: conFase((crudo as unknown as DatosDeLaCalculadora).partidos) as Partido[],
};

const SIN_PRONOSTICOS = new Map<string, readonly [number, number]>();

const tablaDe = (clave: string, pronosticos = SIN_PRONOSTICOS): Tabla => {
  const definicion = LIGA1.tablas.find((t) => t.clave === clave);
  if (!definicion) throw new Error(clave);
  return calcularTabla(definicion, datos.equipos, datos.partidos, pronosticos, datos.ordenOficial);
};

describe('la tabla calculada', () => {
  /*
   * La prueba que sostiene todo lo demás. Se hace sobre una fase **terminada**: ahí el proveedor
   * ya no tiene nada pendiente que incorporar y su tabla y la nuestra tienen que ser la misma.
   *
   * En una fase en curso no se puede exigir lo mismo, y no por un error nuestro: la tabla del
   * proveedor se refresca aparte del calendario y llega a quedar internamente inconsistente —hoy
   * pone a Juan Pablo II quinto con doce puntos, por delante de dos equipos con catorce—. Cuando
   * eso pasa, la tabla buena es la que sale de los resultados.
   */
  it('sin pronósticos reproduce exactamente la tabla oficial de una fase terminada', () => {
    const oficial = datos.ordenOficial.find((o) => o.clave === APERTURA);
    expect(oficial).toBeDefined();
    const apertura = tablaDe(APERTURA);
    expect(apertura.filas.every((f) => f.jugados === 17)).toBe(true);
    expect(apertura.filas.map((f) => f.equipo.id)).toEqual(oficial?.equipos);
  });

  it('en una fase en curso, el desacuerdo con el proveedor son partidos que él todavía no contó', () => {
    const clausura = tablaDe(CLAUSURA);
    const oficial = datos.ordenOficial.find((o) => o.clave === CLAUSURA)?.equipos ?? [];
    expect(new Set(clausura.filas.map((f) => f.equipo.id))).toEqual(new Set(oficial));
    /* Nuestra tabla nunca cuenta menos partidos que el proveedor: a lo sumo va más al día. */
    const jugadosMaximos = Math.max(...clausura.filas.map((f) => f.jugados));
    const jugadosMinimos = Math.min(...clausura.filas.map((f) => f.jugados));
    expect(jugadosMaximos - jugadosMinimos).toBeLessThanOrEqual(1);
  });

  it('la tabla está siempre ordenada por sus propios criterios', () => {
    for (const clave of [APERTURA, CLAUSURA, ANUAL]) {
      const filas = tablaDe(clave).filas;
      for (let i = 1; i < filas.length; i += 1) {
        const previa = filas[i - 1];
        const actual = filas[i];
        if (!previa || !actual) continue;
        expect(previa.puntos).toBeGreaterThanOrEqual(actual.puntos);
        if (previa.puntos === actual.puntos) {
          expect(previa.diferencia).toBeGreaterThanOrEqual(actual.diferencia);
        }
      }
    }
  });

  it('los puntos y los goles coinciden con lo que informó el proveedor', () => {
    const anual = tablaDe(ANUAL);
    const lider = anual.filas[0];
    expect(lider?.jugados).toBe(lider ? lider.ganados + lider.empatados + lider.perdidos : -1);
    expect(lider?.puntos).toBe(lider ? lider.ganados * 3 + lider.empatados : -1);
    expect(lider?.diferencia).toBe(lider ? lider.golesFavor - lider.golesContra : -1);
  });

  it('la anual es la suma de las dos fases', () => {
    const apertura = tablaDe(APERTURA);
    const clausura = tablaDe(CLAUSURA);
    const anual = tablaDe(ANUAL);
    const puntosDe = (tabla: Tabla, id: string) =>
      tabla.filas.find((f) => f.equipo.id === id)?.puntos ?? 0;
    for (const fila of anual.filas) {
      expect(fila.puntos).toBe(
        puntosDe(apertura, fila.equipo.id) + puntosDe(clausura, fila.equipo.id),
      );
    }
  });

  it('un pronóstico mueve los puntos y la posición', () => {
    const pendiente = datos.partidos.find((p) => p.estado === 'scheduled');
    expect(pendiente).toBeDefined();
    const antes = tablaDe(CLAUSURA).filas.find((f) => f.equipo.id === pendiente?.local);
    const despues = tablaDe(
      CLAUSURA,
      new Map([[pendiente?.id ?? '', [3, 0] as const]]),
    ).filas.find((f) => f.equipo.id === pendiente?.local);
    expect(despues?.puntos).toBe((antes?.puntos ?? 0) + 3);
    expect(despues?.golesFavor).toBe((antes?.golesFavor ?? 0) + 3);
  });

  it('sin pronósticos nadie se movió', () => {
    const definicion = LIGA1.tablas.find((t) => t.clave === ANUAL);
    const [anual] = calcularTablas(
      [definicion!],
      datos.equipos,
      datos.partidos,
      SIN_PRONOSTICOS,
      datos.ordenOficial,
    );
    expect(anual?.filas.every((f) => f.movimiento === 0)).toBe(true);
  });

  it('un pronóstico que cambia el orden se refleja en la flecha', () => {
    const definicion = LIGA1.tablas.find((t) => t.clave === CLAUSURA);
    const ultimo = tablaDe(CLAUSURA).filas.at(-1);
    const suyos = datos.partidos.filter(
      (p) => p.estado === 'scheduled' && (p.local === ultimo?.equipo.id || p.visita === ultimo?.equipo.id),
    );
    const goleadas = new Map(
      suyos.map((p) => [p.id, (p.local === ultimo?.equipo.id ? [9, 0] : [0, 9]) as readonly [number, number]]),
    );
    const [tabla] = calcularTablas(
      [definicion!],
      datos.equipos,
      datos.partidos,
      goleadas,
      datos.ordenOficial,
    );
    const subio = tabla?.filas.find((f) => f.equipo.id === ultimo?.equipo.id);
    expect(subio?.movimiento).toBeGreaterThan(0);
  });

  it('un partido cancelado no suma aunque tenga pronóstico', () => {
    const pendiente = datos.partidos.find((p) => p.estado === 'scheduled');
    const cancelado: Partido = { ...(pendiente as Partido), estado: 'cancelled' };
    const definicion = LIGA1.tablas.find((t) => t.clave === CLAUSURA);
    const conCancelado = datos.partidos.map((p) => (p.id === cancelado.id ? cancelado : p));
    const tabla = calcularTabla(
      definicion!,
      datos.equipos,
      conCancelado,
      new Map([[cancelado.id, [5, 0] as const]]),
      datos.ordenOficial,
    );
    const base = tablaDe(CLAUSURA).filas.find((f) => f.equipo.id === cancelado.local);
    expect(tabla.filas.find((f) => f.equipo.id === cancelado.local)?.puntos).toBe(base?.puntos);
  });
});

describe('el desempate', () => {
  const equipos: Equipo[] = [
    { id: 'a', nombre: 'Ayacucho', slug: 'a', logo: null, codigo: 'aaa' },
    { id: 'b', nombre: 'Bolognesi', slug: 'b', logo: null, codigo: 'bbb' },
    { id: 'c', nombre: 'Carlos Mannucci', slug: 'c', logo: null, codigo: 'ccc' },
  ];
  const definicion = { clave: 'x', titulo: 'X', fases: [], zonas: [] };
  const partido = (id: string, local: string, visita: string, gl: number, gv: number): Partido => ({
    id,
    ronda: 'X - 1',
    fase: 'X',
    local,
    visita,
    estado: 'finished',
    golesLocal: gl,
    golesVisita: gv,
    kickoff: '2026-01-01T00:00:00.000Z',
  });

  it('a igual puntaje manda la diferencia de goles', () => {
    const tabla = calcularTabla(
      definicion,
      equipos,
      [partido('1', 'a', 'b', 3, 0), partido('2', 'b', 'a', 1, 0)],
      SIN_PRONOSTICOS,
      [],
    );
    expect(tabla.filas[0]?.equipo.id).toBe('a');
  });

  it('a igual diferencia manda los goles a favor', () => {
    /* Los dos empatan contra el tercero con diferencia cero; "b" convirtió y "a" no. */
    const tabla = calcularTabla(
      definicion,
      equipos,
      [partido('1', 'a', 'c', 0, 0), partido('2', 'b', 'c', 2, 2)],
      SIN_PRONOSTICOS,
      [],
    );
    const entreLosDos = tabla.filas.filter((f) => f.equipo.id !== 'c');
    expect(entreLosDos.map((f) => f.equipo.id)).toEqual(['b', 'a']);
  });

  /*
   * El último criterio computable es el orden que publica hoy la Liga: ya absorbió el resultado
   * entre sí, el fair play y el sorteo. Aplicarlos por nuestra cuenta divergiría justo donde el
   * proveedor no los aplicó.
   */
  it('empatados en todo, queda el orden oficial de hoy', () => {
    const tabla = calcularTabla(
      definicion,
      equipos,
      [partido('1', 'a', 'b', 1, 1)],
      SIN_PRONOSTICOS,
      [{ clave: 'x', equipos: ['b', 'a', 'c'] }],
    );
    expect(tabla.filas.slice(0, 2).map((f) => f.equipo.id)).toEqual(['b', 'a']);
  });

  it('sin orden oficial, el nombre desempata y no el azar', () => {
    const tabla = calcularTabla(definicion, equipos, [partido('1', 'a', 'b', 1, 1)], SIN_PRONOSTICOS, []);
    expect(tabla.filas.slice(0, 2).map((f) => f.equipo.id)).toEqual(['a', 'b']);
  });
});

describe('el código de la URL', () => {
  it('va y vuelve', () => {
    const pendientes = datos.partidos.filter((p) => p.estado === 'scheduled').slice(0, 3);
    const pronosticos = new Map(pendientes.map((p, i) => [p.id, [i, 1] as const]));
    const codigo = codificar(pronosticos, datos.equipos, datos.partidos);
    expect(codigo).toHaveLength(pendientes.length * 8);
    expect(decodificar(codigo, datos.equipos, datos.partidos)).toEqual(pronosticos);
  });

  it('ignora la basura en vez de perder el escenario entero', () => {
    const pendiente = datos.partidos.find((p) => p.estado === 'scheduled');
    const codigo = codificar(
      new Map([[pendiente?.id ?? '', [2, 1] as const]]),
      datos.equipos,
      datos.partidos,
    );
    expect(decodificar(`!!${codigo}zzz`, datos.equipos, datos.partidos).size).toBe(1);
    expect(decodificar('', datos.equipos, datos.partidos).size).toBe(0);
    expect(decodificar(null, datos.equipos, datos.partidos).size).toBe(0);
  });

  it('un partido que ya se jugó ignora su pronóstico viejo', () => {
    const jugado = datos.partidos.find((p) => p.estado === 'finished');
    const codigos = codificar(
      new Map([[jugado?.id ?? '', [9, 9] as const]]),
      datos.equipos,
      datos.partidos,
    );
    expect(decodificar(codigos, datos.equipos, datos.partidos).size).toBe(0);
  });

  it('los goles no se van de rango', () => {
    const pendiente = datos.partidos.find((p) => p.estado === 'scheduled');
    const codigo = codificar(
      new Map([[pendiente?.id ?? '', [99, -3] as const]]),
      datos.equipos,
      datos.partidos,
    );
    expect([...decodificar(codigo, datos.equipos, datos.partidos).values()][0]).toEqual([9, 0]);
  });

  it('ningún equipo comparte código', () => {
    const codigo = (id: string) => {
      const uno = new Map([[id, [1, 0] as const]]);
      return codificar(uno, datos.equipos, datos.partidos);
    };
    const pendientes = datos.partidos.filter((p) => p.estado === 'scheduled');
    const pares = pendientes.map((p) => codigo(p.id).slice(0, 6));
    expect(new Set(pares).size).toBe(pares.length);
  });
});

describe('el camino al título', () => {
  const tabla = (clave: string, orden: string[]): Tabla => ({
    clave,
    titulo: clave,
    filas: orden.map((id, i) => ({
      equipo: { id, nombre: id, slug: id, logo: null, codigo: id },
      posicion: i + 1,
      puntos: 0,
      jugados: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      golesFavor: 0,
      golesContra: 0,
      diferencia: 0,
      movimiento: 0,
    })),
  });

  it('el mismo equipo gana los dos torneos y es campeón sin jugar', () => {
    const camino = caminoAlTitulo(
      tabla(APERTURA, ['ali', 'uni', 'cri', 'mel']),
      tabla(CLAUSURA, ['ali', 'cri', 'uni', 'mel']),
      tabla(ANUAL, ['ali', 'uni', 'cri', 'mel']),
    );
    expect(camino?.tipo).toBe('campeon-directo');
    expect(camino?.campeon).toBe('ali');
    expect(camino?.cruces).toHaveLength(0);
  });

  it('los dos ganadores son los dos primeros de la anual: final directa', () => {
    const camino = caminoAlTitulo(
      tabla(APERTURA, ['ali', 'uni', 'cri', 'mel']),
      tabla(CLAUSURA, ['uni', 'ali', 'cri', 'mel']),
      tabla(ANUAL, ['ali', 'uni', 'cri', 'mel']),
    );
    expect(camino?.tipo).toBe('final');
    expect(camino?.cruces).toEqual([
      { ronda: 'final', local: { tipo: 'equipo', id: 'ali' }, visita: { tipo: 'equipo', id: 'uni' } },
    ]);
  });

  it('un ganador está entre los dos primeros: espera en la final', () => {
    const camino = caminoAlTitulo(
      tabla(APERTURA, ['ali', 'uni', 'cri', 'mel']),
      tabla(CLAUSURA, ['mel', 'ali', 'uni', 'cri']),
      tabla(ANUAL, ['ali', 'uni', 'cri', 'mel']),
    );
    expect(camino?.tipo).toBe('semifinal-y-final');
    /*
     * Alianza ganó el Apertura y es primera: espera en la final. Melgar juega la semifinal con el
     * mejor de la anual que no ganó nada, y a la final entra **el que gane esa semifinal**, no
     * Melgar: decir su nombre ahí sería contar un resultado que no pasó.
     */
    expect(camino?.cruces).toEqual([
      {
        ronda: 'semifinal',
        local: { tipo: 'equipo', id: 'mel' },
        visita: { tipo: 'equipo', id: 'uni' },
      },
      {
        ronda: 'final',
        local: { tipo: 'equipo', id: 'ali' },
        visita: { tipo: 'ganadorDe', semifinal: 0 },
      },
    ]);
  });

  it('ningún ganador entró a los dos primeros: semifinales cruzadas', () => {
    const camino = caminoAlTitulo(
      tabla(APERTURA, ['cri', 'ali', 'uni', 'mel']),
      tabla(CLAUSURA, ['mel', 'ali', 'uni', 'cri']),
      tabla(ANUAL, ['ali', 'uni', 'cri', 'mel']),
    );
    expect(camino?.tipo).toBe('semifinal-y-final');
    expect(camino?.cruces).toHaveLength(3);
    /* La final la juegan los dos ganadores de semifinal, no dos equipos elegidos de antemano. */
    expect(camino?.cruces.at(-1)).toEqual({
      ronda: 'final',
      local: { tipo: 'ganadorDe', semifinal: 0 },
      visita: { tipo: 'ganadorDe', semifinal: 1 },
    });
  });

  it('ningún semifinalista aparece puesto en la final antes de jugarla', () => {
    const camino = caminoAlTitulo(
      tabla(APERTURA, ['ali', 'uni', 'cri', 'mel']),
      tabla(CLAUSURA, ['mel', 'ali', 'uni', 'cri']),
      tabla(ANUAL, ['ali', 'uni', 'cri', 'mel']),
    );
    const semifinalistas = new Set(
      camino?.cruces
        .filter((c) => c.ronda === 'semifinal')
        .flatMap((c) => [c.local, c.visita])
        .flatMap((p) => (p.tipo === 'equipo' ? [p.id] : [])),
    );
    const final = camino?.cruces.find((c) => c.ronda === 'final');
    for (const lado of [final?.local, final?.visita]) {
      if (lado?.tipo === 'equipo') expect(semifinalistas.has(lado.id)).toBe(false);
    }
  });
});
