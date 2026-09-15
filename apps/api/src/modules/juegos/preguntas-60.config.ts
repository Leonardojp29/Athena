import { banderaDePais, escudoDeEquipo } from '../../shared/entorno.js';
/**
 * El catálogo de 60 Segundos, como código.
 *
 * Mismo criterio que los otros dos juegos: **equipos y competencias van con el id del proveedor
 * fijado; los futbolistas van por nombre**. El nombre se resuelve dentro de su contexto —los
 * veintitantos de un acta, los clubes de una trayectoria— y no contra los cuarenta y seis mil de la
 * base, que es el problema de homónimos que ya costó caro en el buscador de Adivina el XI.
 *
 * Ojo con la temporada: el proveedor nombra la de Champions por su año de inicio, así que la final
 * de mayo de 2015 es `temporada: 2014`.
 */

export type Dificultad = 'facil' | 'normal' | 'dificil';

/** Cómo se pinta la pregunta. El tipo decide qué se ve arriba del enunciado, no solo su etiqueta. */
export type Tipo =
  | 'opcion-multiple'
  | 'quien-marco'
  | 'campeon'
  | 'resultado'
  | 'trayectoria'
  | 'quien-es'
  | 'verdadero-falso'
  | 'comparacion'
  | 'titularidad';

export type Validacion =
  /** Algo que pasó en un partido concreto: el marcador, un gol, el once, el capitán o el técnico. */
  | {
      tipo: 'partido';
      competenciaRef: string;
      temporada: number;
      localRef: string;
      visitaRef: string;
      /** El marcador ayuda a elegir entre ida y vuelta cuando dos equipos se cruzan dos veces. */
      marcador?: readonly [number, number];
      comprueba: 'marcador' | 'goleador' | 'titularidad' | 'capitan' | 'tecnico' | 'penal-fallado';
      /** A quién se le atribuye lo que se comprueba. */
      quien?: string;
      /** El orden del gol dentro del partido, cuando el enunciado dice «el primero» o «el segundo». */
      orden?: number;
      /** Cuántas veces marcó, cuando el enunciado lo dice. */
      veces?: number;
      /** De qué equipo es el once que se mira. Sin esto se miraría el del rival. */
      equipoRef?: string;
      /** Los otros tres, que en una pregunta de titularidad sí arrancaron. */
      losOtros?: readonly string[];
    }
  | { tipo: 'campeon'; competenciaRef: string; temporada: number; campeonRef: string }
  | { tipo: 'trayectoria'; jugador: string; clubesRef: readonly string[] }
  | { tipo: 'foto'; jugador: string }
  | { tipo: 'editorial'; motivo: string };

export interface PreguntaDeclarada {
  clave: string;
  tipo: Tipo;
  dificultad: Dificultad;
  enunciado: string;
  /** Solo se muestra al repasar los errores, nunca durante los sesenta segundos. */
  explicacion: string;
  opciones: readonly string[];
  correcta: string;
  /** Escudos, banderas o logos que acompañan al enunciado, por id fijado. */
  equiposRef?: readonly string[];
  competenciaRef?: string;
  /**
   * Qué son las opciones, cuando son algo con cara.
   *
   * `equipo` las resuelve por el mapa de nombres de abajo; `jugador` contra las fichas de Athena.
   * Un marcador o un verdadero/falso no lo lleva: no hay nada que mostrar.
   */
  opcionesDe?: 'equipo' | 'jugador';
  validacion: Validacion;
}

/* ── Competencias ─────────────────────────────────────────────────────────────────────────── */
const MUNDIAL = '1';
const CHAMPIONS = '2';
const COPA_AMERICA = '9';
const LIBERTADORES = '13';
const LIGA1 = '281';
const REPECHAJE = '37';

/* ── Selecciones ──────────────────────────────────────────────────────────────────────────── */
const ALEMANIA = '25';
const ARGENTINA = '26';
const AUSTRALIA = '20';
const BRASIL = '6';
const CHILE = '2383';
const BELGICA = '1';
const CROACIA = '3';
const DINAMARCA = '21';
const ESPANA = '9';
const FRANCIA = '2';
const MARRUECOS = '31';
const NUEVA_ZELANDA = '4673';
const PAISES_BAJOS = '1118';
const PERU = '30';

/*
 * Las selecciones llevan bandera y no escudo: el proveedor devuelve la bandera de Argentina pero el
 * sello de la federación para Perú, así que el código va fijado acá, igual que en El Impostor.
 */
export const BANDERAS: Record<string, string> = {
  [ALEMANIA]: 'de',
  [ARGENTINA]: 'ar',
  [AUSTRALIA]: 'au',
  [BRASIL]: 'br',
  [CHILE]: 'cl',
  [CROACIA]: 'hr',
  [DINAMARCA]: 'dk',
  [ESPANA]: 'es',
  [FRANCIA]: 'fr',
  [NUEVA_ZELANDA]: 'nz',
  [PAISES_BAJOS]: 'nl',
  [PERU]: 'pe',
};

