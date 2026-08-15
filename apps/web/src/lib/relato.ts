/*
 * El relato vive en el dominio, que es donde se puede probar sin navegador. Acá solo se reexporta
 * con los tipos de la vista, para que los componentes no tengan que saber de dónde sale.
 */
export {
  goleadoresDelPartido,
  relatoDelPartido,
  minutoDeJugada,
  motivoDeTarjeta,
  revisionDeVar,
  type Banda,
  type FilaDelRelato,
  type Jugada,
  type GolDeGoleador,
  type Goleador,
  type Marcador,
} from '@athena/domain';
