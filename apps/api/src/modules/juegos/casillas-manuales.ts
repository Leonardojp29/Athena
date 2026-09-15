import { rowsFromFormation } from '@athena/domain';
import type { DisposicionManual } from './retos-once.config.js';

/**
 * Convierte una disposición escrita a mano en las casillas `fila:columna` del proveedor.
 *
 * La lista viene por línea y de izquierda a derecha mirando hacia el arco rival, que es justo el
 * orden que numera el proveedor: fila 1 el arquero, columna 1 la banda izquierda. Así la cancha se
 * dibuja con el mismo `layout()` que el resto del sitio y no hace falta un camino aparte.
 *
 * Devuelve null si la formación no suma once o si no vienen once futbolistas: una disposición a
 * medias dibujaría una cancha equivocada, que es peor que no dibujarla.
 */
export function casillasManuales(disposicion: DisposicionManual): Map<string, string> | null {
  const filas = rowsFromFormation(disposicion.formacion);
  if (filas === null) return null;

  const total = filas.reduce((suma, cuantos) => suma + cuantos, 0);
  if (total !== disposicion.jugadores.length) return null;
  if (new Set(disposicion.jugadores).size !== disposicion.jugadores.length) return null;

  const casillas = new Map<string, string>();
  let indice = 0;
  for (const [fila, cuantos] of filas.entries()) {
    for (let columna = 0; columna < cuantos; columna++) {
      casillas.set(disposicion.jugadores[indice] as string, `${fila + 1}:${columna + 1}`);
      indice++;
    }
  }
  return casillas;
}
