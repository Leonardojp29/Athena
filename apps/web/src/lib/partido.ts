/*
 * La dirección de un partido.
 *
 * `/partidos/alianza-lima-vs-universitario-2026-03-15` en vez de un UUID. La página que tiene que
 * salir cuando alguien busca «alianza lima vs universitario» no puede ser la única del sitio sin
 * una palabra en su dirección.
 *
 * El slug se deriva, no se guarda: es el slug de cada club más la fecha en Lima. Se comprobó sobre
 * los 71.062 partidos de la base —cero colisiones, y ningún slug de club contiene `-vs-` ni termina
 * en algo con forma de fecha—, así que armarlo y volver a leerlo es reversible sin una columna.
 */

const TZ = 'America/Lima';
const enLima = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface ParaRuta {
  homeTeam: { slug: string };
  awayTeam: { slug: string };
  kickoffUtc: string;
}

export const fechaDelPartido = (kickoffUtc: string) => enLima.format(new Date(kickoffUtc));

export function rutaDePartido(partido: ParaRuta): string {
  return `${partido.homeTeam.slug}-vs-${partido.awayTeam.slug}-${fechaDelPartido(partido.kickoffUtc)}`;
}

export const enlaceDePartido = (partido: ParaRuta) => `/partidos/${rutaDePartido(partido)}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (valor: string) => UUID.test(valor);

export interface PartidoPedido {
  local: string;
  visita: string;
  fecha: string;
}

/**
 * El camino de vuelta. Devuelve null si la dirección no tiene la forma esperada, para que la ruta
 * conteste 404 en vez de preguntarle al API por algo que nunca fue un partido.
 */
export function leerRutaDePartido(ruta: string): PartidoPedido | null {
  const conFecha = /^(.+)-(\d{4}-\d{2}-\d{2})$/.exec(ruta);
  if (!conFecha) return null;
  const [, cruce = '', fecha = ''] = conFecha;
  const corte = cruce.indexOf('-vs-');
  if (corte < 1) return null;
  const local = cruce.slice(0, corte);
  const visita = cruce.slice(corte + 4);
  if (!local || !visita) return null;
  return { local, visita, fecha };
}

/** El historial llega del SQL crudo, con los nombres de columna de la base. */
export interface CruceParaRuta {
  home_slug: string;
  away_slug: string;
  kickoff_utc: string;
}

export const enlaceDeCruce = (cruce: CruceParaRuta) =>
  `/partidos/${cruce.home_slug}-vs-${cruce.away_slug}-${fechaDelPartido(cruce.kickoff_utc)}`;
