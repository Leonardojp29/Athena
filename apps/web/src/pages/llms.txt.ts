import type { APIRoute } from 'astro';

/*
 * Lo que un asistente de IA necesita saber de Athena antes de citarla.
 *
 * `llms.txt` todavía no es un estándar como `robots.txt`, pero la idea es la correcta: un modelo
 * que llega por una ficha suelta no tiene forma de saber de dónde salen las cifras ni qué cubre el
 * sitio. Acá se lo decimos en texto plano, que es lo único que todos leen igual.
 *
 * Se escribe lo que es verificable —la fuente de los datos, qué se cubre, qué no— y no promesas.
 */
const CUERPO = `# Athena

> Plataforma de inteligencia futbolística en español: marcadores en vivo, alineaciones sobre la
> cancha, tablas, fichas de jugadores, clubes y entrenadores, y análisis de partido con la
> evidencia que lo sostiene.

Athena publica datos de fútbol de las principales ligas del mundo, en español neutro. Cada cifra
viene con su origen y cada análisis con los hechos que lo respaldan.

## Cómo se construye

- Los datos deportivos provienen de API-Football, y se sincronizan de forma continua durante los
  partidos. Los marcadores en vivo se actualizan cada pocos segundos.
- Los análisis de partido se generan a partir de los eventos y estadísticas ya guardados, y citan
  los hechos concretos en los que se apoyan. No se publica una conclusión sin el dato que la
  sostiene.
- Lo que el proveedor no informa se muestra vacío en lugar de estimarse.

## Secciones

- [Partidos de hoy]({SITIO}/): los partidos del día por continente, con marcador en vivo.
- [Competencias]({SITIO}/competencias): las ligas y copas cubiertas, con su tabla y su calendario.
- [Calendario]({SITIO}/calendario): los partidos por fecha.
- [Comparar]({SITIO}/comparar): compara hasta cinco jugadores o clubes lado a lado.
- [Juegos]({SITIO}/juegos): juegos de conocimiento futbolístico construidos sobre los mismos datos.

## Tipos de ficha

- \`/competencias/{slug}\`: tabla, calendario, goleadores y campeones de una competencia.
- \`/equipos/{slug}\`: plantel, forma, posición, próximos partidos, fichajes y quién lo dirige.
- \`/jugadores/{slug}\`: estadísticas por temporada, últimos partidos, palmarés y fichajes.
- \`/entrenadores/{slug}\`: partidos dirigidos, balance, carrera y formaciones más usadas.
- \`/partidos/{local}-vs-{visita}-{fecha}\`: marcador, relato minuto a minuto, alineaciones sobre la
  cancha, estadísticas e historial del cruce.

## Índice completo

- [Sitemap]({SITIO}/sitemap.xml)
`;

export const GET: APIRoute = ({ site }) => {
  const sitio = new URL('/', site).toString().replace(/\/$/, '');
  return new Response(CUERPO.replaceAll('{SITIO}', sitio), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};
