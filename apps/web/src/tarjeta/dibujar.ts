import type { Equipo, Resumen } from '@athena/calculadora';
import {
  ACENTO,
  ALTO,
  ANCHO,
  FONDO,
  FONDO_HONDO,
  LINEA,
  MARGEN,
  TIZA,
  TIZA_TENUE,
  escapar,
  marcaDeAthena,
  palabraAthena,
} from './marca';

/*
 * La tarjeta que se comparte, dibujada a mano en SVG.
 *
 * Se escribe el trazado en vez de componer un árbol y dejar que una librería lo acomode porque acá
 * el diseño es el producto: la tarjeta es lo único que va a ver mucha gente que nunca abra la
 * calculadora, y una caja mal centrada en una imagen que circula por WhatsApp no se arregla con un
 * despliegue.
 *
 * Mide 1200×630, que es lo que esperan las vistas previas de los chats y las redes. El fondo, la
 * marca y la paleta salen de `marca.ts`, que es lo que comparte con la portada del sitio.
 */

export interface Insumos {
  resumen: Resumen;
  /** Escudos ya resueltos a `data:`; resvg no sale a la red. */
  escudoClub: string | null;
  escudoLiga: string | null;
  competencia: string;
  temporada: number;
  /** El dominio real de quien sirve la imagen: inventar uno es peor que no poner ninguno. */
  sitio: string;
}

/*
 * El ancho de una cadena en Oswald, estimado por clase de carácter. Es una aproximación —la buena
 * exige medir la fuente— pero acá solo decide cuándo encoger un nombre para que entre, y errar por
 * un par de píxeles no se nota. Errar por veinte, sí.
 */
function anchoAproximado(texto: string, tamano: number): number {
  let unidades = 0;
  for (const letra of texto) {
    if ('MWmw'.includes(letra)) unidades += 0.82;
    else if ('ILilJjtfr.,;: '.includes(letra)) unidades += 0.32;
    else if (letra >= '0' && letra <= '9') unidades += 0.52;
    else unidades += 0.56;
  }
  return unidades * tamano;
}

/** El nombre del club manda: si no entra, encoge hasta entrar en vez de cortarse. */
function tamanoQueEntra(texto: string, disponible: number, maximo: number, minimo: number): number {
  let tamano = maximo;
  while (tamano > minimo && anchoAproximado(texto, tamano) > disponible) tamano -= 2;
  return tamano;
}

/*
 * Los cuatro cupos entran enteros o no entran: "+1" obliga a preguntar quién falta, que es lo
 * contrario de lo que hace una tarjeta. Si no caben con el nombre largo, se acortan.
 */
function lista(equipos: Equipo[], disponible: number, tamano: number): string {
  const largo = equipos.map((e) => e.nombre).join(' · ');
  if (anchoAproximado(largo, tamano) <= disponible) return largo;
  const corto = equipos.map((e) => acortar(e.nombre)).join(' · ');
  return corto;
}

/** "Club Deportivo Los Chankas" → "Los Chankas"; "Universitario" se queda como está. */
function acortar(nombre: string): string {
  const sobra = /^(Club Deportivo|Club|Deportivo|Foot Ball Club|FBC|Asociación)\s+/i;
  const podado = nombre.replace(sobra, '');
  const palabras = podado.split(' ');
  return palabras.length > 2 ? palabras.slice(0, 2).join(' ') : podado;
}

function cupo(
  x: number,
  y: number,
  ancho: number,
  titulo: string,
  equipos: Equipo[],
  color: string,
): string {
  if (equipos.length === 0) return '';
  return `<g>
    <rect x="${x}" y="${y - 14}" width="4" height="18" rx="2" fill="${color}" />
    <text x="${x + 15}" y="${y}" font-family="Archivo" font-size="17" font-weight="600" fill="${TIZA_TENUE}" letter-spacing="1.6">${escapar(titulo.toUpperCase())}</text>
    <text x="${x + 15}" y="${y + 35}" font-family="Archivo" font-size="23" fill="${TIZA}">${escapar(lista(equipos, ancho - 15, 23))}</text>
  </g>`;
}