/* ── Clubes ───────────────────────────────────────────────────────────────────────────────── */
const AJAX = '194';
const AYACUCHO = '2542';
const ALIANZA_LIMA = '2553';
const ARSENAL = '42';
const ATLETICO_MADRID = '530';
const BARCELONA = '529';
const BAYERN = '157';
const BOCA = '451';
const CHELSEA = '49';
const DORTMUND = '165';
const ESTUDIANTES = '450';
const FLAMENGO = '127';
const INTER = '505';
const JUVENTUS = '496';
const LIVERPOOL = '40';
const MELGAR = '2554';
const MAN_CITY = '50';
const MONACO = '91';
const PALMEIRAS = '121';
const PSG = '85';
const REAL_MADRID = '541';
const RIVER = '435';
const SANTOS = '128';
const SPORTING_CRISTAL = '2546';
const TOTTENHAM = '47';
const UNIVERSITARIO = '2540';

/*
 * El nombre de la opción al id del equipo.
 *
 * Va acá y no pregunta por nombre a la base porque el catálogo escribe «Bayern Múnich» y el
 * proveedor «Bayern München», «PSG» y «Paris Saint Germain»: buscar por texto acertaría a veces,
 * que es la peor de las opciones. Lo que falte en este mapa lo dice la auditoría.
 */
const EQUIPO_POR_NOMBRE: Record<string, string> = {
  Ajax: AJAX,
  Alemania: ALEMANIA,
  'Alianza Lima': ALIANZA_LIMA,
  Argentina: ARGENTINA,
  Arsenal: ARSENAL,
  'Atlético de Madrid': ATLETICO_MADRID,
  'Ayacucho FC': AYACUCHO,
  Barcelona: BARCELONA,
  'Bayern Múnich': BAYERN,
  Bélgica: BELGICA,
  'Boca Juniors': BOCA,
  'Borussia Dortmund': DORTMUND,
  Brasil: BRASIL,
  Chelsea: CHELSEA,
  Croacia: CROACIA,
  España: ESPANA,
  Flamengo: FLAMENGO,
  Francia: FRANCIA,
  Inter: INTER,
  Juventus: JUVENTUS,
  Liverpool: LIVERPOOL,
  'Manchester City': MAN_CITY,
  Marruecos: MARRUECOS,
  Melgar: MELGAR,
  'Países Bajos': PAISES_BAJOS,
  PSG: PSG,
  Palmeiras: PALMEIRAS,
  'Real Madrid': REAL_MADRID,
  'River Plate': RIVER,
  'Sporting Cristal': SPORTING_CRISTAL,
  Tottenham: TOTTENHAM,
  Universitario: UNIVERSITARIO,
};

/** El id del equipo que nombra una opción, o nulo si el catálogo lo escribe de otra forma. */
export const equipoDeLaOpcion = (texto: string): string | null => EQUIPO_POR_NOMBRE[texto] ?? null;

