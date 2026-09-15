/**
 * Los 50 retos de El Impostor, transcritos de `retos.md`.
 *
 * Es la única fuente de verdad: de acá salen la auditoría y la importación. Un reto no se cambia ni
 * se sustituye desde el código; si no pasa la auditoría, se reporta y queda bloqueado.
 *
 * **Los futbolistas van por nombre y los equipos por id.** No es una inconsistencia: cada nombre se
 * resuelve *dentro de su reto* —contra los veintitrés de una alineación o los treinta de un
 * plantel—, donde "Guerrero" es uno solo. Resolverlos contra los 46.000 de la base sería el problema
 * de homónimos que costó caro en el buscador de Adivina el XI. Los equipos, en cambio, se buscarían
 * contra todo el catálogo, y ahí un "Inter" o un "Barcelona" traen media docena de países.
 */
export type Dificultad = 'facil' | 'normal' | 'dificil';
export type Categoria = 'peruano' | 'selecciones' | 'clubes' | 'trayectorias';

/**
 * Cómo se comprueba un reto.
 *
 * `once` — los cinco fueron titulares de ese equipo en ese partido y el impostor no.
 * `plantel` — los cinco figuran en el club o la selección esa temporada y el impostor no. Con
 *   `competenciaRef` la pregunta se acota a un torneo, que es lo que separa "jugó por Perú en 2018"
 *   de "estuvo en el Mundial de 2018".
 * `editorial` — el proveedor no cubre la temporada. Entra igual si los seis tienen ficha y foto, y
 *   su verdad futbolística la respalda el editor.
 */
export type Validacion =
  | {
      tipo: 'once';
      competenciaRef: string;
      temporada: number;
      localRef: string;
      visitaRef: string;
      marcador: [number, number];
      objetivo: 'local' | 'visita';
    }
  | { tipo: 'plantel'; equipoRef: string; temporada: number; competenciaRef?: string }
  | { tipo: 'editorial'; motivo: string };

export interface RetoDelImpostorDeclarado {
  clave: string;
  dificultad: Dificultad;
  categoria: Categoria;
  enunciado: string;
  reveal: string;
  /** Los cinco que sí cumplen, con el nombre tal como está escrito en el catálogo. */
  correctos: readonly string[];
  impostor: string;
  validacion: Validacion;
}

/*
 * Ids del proveedor verificados el 2026-09-15. Van fijados y no se buscan por nombre.
 */
const MUNDIAL = '1';
const COPA_AMERICA = '9';
const CHAMPIONS = '2';
const EURO = '4';
const LIBERTADORES = '13';

const ARGENTINA = '26';
const ALEMANIA = '25';
const AUSTRALIA = '20';
const BELGICA = '1';
const BRASIL = '6';
const CHILE = '2383';
const COLOMBIA = '8';
const COREA_DEL_SUR = '17';
const CROACIA = '3';
const ESPANA = '9';
const FRANCIA = '2';
const GHANA = '1504';
const INGLATERRA = '10';
const ITALIA = '768';
const PAISES_BAJOS = '1118';
const PERU = '30';
const PORTUGAL = '27';
const SUIZA = '15';
const URUGUAY = '7';

const AJAX = '194';
const ALIANZA_LIMA = '2553';
const ATLETICO_MADRID = '530';
const BARCELONA = '529';
const BAYERN = '157';
const CHELSEA = '49';
const DORTMUND = '165';
const INTER = '505';
const JUVENTUS = '496';
const LDU_QUITO = '1158';
const LIVERPOOL = '40';
const MAN_CITY = '50';
const MAN_UNITED = '33';
const PSG = '85';
const REAL_MADRID = '541';
const SPORTING_CRISTAL = '2546';
const UNIVERSITARIO = '2540';

