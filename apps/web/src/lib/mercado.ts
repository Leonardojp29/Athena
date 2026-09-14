import type { ClaseDeFichaje, Fichaje, Trofeo } from './api';

/*
 * Cómo se cuentan el palmarés y el mercado.
 *
 * Las dos cosas llegan del proveedor con la misma aspereza: títulos sin año y una clase de pase que
 * la mitad de las veces no dice nada. Acá se decide qué se escribe y qué se calla, que es donde
 * manda la regla de Athena: si algo no se sabe, no se menciona.
 */

const NOMBRE: Record<Exclude<ClaseDeFichaje, 'desconocido'>, string> = {
  traspaso: 'Traspaso',
  prestamo: 'A préstamo',
  'vuelve-de-prestamo': 'Vuelve de préstamo',
  libre: 'Libre',
};

/**
 * Cómo se llama un movimiento, o nada.
 *
 * `desconocido` devuelve null a propósito: el proveedor no dice nada en cuatro de cada diez pases, y
 * escribir "Desconocido" en la fila sería llenar la pantalla con nuestra ignorancia.
 */
export const nombreDeClase = (clase: ClaseDeFichaje): string | null =>
  clase === 'desconocido' ? null : NOMBRE[clase];

/** Lo que se lee al costado de un pase: la clase, y el monto cuando el proveedor lo escribió. */
export function detalleDeFichaje(fichaje: Pick<Fichaje, 'clase' | 'monto'>): string | null {
  const nombre = nombreDeClase(fichaje.clase);
  if (fichaje.monto) return nombre ? `${nombre} · ${fichaje.monto}` : fichaje.monto;
  return nombre;
}

export interface GrupoDePalmares {
  /** El año, o null para los títulos que el proveedor mandó sin temporada. */
  temporada: string | null;
  titulos: Trofeo[];
}

/**
 * El palmarés agrupado por temporada, del año más nuevo al más viejo.
 *
 * Los títulos sin año van al final en un grupo propio en vez de mezclarse arriba: son el 45% de las
 * filas, y colarlos entre los años fechados haría dudar de todos los demás.
 */
export function agruparPalmares(palmares: Trofeo[]): GrupoDePalmares[] {
  const porTemporada = new Map<string, Trofeo[]>();
  const sinAnio: Trofeo[] = [];

  for (const titulo of palmares) {
    if (!titulo.temporada) {
      sinAnio.push(titulo);
      continue;
    }
    porTemporada.set(titulo.temporada, [...(porTemporada.get(titulo.temporada) ?? []), titulo]);
  }

  const conAnio = [...porTemporada]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([temporada, titulos]) => ({ temporada, titulos: ordenar(titulos) }));

  return sinAnio.length > 0
    ? [...conAnio, { temporada: null, titulos: ordenar(sinAnio) }]
    : conAnio;
}

/* Lo ganado antes que lo perdido, y dentro de cada uno por nombre: un orden que no depende del feed. */
const ordenar = (titulos: Trofeo[]): Trofeo[] =>
  [...titulos].sort(
    (a, b) =>
      Number(b.puesto === 'campeon') - Number(a.puesto === 'campeon') ||
      a.competencia.localeCompare(b.competencia),
  );

export interface ResumenDePalmares {
  campeon: number;
  subcampeon: number;
}

export const contarPalmares = (palmares: Trofeo[]): ResumenDePalmares => ({
  campeon: palmares.filter((t) => t.puesto === 'campeon').length,
  subcampeon: palmares.filter((t) => t.puesto === 'subcampeon').length,
});
