/*
 * El proveedor entrega los países en inglés y la página está en español: "Brazil" bajo un
 * título en castellano delata de dónde salió el dato. Se traduce en la vista, no en la base,
 * porque el valor crudo sigue siendo la llave con la que el proveedor lo identifica.
 */
const NOMBRE: Record<string, string> = {
  Argentina: 'Argentina',
  Bolivia: 'Bolivia',
  Brazil: 'Brasil',
  Chile: 'Chile',
  Colombia: 'Colombia',
  Ecuador: 'Ecuador',
  Paraguay: 'Paraguay',
  Peru: 'Perú',
  Uruguay: 'Uruguay',
  Venezuela: 'Venezuela',

  Austria: 'Austria',
  Belgium: 'Bélgica',
  Croatia: 'Croacia',
  Czechia: 'Chequia',
  'Czech-Republic': 'Chequia',
  Denmark: 'Dinamarca',
  England: 'Inglaterra',
  Finland: 'Finlandia',
  France: 'Francia',
  Germany: 'Alemania',
  Greece: 'Grecia',
  Hungary: 'Hungría',
  Iceland: 'Islandia',
  Ireland: 'Irlanda',
  Italy: 'Italia',
  Netherlands: 'Países Bajos',
  Norway: 'Noruega',
  Poland: 'Polonia',
  Portugal: 'Portugal',
  Romania: 'Rumanía',
  Russia: 'Rusia',
  Scotland: 'Escocia',
  Serbia: 'Serbia',
  Slovakia: 'Eslovaquia',
  Slovenia: 'Eslovenia',
  Spain: 'España',
  Sweden: 'Suecia',
  Switzerland: 'Suiza',
  Turkey: 'Turquía',
  Ukraine: 'Ucrania',
  Wales: 'Gales',

  Algeria: 'Argelia',
  Cameroon: 'Camerún',
  'Cote d’Ivoire': 'Costa de Marfil',
  'Ivory-Coast': 'Costa de Marfil',
  Egypt: 'Egipto',
  Ghana: 'Ghana',
  Morocco: 'Marruecos',
  Nigeria: 'Nigeria',
  Senegal: 'Senegal',
  'South-Africa': 'Sudáfrica',
  Tunisia: 'Túnez',

  Australia: 'Australia',
  Canada: 'Canadá',
  China: 'China',
  'Costa-Rica': 'Costa Rica',
  Japan: 'Japón',
  Mexico: 'México',
  Panama: 'Panamá',
  'South-Korea': 'Corea del Sur',
  'United-States': 'Estados Unidos',
  USA: 'Estados Unidos',
  World: 'Internacional',
};

export function paisEnEspanol(pais: string | null | undefined): string | null {
  if (!pais) return null;
  return NOMBRE[pais] ?? pais;
}

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
