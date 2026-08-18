/**
 * La partida guardada, en el navegador.
 *
 * Sin cuentas, la fuente de verdad es `localStorage`, igual que los favoritos. Una carrera de veinte
 * temporadas ocupa unos 40 KB en JSON: entra sin problema y se lee de una sola vez al abrir el juego.
 *
 * Dos claves: la partida en curso y el salón, que guarda **solo el veredicto** de las carreras
 * terminadas. Guardar la carrera entera de cada una llenaría el almacenamiento en veinte partidas y
 * nadie vuelve a mirar el detalle de la temporada nueve de su tercer futbolista.
 */
import type { Carrera, Veredicto } from '@athena/leyenda';

const CLAVE = 'athena:leyenda';
const CLAVE_SALON = 'athena:leyenda-salon';

/** Se dispara cuando la partida cambia: la página del catálogo repinta el "seguir jugando". */
export const EVENTO_LEYENDA = 'athena:leyenda';

/** La versión del formato guardado. Si cambia la forma de `Carrera`, sube y lo viejo se descarta. */
const VERSION = 1;

export interface CarreraGuardada {
  version: number;
  guardadaEn: string;
  carrera: Carrera;
}

export interface EntradaDelSalon {
  nombre: string;
  club: string;
  temporadas: number;
  goles: number;
  trofeos: number;
  ovr: number;
  nivel: string;
  adn: string;
  terminadaEn: string;
  /** El código compartible, para volver a abrir esa carta. */
  codigo: string;
}

export function leerPartida(): Carrera | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const guardada = JSON.parse(crudo) as CarreraGuardada;
    /* Una partida de un formato viejo no se migra: se descarta con aviso, no se rompe el juego. */
    if (guardada.version !== VERSION || !guardada.carrera?.futbolista) return null;
    return guardada.carrera;
  } catch {
    return null;
  }
}

export function guardarPartida(carrera: Carrera): void {
  try {
    const guardada: CarreraGuardada = {
      version: VERSION,
      guardadaEn: new Date().toISOString(),
      carrera,
    };
    localStorage.setItem(CLAVE, JSON.stringify(guardada));
    window.dispatchEvent(new CustomEvent(EVENTO_LEYENDA));
  } catch {
    /* Almacenamiento lleno o bloqueado: la partida sigue en memoria y se avisa en pantalla. */
  }
}

export function borrarPartida(): void {
  try {
    localStorage.removeItem(CLAVE);
    window.dispatchEvent(new CustomEvent(EVENTO_LEYENDA));
  } catch {
    /* Si no se puede borrar, empezar de nuevo la sobreescribe igual. */
  }
}

export function leerSalon(): EntradaDelSalon[] {
  try {
    const crudo = localStorage.getItem(CLAVE_SALON);
    const lista = crudo ? (JSON.parse(crudo) as EntradaDelSalon[]) : [];
    return Array.isArray(lista) ? lista.filter((e) => e && typeof e.nombre === 'string') : [];
  } catch {
    return [];
  }
}

/** Guarda una carrera terminada en el salón. Las últimas veinte alcanzan. */
export function guardarEnElSalon(carrera: Carrera, veredicto: Veredicto, codigo: string): void {
  try {
    const entrada: EntradaDelSalon = {
      nombre: carrera.futbolista.nombre,
      club: carrera.retiro?.clubNombre ?? carrera.clubActual?.nombre ?? '',
      temporadas: veredicto.totales.temporadas,
      goles: veredicto.totales.goles,
      trofeos: veredicto.totales.trofeos,
      ovr: veredicto.totales.ovrMaximo,
      nivel: veredicto.nivelMaximo,
      adn: veredicto.adn.titulo,
      terminadaEn: new Date().toISOString(),
      codigo,
    };
    const lista = [entrada, ...leerSalon()].slice(0, 20);
    localStorage.setItem(CLAVE_SALON, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent(EVENTO_LEYENDA));
  } catch {
    /* Sin salón, el legado igual se puede compartir por su código. */
  }
}

/* ------------------------------------------------------------------ compartir */

/**
 * El código de un legado: la carrera resumida, en la URL.
 *
 * No viaja la carrera entera —serían 40 KB en una dirección— sino lo que la carta final necesita. Va
 * en base64url para que se pueda pegar en WhatsApp sin que nada lo escape, y quien lo abre ve la carta
 * de verdad, interactiva, no una captura de pantalla.
 */
export interface LegadoCompartible {
  n: string;
  d: number;
  p: string;
  o: number;
  v: string;
  a: [number, number, number, number, number, number];
  c: string;
  cc: string | null;
  e: string;
  b: string | null;
  t: number;
  pr: number;
  g: number;
  as: number;
  te: number;
  adn: string;
}

/**
 * La frase para compartir, armada de lo que el código ya trae. No viaja en la URL a propósito: era el
 * campo más largo y un enlace que no cabe en un mensaje no se comparte.
 */
export function fraseDelLegado(legado: LegadoCompartible): string {
  const apellido = legado.n.split(' ').at(-1) ?? legado.n;
  return `${apellido}: ${legado.te} temporadas, ${legado.g} goles, ${legado.t} títulos. ${legado.adn}.`;
}

export function codificarLegado(datos: LegadoCompartible): string {
  const texto = JSON.stringify(datos);
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodificarLegado(codigo: string): LegadoCompartible | null {
  try {
    const base64 = codigo.replaceAll('-', '+').replaceAll('_', '/');
    const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const datos = JSON.parse(new TextDecoder().decode(bytes)) as LegadoCompartible;
    return typeof datos?.n === 'string' && Array.isArray(datos.a) ? datos : null;
  } catch {
    return null;
  }
}
