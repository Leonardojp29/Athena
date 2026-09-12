/*
 * Lo que el sitio le cuenta a un buscador.
 *
 * Un solo lugar para las tres cosas que antes estaban sueltas por las páginas: el canónico cuando
 * un parámetro sí cambia el contenido, las migas, y el grafo de datos estructurados.
 *
 * Los nodos del grafo llevan `@id` a propósito. Sin él cada bloque es una isla: el equipo de la
 * página y el equipo local del partido son el mismo club y nada se los dice. Con `@id` iguales el
 * buscador los une, y esa unión es la mitad del valor de marcar el HTML.
 */

export type Nodo = Record<string, unknown>;

/** El `@id` de una entidad: su URL canónica más un ancla por tipo. */
export const identidad = (url: string | URL, tipo: string) => `${url}#${tipo}`;

export const absoluta = (ruta: string, sitio: URL | undefined) =>
  sitio ? new URL(ruta, sitio).toString() : ruta;

/**
 * El canónico de una página que sí depende de sus parámetros. Se listan los que cambian el
 * contenido y se descarta el resto: `?vista=` muestra otra pestaña de lo mismo, `?utm_*` no es
 * del sitio, y cada uno de esos indexado por separado divide la misma página en copias.
 */
export function canonicaCon(url: URL, sitio: URL | undefined, conservar: string[]): string {
  const limpia = new URL(url.pathname, sitio ?? url);
  for (const clave of conservar) {
    const valor = url.searchParams.get(clave);
    if (valor) limpia.searchParams.set(clave, valor);
  }
  return limpia.toString();
}

export interface Miga {
  nombre: string;
  ruta: string;
}

/**
 * El rastro desde la portada hasta acá. Google lo usa para dibujar la ruta bajo el título en vez
 * de la URL cruda, que en una página de partido es la diferencia entre leer «Athena › Liga 1 ›
 * Alianza vs Universitario» y leer un UUID.
 */
export function migas(pasos: Miga[], sitio: URL | undefined, canonica: string): Nodo {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonica}#migas`,
    itemListElement: [{ nombre: 'Inicio', ruta: '/' }, ...pasos].map((paso, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: paso.nombre,
      item: absoluta(paso.ruta, sitio),
    })),
  };
}

/** La ficha del sitio y de quien lo publica. Van solo en la portada: se declaran una vez. */
export function sitioYOrganizacion(sitio: URL | undefined): Nodo[] {
  const raiz = absoluta('/', sitio);
  return [
    {
      '@type': 'WebSite',
      '@id': `${raiz}#sitio`,
      url: raiz,
      name: 'Athena',
      inLanguage: 'es',
      publisher: { '@id': `${raiz}#organizacion` },
      /* El buscador es un formulario GET de verdad, así que esto se puede prometer. */
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${absoluta('/buscar', sitio)}?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${raiz}#organizacion`,
      url: raiz,
      name: 'Athena',
      description: 'Resultados, tablas y análisis de fútbol.',
      logo: {
        '@type': 'ImageObject',
        url: absoluta('/og.png', sitio),
        width: 1200,
        height: 630,
      },
    },
  ];
}

/** Un club como nodo compartible: el mismo `@id` lo use quien lo use. */
export function nodoEquipo(
  equipo: { name: string; slug: string; logoUrl?: string | null },
  sitio: URL | undefined,
): Nodo {
  const url = absoluta(`/equipos/${equipo.slug}`, sitio);
  return {
    '@type': 'SportsTeam',
    '@id': identidad(url, 'equipo'),
    url,
    name: equipo.name,
    sport: 'Soccer',
    ...(equipo.logoUrl ? { logo: equipo.logoUrl } : {}),
  };
}

export function nodoCompetencia(
  competencia: { name: string; slug: string; logoUrl?: string | null },
  sitio: URL | undefined,
): Nodo {
  const url = absoluta(`/competencias/${competencia.slug}`, sitio);
  return {
    '@type': 'SportsOrganization',
    '@id': identidad(url, 'competencia'),
    url,
    name: competencia.name,
    sport: 'Soccer',
    ...(competencia.logoUrl ? { logo: competencia.logoUrl } : {}),
  };
}

/*
 * El estado del partido en el vocabulario de schema.org. Importa más de lo que parece: un partido
 * aplazado que se sigue anunciando como programado es exactamente el error que este campo existe
 * para evitar.
 */
const ESTADOS: Record<string, string> = {
  scheduled: 'https://schema.org/EventScheduled',
  in_play: 'https://schema.org/EventScheduled',
  paused: 'https://schema.org/EventScheduled',
  finished: 'https://schema.org/EventScheduled',
  awarded: 'https://schema.org/EventScheduled',
  postponed: 'https://schema.org/EventPostponed',
  suspended: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
  abandoned: 'https://schema.org/EventCancelled',
};

export const estadoDelEvento = (estado: string) => ESTADOS[estado] ?? 'https://schema.org/EventScheduled';
