/**
 * La partida guardada, en el navegador.
 *
 * Sin cuentas, la fuente de verdad es `localStorage`, igual que los favoritos. Una carrera de veinte
 * temporadas ocupa unos 40 KB en JSON: entra sin problema y se lee de una sola vez al abrir el juego.
 *
 * Una sola clave: la partida en curso. **No hay historial.** Una leyenda que termina se cuenta, se
 * comparte si el jugador quiere y desaparece; guardar la lista de todas convertía el juego en un
 * archivo, y lo que hace que alguien empiece otra carrera es que la anterior ya no esté.
 */
import type { Carrera } from '@athena/leyenda';

const CLAVE = 'athena:leyenda';
/* La clave del salón viejo. Solo se usa para borrarla: las partidas terminadas ya no se guardan. */
const CLAVE_SALON_VIEJA = 'athena:leyenda-salon';

/** Se dispara cuando la partida cambia: la página del catálogo repinta el "seguir jugando". */
export const EVENTO_LEYENDA = 'athena:leyenda';

/**
 * La versión del formato guardado. Si cambia la forma de `Carrera`, sube y lo viejo se descarta.
 *
 * La 2 es el juego de doce capítulos. Una partida de la 1 —veinte temporadas, tramos, ritmo— leída
 * con el motor nuevo mostraba disparates como "217 años" y "capítulo 1 de 12" con doce filas ya
 * escritas: el estado viejo encajaba de casualidad en los tipos nuevos. Por eso la versión se
 * compara antes de mirar nada más.
 */
const VERSION = 2;

export interface CarreraGuardada {
  version: number;
  guardadaEn: string;
  carrera: Carrera;
}

export function leerPartida(): Carrera | null {
  try {
    /* De paso se limpia el salón viejo: si el historial ya no existe, tampoco su rastro. */
    localStorage.removeItem(CLAVE_SALON_VIEJA);
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const guardada = JSON.parse(crudo) as CarreraGuardada;
    /* Una partida de un formato viejo no se migra: se descarta, que es mejor que jugar algo roto. */
    if (guardada.version !== VERSION || !guardada.carrera?.futbolista) return null;
    /* Y una del formato nuevo pero incoherente tampoco: el juego arranca limpio. */
    if (typeof guardada.carrera.capitulo !== 'number' || guardada.carrera.capitulo > 12) return null;
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
  /** La banda del lateral o el extremo. Los códigos viejos no la traen. */
  pc?: string;
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
