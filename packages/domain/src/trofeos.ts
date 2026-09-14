/**
 * Cómo llama el proveedor a los torneos del palmarés, y cómo los llamamos nosotros.
 *
 * El endpoint de trofeos manda el nombre del torneo y no su id, y no usa el mismo nombre que el
 * resto de su propia API: escribe "CONMEBOL Copa America" donde en las competencias pone "Copa
 * América", y "FIFA World Cup" donde nosotros tenemos "Mundial". Sin esta tabla, la Copa América de
 * Messi aparece sin escudo teniendo el escudo a mano.
 *
 * Es una tabla escrita y no una comparación por parecido a propósito: "FIFA World Cup" se parece
 * muchísimo a "FIFA Club World Cup", y poner el escudo del Mundial de Clubes en una Copa del Mundo
 * es peor que no poner ninguno. Lo que no está acá se queda sin escudo, que es lo honesto.
 */
const ALIAS: Record<string, string> = {
  'conmebol copa america': 'Copa América',
  'uefa european championship': 'Eurocopa',
  'uefa nations league': 'Nations League',
  'concacaf nations league': 'Nations League Concacaf',
  'fifa world cup': 'Mundial',
  'uefa conference league': 'UEFA Europa Conference League',
};

export const normalizarNombre = (nombre: string): string =>
  nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * El nombre con el que buscar el torneo de un título entre las competencias de Athena.
 *
 * Devuelve el nombre tal cual cuando no hay alias: la mayoría coincide sola.
 */
export function torneoDeTrofeo(competencia: string): string {
  return ALIAS[normalizarNombre(competencia)] ?? competencia;
}
