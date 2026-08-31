/**
 * La física de la pelota.
 *
 * Es una simulación en **tres dimensiones** que después se proyecta a dos: la pelota tiene ancho,
 * alto y profundidad, y por eso se achica al alejarse, pasa por encima de la barrera y entra al arco
 * por adentro o se va por afuera. Dibujar el mismo movimiento en 2D plano se ve como una animación;
 * simularlo en 3D se ve como fútbol.
 *
 * Tres fuerzas y ninguna de adorno: la gravedad, el rozamiento del aire y el **efecto Magnus**, que
 * es el que hace que una pelota con rotación se curve. La comba de un tiro libre no está animada a
 * mano: sale de multiplicar el giro por la velocidad, como en el aire de verdad.
 *
 * Sin librerías. Un integrador de Euler semi-implícito a paso fijo entra en cien líneas y corre a
 * 60 fps en un teléfono; matter.js pesa noventa kilobytes por lo mismo.
 */

/** Metros. El arco reglamentario, para que las proporciones sean las del fútbol. */
export const ARCO = { ancho: 7.32, alto: 2.44, profundidad: 2 } as const;
export const PENAL_DESDE = 11;
export const TIRO_LIBRE_DESDE = 22;

/** Un cuerpo en vuelo: posición en metros, velocidad en metros por segundo, giro en radianes/s. */
export interface Pelota {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Giro sobre el eje vertical: positivo curva a la derecha. */
  spin: number;
  /** Radio, en metros. Una pelota de fútbol mide 11 cm. */
  r: number;
}

const GRAVEDAD = 9.81;
/** Rozamiento del aire. Calibrado para que un remate fuerte pierda algo de fuerza en el camino. */
const ARRASTRE = 0.0055;
/** Cuánto curva el giro. Es el coeficiente de Magnus, ajustado para que una comba se vea. */
const MAGNUS = 0.00042;
/** Cuánta energía devuelve el palo. Un poste de aluminio devuelve mucho. */
const REBOTE_PALO = 0.62;
/** La red frena casi todo: la pelota queda adentro en lugar de volver. */
const REBOTE_RED = 0.12;

export type Desenlace = 'volando' | 'gol' | 'palo' | 'afuera' | 'atajada' | 'barrera';

export interface Mundo {
  /** Dónde está el arquero, en metros desde el centro del arco. */
  arqueroX: number;
  arqueroY: number;
  /** Qué tan estirado está: 0 quieto, 1 volando del todo. */
  arqueroExtension: number;
  /** La barrera, si la hay: centro y ancho en metros. */
  barrera: { x: number; ancho: number; alto: number } | null;
}

/**
 * Un paso de simulación. `dt` va fijo (1/120 s) y el bucle de dibujo acumula el tiempo real: así la
 * física es idéntica en un monitor de 60 Hz y en uno de 144, y el resultado nunca depende de la
 * máquina de quien juega.
 */
export function integrar(pelota: Pelota, dt: number): void {
  const velocidad = Math.hypot(pelota.vx, pelota.vy, pelota.vz);

  /* Arrastre: se opone al movimiento y crece con el cuadrado de la velocidad. */
  const arrastre = ARRASTRE * velocidad;
  pelota.vx -= pelota.vx * arrastre * dt;
  pelota.vy -= pelota.vy * arrastre * dt;
  pelota.vz -= pelota.vz * arrastre * dt;

  /*
   * Magnus: la fuerza es perpendicular al giro y al avance. Con el giro en el eje vertical, el
   * empuje sale lateral y proporcional a lo rápido que viaja: por eso una pelota lenta no se curva y
   * un tiro libre pegado con el empeine dibuja.
   */
  pelota.vx += MAGNUS * pelota.spin * pelota.vy * dt;

  pelota.vz -= GRAVEDAD * dt;

  pelota.x += pelota.vx * dt;
  pelota.y += pelota.vy * dt;
  pelota.z += pelota.vz * dt;

  /* El piso, con rebote y rozamiento del césped. */
  if (pelota.z < pelota.r) {
    pelota.z = pelota.r;
    pelota.vz = Math.abs(pelota.vz) * 0.45;
    pelota.vx *= 0.82;
    pelota.vy *= 0.82;
  }
}

