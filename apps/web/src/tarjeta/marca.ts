/*
 * La marca de Athena dibujada en SVG, y la portada que la usa sola.
 *
 * Vive aparte de la tarjeta de la calculadora porque ya son dos los que la necesitan: esa tarjeta
 * y la imagen de respaldo que se comparte cuando una página no tiene una propia. El búho y el
 * logotipo van en trazados y no en texto para que la imagen no dependa de que cargue una fuente.
 */

export const ANCHO = 1200;
export const ALTO = 630;
export const MARGEN = 64;

/* Los mismos valores que la banda del sitio, en sRGB porque el SVG no entiende oklch. */
export const FONDO = '#12234f';
export const FONDO_HONDO = '#0d1a3c';
export const TIZA = '#fdfcfb';
export const TIZA_TENUE = '#9bacc9';
export const LINEA = '#2b3f70';
export const ACENTO = '#1a5cdf';

export const escapar = (texto: string) => texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** El búho de Athena, del mismo trazado que `LogoMark.astro`, escalado desde su caja de 32. */
export function marcaDeAthena(x: number, y: number, tamano: number, tinta = TIZA): string {
  const k = tamano / 32;
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${tinta}" stroke-width="1.6" stroke-linejoin="round">
    <path d="M4 9 A5 5 0 0 1 9 4 H13.6 L16 7.2 L18.4 4 H23 A5 5 0 0 1 28 9 V15.4 C28 22 22.6 26.6 16 29 C9.4 26.6 4 22 4 15.4 Z" />
    <rect x="8" y="8.6" width="16" height="2" rx="1" fill="#e6293f" stroke="none" />
    <circle cx="11.2" cy="14" r="4.2" stroke-width="2.2" />
    <circle cx="20.8" cy="14" r="4.2" stroke-width="2.2" />
    <circle cx="11.2" cy="14" r="1.7" fill="${tinta}" stroke="none" />
    <circle cx="20.8" cy="14" r="1.7" fill="${tinta}" stroke="none" />
    <path d="M14.3 13 L17.7 13 L16 18.6 Z" fill="${tinta}" stroke="none" />
  </g>`;
}

/** El logotipo "ATHENA" en trazados, como en el header: no depende de que la fuente cargue. */
export function palabraAthena(x: number, y: number, alto: number, tinta = TIZA): string {
  const k = alto / 18;
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="${tinta}">
    <path d="M0 18 L7.4 0 H11.6 L19 18 H14.7 L13.2 14.1 H5.8 L4.3 18 Z M7.1 10.7 H11.9 L9.5 4.4 Z" />
    <path d="M22 18 V3.6 H17.2 V0 H31.2 V3.6 H26.4 V18 Z" />
    <path d="M34 18 V0 H38.4 V7.1 H45.4 V0 H49.8 V18 H45.4 V10.7 H38.4 V18 Z" />
    <path d="M53.6 18 V0 H66.8 V3.6 H58 V7.1 H65.6 V10.6 H58 V14.4 H67 V18 Z" />
    <path d="M70.6 18 V0 H75.1 L82.4 11.4 V0 H86.6 V18 H82.2 L74.8 6.5 V18 Z" />
    <path d="M89.6 18 L97 0 H101.2 L108.6 18 H104.3 L102.8 14.1 H95.4 L93.9 18 Z M96.7 10.7 H101.5 L99.1 4.4 Z" />
  </g>`;
}

/*
 * El búho y el logotipo como una sola pieza, centrada de verdad.
 *
 * Se centra midiendo: el logotipo mide 108,6 unidades de ancho en su caja de 18 de alto, así que
 * su ancho real se calcula y la pieza entera se reparte a los dos lados del eje. Centrar a ojo
 * dejaba el conjunto casi cien píxeles a la derecha, y en una imagen que circula sola eso se ve.
 */
const BUHO = 108;
const LOGOTIPO_ALTO = 58;
const AIRE = 26;

function lockup(centro: number, arriba: number): string {
  const logotipoAncho = 108.6 * (LOGOTIPO_ALTO / 18);
  const izquierda = centro - (BUHO + AIRE + logotipoAncho) / 2;
  /* Los dos se alinean por su centro óptico, no por su caja: el búho vive entre 4 y 29 de 32. */
  const centroDelBuho = arriba + ((4 + 29) / 2) * (BUHO / 32);
  return `${marcaDeAthena(izquierda, arriba, BUHO)}
  ${palabraAthena(izquierda + BUHO + AIRE, centroDelBuho - LOGOTIPO_ALTO / 2, LOGOTIPO_ALTO)}`;
}

/*
 * La portada de respaldo: la que sale en WhatsApp cuando se comparte una página que no tiene imagen
 * propia. Es la marca en grande sobre la banda, con la línea de cancha trazada del mundo visual.
 */
export function dibujarPortada(): string {
  const centro = ANCHO / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${FONDO}" />
      <stop offset="1" stop-color="${FONDO_HONDO}" />
    </linearGradient>
    <radialGradient id="aura" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${ACENTO}" stop-opacity="0.5" />
      <stop offset="1" stop-color="${ACENTO}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#fondo)" />
  <circle cx="${centro}" cy="${ALTO / 2 - 40}" r="420" fill="url(#aura)" />

  <!-- La cancha trazada, no dibujada: el gesto del entrenador sobre la pizarra. -->
  <g fill="none" stroke="${LINEA}" stroke-width="2">
    <rect x="${MARGEN}" y="${MARGEN}" width="${ANCHO - MARGEN * 2}" height="${ALTO - MARGEN * 2}" rx="10" />
    <line x1="${centro}" y1="${MARGEN}" x2="${centro}" y2="${ALTO - MARGEN}" />
    <circle cx="${centro}" cy="${ALTO / 2}" r="96" />
    <rect x="${MARGEN}" y="${ALTO / 2 - 118}" width="128" height="236" />
    <rect x="${ANCHO - MARGEN - 128}" y="${ALTO / 2 - 118}" width="128" height="236" />
  </g>

  ${lockup(centro, 186)}

  <text x="${centro}" y="352" text-anchor="middle" font-family="Archivo" font-size="26" fill="${TIZA_TENUE}" letter-spacing="5">INTELIGENCIA FUTBOLÍSTICA</text>
  <text x="${centro}" y="414" text-anchor="middle" font-family="Archivo" font-size="23" fill="${TIZA}">Resultados, tablas y análisis de las ligas que te importan</text>

  <rect x="0" y="${ALTO - 8}" width="${ANCHO}" height="8" fill="${ACENTO}" />
</svg>`;
}
