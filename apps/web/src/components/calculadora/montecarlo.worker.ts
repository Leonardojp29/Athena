import { simular, type DatosDeLaCalculadora, type ReglasLiga } from '@athena/calculadora';

/*
 * Cinco mil temporadas son casi trescientos milisegundos: en el hilo principal se sentirían como
 * un tirón en cada tecla. Acá el lector sigue escribiendo mientras se cuenta, y una corrida que
 * ya quedó vieja se descarta por su id en vez de cancelarse a medias.
 */
interface Pedido {
  id: number;
  datos: DatosDeLaCalculadora;
  reglas: ReglasLiga;
  pronosticos: Array<[string, [number, number]]>;
  semilla: number;
}

self.onmessage = (evento: MessageEvent<Pedido>) => {
  const { id, datos, reglas, pronosticos, semilla } = evento.data;
  const probabilidades = simular(datos, new Map(pronosticos), reglas, { semilla });
  self.postMessage({ id, probabilidades });
};
