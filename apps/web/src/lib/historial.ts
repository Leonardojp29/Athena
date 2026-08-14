import type { CruceHistorial, ResumenHistorial } from './api';

/**
 * Las cuentas del cara a cara.
 *
 * Vive acá y no en el componente porque la usan la sección completa, la tarjeta del riel y el panel
 * de la copa, y porque es lo único del historial que se puede probar sin un navegador: quién ganó un
 * cruce mirado desde el local de hoy, la racha y los porcentajes de la barra.
 */
export type Resultado = 'local' | 'visita' | 'empate';

/**
 * Quién ganó ese cruce, **mirado desde el local de hoy**.
 *
 * Es la reorientación que hace legible la historia: en la mitad de los cruces los papeles estaban al
 * revés, y sin esto la barra sumaría victorias del equipo equivocado.
 */
export function resultadoDeCruce(cruce: CruceHistorial, slugLocalDeHoy: string): Resultado {
  if (cruce.home_score === null || cruce.away_score === null) return 'empate';
  if (cruce.home_score === cruce.away_score) return 'empate';
  const ganoElDeCasa = cruce.home_score > cruce.away_score;
  return ganoElDeCasa === (cruce.home_slug === slugLocalDeHoy) ? 'local' : 'visita';
}

/** Los tres tramos de la barra, en porcentaje entero y sumando cien. */
export function porcentajes(resumen: ResumenHistorial): Record<Resultado, number> {
  const total = resumen.jugados;
  if (total <= 0) return { local: 0, empate: 0, visita: 0 };
  const local = Math.round((resumen.gano_local / total) * 100);
  const empate = Math.round((resumen.empates / total) * 100);
  return { local, empate, visita: Math.max(0, 100 - local - empate) };
}

export interface Racha {
  resultado: Resultado;
  cuantos: number;
}

/**
 * La racha que viene corriendo, contada desde el cruce más reciente.
 *
 * Devuelve null cuando todos los cruces que tenemos a la vista son iguales: con doce invictos en doce
 * cruces no se puede decir "invicto hace doce" porque la racha puede ser más larga que la lista, y
 * afirmar un número que no se puede sostener es peor que no decir nada.
 */
export function racha(cruces: CruceHistorial[], slugLocalDeHoy: string): Racha | null {
  const primero = cruces[0];
  if (!primero) return null;

  const resultado = resultadoDeCruce(primero, slugLocalDeHoy);
  let cuantos = 0;
  for (const cruce of cruces) {
    if (resultadoDeCruce(cruce, slugLocalDeHoy) !== resultado) break;
    cuantos++;
  }
  return cuantos === cruces.length ? null : { resultado, cuantos };
}

/** El promedio de goles por cruce, sobre toda la historia y con un decimal. */
export function golesPorCruce(resumen: ResumenHistorial): string | null {
  if (resumen.jugados <= 0) return null;
  return ((resumen.goles_local + resumen.goles_visita) / resumen.jugados).toFixed(1);
}

/**
 * Con menos de tres cruces no se afirma nada más que el marcador.
 *
 * Una barra al cien por ciento sobre un solo partido dice "domina el historial" cuando lo único que
 * pasó es que se jugaron una vez, y el corte por sede con dos partidos es ruido con forma de dato.
 */
export const MINIMO_PARA_ANALIZAR = 3;
