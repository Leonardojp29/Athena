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
