/*
 * Los colores del equipo, usados con cuidado.
 *
 * El proveedor manda el color de la camiseta en hex sin almohadilla y sin ninguna garantía: hay
 * cremas casi blancos (Universitario `e7d7cf`), negros (`000000`) y grises. Por eso la regla es que
 * el color del equipo se usa como **acento** —la plaquita del escudo, una barra, un halo— y nunca
 * como fondo de un texto: así no hay forma de que un color inesperado deje algo ilegible.
 *
 * `esOscuro` existe para el único caso donde sí hay algo encima: el escudo sobre su plaquita, que
 * necesita un aro claro si el color es oscuro y uno oscuro si es claro.
 */
export interface ColorEquipo {
  base: string;
  /** El mismo color translúcido, para lavados y halos. */
  suave: (alfa: number) => string;
  esOscuro: boolean;
}

const HEX = /^[0-9a-fA-F]{6}$/;

/*
 * Clubes donde el color del proveedor no es el del club.
 *
 * Alianza Lima quedó guardado como blanco con dorsal naranja, y es blanquiazul. No es un error de
 * mapeo: el proveedor manda **el kit de ese partido**, no la identidad del club —en el partido del 2
 * de agosto Alianza figura de negro— y el muestreo se queda con el que le tocó. Cuando el club es
 * conocido y el dato está mal, gana esta lista; cuando no, manda la regla de abajo.
 *
 * Es una lista de casos, no un mecanismo: la solución de fondo es deducir el color del escudo.
 */
const COLORES_DE_CLUB: Record<string, [string, string]> = {
  'alianza-lima': ['00285c', 'ffffff'],
};

/**
 * Qué colores usar para un club.
 *
 * Lo que descalifica a un color no es ser claro sino **no tener color**: el blanco, el negro y el gris
 * son 331 de los 835 equipos con dato, y pintan una cabecera lavada —o una franja de blanco a naranja,
 * como la de Alianza— que dice del club algo que no es cierto. Ahí no se muestra ninguno y manda la
 * pizarra de siempre: no saber es honesto, inventar no.
 *
 * Se mide con el croma y no con la luminancia, y la diferencia no es teórica: el crema de
 * Universitario tiene luminancia 0,854 —cruzaba por cuatro milésimas un umbral de 0,85 y se descartaba
 * como si fuera blanco— pero croma 0,094, mientras que el blanco puro y el gris tienen croma 0. Con la
 * regla correcta vuelven noventa y tres equipos con color propio.
 *
 * El secundario tampoco sirve de reemplazo: es el color del dorsal, no el de la camiseta alternativa.
 */
export function coloresDeClub(
  slug: string,
  primario: string | null | undefined,
  secundario: string | null | undefined,
): [string | null, string | null] {
  const propio = COLORES_DE_CLUB[slug];
  if (propio) return propio;
  if (!primario || !HEX.test(primario)) return [null, null];

  return cromaDe(primario) < CROMA_MINIMO ? [null, null] : [primario, secundario ?? null];
}

/* Debajo de esto el color es blanco, negro o gris: no distingue a nadie. */
const CROMA_MINIMO = 0.06;

/** Cuánto se aparta el color del gris: la distancia entre su canal más alto y el más bajo. */
function cromaDe(hex: string): number {
  const canales = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return Math.max(...canales) - Math.min(...canales);
}

export function colorEquipo(hex: string | null | undefined): ColorEquipo | null {
  if (!hex || !HEX.test(hex)) return null;

  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  /* Luminancia relativa de WCAG: la misma fórmula con la que se mide el contraste. */
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminancia = 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

  return {
    base: `#${hex.toLowerCase()}`,
    suave: (alfa: number) => `rgb(${r} ${g} ${b} / ${alfa})`,
    esOscuro: luminancia < 0.4,
  };
}

/*
 * El tema de una entidad: la camiseta como superficie, no como lavado.
 *
 * El acento tímido fracasó en la práctica: el azul casi negro de Alianza al 30% sobre la pizarra
 * oscura era invisible, y lo mismo el blanco de River. Lo que hace que una página "sea" del club es
 * que la cabecera tenga su color de verdad —aunque sea negro o blanco— con la tinta elegida por
 * luminancia y el secundario como resplandor.
 *
 * El texto se apoya en el extremo oscurecido del degradado (mezcla con casi-negro en los colores
 * oscuros, con blanco en los claros), que es lo que mantiene el contraste cuando el color cae en la
 * franja media donde ni la tinta clara ni la oscura alcanzan sobre el color puro.
 */
export interface TemaEquipo {
  fondo: string;
  tinta: string;
  tintaSuave: string;
  tintaTenue: string;
  /** Hairline y chips sobre el fondo, derivados de la tinta: gris sobre color se ve sucio. */
  linea: string;
  chip: string;
  /** La franja de identidad: primario → secundario. */
  franja: string;
  /** El primario translúcido, para lavar el cuerpo de la página. */
  lavado: (alfa: number) => string;
  esOscuro: boolean;
}

export function temaEquipo(
  primario: string | null | undefined,
  secundario?: string | null,
): TemaEquipo | null {
  const base = colorEquipo(primario);
  if (!base) return null;
  const sec = colorEquipo(secundario);

  const tintaRgb = base.esOscuro ? '245 247 245' : '16 17 21';
  const profundo = base.esOscuro
    ? `color-mix(in oklab, ${base.base} 66%, #07070b)`
    : `color-mix(in oklab, ${base.base} 72%, #ffffff)`;
  const halo = sec ? sec.suave(base.esOscuro ? 0.38 : 0.5) : base.suave(0.25);

  return {
    fondo: `radial-gradient(110% 180% at 100% -40%, ${halo}, transparent 55%), linear-gradient(115deg, ${profundo} 0%, ${base.base} 82%)`,
    tinta: `rgb(${tintaRgb})`,
    tintaSuave: `rgb(${tintaRgb} / 0.78)`,
    tintaTenue: `rgb(${tintaRgb} / 0.4)`,
    linea: `rgb(${tintaRgb} / 0.16)`,
    chip: `rgb(${tintaRgb} / 0.1)`,
    franja: `linear-gradient(90deg, ${base.base}, ${sec?.base ?? base.suave(0.35)})`,
    lavado: base.suave,
    esOscuro: base.esOscuro,
  };
}
