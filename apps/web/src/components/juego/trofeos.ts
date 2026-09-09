import type { Trofeo } from '@athena/leyenda';

export interface GrupoDeTrofeos {
  nombre: string;
  clase: Trofeo['clase'];
  escudo: string | null;
  club: string | null;
  veces: number;
  anios: number[];
  /** Lo que se lee al pasar el mouse: la competencia, el club y los años. */
  detalle: string;
}

const JERARQUIA: Record<string, number> = { seleccion: 0, continental: 1, liga: 2, copa: 3, individual: 4 };

/**
 * La vitrina agrupada por competencia.
 *
 * Tres ligas ganadas con el mismo club son una insignia con un ×3, no tres insignias iguales. Vive
 * acá y no en cada pantalla porque lo usan las dos —el tablero mientras juegas y el resumen del
 * final— y tenían dos copias de la misma cuenta.
 */
export function agruparTrofeos(trofeos: Trofeo[]): GrupoDeTrofeos[] {
  const mapa = new Map<string, GrupoDeTrofeos>();
  for (const trofeo of trofeos) {
    const clave = `${trofeo.nombre}|${trofeo.clase}`;
    const previo = mapa.get(clave);
    mapa.set(clave, {
      nombre: trofeo.nombre,
      clase: trofeo.clase,
      escudo: trofeo.escudo ?? null,
      club: previo?.club ?? trofeo.clubNombre ?? null,
      veces: (previo?.veces ?? 0) + 1,
      anios: [...(previo?.anios ?? []), trofeo.temporada],
      detalle: '',
    });
  }
  return [...mapa.values()]
    .map((grupo) => {
      const anios = [...grupo.anios].sort((a, b) => a - b);
      return {
        ...grupo,
        anios,
        detalle: [grupo.nombre, grupo.club, anios.join(' · ')].filter(Boolean).join(' · '),
      };
    })
    .sort((a, b) => (JERARQUIA[a.clase] ?? 9) - (JERARQUIA[b.clase] ?? 9) || b.veces - a.veces);
}
