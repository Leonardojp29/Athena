import { ARCO, type Pelota } from './fisica';

/**
 * El estadio, de noche.
 *
 * Todo dibujado: no hay una sola imagen. Césped con franjas de corte, luz de reflectores, arco con
 * red en profundidad, sombra que se achica cuando la pelota sube y tribuna desenfocada con destellos
 * de flash. Lo que separa un dibujo de un juego es la **perspectiva**: la escena se proyecta desde
 * una cámara detrás del pateador, así que lo que está lejos se ve más chico y más arriba, y el arco
 * tiene fondo.
 */

export interface Camara {
  /** Altura de la cámara, en metros. */
  altura: number;
  /** A cuántos metros por detrás del punto de tiro está. */
  atras: number;
  /** Distancia focal en píxeles: cuánto “zoom” tiene la lente. */
  focal: number;
  /** Dónde cae el infinito, como fracción del alto. Es la línea del horizonte. */
  horizonte: number;
  ancho: number;
  alto: number;
  /** Sacudida del impacto, en píxeles. */
  sacudida: number;
}

/**
 * La cámara de un penal por televisión: detrás y **por encima** del pateador.
 *
 * La altura no es un capricho: con la cámara a la altura de los ojos, la pelota —que está a tres
 * metros y dos por debajo del ojo— cae fuera del cuadro por abajo mientras el arco queda arriba. Es
 * geometría, no un error de dibujo. Subiendo la cámara a cuatro metros y medio, la línea de visión se
 * aplana y entran las dos cosas: la pelota abajo y el arco entero adelante, que es exactamente el
 * plano con el que todo el mundo tiene grabado un penal.
 */
export function camaraDePenal(ancho: number, alto: number, desde: number, sacudida = 0): Camara {
  /* A la altura del pecho y unos metros detrás de la pelota: la vista del que va a patear. */
  const altura = 1.8;
  const atras = desde > 15 ? 6 : 4;

  /*
   * La focal y el horizonte no se eligen: se **despejan** de dos anclas, que es lo que garantiza que
   * el encuadre funcione en cualquier pantalla. Ancla uno: la pelota, abajo, al 88% del alto. Ancla
   * dos: el travesaño, arriba, al 35%. Entre las dos queda el arco entero, con cuarenta por ciento de
   * cuadro para el estadio; y como las dos dependen del tamaño real del lienzo, el plano es idéntico
   * en un teléfono y en un monitor.
   */
  const ratioPelota = (altura - 0.11) / atras;
  const ratioTravesano = (altura - ARCO.alto) / (desde + atras);
  const focal = (alto * 0.53) / (ratioPelota - ratioTravesano);
  const horizonte = (alto * 0.35 - ratioTravesano * focal) / alto;

  return { altura, atras, focal, horizonte, ancho, alto, sacudida };
}

export interface Punto {
  px: number;
  py: number;
  /** Escala de lo que está a esa profundidad: sirve para el tamaño de la pelota y las sombras. */
  escala: number;
  /** Falso si el punto está detrás de la cámara. */
  visible: boolean;
}

/**
 * De metros a píxeles.
 *
 * El eje `y` del mundo va hacia el arco (0 es la línea), `x` es a lo ancho y `z` la altura. La
 * cámara mira desde `y = origen + atras`, y la proyección es la de siempre: dividir por la
 * profundidad. Con eso solo, la escena ya tiene fuga y el arco se ve tridimensional.
 */
export function proyectar(camara: Camara, x: number, y: number, z: number, origen: number): Punto {
  const profundidad = origen + camara.atras - y;
  if (profundidad <= 0.4) return { px: 0, py: 0, escala: 0, visible: false };

  const escala = camara.focal / profundidad;
  return {
    px: camara.ancho / 2 + x * escala,
    /* Lo que está a la altura del suelo cae por debajo del horizonte, y tanto más cuanto más cerca. */
    py: camara.alto * camara.horizonte + (camara.altura - z) * escala,
    escala,
    visible: true,
  };
}