/**
 * Qué le pasó a la pelota en este paso: entró, pegó en el palo, se fue o la atajaron.
 *
 * Se evalúa contra el plano del arco (y = 0) y solo cuando lo cruza, que es la única forma honesta de
 * decidir un gol: mirar dónde estaba la pelota **al pasar la línea**, no dónde terminó.
 */
export function resolverPaso(pelota: Pelota, previa: Pelota, mundo: Mundo): Desenlace {
  const medioAncho = ARCO.ancho / 2;

  /* La barrera: un muro corto delante del arco. */
  if (mundo.barrera && previa.y > mundo.barrera.x && pelota.y <= mundo.barrera.x) {
    const dentro = Math.abs(pelota.x) <= mundo.barrera.ancho / 2;
    if (dentro && pelota.z <= mundo.barrera.alto) return 'barrera';
  }

  /* El arquero: dos cajas, el cuerpo y el alcance de las manos al estirarse. */
  if (previa.y > 0.6 && pelota.y <= 0.6) {
    const alcance = 0.55 + mundo.arqueroExtension * 1.9;
    const cerca = Math.abs(pelota.x - mundo.arqueroX) <= alcance;
    const altura = pelota.z <= 0.7 + mundo.arqueroExtension * 1.7;
    if (cerca && altura) return 'atajada';
  }

  /* El plano del arco. */
  if (previa.y > 0 && pelota.y <= 0) {
    const dentroDelAncho = Math.abs(pelota.x) <= medioAncho - pelota.r;
    const bajoElTravesano = pelota.z <= ARCO.alto - pelota.r;

    /* Los palos: una franja del grosor de la pelota a cada lado. */
    const rozaPalo =
      Math.abs(Math.abs(pelota.x) - medioAncho) < pelota.r ||
      Math.abs(pelota.z - ARCO.alto) < pelota.r;
    if (rozaPalo) return 'palo';
    if (dentroDelAncho && bajoElTravesano) return 'gol';
    return 'afuera';
  }

  /* Ya adentro: la red la frena. */
  if (pelota.y < -ARCO.profundidad) return 'gol';
  return 'volando';
}

/** Rebote en el palo: invierte y pierde energía. */
export function rebotarEnPalo(pelota: Pelota): void {
  pelota.vy = Math.abs(pelota.vy) * REBOTE_PALO;
  pelota.vx *= -REBOTE_PALO;
  pelota.spin *= 0.3;
}

/** La red: absorbe casi todo y deja la pelota adentro. */
export function frenarEnRed(pelota: Pelota): void {
  pelota.vx *= REBOTE_RED;
  pelota.vy *= REBOTE_RED;
  pelota.vz *= REBOTE_RED;
  pelota.spin = 0;
}

/**
 * Del gesto del jugador a la velocidad inicial.
 *
 * `apunte` es dónde tocó, en coordenadas del arco (x de −1 a 1, z de 0 a 1); `fuerza` de 0 a 1 y
 * `comba` de −1 a 1. La cuenta resuelve el tiro como un problema de tiro parabólico: con la
 * distancia y el tiempo de vuelo deseado sale la velocidad, y la altura se corrige por la gravedad.
 * Es lo que hace que apuntar arriba obligue a pegarle más fuerte, igual que en la cancha.
 */
export function patear(
  desde: number,
  apunte: { x: number; z: number },
  fuerza: number,
  comba: number,
): Pelota {
  const destinoX = apunte.x * (ARCO.ancho / 2 + 0.6);
  const destinoZ = apunte.z * (ARCO.alto + 0.9);

  /* Un remate fuerte tarda medio segundo desde el punto del penal; uno suave, casi el doble. */
  const tiempo = (desde / 26) * (1.7 - fuerza * 0.85);

  return {
    x: 0,
    y: desde,
    z: 0.11,
    vx: (destinoX - 0) / tiempo,
    vy: -desde / tiempo,
    /* La componente vertical incluye lo que la gravedad se va a comer en el camino. */
    vz: (destinoZ - 0.11) / tiempo + 0.5 * GRAVEDAD * tiempo,
    spin: comba * 320,
    r: 0.11,
  };
}

export const copiar = (p: Pelota): Pelota => ({ ...p });
