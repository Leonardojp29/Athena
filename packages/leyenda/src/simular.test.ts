/**
 * La carrera entera, mil veces.
 *
 * Es el único test que puede afirmar sobre el **ritmo** del juego: cuántas decisiones toma alguien que
 * juega de principio a fin, cuántos títulos junta y cómo sube la escalera de clubes. Nada de eso se
 * ve leyendo una función.
 *
 * Corre contra `mundo.fixture.json`, que es una copia de las veinte ligas reales. Hace falta: con el
 * mundo de tres clubes de `motor.test.ts` cualquiera sale campeón todos los años y el número de
 * títulos no significa nada —medía diecisiete donde el mundo de verdad mide ocho—.
 */
import { describe, expect, it } from 'vitest';
import { abrirCarrera, avanzarCapitulo, eventoPendiente } from './capitulo.js';
import { crearCarrera } from './crear.js';
import type { Carrera, Mundo } from './estado.js';
import type { DatosDeCreacion } from './crear.js';
import fixture from './mundo.fixture.json' with { type: 'json' };

const mundo = fixture as unknown as Mundo;

const datosBase: DatosDeCreacion = {
  nombre: 'Leonardo Jurado',
  dorsal: 10,
  puesto: 'MO',
  pie: 'izquierda',
  pais: 'Perú',
  paisCodigo: 'PE',
  bandera: null,
  ligaSlug: 'primera-division',
  semilla: 123456,
  anio: 2026,
};
const CARRERAS = 600;

/** Un jugador ambicioso: siempre acepta la mejor oferta y siempre patea al ángulo. */
function jugarHasta(semilla: number) {
  let carrera: Carrera = abrirCarrera(crearCarrera({ ...datosBase, semilla }), mundo).carrera;
  let decisiones = 0;
  let mercados = 0;
  let jugadas = 0;
  let tituloEnElDebut = false;
  let vueltas = 0;

  while (carrera.etapa !== 'legado' && vueltas++ < 200) {
    const pendiente = carrera.pendiente;
    const eraDebut = carrera.capitulo === 0;
    let paso;
    if (pendiente?.clase === 'momento') {
      jugadas++;
      paso = avanzarCapitulo(
        carrera,
        { tipo: 'jugar-momento', intencion: { zona: 'der-alta', remate: 'colocada' } },
        mundo,
      );
    } else if (pendiente?.clase === 'decision') {
      const evento = eventoPendiente(carrera, mundo);
      paso = avanzarCapitulo(carrera, { tipo: 'decidir', opcionId: evento?.opciones[0]?.id ?? '' }, mundo);
    } else {
      mercados++;
      const oferta = carrera.ofertas[0];
      paso = avanzarCapitulo(carrera, oferta ? { tipo: 'firmar', ofertaId: oferta.id } : { tipo: 'renovar' }, mundo);
    }
    decisiones++;
    if (eraDebut && paso.capitulo.trofeos.length > 0) tituloEnElDebut = true;
    carrera = paso.carrera;
  }
  return { carrera, decisiones, mercados, jugadas, tituloEnElDebut };
}

const partidas = Array.from({ length: CARRERAS }, (_, i) => jugarHasta(i * 2654435761));
const percentil = (valores: number[], q: number) => {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length * q)] as number;
};

describe('el ritmo de una carrera', () => {
  it('termina siempre, sin quedarse trabada', () => {
    for (const p of partidas) expect(p.carrera.etapa).toBe('legado');
  });

  /* El mercado y una pregunta en cada capítulo, y una jugada de vez en cuando: es el ritmo que el juego promete. */
  it('son dos decisiones por capítulo, y una es siempre el mercado', () => {
    const medias = partidas.reduce((s, p) => s + p.decisiones, 0) / CARRERAS;
    expect(medias).toBeGreaterThanOrEqual(24);
    expect(medias).toBeLessThan(30);
    const jugadas = partidas.reduce((s, p) => s + p.jugadas, 0) / CARRERAS;
    expect(jugadas).toBeGreaterThan(1);
    expect(jugadas).toBeLessThan(5);
    /* El mercado abre en todos los capítulos: doce preguntas de "¿me quedo o me voy?" por carrera. */
    for (const p of partidas) expect(p.mercados).toBeGreaterThanOrEqual(12);
  });

  /*
   * Exigente pero generoso. Antes eran dieciséis o más y el jugador lo dijo: "es poco real que tenga
   * 16 títulos". Ahora la mitad de las carreras termina con ocho y hace falta una muy buena para
   * pasar de catorce.
   */
  it('los títulos quedan en la banda de seis a catorce', () => {
    const titulos = partidas.map((p) => p.carrera.trofeos.length);
    expect(percentil(titulos, 0.25)).toBeGreaterThanOrEqual(4);
    expect(percentil(titulos, 0.5)).toBeGreaterThanOrEqual(6);
    expect(percentil(titulos, 0.5)).toBeLessThanOrEqual(10);
    expect(percentil(titulos, 0.95)).toBeLessThanOrEqual(16);
  });

  /* Con dieciséis años y trece partidos de reserva, el campeón fue el club. */
  it('nadie sale campeón en el capítulo del debut', () => {
    expect(partidas.filter((p) => p.tituloEnElDebut)).toHaveLength(0);
  });

  it('la escalera sube: se empieza chico y se llega arriba', () => {
    const primeros: number[] = [];
    const cumbres: number[] = [];
    for (const { carrera } of partidas) {
      const fuerzas = carrera.temporadas.map((t) => t.ovrFin);
      if (fuerzas.length < 4) continue;
      primeros.push(carrera.temporadas[0]?.ovrInicio ?? 0);
      cumbres.push(Math.max(...fuerzas));
    }
    const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
    expect(media(cumbres)).toBeGreaterThan(media(primeros) + 8);
  });

  it('una carrera se puede acabar antes de tiempo, pero es raro', () => {
    const abruptas = partidas.filter((p) => p.carrera.motivoDeRetiro && p.carrera.motivoDeRetiro !== 'edad');
    const proporcion = abruptas.length / CARRERAS;
    expect(proporcion).toBeLessThan(0.2);
  });
});
