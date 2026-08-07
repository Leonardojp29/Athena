/**
 * Qué tabla de posiciones es la que importa hoy.
 *
 * Una temporada puede traer varias tablas y no todas significan lo mismo. Hay tres casos y
 * mezclarlos es lo que hacía que la Liga 1 abriera en el Apertura —terminado en mayo— mientras
 * se jugaba el Clausura:
 *
 * - **Fases en secuencia**: Apertura y Clausura (Perú, Colombia), o Apertura, Clausura,
 *   Intermedio, Anual y Promedios (Uruguay). Solo una está en juego.
 * - **Grupos simultáneos**: los ocho de la Libertadores, los cuatro de la CAF. Todos cuentan.
 * - **Conferencias simultáneas**: Este y Oeste de la MLS. Las dos cuentan.
 *
 * La señal para distinguirlos no está en la tabla sino en el calendario: la jornada del próximo
 * partido dice en qué fase está la competencia. "Clausura - 4" nombra la fase; "Group Stage - 6"
 * y "Regular Season - 18" no nombran ningún grupo, y eso es justamente lo que revela que los
 * grupos son simultáneos.
 */

/**
 * "Clausura - 4" → "Clausura". La jornada trae la fase y el número; el número no interesa.
 * "Final" o "Round of 16" se devuelven enteros: son fases sin numerar.
 */
export function faseDeJornada(round: string | null | undefined): string | null {
  if (!round) return null;
  const limpio = round.trim();
  if (limpio === '') return null;
  /* El separador es " - " y lo que sigue puede ser un número o el nombre de una llave. */
  const corte = limpio.lastIndexOf(' - ');
  if (corte === -1) return limpio;
  const cola = limpio.slice(corte + 3).trim();
  return /^\d+$/.test(cola) ? limpio.slice(0, corte).trim() : limpio;
}

/**
 * De todas las tablas de la temporada, las que corresponden a la fase en juego.
 *
 * Devuelve una lista vacía cuando la jornada no nombra ninguna tabla —grupos y conferencias
 * simultáneos— y también cuando las nombra todas: en los dos casos no hay nada que priorizar y
 * quien dibuje debe mostrarlas juntas.
 */
export function gruposVigentes(round: string | null | undefined, labels: string[]): string[] {
  const fase = faseDeJornada(round);
  if (fase === null || labels.length < 2) return [];

  const aguja = normalizar(fase);
  if (aguja === '') return [];

  const coincidencias = labels.filter((label) => normalizar(label).includes(aguja));
  return coincidencias.length === labels.length ? [] : coincidencias;
}

/** Sin tildes, sin mayúsculas y sin espacios de más: "Primera: Clausura" contiene "clausura". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
