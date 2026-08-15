/**
 * De qué color juega un club.
 *
 * El proveedor no publica la paleta de un club en ningún endpoint: los únicos colores que manda son
 * los de la alineación, y son los de **la camiseta de ese partido**. Guardar el último visto pintaba
 * a cada equipo con el kit que le tocara ese fin de semana —Real Madrid quedó con su tercera— y la
 * identidad del club cambiaba sola cada domingo.
 *
 * La equipación titular no viene como dato pero se deduce: es la camiseta que un equipo usa **cuando
 * juega de local**, partido tras partido. Con las muestras suficientes, la moda la encuentra sola.
 */
export interface MuestraDeKit {
  color: string;
  /** Cuándo se jugó: desempata cuando dos camisetas están igual de repetidas. */
  cuando: Date;
}

/* Con menos muestras que esto, una camiseta conmemorativa gana la votación. */
export const MUESTRAS_MINIMAS = 3;

/**
 * El kit titular de un equipo a partir de sus partidos de local.
 *
 * Devuelve null cuando no hay muestras suficientes: preferir el dato viejo antes que decidir la
 * identidad de un club con dos partidos, uno de los cuales pudo ser el del centenario.
 */
export function kitTitular(muestras: MuestraDeKit[]): string | null {
  if (muestras.length < MUESTRAS_MINIMAS) return null;

  const cuenta = new Map<string, { veces: number; ultima: number }>();
  for (const muestra of muestras) {
    const actual = cuenta.get(muestra.color);
    const cuando = muestra.cuando.getTime();
    if (actual) {
      actual.veces++;
      actual.ultima = Math.max(actual.ultima, cuando);
    } else {
      cuenta.set(muestra.color, { veces: 1, ultima: cuando });
    }
  }

  /* La más repetida y, si empatan, la más reciente: un cambio de camiseta se impone con el tiempo. */
  return (
    [...cuenta.entries()].sort(
      ([, a], [, b]) => b.veces - a.veces || b.ultima - a.ultima,
    )[0]?.[0] ?? null
  );
}
