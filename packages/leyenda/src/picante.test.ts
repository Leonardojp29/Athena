/**
 * La escalera del escándalo, medida jugando.
 *
 * El catálogo puede tener los niveles bien puestos y la curva salir plana igual, porque lo que decide
 * qué sale es el cruce de la categoría, la rareza y las condiciones. Antes pasaba exactamente eso: de
 * los veinticuatro a los treinta y seis el juego ofrecía lo mismo, y a los dieciocho —la edad más
 * escandalizable que existe— ofrecía un rondo y un doble turno.
 */
import { describe, expect, it } from 'vitest';
import { abrirCarrera, avanzarCapitulo, eventoPendiente } from './capitulo.js';
import { crearCarrera, type DatosDeCreacion } from './crear.js';
import type { Carrera, Mundo } from './estado.js';
import { CATALOGO, picanteDe } from './eventos/index.js';
import fixture from './mundo.fixture.json' with { type: 'json' };

const mundo = fixture as unknown as Mundo;
const NIVEL = new Map(CATALOGO.map((e) => [e.id, picanteDe(e)]));
/* Las facturas de una cadena entran sin pasar por el filtro: lo que se gradúa es dónde empieza. */
const FACTURAS = new Set(
  CATALOGO.flatMap((e) =>
    e.opciones.flatMap((o) =>
      [o.efectos, o.riesgo?.bien, o.riesgo?.mal].flatMap((efectos) => efectos?.luego?.eventoId ?? []),
    ),
  ),
);

const datos: DatosDeCreacion = {
  nombre: 'Leonardo Jurado',
  dorsal: 10,
  puesto: 'MO',
  pie: 'izquierda',
  pais: 'Perú',
  paisCodigo: 'PE',
  bandera: null,
  ligaSlug: 'primera-division',
  semilla: 1,
  anio: 2026,
};

/** Qué picante vio el jugador en cada capítulo, a lo largo de cuatrocientas carreras. */
const porCapitulo = new Map<number, number[]>();
for (let semilla = 0; semilla < 400; semilla++) {
  let carrera: Carrera = abrirCarrera(crearCarrera({ ...datos, semilla: semilla * 7919 + 3 }), mundo).carrera;
  let vueltas = 0;
  while (carrera.etapa !== 'legado' && vueltas++ < 200) {
    const pendiente = carrera.pendiente;
    if (pendiente?.clase === 'decision') {
      const abierto = eventoPendiente(carrera, mundo);
      const nivel = abierto ? NIVEL.get(abierto.evento.id) : undefined;
      if (abierto && nivel && !FACTURAS.has(abierto.evento.id)) {
        const lista = porCapitulo.get(carrera.capitulo) ?? [];
        lista.push(nivel);
        porCapitulo.set(carrera.capitulo, lista);
      }
      carrera = avanzarCapitulo(carrera, { tipo: 'decidir', opcionId: abierto?.opciones[0]?.id ?? '' }, mundo).carrera;
    } else if (pendiente?.clase === 'momento') {
      carrera = avanzarCapitulo(
        carrera,
        { tipo: 'jugar-momento', intencion: { zona: 'der-alta', remate: 'colocada' } },
        mundo,
      ).carrera;
    } else {
      const oferta = carrera.ofertas[0];
      carrera = avanzarCapitulo(
        carrera,
        oferta ? { tipo: 'firmar', ofertaId: oferta.id } : { tipo: 'renovar' },
        mundo,
      ).carrera;
    }
  }
}

const medio = (capitulos: number[]): number => {
  const niveles = capitulos.flatMap((c) => porCapitulo.get(c) ?? []);
  return niveles.reduce((suma, n) => suma + n, 0) / niveles.length;
};
const proporcionDe = (nivel: number, capitulos: number[]): number => {
  const niveles = capitulos.flatMap((c) => porCapitulo.get(c) ?? []);
  return niveles.filter((n) => n === nivel).length / niveles.length;
};

describe('la escalera del picante', () => {
  it('el juego ofrece decisiones en todos los capítulos', () => {
    for (let capitulo = 1; capitulo <= 11; capitulo++) {
      expect((porCapitulo.get(capitulo) ?? []).length, `capítulo ${capitulo}`).toBeGreaterThan(50);
    }
  });

  /* A los dieciocho pasa lo de un chico que recién llegó; a los veinte entra la farándula, y nada más fuerte. */
  it('a los 18 no sube del primer nivel, y hasta los 20 no hay nada del más fuerte', () => {
    expect(proporcionDe(2, [1])).toBe(0);
    expect(proporcionDe(3, [1, 2])).toBe(0);
  });

  it('el escándalo sube tramo por tramo', () => {
    const chico = medio([1, 2]);
    const medioDeLaCarrera = medio([3, 4, 5]);
    const grande = medio([6, 7, 8]);
    const final = medio([9, 10, 11]);
    expect(medioDeLaCarrera).toBeGreaterThan(chico + 0.25);
    expect(grande).toBeGreaterThan(medioDeLaCarrera + 0.15);
    expect(final).toBeGreaterThanOrEqual(grande - 0.05);
  });

  it('lo más fuerte solo aparece en la segunda mitad', () => {
    expect(proporcionDe(3, [3, 4, 5])).toBe(0);
    expect(proporcionDe(3, [6, 7, 8, 9, 10, 11])).toBeGreaterThan(0.08);
  });
});
