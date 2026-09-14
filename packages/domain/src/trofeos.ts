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
  'conmebol/uefa finalissima': 'Finalissima',
};

/*
 * Lo que se parece y NO es lo mismo, anotado para que nadie lo agregue por error:
 *   · "FIFA World Cup" contra "FIFA Club World Cup": el Mundial no es el Mundial de Clubes.
 *   · "FIFA Intercontinental Cup" contra "Repechaje Intercontinental": una es la copa de clubes
 *     que jugaban campeón de Europa y de América; el otro es un repechaje de eliminatorias.
 * Ninguna de las dos lleva alias, y por eso esos títulos se quedan sin escudo.
 */

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
