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
 *
 * Lo que este archivo **no** hace es decidir. El desenlace lo dicta el motor y acá se construye la
 * trayectoria que lo cuenta: `objetivoDe` traduce el veredicto a un punto del arco y `apuntarA`
 * resuelve la velocidad que lleva la pelota exactamente ahí. Antes había un `resolverPaso` que
 * juzgaba la jugada desde el canvas —una segunda verdad que podía contradecir a la crónica— y que
 * solo terminaba si la pelota cruzaba la línea: un remate al palo rebotaba hacia atrás y la escena
 * se quedaba congelada para siempre.
 */

import type { Desenlace as DesenlaceDeJugada, Remate, Zona } from '@athena/leyenda';

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

/**
 * Un paso de simulación. `dt` va fijo (1/120 s) y el bucle de dibujo acumula el tiempo real: así la
 * física es idéntica en un monitor de 60 Hz y en uno de 144, y el vuelo nunca depende de la máquina
 * de quien juega.
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

export const copiar = (p: Pelota): Pelota => ({ ...p });

/** El centro de cada zona del arco, en metros. Es a lo que apunta el jugador cuando elige. */
export const PUNTO_DE_ZONA: Record<Zona, { x: number; z: number }> = {
  'izq-alta': { x: -(ARCO.ancho / 2 - 0.7), z: ARCO.alto - 0.4 },
  'centro-alta': { x: 0, z: ARCO.alto - 0.45 },
  'der-alta': { x: ARCO.ancho / 2 - 0.7, z: ARCO.alto - 0.4 },
  'izq-baja': { x: -(ARCO.ancho / 2 - 0.7), z: 0.4 },
  'centro-baja': { x: 0, z: 0.5 },
  'der-baja': { x: ARCO.ancho / 2 - 0.7, z: 0.4 },
};

/**
 * A dónde tiene que ir la pelota para que se vea lo que el motor ya dictó.
 *
 * Acá se cierra el bug que hacía que la pantalla cantara una atajada sobre un gol: el desenlace
 * llega decidido y la trayectoria se construye **para** ese desenlace. Un gol entra por dentro del
 * palo, un tiro al palo pega en el fierro y un remate afuera se va por afuera de verdad.
 */
export function objetivoDe(zona: Zona, desenlace: DesenlaceDeJugada): { x: number; z: number } {
  const punto = PUNTO_DE_ZONA[zona];
  const lado = Math.sign(punto.x);
  const alta = punto.z > ARCO.alto / 2;

  if (desenlace === 'palo') {
    /* Sin lado definido no hay poste que buscar: se va al travesaño. */
    if (lado === 0) return { x: 0, z: ARCO.alto };
    return alta ? { x: lado * (ARCO.ancho / 2), z: ARCO.alto } : { x: lado * (ARCO.ancho / 2), z: punto.z };
  }
  if (desenlace === 'afuera') {
    if (lado === 0) return { x: punto.x, z: ARCO.alto + 1.3 };
    return alta
      ? { x: lado * (ARCO.ancho / 2 + 0.9), z: ARCO.alto + 0.8 }
      : { x: lado * (ARCO.ancho / 2 + 1.4), z: punto.z };
  }
  if (desenlace === 'barrera') return { x: punto.x * 0.35, z: 1.6 };
  return punto;
}

/**
 * Cuánto tarda el vuelo según cómo la pegó. Una picada flota; una potente no se ve venir.
 *
 * La velocidad crece con la distancia porque en la cancha también: a un tiro libre desde treinta
 * metros se le pega con todo, y calcular el tiempo como distancia partido por una velocidad fija
 * daba vuelos de casi dos segundos que ni se ven bien ni existen.
 */
export function vueloDe(remate: Remate, desde: number): number {
  const base = remate === 'potente' ? 22 : remate === 'colocada' ? 16 : 11;
  return desde / (base + desde * 0.38);
}

/** El giro de cada remate. Positivo curva a la derecha, y se compensa para que igual caiga en el punto. */
export function combaDe(remate: Remate, zona: Zona): number {
  const lado = Math.sign(PUNTO_DE_ZONA[zona].x);
  if (remate === 'colocada') return -lado * 0.55;
  if (remate === 'potente') return -lado * 0.18;
  return -lado * 0.12;
}

/**
 * La velocidad inicial que lleva la pelota a un punto exacto del arco.
 *
 * La parábola de manual no alcanza: el arrastre del aire y el efecto Magnus desvían el vuelo, así que
 * apuntar con la fórmula cerrada deja la pelota a medio metro de donde tenía que ir —y medio metro es
 * la diferencia entre un gol y el palo—. Se resuelve como un problema de tiro: se simula el vuelo, se
 * mide el error en el plano del arco y se corrige. Ocho pasadas dejan el error por debajo del
 * centímetro incluso en los vuelos largos, y como corre una sola vez por jugada no cuesta nada.
 */
export function apuntarA(
  desde: number,
  destino: { x: number; z: number },
  tiempo: number,
  comba: number,
): Pelota {
  const spin = comba * 320;
  const vy = -desde / tiempo;
  let vx = destino.x / tiempo;
  let vz = (destino.z - 0.11) / tiempo + 0.5 * GRAVEDAD * tiempo;

  for (let intento = 0; intento < 8; intento++) {
    const prueba: Pelota = { x: 0, y: desde, z: 0.11, vx, vy, vz, spin, r: 0.11 };
    const cruce = cruzarElPlano(prueba);
    if (!cruce) break;
    vx += (destino.x - cruce.x) / cruce.tiempo;
    vz += (destino.z - cruce.z) / cruce.tiempo;
  }

  return { x: 0, y: desde, z: 0.11, vx, vy, vz, spin, r: 0.11 };
}

/** Dónde y cuándo cruza el plano del arco. Nulo si nunca lo cruza, que es lo que evita un lazo infinito. */
function cruzarElPlano(pelota: Pelota): { x: number; z: number; tiempo: number } | null {
  const p = copiar(pelota);
  for (let paso = 1; paso <= 600; paso++) {
    integrar(p, 1 / 120);
    if (p.y <= 0) return { x: p.x, z: p.z, tiempo: paso / 120 };
  }
  return null;
}