export function dibujarTarjeta({
  resumen,
  escudoClub,
  escudoLiga,
  competencia,
  temporada,
  sitio,
}: Insumos): string {
  const club = resumen.campeon;
  const nombre = (club?.nombre ?? '').toUpperCase();
  const acentoClub = club?.color ? `#${club.color.replace('#', '')}` : ACENTO;

  const escudo = 168;
  const escudoX = MARGEN;
  const escudoY = 196;
  const textoX = escudoX + escudo + 44;
  /* El bloque de puntos se reserva su ancho antes de medir el nombre: nunca se pisan. */
  const anchoPuntos = 186;
  const disponible = ANCHO - textoX - MARGEN - anchoPuntos;
  const tamanoNombre = tamanoQueEntra(nombre, disponible, 86, 38);

  const veredicto = `${resumen.cerrado ? 'campeón del' : 'puntero del'} ${resumen.torneo}`;
  const puntosX = ANCHO - MARGEN;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${FONDO}" />
      <stop offset="1" stop-color="${FONDO_HONDO}" />
    </linearGradient>
    <radialGradient id="aura" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${acentoClub}" stop-opacity="0.55" />
      <stop offset="1" stop-color="${acentoClub}" stop-opacity="0" />
    </radialGradient>
    <clipPath id="disco">
      <circle cx="${escudoX + escudo / 2}" cy="${escudoY + escudo / 2}" r="${escudo / 2}" />
    </clipPath>
  </defs>

  <rect width="${ANCHO}" height="${ALTO}" fill="url(#fondo)" />

  <!-- El aura toma el color del club: la tarjeta de cada uno se ve suya y no de una plantilla. -->
  <circle cx="${escudoX + escudo / 2}" cy="${escudoY + escudo / 2}" r="370" fill="url(#aura)" />

  <!-- Cabecera: la marca a la izquierda, el torneo a la derecha. -->
  ${marcaDeAthena(MARGEN, 52, 38)}
  ${palabraAthena(MARGEN + 50, 61, 20)}
  ${
    escudoLiga
      ? `<image href="${escudoLiga}" x="${ANCHO - MARGEN - 52}" y="44" width="52" height="52" preserveAspectRatio="xMidYMid meet" />`
      : ''
  }
  <text x="${ANCHO - MARGEN - 68}" y="78" text-anchor="end" font-family="Archivo" font-size="20" fill="${TIZA_TENUE}">${escapar(competencia)} ${temporada}</text>

  <line x1="${MARGEN}" y1="126" x2="${ANCHO - MARGEN}" y2="126" stroke="${LINEA}" stroke-width="1" />

  <text x="${MARGEN}" y="176" font-family="Archivo" font-size="19" font-weight="600" fill="${TIZA_TENUE}" letter-spacing="3.4">MI PREDICCIÓN</text>

  <!-- El escudo del club, recortado en disco sobre tiza: los PNG del proveedor traen fondos varios. -->
  <circle cx="${escudoX + escudo / 2}" cy="${escudoY + escudo / 2}" r="${escudo / 2}" fill="${TIZA}" />
  ${
    escudoClub
      ? `<image href="${escudoClub}" x="${escudoX + 18}" y="${escudoY + 18}" width="${escudo - 36}" height="${escudo - 36}" preserveAspectRatio="xMidYMid meet" clip-path="url(#disco)" />`
      : ''
  }

  <text x="${textoX}" y="${escudoY + 76}" font-family="Oswald" font-size="${tamanoNombre}" font-weight="600" fill="${TIZA}">${escapar(nombre)}</text>
  <text x="${textoX}" y="${escudoY + 124}" font-family="Archivo" font-size="29" fill="${TIZA_TENUE}">${escapar(veredicto)}</text>

  <!-- Los puntos: el número es el titular real, así que se lleva el cuerpo más grande de todos. -->
  <text x="${puntosX}" y="${escudoY + 92}" text-anchor="end" font-family="Oswald" font-size="132" font-weight="600" fill="${TIZA}">${resumen.puntos}</text>
  <text x="${puntosX}" y="${escudoY + 126}" text-anchor="end" font-family="Archivo" font-size="19" font-weight="600" fill="${acentoClub === ACENTO ? TIZA_TENUE : acentoClub}" letter-spacing="3.4">PUNTOS</text>

  <line x1="${MARGEN}" y1="408" x2="${ANCHO - MARGEN}" y2="408" stroke="${LINEA}" stroke-width="1" />

  ${cupo(MARGEN, 456, ANCHO / 2 - MARGEN - 30, 'Copa Libertadores', resumen.libertadores, '#2f9e6b')}
  ${cupo(ANCHO / 2 + 14, 456, ANCHO / 2 - MARGEN - 14, 'Descienden', resumen.descenso, '#d8453c')}

  <line x1="${MARGEN}" y1="528" x2="${ANCHO - MARGEN}" y2="528" stroke="${LINEA}" stroke-width="1" />

  <text x="${MARGEN}" y="573" font-family="Archivo" font-size="19" fill="${TIZA_TENUE}">${
    resumen.cerrado
      ? `Escenario completo · ${resumen.puestos} partidos puestos`
      : `Faltan ${resumen.faltan} partidos por definir`
  }</text>
  <text x="${ANCHO - MARGEN}" y="573" text-anchor="end" font-family="Archivo" font-size="19" font-weight="600" fill="${TIZA_TENUE}">${escapar(sitio)}/calculadora-liga-1</text>

  <!-- El labio de la banda, igual que en el sitio: la tarjeta es Athena, no una imagen suelta. -->
  <rect x="0" y="${ALTO - 8}" width="${ANCHO}" height="8" fill="${ACENTO}" />
</svg>`;
}
