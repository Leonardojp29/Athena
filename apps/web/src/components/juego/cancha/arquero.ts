import { proyectar, type Camara } from './escena';

/**
 * El arquero.
 *
 * Una silueta articulada —cabeza, tronco, brazos y piernas— que se estira hacia donde vuela. No es un
 * muñeco con fotogramas: las extremidades se interpolan según cuánto lleva de vuelo, así el mismo
 * código sirve para una estirada corta abajo y para un vuelo al ángulo.
 *
 * **Su decisión no se toma acá.** El motor del juego, con la semilla de la partida, ya resolvió si
 * ataja o no; esta función solo lo muestra. Si la animación decidiera, el resultado dependería de los
 * fotogramas que alcanzó a dibujar el navegador, que es la peor forma de perder un penal.
 */

export interface EstadoDelArquero {
  /** Hacia dónde se tira, en metros desde el centro del arco. */
  destinoX: number;
  /** A qué altura llega: 0 al ras, 1 al ángulo. */
  destinoZ: number;
  /** 0 quieto en el medio, 1 completamente estirado. */
  avance: number;
  /** Los colores del club, para que se vea del equipo rival. */
  color: string;
}

export function dibujarArquero(
  ctx: CanvasRenderingContext2D,
  camara: Camara,
  origen: number,
  estado: EstadoDelArquero,
): void {
  const { avance, destinoX, destinoZ } = estado;
  /* Arranca en el centro de la línea y se desplaza hacia su destino con una curva de salida rápida. */
  const suave = 1 - Math.pow(1 - avance, 2.2);
  const x = destinoX * suave;
  const z = 0.9 + destinoZ * 1.5 * suave;
  /* Al volar, el cuerpo se inclina: es lo que hace que la estirada se lea como una estirada. */
  const inclinacion = suave * Math.sign(destinoX || 1) * 1.15;

  const punto = (dx: number, dz: number) =>
    proyectar(camara, x + dx * Math.cos(inclinacion) - dz * Math.sin(inclinacion) * 0.35, 0.5, z + dz * Math.cos(inclinacion) + dx * Math.sin(inclinacion) * 0.35, origen);

  const cadera = punto(0, 0);
  if (!cadera.visible) return;
  const u = cadera.escala;

  ctx.lineCap = 'round';
  ctx.strokeStyle = estado.color;
  ctx.fillStyle = estado.color;

  /* Piernas: se abren con el vuelo. */
  ctx.lineWidth = Math.max(3, u * 0.11);
  for (const lado of [-1, 1]) {
    const pie = punto(lado * (0.16 + suave * 0.5), -0.85);
    ctx.beginPath();
    ctx.moveTo(cadera.px, cadera.py);
    ctx.lineTo(pie.px, pie.py);
    ctx.stroke();
  }

  /* Tronco. */
  const hombros = punto(0, 0.62);
  ctx.lineWidth = Math.max(4, u * 0.15);
  ctx.beginPath();
  ctx.moveTo(cadera.px, cadera.py);
  ctx.lineTo(hombros.px, hombros.py);
  ctx.stroke();

  /*
   * Brazos: el del lado del vuelo se estira del todo —es el que llega a la pelota— y el otro
   * acompaña. Los guantes son dos círculos más claros, que es lo que el ojo sigue en una atajada.
   */
  ctx.lineWidth = Math.max(3, u * 0.1);
  const guantes: Array<{ px: number; py: number }> = [];
  for (const lado of [-1, 1]) {
    const estirado = Math.sign(destinoX || 1) === lado;
    const largo = estirado ? 0.55 + suave * 0.7 : 0.42;
    const alto = estirado ? 0.35 + suave * 0.55 : 0.1;
    const mano = punto(lado * largo, 0.5 + alto);
    ctx.beginPath();
    ctx.moveTo(hombros.px, hombros.py);
    ctx.lineTo(mano.px, mano.py);
    ctx.stroke();
    guantes.push(mano);
  }

  /* Cabeza. */
  const cabeza = punto(0, 0.86);
  ctx.beginPath();
  ctx.arc(cabeza.px, cabeza.py, Math.max(2.5, u * 0.1), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4f7f9';
  for (const guante of guantes) {
    ctx.beginPath();
    ctx.arc(guante.px, guante.py, Math.max(2, u * 0.075), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** La barrera del tiro libre: cuatro siluetas que saltan cuando la pelota sale. */
export function dibujarBarrera(
  ctx: CanvasRenderingContext2D,
  camara: Camara,
  origen: number,
  x: number,
  salto: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const dx = x + (i - 1.5) * 0.5;
    const base = proyectar(camara, dx, 9.15, salto * 0.55, origen);
    const cabeza = proyectar(camara, dx, 9.15, 1.75 + salto * 0.55, origen);
    if (!base.visible) continue;
    const ancho = Math.max(3, base.escala * 0.22);
    ctx.fillRect(base.px - ancho / 2, cabeza.py, ancho, base.py - cabeza.py);
    ctx.beginPath();
    ctx.arc(base.px, cabeza.py - ancho * 0.5, ancho * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}
