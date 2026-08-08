import { colorEquipo, type ColorEquipo } from './color';

/*
 * La identidad de cada copa internacional.
 *
 * Son doce y son especiales: una noche de Libertadores no se ve como una fecha de liga, y el
 * proveedor no manda nada de esto —solo el logo—. Así que la lista está curada a mano con los dos
 * colores de cada marca: el `base` para el fondo de la cabecera y el `acento` para los detalles que
 * llevan la mirada (el rótulo de la ronda, la barra del campeón, el borde de la llave en juego).
 *
 * Se usa como acento y como fondo de cabecera, nunca detrás de un texto largo, y el par se elige de
 * modo que el acento pase contraste sobre el base. Una liga no entra acá: devuelve null y la página
 * se ve como siempre.
 */
export interface PaletaCompetencia {
  base: ColorEquipo;
  acento: ColorEquipo;
  /** Cómo se llama el torneo en dos palabras, para la cabecera. */
  tono: string;
}

const CURADAS: Record<string, [base: string, acento: string, tono: string]> = {
  'conmebol-libertadores': ['0d2f6b', 'f2c230', 'La Gloria Eterna'],
  'conmebol-sudamericana': ['0e3a6e', 'f27327', 'La otra copa'],
  'conmebol-recopa': ['16325c', 'c9c9d1', 'Campeón contra campeón'],
  'uefa-champions-league': ['0a1a4f', '4a9be8', 'Las noches de Champions'],
  'uefa-europa-league': ['1c1c22', 'ea6a1e', 'El camino largo a Europa'],
  'uefa-europa-conference-league': ['0b3b2e', '39c07a', 'La tercera puerta'],
  'uefa-super-cup': ['12285c', 'cbd5f0', 'Campeón contra campeón'],
  'fifa-club-world-cup': ['1b2a5e', 'd4af37', 'El mundo en un torneo'],
  'concacaf-champions-league': ['08402f', '2fbf71', 'De México al Caribe'],
  'afc-champions-league-elite': ['13235e', 'e0483f', 'La élite de Asia'],
  'caf-champions-league': ['0f4d2a', 'e0b93c', 'La corona africana'],
  'leagues-cup': ['3b1b5e', 'e4519b', 'MLS contra Liga MX'],
};

export function paletaCompetencia(slug: string): PaletaCompetencia | null {
  const curada = CURADAS[slug];
  if (!curada) return null;

  const base = colorEquipo(curada[0]);
  const acento = colorEquipo(curada[1]);
  return base && acento ? { base, acento, tono: curada[2] } : null;
}
