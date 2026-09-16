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
 * El nombre de una tabla, en español y sin el ruido del proveedor.
 *
 * Las etiquetas reales de la base son de seis formas: "Apertura", "Primera: Clausura",
 * "Apertura - Group A", "CAF Champions League , Group A", "Liga 1 2025, Apertura" y
 * "Primera Division 2025, Torneo Intermedio, Group B". Todas menos la primera traen el torneo
 * pegado adelante, y a veces repiten el año, que ya se muestra al lado.
 *
 * La traducción es explícita —y no una regla general— porque acá una regla de más renombra un
 * torneo. Lo que no está en el diccionario se muestra tal cual: es preferible a inventar.
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
  /* Liga 1 llama "Overall" a la tabla que suma el Apertura y el Clausura. */
  overall: 'Tabla general',
  'championship round': 'Ronda por el título',
  'qualifying round': 'Ronda clasificatoria',
  'relegation round': 'Ronda por el descenso',
  east: 'Este',
  west: 'Oeste',
};

export function nombreFase(label: string): string {
  /*
   * Se quita el torneo, que es lo que va antes de la primera coma o de los dos puntos. Solo la
   * primera: "Primera Division 2025, Torneo Intermedio, Group B" pierde el torneo y conserva las
   * dos partes que sí dicen algo.
   */
  const sinTorneo = label
    .replace(/^[^,]*,\s*/, '')
    .replace(/^[^:]+:\s*/, '')
    .trim();
  if (sinTorneo === '') return 'Tabla';

  return sinTorneo
    .split(/\s*[,-]\s*/)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      /* El año ya se muestra al lado de la etiqueta: repetirlo no agrega nada. */
      const sinAnio = parte.replace(/\s*\b(19|20)\d{2}\b\s*/g, ' ').trim() || parte;
      const clave = sinAnio.toLowerCase();
      if (FASE[clave]) return FASE[clave];
      const grupo = /^group\s+(\S+)$/i.exec(sinAnio);
      if (grupo) return `Grupo ${grupo[1]}`;
      const liga = /^league\s+(\S+)$/i.exec(sinAnio);
      if (liga) return `Liga ${liga[1]}`;
      const ronda = /^round\s+(\d+)$/i.exec(sinAnio);
      if (ronda) return `Fase ${ronda[1]}`;
      return sinAnio;
    })
    .join(' · ');
}
