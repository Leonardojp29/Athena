import type { RondaDelImpostor } from './api';

const CLAVE = 'athena:impostor';
const VERSION = 1;
/** Cuántas claves recuerda para no repetir rondas entre partidas. */
const MEMORIA = 30;

/** Que el catálogo lo sepa sin sondear el almacenamiento en cada render. */
export const EVENTO_IMPOSTOR = 'athena:impostor';

/**
 * Lo que queda de las partidas.
 *
 * Mi Leyenda no guarda historial a propósito —[leyenda.ts] lo dice: una carrera terminada se cuenta
 * y desaparece—. Esto no lo contradice: una racha es un número que invita a volver, no un archivo
 * de partidas que las convierte en museo. Por eso se guardan cuatro cifras y ninguna fecha.
 */
export interface Marcas {
  mejorRacha: number;
  ultimaRacha: number;
  partidas: number;
  rondasAcertadas: number;
  /** Las claves ya vistas, para que la tanda siguiente traiga otras. */
  vistas: string[];
}

export const MARCAS_VACIAS: Marcas = {
  mejorRacha: 0,
  ultimaRacha: 0,
  partidas: 0,
  rondasAcertadas: 0,
  vistas: [],
};

const entero = (valor: unknown): number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? Math.floor(valor) : 0;

/** Lectura defensiva: un `localStorage` bloqueado o un formato viejo no pueden romper el juego. */
export function leerMarcas(): Marcas {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return MARCAS_VACIAS;
    const guardado = JSON.parse(crudo) as { version?: number } & Partial<Marcas>;
    if (guardado.version !== VERSION) return MARCAS_VACIAS;
    return {
      mejorRacha: entero(guardado.mejorRacha),
      ultimaRacha: entero(guardado.ultimaRacha),
      partidas: entero(guardado.partidas),
      rondasAcertadas: entero(guardado.rondasAcertadas),
      vistas: Array.isArray(guardado.vistas)
        ? guardado.vistas.filter((x) => typeof x === 'string').slice(0, MEMORIA)
        : [],
    };
  } catch {
    return MARCAS_VACIAS;
  }
}

function guardarMarcas(marcas: Marcas): void {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ version: VERSION, ...marcas, vistas: marcas.vistas.slice(0, MEMORIA) }),
    );
  } catch {
    /* Sin dónde guardar, el juego sigue: lo único que se pierde es el récord al recargar. */
  }
  window.dispatchEvent(new Event(EVENTO_IMPOSTOR));
}

export interface Cierre {
  racha: number;
  rondasAcertadas: number;
  vistas: string[];
}

export interface Resultado {
  marcas: Marcas;
  /** Verdadero cuando esta partida superó lo mejor que había. Lo usa la animación del desenlace. */
  record: boolean;
}

/** Cierra la partida y devuelve las marcas nuevas junto con si hubo récord. */
export function anotarPartida(cierre: Cierre): Resultado {
  const previas = leerMarcas();
  const record = cierre.racha > previas.mejorRacha;
  const marcas: Marcas = {
    mejorRacha: Math.max(previas.mejorRacha, cierre.racha),
    ultimaRacha: cierre.racha,
    partidas: previas.partidas + 1,
    rondasAcertadas: previas.rondasAcertadas + cierre.rondasAcertadas,
    vistas: [...cierre.vistas, ...previas.vistas.filter((v) => !cierre.vistas.includes(v))].slice(
      0,
      MEMORIA,
    ),
  };
  guardarMarcas(marcas);
  return { marcas, record };
}

export async function pedirTanda(vistas: string[]): Promise<RondaDelImpostor[]> {
  const respuesta = await fetch(
    `/juegos/el-impostor/tanda.json?excluir=${encodeURIComponent(vistas.join(','))}`,
  );
  if (!respuesta.ok) throw new Error('sin tanda');
  const cuerpo = (await respuesta.json()) as { rondas: RondaDelImpostor[] };
  if (cuerpo.rondas.length === 0) throw new Error('sin tanda');
  return cuerpo.rondas;
}

/** La foto no viaja en la respuesta: el proveedor la sirve por id y con eso alcanza. */
export const fotoDe = (ref: string): string =>
  `https://media.api-sports.io/football/players/${ref}.png`;

/** "Lionel Messi" → "Messi", para la carta, donde el apellido es lo que se reconoce. */
export const apellidoDe = (nombre: string): string => nombre.trim().split(/\s+/).pop() ?? nombre;
