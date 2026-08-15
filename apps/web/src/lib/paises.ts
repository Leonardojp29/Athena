/*
 * Los países en español viven en el dominio, que es donde también los necesita el sync: las
 * selecciones se guardan ya traducidas. Acá solo se reexporta para no cambiar los imports.
 */
export { paisEnEspanol } from '@athena/domain';

/*
 * El proveedor capitaliza cada palabra: "Copa De La Liga", "Copa Do Brasil". En español los
 * conectores van en minúscula. La lista es corta y explícita a propósito: una regla general
 * sobre palabras de dos letras destrozaría nombres propios.
 */
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'do', 'da', 'dos', 'y']);

export function nombreTorneo(nombre: string): string {
  return nombre
    .split(' ')
    .map((palabra, i) => (i > 0 && CONECTORES.has(palabra.toLowerCase()) ? palabra.toLowerCase() : palabra))
    .join(' ');
}

/*
 * El nombre de una tabla, en español y sin el ruido del proveedor. Las etiquetas reales de la
 * temporada 2026 son de cinco formas distintas: "Apertura", "Primera: Clausura",
 * "Apertura - Group A", "CAF Champions League , Group A" y "Eastern Conference". La traducción es
 * explícita —y no una regla general— porque acá una regla de más renombra un torneo.
 */
const FASE: Record<string, string> = {
  'eastern conference': 'Conferencia Este',
  'western conference': 'Conferencia Oeste',
  'regular season': 'Temporada regular',
  'tabla anual': 'Tabla anual',
  'torneo intermedio': 'Torneo Intermedio',
  promedios: 'Promedios',
  'group stage': 'Fase de grupos',
  final: 'Final',
};

export function nombreFase(label: string): string {
  /* "CAF Champions League , Group A" y "Primera: Clausura" traen el torneo pegado adelante. */
  const sinTorneo = label.replace(/^.*\s,\s/, '').replace(/^[^:]+:\s*/, '').trim();
  if (sinTorneo === '') return 'Tabla';

  return sinTorneo
    .split(/\s*-\s*/)
    .map((parte) => {
      const clave = parte.toLowerCase();
      if (FASE[clave]) return FASE[clave];
      const grupo = /^group\s+(\S+)$/i.exec(parte);
      if (grupo) return `Grupo ${grupo[1]}`;
      const ronda = /^round\s+(\d+)$/i.exec(parte);
      if (ronda) return `Fase ${ronda[1]}`;
      return parte;
    })
    .join(' · ');
}
