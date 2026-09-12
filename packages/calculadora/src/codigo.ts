import type { Equipo, Partido, Pronosticos } from './tipos.js';

/**
 * Los pronósticos, en la URL.
 *
 * Ocho caracteres por partido: `aliuni21` es Alianza 2 - 1 Universitario. El par ordenado es
 * único en una liga de ida y vuelta, así que no hace falta decir la fecha. Se eligió un código
 * legible en vez de índices en base 36 —seis caracteres, sin diccionario— porque el enlace se
 * manda por WhatsApp y ahí alguien lo lee y lo cuenta: eso es la mitad de para qué existe.
 *
 * Nada se guarda en el servidor. Un enlace vale para siempre sin costarnos una fila en la base.
 */

const LARGO_DEL_CODIGO = 3;
const LARGO_DEL_TOKEN = LARGO_DEL_CODIGO * 2 + 2;
const GOLES_MAXIMOS = 9;

/** Solo estos pueden pronosticarse: lo jugado manda y lo cancelado no vuelve. */
const PRONOSTICABLE = new Set(['scheduled', 'postponed', 'suspended']);

const CODIGOS: Record<string, string> = {
  'alianza-lima': 'ali',
  universitario: 'uni',
  'sporting-cristal': 'cri',
  'fbc-melgar': 'mel',
  cienciano: 'cie',
  'deportivo-garcilaso': 'gar',
  cusco: 'cus',
  'sport-boys': 'boy',
  'sport-huancayo': 'hua',
  'utc-cajamarca': 'utc',
  'fc-cajamarca': 'caj',
  'atletico-grau': 'gra',
  adt: 'adt',
  'alianza-atletico': 'aat',
  'club-deportivo-los-chankas': 'cha',
  'comerciantes-unidos': 'com',
  'juan-pablo-ii-college': 'jpc',
  'ucv-moquegua': 'ucv',
};

/**
 * Un slug que no esté en el diccionario igual tiene que dar un código estable: si el año que
 * viene asciende un equipo, los enlaces viejos siguen valiendo y el nuevo entra sin tocar nada.
 */
function codigoDe(slug: string): string {
  const conocido = CODIGOS[slug];
  if (conocido) return conocido;
  const letras = slug.replace(/[^a-z]/g, '');
  return letras.slice(0, LARGO_DEL_CODIGO).padEnd(LARGO_DEL_CODIGO, 'x');
}

export function codigosDeEquipos(equipos: readonly Equipo[]): Map<string, string> {
  const usados = new Set<string>();
  const porId = new Map<string, string>();
  for (const equipo of equipos) {
    let codigo = codigoDe(equipo.slug);
    /* Dos slugs distintos no pueden compartir código: el segundo corre una letra. */
    for (let sufijo = 0; usados.has(codigo) && sufijo < 10; sufijo += 1) {
      codigo = codigo.slice(0, LARGO_DEL_CODIGO - 1) + String(sufijo);
    }
    usados.add(codigo);
    porId.set(equipo.id, codigo);
  }
  return porId;
}

export function codificar(
  pronosticos: Pronosticos,
  equipos: readonly Equipo[],
  partidos: readonly Partido[],
): string {
  const codigos = codigosDeEquipos(equipos);
  const porId = new Map(partidos.map((p) => [p.id, p]));

  let salida = '';
  for (const [partidoId, [local, visita]] of pronosticos) {
    const partido = porId.get(partidoId);
    if (!partido) continue;
    const codigoLocal = codigos.get(partido.local);
    const codigoVisita = codigos.get(partido.visita);
    if (!codigoLocal || !codigoVisita) continue;
    salida += codigoLocal + codigoVisita + acotar(local) + acotar(visita);
  }
  return salida;
}

function acotar(goles: number): string {
  const entero = Math.trunc(goles);
  if (!Number.isFinite(entero) || entero < 0) return '0';
  return String(Math.min(entero, GOLES_MAXIMOS));
}

/**
 * Al revés. Los tokens rotos se ignoran en vez de invalidar el enlace entero: un carácter de más
 * al pegarlo en un chat no debería costar el escenario completo.
 */
export function decodificar(
  codigo: string | null | undefined,
  equipos: readonly Equipo[],
  partidos: readonly Partido[],
): Map<string, readonly [number, number]> {
  const pronosticos = new Map<string, readonly [number, number]>();
  if (!codigo) return pronosticos;

  const limpio = codigo.toLowerCase().replace(/[^a-z0-9]/g, '');
  const codigos = codigosDeEquipos(equipos);
  const porPar = new Map<string, Partido>();
  for (const partido of partidos) {
    if (!PRONOSTICABLE.has(partido.estado)) continue;
    const local = codigos.get(partido.local);
    const visita = codigos.get(partido.visita);
    if (local && visita) porPar.set(local + visita, partido);
  }

  for (let i = 0; i + LARGO_DEL_TOKEN <= limpio.length; i += LARGO_DEL_TOKEN) {
    const token = limpio.slice(i, i + LARGO_DEL_TOKEN);
    const par = token.slice(0, LARGO_DEL_CODIGO * 2);
    const goles = token.slice(LARGO_DEL_CODIGO * 2);
    if (!/^\d\d$/.test(goles)) continue;
    const partido = porPar.get(par);
    if (!partido) continue;
    pronosticos.set(partido.id, [Number(goles[0]), Number(goles[1])]);
  }

  return pronosticos;
}