export const PREGUNTAS_DE_60: readonly PreguntaDeclarada[] = [
  {
    clave: 'Q001',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'facil',
    enunciado: '¿Quién marcó el gol que le dio el Mundial 2014 a Alemania?',
    explicacion: 'Götze marcó en la prórroga ante Argentina.',
    opciones: ['Thomas Müller', 'Mario Götze', 'Toni Kroos', 'Miroslav Klose'],
    correcta: 'Mario Götze',
    equiposRef: [ALEMANIA, ARGENTINA],
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'partido', competenciaRef: MUNDIAL, temporada: 2014, localRef: ALEMANIA, visitaRef: ARGENTINA, marcador: [1, 0], comprueba: 'goleador', quien: 'Götze' },
  },
  {
    clave: 'Q002',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'facil',
    enunciado: '¿Quién marcó el primer gol de Perú ante Australia en Rusia 2018?',
    explicacion: 'Carrillo abrió el marcador en el 2-0.',
    opciones: ['Paolo Guerrero', 'André Carrillo', 'Christian Cueva', 'Edison Flores'],
    correcta: 'André Carrillo',
    equiposRef: [PERU, AUSTRALIA],
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'partido', competenciaRef: MUNDIAL, temporada: 2018, localRef: AUSTRALIA, visitaRef: PERU, marcador: [0, 2], comprueba: 'goleador', quien: 'Carrillo', orden: 1 },
  },
  {
    clave: 'Q003',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Champions League 2019/20?',
    explicacion: 'Bayern derrotó 1-0 al PSG en la final.',
    opciones: ['PSG', 'Bayern Múnich', 'Liverpool', 'Manchester City'],
    correcta: 'Bayern Múnich',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2019, campeonRef: BAYERN },
  },
  {
    clave: 'Q004',
    opcionesDe: 'jugador',
    tipo: 'opcion-multiple',
    dificultad: 'facil',
    enunciado: '¿Quién ganó el Balón de Oro en 2018?',
    explicacion: 'Modrić ganó el premio en 2018.',
    opciones: ['Cristiano Ronaldo', 'Lionel Messi', 'Luka Modrić', 'Antoine Griezmann'],
    correcta: 'Luka Modrić',
    validacion: { tipo: 'editorial', motivo: 'El Balón de Oro no es un dato del proveedor.' },
  },
  {
    clave: 'Q005',
    opcionesDe: 'jugador',
    tipo: 'comparacion',
    dificultad: 'normal',
    enunciado: '¿Quién fue el máximo goleador del Mundial 2002?',
    explicacion: 'Ronaldo terminó el torneo con 8 goles.',
    opciones: ['Rivaldo', 'Ronaldo Nazário', 'Miroslav Klose', 'Ronaldinho'],
    correcta: 'Ronaldo Nazário',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'editorial', motivo: 'El proveedor arranca alrededor de 2008 y no publica máximos goleadores del 2002.' },
  },
  {
    clave: 'Q006',
    opcionesDe: 'jugador',
    tipo: 'opcion-multiple',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Bota de Oro del Mundial 2022?',
    explicacion: 'Mbappé marcó 8 goles.',
    opciones: ['Lionel Messi', 'Kylian Mbappé', 'Julián Álvarez', 'Olivier Giroud'],
    correcta: 'Kylian Mbappé',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'editorial', motivo: 'No hay método de máximos goleadores en el puerto del proveedor.' },
  },
  {
    clave: 'Q007',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'facil',
    enunciado: '¿Quién marcó el único gol de la final Argentina vs Brasil de la Copa América 2021?',
    explicacion: 'Di María marcó el 1-0 en el Maracaná.',
    opciones: ['Lionel Messi', 'Ángel Di María', 'Lautaro Martínez', 'Rodrigo De Paul'],
    correcta: 'Ángel Di María',
    equiposRef: [ARGENTINA, BRASIL],
    competenciaRef: COPA_AMERICA,
    validacion: { tipo: 'partido', competenciaRef: COPA_AMERICA, temporada: 2021, localRef: BRASIL, visitaRef: ARGENTINA, marcador: [0, 1], comprueba: 'goleador', quien: 'Di María' },
  },
  {
    clave: 'Q008',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Copa Libertadores 2019?',
    explicacion: 'Flamengo remontó a River y ganó 2-1.',
    opciones: ['River Plate', 'Flamengo', 'Boca Juniors', 'Palmeiras'],
    correcta: 'Flamengo',
    competenciaRef: LIBERTADORES,
    validacion: { tipo: 'campeon', competenciaRef: LIBERTADORES, temporada: 2019, campeonRef: FLAMENGO },
  },
  {
    clave: 'Q009',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién fue campeón de la Liga 1 peruana en 2023?',
    explicacion: 'Universitario ganó la final nacional frente a Alianza Lima.',
    opciones: ['Alianza Lima', 'Sporting Cristal', 'Universitario', 'Melgar'],
    correcta: 'Universitario',
    competenciaRef: LIGA1,
    validacion: { tipo: 'campeon', competenciaRef: LIGA1, temporada: 2023, campeonRef: UNIVERSITARIO },
  },
  {
    clave: 'Q010',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién fue campeón de la Liga 1 peruana en 2021?',
    explicacion: 'Alianza venció a Sporting Cristal en la final.',
    opciones: ['Sporting Cristal', 'Alianza Lima', 'Universitario', 'Melgar'],
    correcta: 'Alianza Lima',
    competenciaRef: LIGA1,
    validacion: { tipo: 'campeon', competenciaRef: LIGA1, temporada: 2021, campeonRef: ALIANZA_LIMA },
  },
  {
    clave: 'Q011',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'normal',
    enunciado: '¿Quién fue campeón de la Liga 1 peruana en 2020?',
    explicacion: 'Cristal derrotó a Universitario en la final.',
    opciones: ['Universitario', 'Sporting Cristal', 'Alianza Lima', 'Ayacucho FC'],
    correcta: 'Sporting Cristal',
    competenciaRef: LIGA1,
    validacion: { tipo: 'campeon', competenciaRef: LIGA1, temporada: 2020, campeonRef: SPORTING_CRISTAL },
  },
  {
    clave: 'Q012',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Qué selección ganó el Mundial 2018?',
    explicacion: 'Francia venció 4-2 a Croacia.',
    opciones: ['Croacia', 'Francia', 'Bélgica', 'Alemania'],
    correcta: 'Francia',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'campeon', competenciaRef: MUNDIAL, temporada: 2018, campeonRef: FRANCIA },
  },
  {
    clave: 'Q013',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Qué selección ganó el Mundial 2010?',
    explicacion: 'España ganó su primer Mundial ante Países Bajos.',
    opciones: ['Alemania', 'Países Bajos', 'España', 'Brasil'],
    correcta: 'España',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'campeon', competenciaRef: MUNDIAL, temporada: 2010, campeonRef: ESPANA },
  },
  {
    clave: 'Q014',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Qué selección ganó el Mundial 2014?',
    explicacion: 'Alemania derrotó 1-0 a Argentina.',
    opciones: ['Argentina', 'Alemania', 'Brasil', 'España'],
    correcta: 'Alemania',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'campeon', competenciaRef: MUNDIAL, temporada: 2014, campeonRef: ALEMANIA },
  },
  {
    clave: 'Q015',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Qué selección ganó el Mundial 2022?',
    explicacion: 'Argentina venció a Francia por penales.',
    opciones: ['Francia', 'Argentina', 'Croacia', 'Marruecos'],
    correcta: 'Argentina',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'campeon', competenciaRef: MUNDIAL, temporada: 2022, campeonRef: ARGENTINA },
  },
  {
    clave: 'Q016',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Champions League 2014/15?',
    explicacion: 'Barcelona venció 3-1 a Juventus.',
    opciones: ['Juventus', 'Real Madrid', 'Barcelona', 'Bayern Múnich'],
    correcta: 'Barcelona',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2014, campeonRef: BARCELONA },
  },
  {
    clave: 'Q017',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Champions League 2016/17?',
    explicacion: 'Madrid venció 4-1 a Juventus.',
    opciones: ['Juventus', 'Barcelona', 'Real Madrid', 'Atlético de Madrid'],
    correcta: 'Real Madrid',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2016, campeonRef: REAL_MADRID },
  },
  {
    clave: 'Q018',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'normal',
    enunciado: '¿Quién ganó la Champions League 2018/19?',
    explicacion: 'Liverpool derrotó 2-0 a Tottenham.',
    opciones: ['Tottenham', 'Liverpool', 'Ajax', 'Barcelona'],
    correcta: 'Liverpool',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2018, campeonRef: LIVERPOOL },
  },
  {
    clave: 'Q019',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'normal',
    enunciado: '¿Quién ganó la Champions League 2020/21?',
    explicacion: 'Chelsea ganó 1-0 con gol de Kai Havertz.',
    opciones: ['Manchester City', 'Chelsea', 'Bayern Múnich', 'PSG'],
    correcta: 'Chelsea',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2020, campeonRef: CHELSEA },
  },
  {
    clave: 'Q020',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Champions League 2022/23?',
    explicacion: 'City venció 1-0 al Inter.',
    opciones: ['Inter', 'Real Madrid', 'Manchester City', 'Bayern Múnich'],
    correcta: 'Manchester City',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2022, campeonRef: MAN_CITY },
  },
  {
    clave: 'Q021',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'facil',
    enunciado: '¿Quién ganó la Champions League 2023/24?',
    explicacion: 'Madrid venció 2-0 al Dortmund.',
    opciones: ['Borussia Dortmund', 'Real Madrid', 'Manchester City', 'PSG'],
    correcta: 'Real Madrid',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2023, campeonRef: REAL_MADRID },
  },
  {
    clave: 'Q022',
    opcionesDe: 'equipo',
    tipo: 'campeon',
    dificultad: 'normal',
    enunciado: '¿Quién ganó la Champions League 2024/25?',
    explicacion: 'PSG ganó su primera Champions en 2025.',
    opciones: ['Inter', 'Barcelona', 'PSG', 'Arsenal'],
    correcta: 'PSG',
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'campeon', competenciaRef: CHAMPIONS, temporada: 2024, campeonRef: PSG },
  },
  {
    clave: 'Q023',
    tipo: 'resultado',
    dificultad: 'facil',
    enunciado: '¿Cómo terminó Barcelona vs Bayern en los cuartos de Champions 2020?',
    explicacion: 'Bayern goleó 8-2 al Barcelona.',
    opciones: ['1-4', '2-8', '0-5', '3-7'],
    correcta: '2-8',
    equiposRef: [BARCELONA, BAYERN],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2019, localRef: BARCELONA, visitaRef: BAYERN, marcador: [2, 8], comprueba: 'marcador' },
  },
  {
    clave: 'Q024',
    tipo: 'resultado',
    dificultad: 'normal',
    enunciado: '¿Cómo terminó Real Madrid vs Ajax en el Bernabéu en 2019?',
    explicacion: 'Ajax eliminó al Madrid con un histórico 4-1.',
    opciones: ['1-4', '0-3', '2-3', '1-3'],
    correcta: '1-4',
    equiposRef: [REAL_MADRID, AJAX],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2018, localRef: REAL_MADRID, visitaRef: AJAX, marcador: [1, 4], comprueba: 'marcador' },
  },
  {
    clave: 'Q025',
    tipo: 'resultado',
    dificultad: 'facil',
    enunciado: '¿Cómo terminó Liverpool vs Barcelona en Anfield en 2019?',
    explicacion: 'Liverpool remontó el 0-3 de la ida.',
    opciones: ['3-0', '4-0', '4-1', '5-1'],
    correcta: '4-0',
    equiposRef: [LIVERPOOL, BARCELONA],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2018, localRef: LIVERPOOL, visitaRef: BARCELONA, marcador: [4, 0], comprueba: 'marcador' },
  },
  {
    clave: 'Q026',
    tipo: 'resultado',
    dificultad: 'normal',
    enunciado: '¿Cómo terminó Barcelona vs PSG en la famosa remontada de 2017?',
    explicacion: 'Barcelona remontó el 0-4 de la ida.',
    opciones: ['5-1', '6-1', '5-0', '6-2'],
    correcta: '6-1',
    equiposRef: [BARCELONA, PSG],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2016, localRef: BARCELONA, visitaRef: PSG, marcador: [6, 1], comprueba: 'marcador' },
  },
  {
    clave: 'Q027',
    opcionesDe: 'jugador',
    tipo: 'trayectoria',
    dificultad: 'facil',
    enunciado: '¿Cuál de estos jugadores pasó por Liverpool y Barcelona?',
    explicacion: 'Suárez pasó de Liverpool al Barcelona en 2014.',
    opciones: ['Luis Suárez', 'Sergio Agüero', 'Edinson Cavani', 'Karim Benzema'],
    correcta: 'Luis Suárez',
    equiposRef: [LIVERPOOL, BARCELONA],
    validacion: { tipo: 'trayectoria', jugador: 'Luis Suárez', clubesRef: [LIVERPOOL, BARCELONA] },
  },
  {
    clave: 'Q028',
    opcionesDe: 'jugador',
    tipo: 'trayectoria',
    dificultad: 'normal',
    enunciado: '¿Cuál de estos jugadores jugó oficialmente para Arsenal y Barcelona?',
    explicacion: 'Fàbregas fue figura de Arsenal y luego regresó al Barcelona.',
    opciones: ['Cesc Fàbregas', 'Luka Modrić', 'David Silva', 'Juan Mata'],
    correcta: 'Cesc Fàbregas',
    equiposRef: [ARSENAL, BARCELONA],
    validacion: { tipo: 'trayectoria', jugador: 'Cesc Fàbregas', clubesRef: [ARSENAL, BARCELONA] },
  },
  {
    clave: 'Q029',
    opcionesDe: 'jugador',
    tipo: 'trayectoria',
    dificultad: 'facil',
    enunciado: '¿Quién tuvo esta ruta de clubes: Santos → Barcelona → PSG?',
    explicacion: 'Neymar siguió esa secuencia antes de volver posteriormente a Santos.',
    opciones: ['Neymar', 'Ronaldinho', 'Robinho', 'Kaká'],
    correcta: 'Neymar',
    equiposRef: [SANTOS, BARCELONA, PSG],
    validacion: { tipo: 'trayectoria', jugador: 'Neymar', clubesRef: [SANTOS, BARCELONA, PSG] },
  },
  {
    clave: 'Q030',
    opcionesDe: 'jugador',
    tipo: 'trayectoria',
    dificultad: 'facil',
    enunciado: '¿Qué estrella pasó de Mónaco al PSG?',
    explicacion: 'Mbappé llegó al PSG procedente del Mónaco.',
    opciones: ['Kylian Mbappé', 'Antoine Griezmann', 'Ousmane Dembélé', 'Karim Benzema'],
    correcta: 'Kylian Mbappé',
    equiposRef: [MONACO, PSG],
    validacion: { tipo: 'trayectoria', jugador: 'Kylian Mbappé', clubesRef: [MONACO, PSG] },
  },
  {
    clave: 'Q031',
    opcionesDe: 'jugador',
    tipo: 'opcion-multiple',
    dificultad: 'facil',
    enunciado: '¿Quién fue capitán de Perú ante Australia en el Mundial 2018?',
    explicacion: 'Guerrero llevó la cinta en aquel partido.',
    opciones: ['Paolo Guerrero', 'Pedro Gallese', 'Renato Tapia', 'Christian Cueva'],
    correcta: 'Paolo Guerrero',
    equiposRef: [PERU, AUSTRALIA],
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'partido', competenciaRef: MUNDIAL, temporada: 2018, localRef: AUSTRALIA, visitaRef: PERU, marcador: [0, 2], comprueba: 'capitan', quien: 'Guerrero', equipoRef: PERU },
  },
  {
    clave: 'Q032',
    tipo: 'opcion-multiple',
    dificultad: 'facil',
    enunciado: '¿Quién dirigió a Perú en el Mundial 2018?',
    explicacion: 'Gareca llevó a Perú a Rusia 2018.',
    opciones: ['Ricardo Gareca', 'Juan Reynoso', 'Jorge Fossati', 'Sergio Markarián'],
    correcta: 'Ricardo Gareca',
    equiposRef: [PERU],
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'partido', competenciaRef: MUNDIAL, temporada: 2018, localRef: AUSTRALIA, visitaRef: PERU, marcador: [0, 2], comprueba: 'tecnico', quien: 'Gareca', equipoRef: PERU },
  },
  {
    clave: 'Q033',
    opcionesDe: 'jugador',
    tipo: 'quien-es',
    dificultad: 'facil',
    enunciado: '¿Quién es este arquero peruano?',
    explicacion: 'Gallese fue el arquero titular de Perú en Rusia 2018.',
    opciones: ['Pedro Gallese', 'Carlos Cáceda', 'Diego Penny', 'José Carvallo'],
    correcta: 'Pedro Gallese',
    validacion: { tipo: 'foto', jugador: 'Pedro Gallese' },
  },
  {
    clave: 'Q034',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'normal',
    enunciado: '¿Quién abrió el marcador para Universitario en la final de vuelta de Liga 1 2023 en Matute?',
    explicacion: 'Flores marcó el primer gol del 2-0.',
    opciones: ['Edison Flores', 'Alex Valera', 'Piero Quispe', 'Horacio Calcaterra'],
    correcta: 'Edison Flores',
    equiposRef: [ALIANZA_LIMA, UNIVERSITARIO],
    competenciaRef: LIGA1,
    validacion: { tipo: 'partido', competenciaRef: LIGA1, temporada: 2023, localRef: ALIANZA_LIMA, visitaRef: UNIVERSITARIO, marcador: [0, 2], comprueba: 'goleador', quien: 'Flores', orden: 1 },
  },
  {
    clave: 'Q035',
    opcionesDe: 'jugador',
    tipo: 'opcion-multiple',
    dificultad: 'normal',
    enunciado: '¿Qué jugador de Alianza Lima marcó un hat-trick ante Estudiantes en la Libertadores 2010?',
    explicacion: 'Aguirre marcó tres goles en el histórico 4-1.',
    opciones: ['Wilmer Aguirre', 'José Carlos Fernández', 'Johnnier Montaño', 'Claudio Velázquez'],
    correcta: 'Wilmer Aguirre',
    equiposRef: [ALIANZA_LIMA, ESTUDIANTES],
    competenciaRef: LIBERTADORES,
    validacion: { tipo: 'editorial', motivo: 'El proveedor cubre la Libertadores desde 2019; 2010 queda fuera.' },
  },
  {
    clave: 'Q036',
    opcionesDe: 'jugador',
    tipo: 'opcion-multiple',
    dificultad: 'facil',
    enunciado: '¿Quién falló un penal para Perú ante Dinamarca en el Mundial 2018?',
    explicacion: 'Cueva envió el penal por encima del arco.',
    opciones: ['Christian Cueva', 'Paolo Guerrero', 'Jefferson Farfán', 'Yoshimar Yotún'],
    correcta: 'Christian Cueva',
    equiposRef: [PERU, DINAMARCA],
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'partido', competenciaRef: MUNDIAL, temporada: 2018, localRef: PERU, visitaRef: DINAMARCA, marcador: [0, 1], comprueba: 'penal-fallado', quien: 'Cueva' },
  },
  {
    clave: 'Q037',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'normal',
    enunciado: '¿Cuál de estos jugadores marcó en el Perú 3-0 Chile de la Copa América 2019?',
    explicacion: 'Flores abrió el marcador en la semifinal.',
    opciones: ['Edison Flores', 'Renato Tapia', 'Luis Advíncula', 'André Carrillo'],
    correcta: 'Edison Flores',
    equiposRef: [PERU, CHILE],
    competenciaRef: COPA_AMERICA,
    validacion: { tipo: 'partido', competenciaRef: COPA_AMERICA, temporada: 2019, localRef: PERU, visitaRef: CHILE, marcador: [3, 0], comprueba: 'goleador', quien: 'Flores', orden: 1 },
  },
  {
    clave: 'Q038',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'facil',
    enunciado: '¿Quién marcó el segundo gol de Argentina en la final del Mundial 2022?',
    explicacion: 'Di María puso el 2-0 en el primer tiempo.',
    opciones: ['Lionel Messi', 'Ángel Di María', 'Julián Álvarez', 'Enzo Fernández'],
    correcta: 'Ángel Di María',
    equiposRef: [ARGENTINA, FRANCIA],
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'partido', competenciaRef: MUNDIAL, temporada: 2022, localRef: ARGENTINA, visitaRef: FRANCIA, marcador: [3, 3], comprueba: 'goleador', quien: 'Di María', orden: 2 },
  },
  {
    clave: 'Q039',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'facil',
    enunciado: '¿Quién marcó el gol del Manchester City en la final de Champions 2023?',
    explicacion: 'Rodri marcó el 1-0 ante Inter.',
    opciones: ['Rodri', 'Erling Haaland', 'Kevin De Bruyne', 'Bernardo Silva'],
    correcta: 'Rodri',
    equiposRef: [MAN_CITY, INTER],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2022, localRef: MAN_CITY, visitaRef: INTER, marcador: [1, 0], comprueba: 'goleador', quien: 'Rodri' },
  },
  {
    clave: 'Q040',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'normal',
    enunciado: '¿Quién marcó el empate del Chelsea ante Bayern en la final de Champions 2012?',
    explicacion: 'Drogba empató de cabeza al final del partido.',
    opciones: ['Didier Drogba', 'Frank Lampard', 'Juan Mata', 'Fernando Torres'],
    correcta: 'Didier Drogba',
    equiposRef: [BAYERN, CHELSEA],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2011, localRef: BAYERN, visitaRef: CHELSEA, marcador: [1, 1], comprueba: 'goleador', quien: 'Drogba' },
  },
  {
    clave: 'Q041',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'facil',
    enunciado: '¿Quién marcó el 1-1 del Real Madrid en la final de Champions 2014?',
    explicacion: 'Ramos empató en el descuento.',
    opciones: ['Sergio Ramos', 'Cristiano Ronaldo', 'Gareth Bale', 'Karim Benzema'],
    correcta: 'Sergio Ramos',
    equiposRef: [REAL_MADRID, ATLETICO_MADRID],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2013, localRef: REAL_MADRID, visitaRef: ATLETICO_MADRID, marcador: [4, 1], comprueba: 'goleador', quien: 'Ramos' },
  },
  {
    clave: 'Q042',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'normal',
    enunciado: '¿Quién marcó el primer gol del Real Madrid en la final de Champions 2017?',
    explicacion: 'Cristiano abrió el marcador ante Juventus.',
    opciones: ['Cristiano Ronaldo', 'Casemiro', 'Marco Asensio', 'Karim Benzema'],
    correcta: 'Cristiano Ronaldo',
    equiposRef: [JUVENTUS, REAL_MADRID],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2016, localRef: JUVENTUS, visitaRef: REAL_MADRID, marcador: [1, 4], comprueba: 'goleador', quien: 'Ronaldo', orden: 1 },
  },
  {
    clave: 'Q043',
    tipo: 'verdadero-falso',
    dificultad: 'facil',
    enunciado: 'Gareth Bale marcó de chilena en la final de Champions 2018.',
    explicacion: 'Bale marcó uno de los goles más recordados de las finales modernas.',
    opciones: ['Verdadero', 'Falso'],
    correcta: 'Verdadero',
    equiposRef: [REAL_MADRID, LIVERPOOL],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'editorial', motivo: 'El proveedor confirma el gol de Bale, pero no que haya sido de chilena.' },
  },
  {
    clave: 'Q044',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'normal',
    enunciado: '¿Quién marcó el primer gol del Real Madrid en la final de Champions 2024?',
    explicacion: 'Carvajal abrió el marcador de cabeza.',
    opciones: ['Dani Carvajal', 'Vinícius Júnior', 'Jude Bellingham', 'Rodrygo'],
    correcta: 'Dani Carvajal',
    equiposRef: [DORTMUND, REAL_MADRID],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2023, localRef: DORTMUND, visitaRef: REAL_MADRID, marcador: [0, 2], comprueba: 'goleador', quien: 'Carvajal', orden: 1 },
  },
  {
    clave: 'Q045',
    opcionesDe: 'jugador',
    tipo: 'quien-marco',
    dificultad: 'normal',
    enunciado: '¿Qué jugador del PSG marcó dos goles en la final de Champions 2025 contra Inter?',
    explicacion: 'Doué anotó dos veces en la goleada 5-0.',
    opciones: ['Désiré Doué', 'Ousmane Dembélé', 'Khvicha Kvaratskhelia', 'Achraf Hakimi'],
    correcta: 'Désiré Doué',
    equiposRef: [PSG, INTER],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2024, localRef: PSG, visitaRef: INTER, marcador: [5, 0], comprueba: 'goleador', quien: 'Doué', veces: 2 },
  },
  {
    clave: 'Q046',
    tipo: 'verdadero-falso',
    dificultad: 'facil',
    enunciado: 'Neymar ganó al menos un Balón de Oro.',
    explicacion: 'Neymar nunca ganó el Balón de Oro.',
    opciones: ['Verdadero', 'Falso'],
    correcta: 'Falso',
    validacion: { tipo: 'editorial', motivo: 'El Balón de Oro no es un dato del proveedor.' },
  },
  {
    clave: 'Q047',
    tipo: 'verdadero-falso',
    dificultad: 'facil',
    enunciado: 'Perú clasificó al Mundial 2018 tras eliminar a Nueva Zelanda en el repechaje.',
    explicacion: 'Perú empató 0-0 fuera y ganó 2-0 en Lima.',
    opciones: ['Verdadero', 'Falso'],
    correcta: 'Verdadero',
    equiposRef: [PERU, NUEVA_ZELANDA],
    validacion: { tipo: 'partido', competenciaRef: REPECHAJE, temporada: 2017, localRef: PERU, visitaRef: NUEVA_ZELANDA, marcador: [2, 0], comprueba: 'marcador' },
  },
  {
    clave: 'Q048',
    opcionesDe: 'jugador',
    tipo: 'titularidad',
    dificultad: 'dificil',
    enunciado: '¿Cuál de estos jugadores del Barcelona NO fue titular en la final de Champions 2015?',
    explicacion: 'Xavi ingresó desde el banco.',
    opciones: ['Andrés Iniesta', 'Ivan Rakitić', 'Xavi', 'Sergio Busquets'],
    correcta: 'Xavi',
    equiposRef: [JUVENTUS, BARCELONA],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2014, localRef: JUVENTUS, visitaRef: BARCELONA, marcador: [1, 3], comprueba: 'titularidad', quien: 'Xavi', equipoRef: BARCELONA, losOtros: ['Iniesta', 'Rakitić', 'Busquets'] },
  },
  {
    clave: 'Q049',
    opcionesDe: 'jugador',
    tipo: 'titularidad',
    dificultad: 'dificil',
    enunciado: '¿Cuál de estos jugadores del Real Madrid NO fue titular en la final de Champions 2018?',
    explicacion: 'Bale entró desde el banco y marcó dos goles.',
    opciones: ['Isco', 'Gareth Bale', 'Luka Modrić', 'Casemiro'],
    correcta: 'Gareth Bale',
    equiposRef: [REAL_MADRID, LIVERPOOL],
    competenciaRef: CHAMPIONS,
    validacion: { tipo: 'partido', competenciaRef: CHAMPIONS, temporada: 2017, localRef: REAL_MADRID, visitaRef: LIVERPOOL, marcador: [3, 1], comprueba: 'titularidad', quien: 'Bale', equipoRef: REAL_MADRID, losOtros: ['Isco', 'Modrić', 'Casemiro'] },
  },
  {
    clave: 'Q050',
    opcionesDe: 'jugador',
    tipo: 'comparacion',
    dificultad: 'normal',
    enunciado: '¿Cuál de estos jugadores marcó más goles en Copas del Mundo?',
    explicacion: 'Klose es el máximo goleador histórico de los Mundiales con 16.',
    opciones: ['Miroslav Klose', 'Ronaldo Nazário', 'Lionel Messi', 'Gerd Müller'],
    correcta: 'Miroslav Klose',
    competenciaRef: MUNDIAL,
    validacion: { tipo: 'editorial', motivo: 'Es un acumulado histórico de varias ediciones, la mayoría fuera de la cobertura del proveedor.' },
  },
];

/** Bandera si es selección, escudo si es club. La distinción no la puede dar el proveedor. */
export function emblemaDelEquipo(equipoRef: string): string {
  const bandera = BANDERAS[equipoRef];
  return bandera ? banderaDePais(bandera) : escudoDeEquipo(equipoRef);
}

export { logoDeCompetencia } from '../../shared/entorno.js';

/**
 * La escena de la pregunta, para que dos de lo mismo no salgan pegadas.
 *
 * Con dieciséis «¿quién ganó…?» en cincuenta, sin esto la tanda se siente como un formulario.
 */
export function contextoDe(pregunta: PreguntaDeclarada): string {
  const v = pregunta.validacion;
  if (v.tipo === 'partido') {
    const [uno, otro] = [v.localRef, v.visitaRef].sort();
    return `partido:${uno}-${otro}:${v.temporada}`;
  }
  if (v.tipo === 'campeon') return `campeon:${v.competenciaRef}:${v.temporada}`;
  if (v.tipo === 'trayectoria') return `trayectoria:${v.jugador}`;
  return `suelta:${pregunta.clave}`;
}
