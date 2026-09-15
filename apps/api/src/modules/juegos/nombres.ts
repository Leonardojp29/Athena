/**
 * Emparejar el nombre de un catálogo con el que manda el proveedor.
 *
 * El proveedor abrevia —"J. Álvarez" por Julián Álvarez, "P. Guerrero" por Paolo— así que comparar
 * el texto entero no alcanza. Se puntúa token a token: el apellido tiene que acertar de lleno y el
 * nombre de pila desempata, aunque venga como inicial. Es lo que distingue a Lautaro Martínez de
 * Emiliano Martínez dentro de una misma lista.
 *
 * Y las palabras de más restan. Sin eso, buscar "Xavi" en el plantel del Barcelona empataba a Xavi
 * con Xavi Torres, y ganaba el que estuviera primero.
 */
export interface Nombrado {
  ref: string;
  nombre: string;
}

export const sinTildes = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function calzaNombre<T extends Nombrado>(buscado: string, lista: readonly T[]): T | null {
  const llano = sinTildes(buscado);
  const pedidos = llano.split(/\s+/).filter(Boolean);
  const apellido = pedidos[pedidos.length - 1];
  if (!apellido) return null;

  let mejor: T | null = null;
  let mejorPuntaje = 0;

  for (const candidato of lista) {
    const suyo = sinTildes(candidato.nombre);
    /* El nombre idéntico gana siempre: no hay nada que desempatar. */
    if (suyo === llano) return candidato;

    const palabras = suyo.split(/\s+/).filter(Boolean);
    let puntaje = 0;
    let aciertaApellido = false;

    for (const pedido of pedidos) {
      const exacta = palabras.some((p) => p === pedido);
      const empieza = pedido.length >= 3 && palabras.some((p) => p.startsWith(pedido));
      const inicial = palabras.some((p) => p.endsWith('.') && p[0] === pedido[0]);

      if (exacta) puntaje += 2;
      else if (empieza) puntaje += 1.5;
      else if (inicial) puntaje += 0.5;

      if (pedido === apellido && (exacta || empieza)) aciertaApellido = true;
    }

    if (!aciertaApellido) continue;
    /* Cada palabra que sobra aleja: "Xavi Torres" no es "Xavi". */
    puntaje -= Math.max(0, palabras.length - pedidos.length) * 0.4;

    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = candidato;
    }
  }

  return mejor;
}
