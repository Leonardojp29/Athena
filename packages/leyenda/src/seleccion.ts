/**
 * La selección.
 *
 * Hasta acá era decorativa: un umbral de OVR encendía un contador de convocatorias que no llevaba a
 * ninguna parte, y la clase de trofeo `'seleccion'` estaba declarada en el estado sin que nadie la
 * produjera nunca. Un futbolista no sueña con convocatorias: sueña con un Mundial.
 *
 * El calendario es el de verdad y encaja con los años del juego —una carrera de 2026 a 2050 cruza
 * seis Mundiales— así que no hay que inventar torneos: hay que jugarlos.
 */
import { campana, chance, entre, limitar, type Azar } from './azar.js';
import type { Carrera, Mundo, TorneoDeSeleccion, Trofeo } from './estado.js';

/** El Mundial cae cada cuatro años desde 2026. La continental, en el medio. */
export const HAY_MUNDIAL = (anio: number): boolean => anio >= 2026 && (anio - 2026) % 4 === 0;
export const HAY_CONTINENTAL = (anio: number): boolean => anio >= 2028 && (anio - 2028) % 4 === 0;

const NOMBRE_CONTINENTAL: Record<string, string> = {
  sudamerica: 'Copa América',
  norteamerica: 'Copa Oro',
  europa: 'Eurocopa',
  africa: 'Copa Africana de Naciones',
  asia: 'Copa Asiática',
};

export interface TorneoDelBienio {
  anio: number;
  nombre: string;
  slug: string | null;
  escudo: string | null;
  /** El Mundial pesa más que cualquier otra cosa que se pueda ganar. */
  mundial: boolean;
}

/** Qué torneos de selección caen en estos dos años. */
export function torneosDelBienio(anio: number, continente: string, mundo: Mundo): TorneoDelBienio[] {
  const salida: TorneoDelBienio[] = [];
  const buscar = (predicado: (t: TorneoDeSeleccion) => boolean) =>
    mundo.torneos?.find(predicado) ?? null;

  for (let i = 0; i < 2; i++) {
    const anioActual = anio + i;
    if (HAY_MUNDIAL(anioActual)) {
      const dato = buscar((t) => t.nombre.toLowerCase().includes('world cup'));
      salida.push({
        anio: anioActual,
        nombre: 'Mundial',
        slug: dato?.slug ?? null,
        escudo: dato?.escudo ?? null,
        mundial: true,
      });
    }
    if (HAY_CONTINENTAL(anioActual)) {
      const nombre = NOMBRE_CONTINENTAL[continente] ?? 'Torneo continental';
      const dato = buscar((t) => t.continente === continente && !t.nombre.toLowerCase().includes('world'));
      salida.push({
        anio: anioActual,
        nombre: dato?.nombre ?? nombre,
        slug: dato?.slug ?? null,
        escudo: dato?.escudo ?? null,
        mundial: false,
      });
    }
  }
  return salida;
}

/**
 * ¿Te llaman?
 *
 * No basta con tener media alta: hay que estar jugando y hay que caerle bien al técnico. Es lo que
 * convierte una pelea con el DT nacional en algo que se paga con un Mundial de menos.
 */
export function convocado(carrera: Carrera): boolean {
  if (carrera.futbolista.edad < 17) return false;
  const nota = carrera.temporadas.at(-1)?.notaMedia ?? 6.4;
  const juega = ['titular', 'estrella', 'capitan'].includes(carrera.rol) ? 8 : 0;
  const conElDt = (carrera.relaciones.dt.confianza - carrera.relaciones.dt.rencor) / 8;
  const puntaje = carrera.ovr + juega + (nota - 6.5) * 10 + conElDt - (carrera.futbolista.edad > 34 ? 6 : 0);
  return puntaje >= 72;
}

/**
 * Hasta dónde llega tu selección.
 *
 * Pesa el país —la escuela del jugador es el mejor proxy que hay del nivel de su selección—, pesas
 * tú, y pesa el azar, que en un torneo corto manda más que en una liga. Devuelve la ronda alcanzada
 * en una escala de 0 a 4: fase de grupos, octavos, cuartos, final, campeón.
 */
export function rondaAlcanzada(azar: Azar, carrera: Carrera, fuerzaDelPais: number, mundial: boolean): number {
  /*
   * Tú pesas, y pesas bastante: un crack de 90 vale cinco puntos, que es la diferencia entre caer en
   * cuartos y jugar la final. Es lo que hace que llegar a la selección sea una recompensa y no un
   * adorno. El Mundial descuenta nueve porque están todos, no solo tu continente.
   */
  const tuAporte = (carrera.ovr - 70) / 3;
  /* `campana` suma tres uniformes: el rango 27 deja una desviación de unos nueve puntos. */
  const puntaje = fuerzaDelPais + tuAporte + campana(azar, 0, 27) - (mundial ? 9 : 0);
  if (puntaje >= 34) return 4;
  if (puntaje >= 26) return 3;
  if (puntaje >= 18) return 2;
  if (puntaje >= 10) return 1;
  return 0;
}

export const NOMBRE_DE_RONDA = ['fase de grupos', 'octavos', 'cuartos', 'la final', 'campeón'];

/** El trofeo de una selección campeona, con el escudo real del torneo. */
export function trofeoDeSeleccion(carrera: Carrera, torneo: TorneoDelBienio, detalle?: string): Trofeo {
  return {
    id: `seleccion-${torneo.anio}-${torneo.nombre}`,
    nombre: `${torneo.nombre} con ${carrera.futbolista.pais}`,
    clase: 'seleccion',
    temporada: torneo.anio,
    clubSlug: null,
    clubNombre: carrera.futbolista.pais,
    escudo: torneo.escudo,
    competicionSlug: torneo.slug,
    ...(detalle ? { detalle } : {}),
  };
}

/** Cuántos partidos y goles deja el bienio con la selección. */
export function numerosDeSeleccion(
  azar: Azar,
  carrera: Carrera,
  torneos: number,
): { convocatorias: number; goles: number } {
  const base = entre(azar, 6, carrera.ovr >= 82 ? 16 : 11);
  const convocatorias = base + torneos * entre(azar, 3, 7);
  const goles =
    carrera.futbolista.puesto === 'POR'
      ? 0
      : entre(azar, 0, Math.max(1, Math.round((convocatorias / 3) * (carrera.ovr / 85))));
  return { convocatorias, goles };
}

/**
 * Cuán fuerte es tu selección, en la misma escala que usa `rondaAlcanzada`.
 *
 * Sale de la escuela del país —el mismo número que decide cuánto arranca por delante un juvenil— y
 * por eso un brasileño llega lejos más seguido que un boliviano, que es exactamente lo que pasa.
 */
export function fuerzaDeSeleccion(escuela: number): number {
  return limitar(8 + escuela * 1.1, 8, 22);
}

/** Si llegaste a la final, el partido se juega: no se sortea. */
export function juegaLaFinal(azar: Azar, ronda: number): boolean {
  return ronda >= 3 && chance(azar, 0.9);
}