/** El fondo: noche, tribuna y luces. Se dibuja una vez por cuadro y no cuesta nada. */
export function dibujarFondo(ctx: CanvasRenderingContext2D, camara: Camara, tiempo: number): void {
  const { ancho, alto } = camara;
  const linea = alto * camara.horizonte;

  /* El cielo de un estadio de noche nunca es negro: es el resplandor de los reflectores. */
  const cielo = ctx.createLinearGradient(0, 0, 0, linea);
  cielo.addColorStop(0, '#050a10');
  cielo.addColorStop(0.7, '#0b1620');
  cielo.addColorStop(1, '#152430');
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, ancho, linea);

  /* Los cuatro reflectores, con su halo. */
  for (const fx of [0.13, 0.37, 0.63, 0.87]) {
    const x = ancho * fx;
    const y = linea * 0.22;
    const halo = ctx.createRadialGradient(x, y, 2, x, y, alto * 0.3);
    halo.addColorStop(0, 'rgba(255,250,225,0.55)');
    halo.addColorStop(0.25, 'rgba(200,225,255,0.12)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - alto * 0.3, y - alto * 0.3, alto * 0.6, alto * 0.6);
    ctx.fillStyle = 'rgba(255,252,235,0.9)';
    ctx.fillRect(x - 9, y - 3, 18, 6);
  }

  /*
   * La tribuna: bandas de gente sin dibujar una sola persona. El desenfoque lo da la textura de
   * puntos, y los destellos de flash aparecen y se apagan solos: es lo que hace que un fondo quieto
   * parezca lleno de miles de personas.
   */
  const tribunaY = linea * 0.45;
  const tribunaAlto = linea * 0.55;
  const grada = ctx.createLinearGradient(0, tribunaY, 0, tribunaY + tribunaAlto);
  grada.addColorStop(0, '#0a1118');
  grada.addColorStop(1, '#111d26');
  ctx.fillStyle = grada;
  ctx.fillRect(0, tribunaY, ancho, tribunaAlto);

  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let fila = 0; fila < 7; fila++) {
    const y = tribunaY + 6 + fila * (tribunaAlto / 7);
    for (let i = 0; i < ancho; i += 7) {
      /* Un ruido barato y estable: la misma "gente" en cada cuadro. */
      const n = Math.sin(i * 12.9898 + fila * 78.233) * 43758.5453;
      const tono = 40 + Math.floor((n - Math.floor(n)) * 60);
      ctx.fillStyle = `rgb(${tono},${tono + 8},${tono + 16})`;
      ctx.fillRect(i, y, 4, 4);
    }
  }
  ctx.restore();

  /* Flashes: tres o cuatro por segundo, en posiciones que cambian. */
  for (let i = 0; i < 5; i++) {
    const fase = (tiempo * 0.0016 + i * 0.37) % 1;
    if (fase > 0.12) continue;
    const semilla = Math.floor(tiempo * 0.0016 + i * 0.37);
    const n = Math.abs(Math.sin(semilla * 91.7 + i * 13.3));
    const x = n * ancho;
    const y = tribunaY + ((n * 7919) % 1) * tribunaAlto;
    ctx.fillStyle = `rgba(255,255,245,${(1 - fase / 0.12) * 0.85})`;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** El césped con sus franjas de corte, en perspectiva. */
export function dibujarCancha(ctx: CanvasRenderingContext2D, camara: Camara, origen: number): void {
  const { ancho, alto } = camara;
  const horizonte = alto * camara.horizonte;

  const pasto = ctx.createLinearGradient(0, horizonte, 0, alto);
  pasto.addColorStop(0, '#0f3a24');
  pasto.addColorStop(0.4, '#14512f');
  pasto.addColorStop(1, '#0d3a22');
  ctx.fillStyle = pasto;
  ctx.fillRect(0, horizonte, ancho, alto - horizonte);

  /* Las franjas del corte: bandas paralelas a la línea, que la perspectiva junta al fondo. */
  for (let m = -2; m < origen + 8; m += 4) {
    const cerca = proyectar(camara, 0, m, 0, origen);
    const lejos = proyectar(camara, 0, m + 2, 0, origen);
    if (!cerca.visible || !lejos.visible) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.028)';
    ctx.fillRect(0, lejos.py, ancho, Math.max(1, cerca.py - lejos.py));
  }

  /* La luz de los focos sobre el césped, que es lo que da el aire de partido de noche. */
  const luz = ctx.createRadialGradient(ancho / 2, horizonte + alto * 0.2, 20, ancho / 2, horizonte + alto * 0.2, ancho * 0.8);
  luz.addColorStop(0, 'rgba(210,240,255,0.16)');
  luz.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, horizonte, ancho, alto - horizonte);

  /* Las líneas: el área grande, el área chica y el punto del penal. */
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  linea(ctx, camara, origen, [-20, 0], [20, 0]);
  linea(ctx, camara, origen, [-20.16, 16.5], [20.16, 16.5]);
  linea(ctx, camara, origen, [-20.16, 0], [-20.16, 16.5]);
  linea(ctx, camara, origen, [20.16, 0], [20.16, 16.5]);
  ctx.lineWidth = 1.6;
  linea(ctx, camara, origen, [-9.16, 5.5], [9.16, 5.5]);
  linea(ctx, camara, origen, [-9.16, 0], [-9.16, 5.5]);
  linea(ctx, camara, origen, [9.16, 0], [9.16, 5.5]);

  const punto = proyectar(camara, 0, 11, 0, origen);
  if (punto.visible) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(punto.px, punto.py, Math.max(1.5, punto.escala * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
}

function linea(
  ctx: CanvasRenderingContext2D,
  camara: Camara,
  origen: number,
  a: [number, number],
  b: [number, number],
): void {
  const p1 = proyectar(camara, a[0], a[1], 0, origen);
  const p2 = proyectar(camara, b[0], b[1], 0, origen);
  if (!p1.visible || !p2.visible) return;
  ctx.beginPath();
  ctx.moveTo(p1.px, p1.py);
  ctx.lineTo(p2.px, p2.py);
  ctx.stroke();
}

/**
 * El arco, con volumen y red.
 *
 * La red se dibuja como una malla entre el marco de adelante y el de atrás, y se **deforma** donde
 * pegó la pelota: ese temblor es la mitad de la satisfacción de un gol.
 */
export function dibujarArco(
  ctx: CanvasRenderingContext2D,
  camara: Camara,
  origen: number,
  impacto: { x: number; z: number; fuerza: number } | null,
): void {
  const medio = ARCO.ancho / 2;
  const fondoY = -ARCO.profundidad;
  const p = (x: number, y: number, z: number) => proyectar(camara, x, y, z, origen);

  /* Cuánto se hunde la red donde pegó la pelota: el temblor es media satisfacción de un gol. */
  const hundir = (x: number, z: number): number => {
    if (!impacto) return 0;
    const d = Math.hypot(x - impacto.x, z - impacto.z);
    return Math.max(0, 1 - d / 1.6) * impacto.fuerza * 0.45;
  };

  ctx.save();
  ctx.strokeStyle = 'rgba(226,244,255,0.22)';
  ctx.lineWidth = 1;

  /* El piso de la red: del pie del arco hacia el fondo. Da la profundidad de una sola mirada. */
  for (let i = 0; i <= 12; i++) {
    const x = -medio + (i / 12) * ARCO.ancho;
    const a = p(x, 0, 0);
    const b = p(x * 0.86, fondoY, 0);
    if (!a.visible || !b.visible) continue;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }
  for (let j = 1; j <= 3; j++) {
    const y = -(j / 3) * ARCO.profundidad;
    const escalaX = 1 - (j / 3) * 0.14;
    const a = p(-medio * escalaX, y, 0);
    const b = p(medio * escalaX, y, 0);
    if (!a.visible || !b.visible) continue;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }

  /* El paño de atrás: la malla que se ve a través del arco, con su hundimiento. */
  ctx.strokeStyle = 'rgba(226,244,255,0.3)';
  for (let i = 0; i <= 12; i++) {
    const x = (-medio + (i / 12) * ARCO.ancho) * 0.86;
    const a = p(x, fondoY, 0);
    const b = p(x, fondoY, ARCO.alto * 0.92 - hundir(x, ARCO.alto / 2));
    if (!a.visible || !b.visible) continue;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }
  for (let j = 0; j <= 5; j++) {
    const z = (j / 5) * ARCO.alto * 0.92;
    const caida = hundir(0, z);
    const a = p(-medio * 0.86, fondoY, z - caida);
    const b = p(medio * 0.86, fondoY, z - caida);
    if (!a.visible || !b.visible) continue;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  }

  /* Los tirantes: unen las esquinas de adelante con las de atrás y cierran el volumen. */
  ctx.strokeStyle = 'rgba(226,244,255,0.35)';
  for (const lado of [-1, 1]) {
    const arriba = p(lado * medio, 0, ARCO.alto);
    const atras = p(lado * medio * 0.86, fondoY, ARCO.alto * 0.92);
    if (!arriba.visible || !atras.visible) continue;
    ctx.beginPath();
    ctx.moveTo(arriba.px, arriba.py);
    ctx.lineTo(atras.px, atras.py);
    ctx.stroke();
  }
  ctx.restore();

  /* Los palos y el travesaño, al final para que queden por encima de la red. */
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f4f8fa';
  ctx.shadowColor = 'rgba(180,220,255,0.5)';
  ctx.shadowBlur = 8;

  const izqAbajo = p(-medio, 0, 0);
  const izqArriba = p(-medio, 0, ARCO.alto);
  const derAbajo = p(medio, 0, 0);
  const derArriba = p(medio, 0, ARCO.alto);
  if (izqAbajo.visible && derAbajo.visible) {
    ctx.lineWidth = Math.max(3, izqAbajo.escala * 0.1);
    ctx.beginPath();
    ctx.moveTo(izqAbajo.px, izqAbajo.py);
    ctx.lineTo(izqArriba.px, izqArriba.py);
    ctx.lineTo(derArriba.px, derArriba.py);
    ctx.lineTo(derAbajo.px, derAbajo.py);
    ctx.stroke();
  }
  ctx.restore();
}

/** La pelota, con su sombra en el piso. La sombra es lo que da la sensación de altura. */
export function dibujarPelota(
  ctx: CanvasRenderingContext2D,
  camara: Camara,
  origen: number,
  pelota: Pelota,
): void {
  const sombra = proyectar(camara, pelota.x, pelota.y, 0, origen);
  if (sombra.visible) {
    const encogida = Math.max(0.25, 1 - pelota.z / 6);
    ctx.fillStyle = `rgba(0,0,0,${0.32 * encogida})`;
    ctx.beginPath();
    ctx.ellipse(
      sombra.px,
      sombra.py,
      Math.max(2, sombra.escala * 0.12 * encogida),
      Math.max(1, sombra.escala * 0.05 * encogida),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const p = proyectar(camara, pelota.x, pelota.y, pelota.z, origen);
  if (!p.visible) return;
  const radio = Math.max(2.5, p.escala * pelota.r);

  /* Un poco de brillo arriba a la izquierda: alcanza para que se lea como una esfera. */
  const luz = ctx.createRadialGradient(
    p.px - radio * 0.35,
    p.py - radio * 0.4,
    radio * 0.1,
    p.px,
    p.py,
    radio,
  );
  luz.addColorStop(0, '#ffffff');
  luz.addColorStop(0.75, '#e8eef2');
  luz.addColorStop(1, '#9fb0bb');
  ctx.fillStyle = luz;
  ctx.beginPath();
  ctx.arc(p.px, p.py, radio, 0, Math.PI * 2);
  ctx.fill();

  /* Los paneles, apenas insinuados, girando con el spin. */
  if (radio > 5) {
    ctx.strokeStyle = 'rgba(20,30,40,0.35)';
    ctx.lineWidth = Math.max(0.6, radio * 0.09);
    ctx.beginPath();
    ctx.arc(p.px, p.py, radio * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
}