export const RETOS_DEL_IMPOSTOR: readonly RetoDelImpostorDeclarado[] = [
  // ─── Fútbol peruano ──────────────────────────────────────────────────────────────────────
  {
    clave: 'IMP-001',
    dificultad: 'normal',
    categoria: 'peruano',
    enunciado: '5 integraron la lista de Perú para Rusia 2018. Uno parece de esa generación… pero no estuvo.',
    reveal: 'Zambrano era habitual de la selección en esos años, pero no integró la nómina mundialista de 2018.',
    correctos: ['Gallese', 'Advíncula', 'Cueva', 'Carrillo', 'Guerrero'],
    impostor: 'Zambrano',
    validacion: { tipo: 'plantel', equipoRef: PERU, temporada: 2018, competenciaRef: MUNDIAL },
  },
  {
    clave: 'IMP-002',
    dificultad: 'facil',
    categoria: 'peruano',
    enunciado: '5 fueron titulares de Perú ante Australia en Rusia 2018. Uno pertenecía al plantel, pero no arrancó.',
    reveal: 'Aquino formó parte del plantel peruano, pero no fue titular ante Australia.',
    correctos: ['Gallese', 'Advíncula', 'Cueva', 'Carrillo', 'Guerrero'],
    impostor: 'Aquino',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2018, localRef: PERU, visitaRef: AUSTRALIA, marcador: [2, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-003',
    dificultad: 'dificil',
    categoria: 'peruano',
    enunciado: '5 fueron titulares de Perú en el 3-0 a Chile de 2019. Uno estuvo en el torneo, pero no arrancó aquella noche.',
    reveal: 'Christofer Gonzales integró la selección, pero no fue titular en aquella semifinal.',
    correctos: ['Gallese', 'Advíncula', 'Yotún', 'Cueva', 'Guerrero'],
    impostor: 'Gonzáles',
    validacion: { tipo: 'once', competenciaRef: COPA_AMERICA, temporada: 2019, localRef: PERU, visitaRef: CHILE, marcador: [3, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-004',
    dificultad: 'dificil',
    categoria: 'peruano',
    enunciado: '5 fueron titulares de Perú en la final de Copa América 2019. Uno estuvo en el plantel, pero comenzó fuera del XI.',
    reveal: 'Gonzales estuvo disponible para Perú, pero no inició la final ante Brasil.',
    correctos: ['Gallese', 'Trauco', 'Tapia', 'Carrillo', 'Guerrero'],
    impostor: 'Gonzáles',
    validacion: { tipo: 'once', competenciaRef: COPA_AMERICA, temporada: 2019, localRef: BRASIL, visitaRef: PERU, marcador: [3, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-005',
    dificultad: 'facil',
    categoria: 'peruano',
    enunciado: '5 disputaron la Copa América 2021 con Perú. Uno había sido habitual de la selección, pero no estuvo en ese torneo.',
    reveal: 'Farfán no formó parte de la convocatoria peruana para esa Copa América.',
    correctos: ['Lapadula', 'Cueva', 'Carrillo', 'Yotún', 'Gallese'],
    impostor: 'Farfán',
    validacion: { tipo: 'plantel', equipoRef: PERU, temporada: 2021, competenciaRef: COPA_AMERICA },
  },
  {
    clave: 'IMP-006',
    dificultad: 'facil',
    categoria: 'peruano',
    enunciado: '5 fueron parte de Universitario campeón en 2023. Uno había vestido de crema hasta poco antes, pero ya no estaba en ese plantel.',
    reveal: 'Novick jugó en Universitario hasta 2022, pero no integró el plantel campeón de 2023.',
    correctos: ['Carvallo', 'Corzo', 'Polo', 'Quispe', 'Valera'],
    impostor: 'Novick',
    validacion: { tipo: 'plantel', equipoRef: UNIVERSITARIO, temporada: 2023 },
  },
  {
    clave: 'IMP-007',
    dificultad: 'normal',
    categoria: 'peruano',
    enunciado: '5 fueron parte de Universitario en la Libertadores 2024. Uno había sido figura crema el año anterior, pero ya se había ido.',
    reveal: 'Quispe dejó Universitario después del título de 2023 y ya no estaba para la Libertadores 2024.',
    correctos: ['Corzo', 'Polo', 'Ureña', 'Flores', 'Valera'],
    impostor: 'Quispe',
    validacion: { tipo: 'plantel', equipoRef: UNIVERSITARIO, temporada: 2024 },
  },
  {
    clave: 'IMP-008',
    dificultad: 'dificil',
    categoria: 'peruano',
    enunciado: '5 fueron titulares de Universitario ante LDU en el 2-1 de Libertadores 2024. Uno era parte del plantel, pero no arrancó.',
    reveal: 'Calcaterra formaba parte del plantel, pero no inició ese partido.',
    correctos: ['Corzo', 'Riveros', 'Ureña', 'Polo', 'Valera'],
    impostor: 'Calcaterra',
    validacion: { tipo: 'once', competenciaRef: LIBERTADORES, temporada: 2024, localRef: UNIVERSITARIO, visitaRef: LDU_QUITO, marcador: [2, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-009',
    dificultad: 'facil',
    categoria: 'peruano',
    enunciado: '5 fueron parte de Alianza Lima campeón en 2021. Uno llegó recién para la temporada siguiente.',
    reveal: 'Lavandeira llegó a Alianza para 2022.',
    correctos: ['Campos', 'Barcos', 'Ballón', 'Concha', 'Mora'],
    impostor: 'Lavandeira',
    validacion: { tipo: 'plantel', equipoRef: ALIANZA_LIMA, temporada: 2021 },
  },
  {
    clave: 'IMP-010',
    dificultad: 'normal',
    categoria: 'peruano',
    enunciado: '5 fueron parte del plantel de Alianza Lima en 2023. Uno había sido referente hasta el año anterior, pero ya se había retirado.',
    reveal: 'Farfán se retiró después de la temporada 2022.',
    correctos: ['Barcos', 'Zambrano', 'Campos', 'Ballón', 'Concha'],
    impostor: 'Farfán',
    validacion: { tipo: 'plantel', equipoRef: ALIANZA_LIMA, temporada: 2023 },
  },
  {
    clave: 'IMP-011',
    dificultad: 'facil',
    categoria: 'peruano',
    enunciado: '5 fueron campeones con Sporting Cristal en 2020. Uno llegó al club en la temporada siguiente.',
    reveal: 'Hohberg llegó a Sporting Cristal en 2021.',
    correctos: ['Solís', 'Merlo', 'Calcaterra', 'Távara', 'Herrera'],
    impostor: 'Hohberg',
    validacion: { tipo: 'plantel', equipoRef: SPORTING_CRISTAL, temporada: 2020 },
  },
  {
    clave: 'IMP-012',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Real Madrid en el 5-2 en Anfield. Uno terminó jugando el partido, pero no arrancó.',
    reveal: 'Nacho entró por la lesión de Alaba; no fue titular en aquella noche.',
    correctos: ['Courtois', 'Carvajal', 'Modrić', 'Vinícius', 'Benzema'],
    impostor: 'Nacho',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2022, localRef: LIVERPOOL, visitaRef: REAL_MADRID, marcador: [2, 5], objetivo: 'visita' },
  },

  // ─── Selecciones y Mundiales ─────────────────────────────────────────────────────────────
  {
    clave: 'IMP-013',
    dificultad: 'facil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Argentina en la final de Qatar 2022. Uno estaba en el plantel, pero empezó en el banco.',
    reveal: 'Dybala fue campeón del mundo, pero no inició la final.',
    correctos: ['Messi', 'Julián Álvarez', 'Di María', 'Enzo Fernández', 'Mac Allister'],
    impostor: 'Dybala',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2022, localRef: ARGENTINA, visitaRef: FRANCIA, marcador: [3, 3], objetivo: 'local' },
  },
  {
    clave: 'IMP-014',
    dificultad: 'normal',
    categoria: 'selecciones',
    enunciado: '5 fueron campeones del mundo con Argentina en 2022. Uno habría sido candidato al XI, pero una lesión lo dejó fuera del Mundial.',
    reveal: 'Lo Celso se perdió Qatar 2022 por lesión.',
    correctos: ['Messi', 'De Paul', 'Lautaro Martínez', 'Emiliano Martínez', 'Otamendi'],
    impostor: 'Lo Celso',
    validacion: { tipo: 'plantel', equipoRef: ARGENTINA, temporada: 2022, competenciaRef: MUNDIAL },
  },
  {
    clave: 'IMP-015',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Francia en la final de Rusia 2018. Uno era campeón del mundo, pero comenzó en el banco.',
    reveal: 'Fekir fue parte del plantel campeón, pero no fue titular en la final.',
    correctos: ['Lloris', 'Varane', 'Pogba', 'Griezmann', 'Mbappé'],
    impostor: 'Fekir',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2018, localRef: FRANCIA, visitaRef: CROACIA, marcador: [4, 2], objetivo: 'local' },
  },
  {
    clave: 'IMP-016',
    dificultad: 'normal',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Alemania en el 7-1 a Brasil. Uno también fue campeón, pero no arrancó esa semifinal.',
    reveal: 'Götze estaba en el plantel, pero no fue titular en el 7-1.',
    correctos: ['Neuer', 'Lahm', 'Kroos', 'Klose', 'Müller'],
    impostor: 'Götze',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2014, localRef: BRASIL, visitaRef: ALEMANIA, marcador: [1, 7], objetivo: 'visita' },
  },
  {
    clave: 'IMP-017',
    dificultad: 'normal',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de España en la final del Mundial 2010. Uno entró desde el banco y terminó siendo clave.',
    reveal: 'Fàbregas ingresó durante la final, pero no fue titular.',
    correctos: ['Casillas', 'Puyol', 'Xavi', 'Iniesta', 'Villa'],
    impostor: 'Fàbregas',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2010, localRef: ESPANA, visitaRef: PAISES_BAJOS, marcador: [1, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-018',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Italia en la final de la Euro 2020. Uno pertenecía al mismo plantel, pero comenzó en el banco.',
    reveal: 'Locatelli fue campeón de Europa, pero no inició la final en Wembley.',
    correctos: ['Donnarumma', 'Bonucci', 'Chiellini', 'Jorginho', 'Chiesa'],
    impostor: 'Locatelli',
    validacion: { tipo: 'once', competenciaRef: EURO, temporada: 2020, localRef: ITALIA, visitaRef: INGLATERRA, marcador: [1, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-019',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Uruguay ante Ghana en los cuartos de 2010. Uno pertenecía a ese plantel, pero no inició.',
    reveal: 'Abreu fue parte de aquel Uruguay, pero no comenzó el partido ante Ghana.',
    correctos: ['Muslera', 'Forlán', 'Suárez', 'Cavani', 'Godín'],
    impostor: 'Abreu',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2010, localRef: URUGUAY, visitaRef: GHANA, marcador: [1, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-020',
    dificultad: 'facil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Portugal en el 6-1 a Suiza de Qatar 2022. Uno estaba en el banco y todos hablaron de ello.',
    reveal: 'Cristiano comenzó aquel partido como suplente.',
    correctos: ['Gonçalo Ramos', 'Bruno Fernandes', 'Bernardo Silva', 'Pepe', 'Rúben Dias'],
    impostor: 'Cristiano Ronaldo',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2022, localRef: PORTUGAL, visitaRef: SUIZA, marcador: [6, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-021',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Países Bajos en la semifinal contra Argentina en 2014. Uno estaba en el plantel, pero empezó fuera.',
    reveal: 'Depay estuvo en Brasil 2014, pero no inició aquella semifinal.',
    correctos: ['Robben', 'van Persie', 'Sneijder', 'Blind', 'de Jong'],
    impostor: 'Depay',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2014, localRef: PAISES_BAJOS, visitaRef: ARGENTINA, marcador: [0, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-022',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Argentina en la final del Mundial 2014. Uno era una estrella del plantel, pero empezó en el banco.',
    reveal: 'Agüero ingresó durante la final, pero no fue titular.',
    correctos: ['Messi', 'Higuaín', 'Mascherano', 'Biglia', 'Zabaleta'],
    impostor: 'Agüero',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2014, localRef: ALEMANIA, visitaRef: ARGENTINA, marcador: [1, 0], objetivo: 'visita' },
  },
  {
    clave: 'IMP-023',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Colombia ante Brasil en los cuartos de 2014. Uno estaba en el Mundial, pero no inició ese partido.',
    reveal: 'Jackson Martínez formaba parte del plantel, pero no fue titular en ese encuentro.',
    correctos: ['James Rodríguez', 'Cuadrado', 'Ospina', 'Yepes', 'Armero'],
    impostor: 'Jackson Martínez',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2014, localRef: BRASIL, visitaRef: COLOMBIA, marcador: [2, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-024',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Bélgica en la eliminación de Brasil en 2018. Uno era habitual, pero arrancó desde el banco.',
    reveal: 'Mertens no fue titular ante Brasil.',
    correctos: ['De Bruyne', 'Hazard', 'Lukaku', 'Courtois', 'Kompany'],
    impostor: 'Mertens',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2018, localRef: BRASIL, visitaRef: BELGICA, marcador: [1, 2], objetivo: 'visita' },
  },
  {
    clave: 'IMP-025',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Croacia en la final del Mundial 2018. Uno era figura del plantel, pero comenzó en el banco.',
    reveal: 'Kovačić no inició la final.',
    correctos: ['Modrić', 'Rakitić', 'Perišić', 'Mandžukić', 'Lovren'],
    impostor: 'Kovačić',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2018, localRef: FRANCIA, visitaRef: CROACIA, marcador: [4, 2], objetivo: 'visita' },
  },
  {
    clave: 'IMP-026',
    dificultad: 'dificil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Inglaterra en la semifinal de Rusia 2018. Uno entró durante el partido.',
    reveal: 'Rashford no fue titular ante Croacia.',
    correctos: ['Kane', 'Sterling', 'Lingard', 'Alli', 'Henderson'],
    impostor: 'Rashford',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2018, localRef: CROACIA, visitaRef: INGLATERRA, marcador: [2, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-027',
    dificultad: 'facil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Francia en la final de Qatar 2022. Uno entró desde el banco y casi cambia la historia.',
    reveal: 'Coman no comenzó la final.',
    correctos: ['Mbappé', 'Giroud', 'Griezmann', 'Tchouaméni', 'Theo Hernández'],
    impostor: 'Coman',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2022, localRef: ARGENTINA, visitaRef: FRANCIA, marcador: [3, 3], objetivo: 'visita' },
  },
  {
    clave: 'IMP-028',
    dificultad: 'normal',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Argentina en la final de Copa América 2021. Uno era parte del plantel, pero empezó afuera.',
    reveal: 'Agüero no fue titular en la final contra Brasil.',
    correctos: ['Messi', 'Di María', 'Lautaro Martínez', 'De Paul', 'Emiliano Martínez'],
    impostor: 'Agüero',
    validacion: { tipo: 'once', competenciaRef: COPA_AMERICA, temporada: 2021, localRef: ARGENTINA, visitaRef: BRASIL, marcador: [1, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-029',
    dificultad: 'facil',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Brasil en el 4-1 a Corea del Sur. Uno estuvo en Qatar, pero empezó en el banco.',
    reveal: 'Rodrygo no inició aquel partido.',
    correctos: ['Neymar', 'Vinícius', 'Richarlison', 'Raphinha', 'Casemiro'],
    impostor: 'Rodrygo',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2022, localRef: BRASIL, visitaRef: COREA_DEL_SUR, marcador: [4, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-030',
    dificultad: 'normal',
    categoria: 'selecciones',
    enunciado: '5 fueron titulares de Brasil en la eliminación ante Bélgica en 2018. Uno jugó ese partido, pero entró desde el banco.',
    reveal: 'Firmino pertenecía al plantel y entró en el segundo tiempo, pero no fue titular.',
    correctos: ['Neymar', 'Coutinho', 'Gabriel Jesus', 'Marcelo', 'Thiago Silva'],
    impostor: 'Firmino',
    validacion: { tipo: 'once', competenciaRef: MUNDIAL, temporada: 2018, localRef: BRASIL, visitaRef: BELGICA, marcador: [1, 2], objetivo: 'local' },
  },

  // ─── Clubes y Champions ──────────────────────────────────────────────────────────────────
  {
    clave: 'IMP-031',
    dificultad: 'normal',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Barcelona en la final de Champions 2015. Uno era leyenda del club, pero empezó desde el banco.',
    reveal: 'Xavi ingresó en la segunda parte; no fue titular contra Juventus.',
    correctos: ['Messi', 'Neymar', 'Suárez', 'Iniesta', 'Busquets'],
    impostor: 'Xavi',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2014, localRef: BARCELONA, visitaRef: JUVENTUS, marcador: [3, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-032',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Barcelona en la final de Champions 2011. Uno pertenecía al plantel, pero no inició en Wembley.',
    reveal: 'Thiago formaba parte del Barcelona, pero no fue titular en aquella final.',
    correctos: ['Messi', 'David Villa', 'Pedro', 'Xavi', 'Iniesta'],
    impostor: 'Thiago Alcântara',
    validacion: { tipo: 'editorial', motivo: 'La final de 2011 es la temporada 2010 y la Champions del proveedor arranca en 2011.' },
  },
  {
    clave: 'IMP-033',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Barcelona en el 2-8 contra Bayern. Uno era fichaje estrella, pero empezó en el banco.',
    reveal: 'Griezmann no inició aquel partido.',
    correctos: ['Messi', 'Suárez', 'Busquets', 'de Jong', 'Jordi Alba'],
    impostor: 'Griezmann',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2019, localRef: BARCELONA, visitaRef: BAYERN, marcador: [2, 8], objetivo: 'local' },
  },
  {
    clave: 'IMP-034',
    dificultad: 'normal',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Real Madrid en la final de Champions 2018. Uno terminó siendo héroe, pero arrancó desde el banco.',
    reveal: 'Bale no fue titular; entró después y marcó dos goles.',
    correctos: ['Cristiano Ronaldo', 'Benzema', 'Modrić', 'Kroos', 'Sergio Ramos'],
    impostor: 'Bale',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2017, localRef: REAL_MADRID, visitaRef: LIVERPOOL, marcador: [3, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-035',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Real Madrid en la final de Champions 2014. Uno era fijo del equipo, pero estaba suspendido.',
    reveal: 'Xabi Alonso se perdió la final por sanción.',
    correctos: ['Cristiano Ronaldo', 'Bale', 'Modrić', 'Di María', 'Sergio Ramos'],
    impostor: 'Xabi Alonso',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2013, localRef: REAL_MADRID, visitaRef: ATLETICO_MADRID, marcador: [4, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-036',
    dificultad: 'facil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Madrid en la final de Champions 2024. Uno fue héroe de la semifinal, pero comenzó la final en el banco.',
    reveal: 'Joselu no inició la final frente al Dortmund.',
    correctos: ['Vinícius', 'Bellingham', 'Kroos', 'Valverde', 'Carvajal'],
    impostor: 'Joselu',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2023, localRef: DORTMUND, visitaRef: REAL_MADRID, marcador: [0, 2], objetivo: 'visita' },
  },
  {
    clave: 'IMP-037',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Ajax que ganó 4-1 en el Bernabéu. Uno pertenecía a ese mismo Ajax, pero empezó fuera.',
    reveal: 'Dolberg era parte del Ajax 2018/19, pero no inició aquella goleada.',
    correctos: ['de Ligt', 'de Jong', 'Ziyech', 'Tadić', 'van de Beek'],
    impostor: 'Dolberg',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2018, localRef: REAL_MADRID, visitaRef: AJAX, marcador: [1, 4], objetivo: 'visita' },
  },
  {
    clave: 'IMP-038',
    dificultad: 'facil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Liverpool en el 4-0 al Barcelona. Uno era su gran estrella ofensiva, pero se perdió la noche por lesión.',
    reveal: 'Salah no disputó la vuelta por lesión.',
    correctos: ['Alisson', 'van Dijk', 'Henderson', 'Mané', 'Origi'],
    impostor: 'Salah',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2018, localRef: LIVERPOOL, visitaRef: BARCELONA, marcador: [4, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-039',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Manchester City en la final de Champions 2023. Uno comenzó en el banco.',
    reveal: 'Foden comenzó como suplente y entró durante el partido.',
    correctos: ['Haaland', 'De Bruyne', 'Rodri', 'Bernardo Silva', 'Rúben Dias'],
    impostor: 'Foden',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2022, localRef: MAN_CITY, visitaRef: INTER, marcador: [1, 0], objetivo: 'local' },
  },
  {
    clave: 'IMP-040',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Chelsea en la final de Champions 2021. Uno entró en el segundo tiempo.',
    reveal: 'Pulisic comenzó la final en el banco.',
    correctos: ['Kanté', 'Mount', 'Havertz', 'Werner', 'Jorginho'],
    impostor: 'Pulisic',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2020, localRef: MAN_CITY, visitaRef: CHELSEA, marcador: [0, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-041',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Bayern en la final de Champions 2020. Uno venía siendo importante, pero perdió el puesto para la final.',
    reveal: 'Perišić no fue titular contra PSG.',
    correctos: ['Lewandowski', 'Müller', 'Gnabry', 'Kimmich', 'Coman'],
    impostor: 'Perišić',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2019, localRef: PSG, visitaRef: BAYERN, marcador: [0, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-042',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del PSG en la final de Champions 2020. Uno era delantero del plantel, pero empezó fuera.',
    reveal: 'Icardi estaba en el PSG, pero no inició la final.',
    correctos: ['Neymar', 'Mbappé', 'Di María', 'Marquinhos', 'Navas'],
    impostor: 'Icardi',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2019, localRef: PSG, visitaRef: BAYERN, marcador: [0, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-043',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Manchester United en el 3-1 al PSG de 2019. Uno era pieza clave, pero estaba suspendido.',
    reveal: 'Pogba se perdió la vuelta por suspensión.',
    correctos: ['Rashford', 'Lukaku', 'McTominay', 'Fred', 'Young'],
    impostor: 'Pogba',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2018, localRef: PSG, visitaRef: MAN_UNITED, marcador: [1, 3], objetivo: 'visita' },
  },
  {
    clave: 'IMP-044',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Barcelona en el 6-1 al PSG. Uno era titular habitual del equipo, pero empezó ese partido en el banco.',
    reveal: 'Jordi Alba no inició la remontada ante PSG.',
    correctos: ['Messi', 'Neymar', 'Suárez', 'Iniesta', 'Busquets'],
    impostor: 'Jordi Alba',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2016, localRef: BARCELONA, visitaRef: PSG, marcador: [6, 1], objetivo: 'local' },
  },
  {
    clave: 'IMP-045',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares de Juventus en la final de Champions 2017. Uno era histórico del club, pero comenzó en el banco.',
    reveal: 'Marchisio no fue titular en la final contra Real Madrid.',
    correctos: ['Buffon', 'Dani Alves', 'Bonucci', 'Chiellini', 'Dybala'],
    impostor: 'Marchisio',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2016, localRef: REAL_MADRID, visitaRef: JUVENTUS, marcador: [4, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-046',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Atlético en la final de Champions 2014. Uno era figura de ese equipo, pero no pudo jugar la final.',
    reveal: 'Arda Turan se perdió la final por lesión.',
    correctos: ['Courtois', 'Godín', 'Gabi', 'Koke', 'Diego Costa'],
    impostor: 'Arda Turan',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2013, localRef: REAL_MADRID, visitaRef: ATLETICO_MADRID, marcador: [4, 1], objetivo: 'visita' },
  },
  {
    clave: 'IMP-047',
    dificultad: 'dificil',
    categoria: 'clubes',
    enunciado: '5 fueron titulares del Dortmund en la final de Champions 2013. Uno era una de sus mayores estrellas, pero no pudo jugar.',
    reveal: 'Götze se perdió la final por lesión.',
    correctos: ['Lewandowski', 'Reus', 'Gündoğan', 'Hummels', 'Piszczek'],
    impostor: 'Götze',
    validacion: { tipo: 'once', competenciaRef: CHAMPIONS, temporada: 2012, localRef: DORTMUND, visitaRef: BAYERN, marcador: [1, 2], objetivo: 'local' },
  },

  // ─── Trayectorias dentro del mismo club ──────────────────────────────────────────────────
  {
    clave: 'IMP-048',
    dificultad: 'normal',
    categoria: 'trayectorias',
    enunciado: '5 compartieron vestuario con Cristiano Ronaldo en Juventus. Uno también fue figura de Juventus, pero se había marchado antes de que Cristiano llegara.',
    reveal: 'Pogba dejó Juventus en 2016; Cristiano llegó en 2018.',
    correctos: ['Dybala', 'Chiellini', 'Bonucci', 'Chiesa', 'Szczęsny'],
    impostor: 'Pogba',
    validacion: { tipo: 'plantel', equipoRef: JUVENTUS, temporada: 2020 },
  },
  {
    clave: 'IMP-049',
    dificultad: 'normal',
    categoria: 'trayectorias',
    enunciado: '5 compartieron vestuario con Haaland en Dortmund. Uno llegó al club justo después de la salida del noruego.',
    reveal: 'Adeyemi llegó para la temporada posterior a la salida de Haaland.',
    correctos: ['Reus', 'Bellingham', 'Sancho', 'Hummels', 'Reyna'],
    impostor: 'Adeyemi',
    validacion: { tipo: 'plantel', equipoRef: DORTMUND, temporada: 2020 },
  },
  {
    clave: 'IMP-050',
    dificultad: 'normal',
    categoria: 'trayectorias',
    enunciado: '5 compartieron vestuario con Ronaldinho en Barcelona. Uno llegó al club justo cuando Ronnie se marchó.',
    reveal: 'Dani Alves llegó al Barcelona en 2008, tras la salida de Ronaldinho.',
    /* En ese plantel el proveedor lo llama "Xavier Hernández Creus", y además hay un Xavi Torres. */
    correctos: ['Messi', 'Xavier Hernández', 'Iniesta', "Eto'o", 'Puyol'],
    impostor: 'Dani Alves',
    validacion: { tipo: 'plantel', equipoRef: BARCELONA, temporada: 2007 },
  },
];
