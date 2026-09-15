/**
 * Los puntos de enganche del sonido, sin sonido todavía.
 *
 * Athena no tiene una sola línea de audio. Los juegos sí tienen momentos que lo pedirían —acertar,
 * fallar, subir de multiplicador, los últimos segundos, el final, un récord—, y esos momentos son
 * lo difícil de encontrar después: quedan nombrados acá.
 *
 * **No hay interruptor de silencio a propósito.** Un botón que silencia el silencio es una promesa
 * vacía: el día que haya archivos, el interruptor llega con ellos y se guarda junto al resto de las
 * preferencias del juego.
 */
export type Momento =
  | 'largada'
  | 'acierto'
  | 'fallo'
  | 'combo'
  | 'apremio'
  | 'panico'
  | 'fin'
  | 'record';

export function sonar(_momento: Momento): void {
  /* Todavía no hay nada que sonar. */
}
