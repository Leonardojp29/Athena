/**
 * Los retos de Adivina el XI, transcritos de `internacional.md` y `peruano.md`.
 *
 * Es la única fuente de verdad: de acá salen la auditoría y la importación. Un partido no se
 * cambia ni se sustituye desde el código; si un reto no sirve, se reporta y lo reemplaza Leonardo.
 *
 * `temporada` es la del proveedor y **no** el año del cartel, que es donde está la trampa: la final
 * de 2015 de Champions pertenece a la temporada 2014, la Supercopa de España que se juega en enero
 * de 2024 es la temporada 2023, y el repechaje de 2017 vive en la temporada 2018 de la liga 37.
 *
 * `localRef` y `visitaRef` son fragmentos del nombre **tal como lo escribe el proveedor**, que no
 * siempre es el nombre que ve el usuario: "Atletico-MG" por Atlético Mineiro, "Libertad Asuncion"
 * por Libertad. El marcador termina de desambiguar.
 */
export type Catalogo = 'internacional' | 'peruano';
export type Dificultad = 'facil' | 'normal' | 'dificil';

export interface RetoDeclarado {
  clave: string;
  catalogo: Catalogo;
  dificultad: Dificultad;
  competenciaRef: string;
  temporada: number;
  localRef: string;
  visitaRef: string;
  marcador: [number, number];
  /** Cuál de los dos es el equipo cuyo XI hay que adivinar. */
  objetivo: 'local' | 'visita';
  competencia: string;
  fase: string | null;
  anio: number;
  localNombre: string;
  visitaNombre: string;
  nota: string | null;
}

/*
 * Los ids de equipo del proveedor, verificados el 2026-09-14 contra `/teams` y contra los que ya
 * tiene Athena en `external_references`. Van fijados y no se buscan por nombre: el proveedor
 * escribe "Atletico-MG" y "Libertad Asuncion", y un `LIKE` por "Inter" o "Barcelona" trae media
 * docena de clubes de otros países.
 */
const ARGENTINA = '26';
const FRANCIA = '2';
const ESPANA = '9';
const CROACIA = '3';
const PAISES_BAJOS = '1118';
const ALEMANIA = '25';
const BRASIL = '6';
const COREA_DEL_SUR = '17';
const INGLATERRA = '10';
const BELGICA = '1';
const URUGUAY = '7';
const PARAGUAY = '2380';
const COLOMBIA = '8';
const PERU = '30';
const CHILE = '2383';
const AUSTRALIA = '20';
const NUEVA_ZELANDA = '4673';
const BARCELONA = '529';
const REAL_MADRID = '541';
const ATLETICO_MADRID = '530';
const SEVILLA = '536';
const JUVENTUS = '496';
const INTER = '505';
const AC_MILAN = '489';
const PSG = '85';
const LYON = '80';
const BAYERN = '157';
const DORTMUND = '165';
const LIVERPOOL = '40';
const CHELSEA = '49';
const MAN_CITY = '50';
const MAN_UNITED = '33';
const ARSENAL = '42';
const NEWCASTLE = '34';
const BENFICA = '211';
const SHAKHTAR = '550';
const SHERIFF = '568';
const AJAX = '194';
const ALIANZA_LIMA = '2553';
const UNIVERSITARIO = '2540';
const SPORTING_CRISTAL = '2546';
const CIENCIANO = '2562';
const BOCA = '451';
const RIVER = '435';
const LIBERTAD = '1179';
const CORINTHIANS = '131';
const FLAMENGO = '127';
const ATLETICO_MINEIRO = '1062';
const LDU_QUITO = '1158';

const MUNDIAL = '1';
const COPA_AMERICA = '9';
const CHAMPIONS = '2';
const LALIGA = '140';
const LIBERTADORES = '13';
const SUDAMERICANA = '11';
const LIGA_1 = '281';
const SUPERCOPA_ESPANA = '556';
const ELIMINATORIAS = '34';
const REPECHAJE = '37';

export const RETOS_DECLARADOS: readonly RetoDeclarado[] = [
  // ─── Internacional · Fácil ───────────────────────────────────────────────────────────────
  { clave: 'int-facil-1', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2022, localRef: ARGENTINA, visitaRef: FRANCIA, marcador: [3, 3], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Final', anio: 2022, localNombre: 'Argentina', visitaNombre: 'Francia', nota: 'Argentina ganó 4-2 en penales' },
  { clave: 'int-facil-2', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2026, localRef: ESPANA, visitaRef: ARGENTINA, marcador: [1, 0], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Final', anio: 2026, localNombre: 'España', visitaNombre: 'Argentina', nota: 'en prórroga' },
  { clave: 'int-facil-3', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2018, localRef: FRANCIA, visitaRef: CROACIA, marcador: [4, 2], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Final', anio: 2018, localNombre: 'Francia', visitaNombre: 'Croacia', nota: null },
  { clave: 'int-facil-4', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2010, localRef: ESPANA, visitaRef: PAISES_BAJOS, marcador: [1, 0], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Final', anio: 2010, localNombre: 'España', visitaNombre: 'Países Bajos', nota: 'en prórroga' },
  { clave: 'int-facil-5', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2022, localRef: BRASIL, visitaRef: COREA_DEL_SUR, marcador: [4, 1], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Octavos de final', anio: 2022, localNombre: 'Brasil', visitaNombre: 'Corea del Sur', nota: null },
  { clave: 'int-facil-6', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2014, localRef: ALEMANIA, visitaRef: ARGENTINA, marcador: [1, 0], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Final', anio: 2014, localNombre: 'Alemania', visitaNombre: 'Argentina', nota: 'en prórroga' },
  { clave: 'int-facil-7', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2014, localRef: BARCELONA, visitaRef: JUVENTUS, marcador: [3, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2015, localNombre: 'Barcelona', visitaNombre: 'Juventus', nota: null },
  { clave: 'int-facil-8', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2016, localRef: BARCELONA, visitaRef: PSG, marcador: [6, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Octavos de final, vuelta', anio: 2017, localNombre: 'Barcelona', visitaNombre: 'PSG', nota: null },
  { clave: 'int-facil-9', catalogo: 'internacional', dificultad: 'facil', competenciaRef: LALIGA, temporada: 2010, localRef: BARCELONA, visitaRef: REAL_MADRID, marcador: [5, 0], objetivo: 'local', competencia: 'LaLiga', fase: null, anio: 2010, localNombre: 'Barcelona', visitaNombre: 'Real Madrid', nota: null },
  { clave: 'int-facil-10', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2016, localRef: REAL_MADRID, visitaRef: JUVENTUS, marcador: [4, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2017, localNombre: 'Real Madrid', visitaNombre: 'Juventus', nota: null },
  { clave: 'int-facil-11', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2017, localRef: REAL_MADRID, visitaRef: LIVERPOOL, marcador: [3, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2018, localNombre: 'Real Madrid', visitaNombre: 'Liverpool', nota: null },
  { clave: 'int-facil-12', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2023, localRef: DORTMUND, visitaRef: REAL_MADRID, marcador: [0, 2], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Final', anio: 2024, localNombre: 'Borussia Dortmund', visitaNombre: 'Real Madrid', nota: null },
  { clave: 'int-facil-13', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2019, localRef: BAYERN, visitaRef: PSG, marcador: [1, 0], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2020, localNombre: 'Bayern Múnich', visitaNombre: 'PSG', nota: null },
  { clave: 'int-facil-14', catalogo: 'internacional', dificultad: 'facil', competenciaRef: CHAMPIONS, temporada: 2024, localRef: PSG, visitaRef: INTER, marcador: [5, 0], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2025, localNombre: 'PSG', visitaNombre: 'Inter', nota: null },
  { clave: 'int-facil-15', catalogo: 'internacional', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2018, localRef: FRANCIA, visitaRef: ARGENTINA, marcador: [4, 3], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Octavos de final', anio: 2018, localNombre: 'Francia', visitaNombre: 'Argentina', nota: null },

  // ─── Internacional · Normal ──────────────────────────────────────────────────────────────
  { clave: 'int-normal-1', catalogo: 'internacional', dificultad: 'normal', competenciaRef: MUNDIAL, temporada: 2014, localRef: BRASIL, visitaRef: ALEMANIA, marcador: [1, 7], objetivo: 'visita', competencia: 'Copa Mundial de la FIFA', fase: 'Semifinal', anio: 2014, localNombre: 'Brasil', visitaNombre: 'Alemania', nota: null },
  { clave: 'int-normal-2', catalogo: 'internacional', dificultad: 'normal', competenciaRef: MUNDIAL, temporada: 2026, localRef: INGLATERRA, visitaRef: ARGENTINA, marcador: [1, 2], objetivo: 'visita', competencia: 'Copa Mundial de la FIFA', fase: 'Semifinal', anio: 2026, localNombre: 'Inglaterra', visitaNombre: 'Argentina', nota: null },
  { clave: 'int-normal-3', catalogo: 'internacional', dificultad: 'normal', competenciaRef: MUNDIAL, temporada: 2018, localRef: BELGICA, visitaRef: BRASIL, marcador: [2, 1], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Cuartos de final', anio: 2018, localNombre: 'Bélgica', visitaNombre: 'Brasil', nota: null },
  { clave: 'int-normal-4', catalogo: 'internacional', dificultad: 'normal', competenciaRef: COPA_AMERICA, temporada: 2021, localRef: ARGENTINA, visitaRef: BRASIL, marcador: [1, 0], objetivo: 'visita', competencia: 'Copa América', fase: 'Final', anio: 2021, localNombre: 'Argentina', visitaNombre: 'Brasil', nota: null },
  { clave: 'int-normal-5', catalogo: 'internacional', dificultad: 'normal', competenciaRef: MUNDIAL, temporada: 2022, localRef: BRASIL, visitaRef: CROACIA, marcador: [1, 1], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Cuartos de final', anio: 2022, localNombre: 'Brasil', visitaNombre: 'Croacia', nota: 'Croacia ganó 4-2 en penales' },
  { clave: 'int-normal-6', catalogo: 'internacional', dificultad: 'normal', competenciaRef: LALIGA, temporada: 2024, localRef: BARCELONA, visitaRef: REAL_MADRID, marcador: [4, 3], objetivo: 'local', competencia: 'LaLiga', fase: null, anio: 2025, localNombre: 'Barcelona', visitaNombre: 'Real Madrid', nota: null },
  { clave: 'int-normal-7', catalogo: 'internacional', dificultad: 'normal', competenciaRef: SUPERCOPA_ESPANA, temporada: 2023, localRef: REAL_MADRID, visitaRef: BARCELONA, marcador: [4, 1], objetivo: 'local', competencia: 'Supercopa de España', fase: 'Final', anio: 2024, localNombre: 'Real Madrid', visitaNombre: 'Barcelona', nota: null },
  { clave: 'int-normal-8', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2011, localRef: BAYERN, visitaRef: CHELSEA, marcador: [1, 1], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Final', anio: 2012, localNombre: 'Bayern Múnich', visitaNombre: 'Chelsea', nota: 'Chelsea ganó 4-3 en penales' },
  { clave: 'int-normal-9', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2013, localRef: REAL_MADRID, visitaRef: ATLETICO_MADRID, marcador: [4, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2014, localNombre: 'Real Madrid', visitaNombre: 'Atlético de Madrid', nota: 'en prórroga' },
  { clave: 'int-normal-10', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2020, localRef: MAN_CITY, visitaRef: CHELSEA, marcador: [0, 1], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Final', anio: 2021, localNombre: 'Manchester City', visitaNombre: 'Chelsea', nota: null },
  { clave: 'int-normal-11', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2022, localRef: MAN_CITY, visitaRef: INTER, marcador: [1, 0], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Final', anio: 2023, localNombre: 'Manchester City', visitaNombre: 'Inter', nota: null },
  { clave: 'int-normal-12', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2024, localRef: BARCELONA, visitaRef: BAYERN, marcador: [4, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Fase de liga', anio: 2024, localNombre: 'Barcelona', visitaNombre: 'Bayern Múnich', nota: null },
  { clave: 'int-normal-13', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2024, localRef: ARSENAL, visitaRef: REAL_MADRID, marcador: [3, 0], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Cuartos de final, ida', anio: 2025, localNombre: 'Arsenal', visitaNombre: 'Real Madrid', nota: null },
  { clave: 'int-normal-14', catalogo: 'internacional', dificultad: 'normal', competenciaRef: CHAMPIONS, temporada: 2024, localRef: REAL_MADRID, visitaRef: MAN_CITY, marcador: [3, 1], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Play-off eliminatorio, vuelta', anio: 2025, localNombre: 'Real Madrid', visitaNombre: 'Manchester City', nota: null },
  { clave: 'int-normal-15', catalogo: 'internacional', dificultad: 'normal', competenciaRef: MUNDIAL, temporada: 2022, localRef: PAISES_BAJOS, visitaRef: ARGENTINA, marcador: [2, 2], objetivo: 'visita', competencia: 'Copa Mundial de la FIFA', fase: 'Cuartos de final', anio: 2022, localNombre: 'Países Bajos', visitaNombre: 'Argentina', nota: 'Argentina ganó 4-3 en penales' },

  // ─── Internacional · Difícil ─────────────────────────────────────────────────────────────
  { clave: 'int-dificil-1', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2021, localRef: BENFICA, visitaRef: BARCELONA, marcador: [3, 0], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Fase de grupos', anio: 2021, localNombre: 'Benfica', visitaNombre: 'Barcelona', nota: null },
  { clave: 'int-dificil-2', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2022, localRef: BARCELONA, visitaRef: INTER, marcador: [3, 3], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Fase de grupos', anio: 2022, localNombre: 'Barcelona', visitaNombre: 'Inter', nota: null },
  { clave: 'int-dificil-3', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2020, localRef: REAL_MADRID, visitaRef: SHAKHTAR, marcador: [2, 3], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Fase de grupos', anio: 2020, localNombre: 'Real Madrid', visitaNombre: 'Shakhtar Donetsk', nota: null },
  { clave: 'int-dificil-4', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2021, localRef: REAL_MADRID, visitaRef: SHERIFF, marcador: [1, 2], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Fase de grupos', anio: 2021, localNombre: 'Real Madrid', visitaNombre: 'Sheriff Tiraspol', nota: null },
  { clave: 'int-dificil-5', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2019, localRef: MAN_CITY, visitaRef: REAL_MADRID, marcador: [2, 1], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Octavos de final, vuelta', anio: 2020, localNombre: 'Manchester City', visitaNombre: 'Real Madrid', nota: null },
  { clave: 'int-dificil-6', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2017, localRef: MAN_UNITED, visitaRef: SEVILLA, marcador: [1, 2], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Octavos de final, vuelta', anio: 2018, localNombre: 'Manchester United', visitaNombre: 'Sevilla', nota: null },
  { clave: 'int-dificil-7', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2018, localRef: PSG, visitaRef: MAN_UNITED, marcador: [1, 3], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Octavos de final, vuelta', anio: 2019, localNombre: 'PSG', visitaNombre: 'Manchester United', nota: null },
  { clave: 'int-dificil-8', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2019, localRef: BARCELONA, visitaRef: BAYERN, marcador: [2, 8], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Cuartos de final', anio: 2020, localNombre: 'Barcelona', visitaNombre: 'Bayern Múnich', nota: null },
  { clave: 'int-dificil-9', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2019, localRef: MAN_CITY, visitaRef: LYON, marcador: [1, 3], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Cuartos de final', anio: 2020, localNombre: 'Manchester City', visitaNombre: 'Lyon', nota: null },
  { clave: 'int-dificil-10', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2021, localRef: REAL_MADRID, visitaRef: CHELSEA, marcador: [2, 3], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Cuartos de final, vuelta', anio: 2022, localNombre: 'Real Madrid', visitaNombre: 'Chelsea', nota: 'en prórroga; Real Madrid avanzó por global' },
  { clave: 'int-dificil-11', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2020, localRef: PSG, visitaRef: BAYERN, marcador: [0, 1], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Cuartos de final, vuelta', anio: 2021, localNombre: 'PSG', visitaNombre: 'Bayern Múnich', nota: 'PSG avanzó por goles de visitante' },
  { clave: 'int-dificil-12', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2018, localRef: REAL_MADRID, visitaRef: AJAX, marcador: [1, 4], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Octavos de final, vuelta', anio: 2019, localNombre: 'Real Madrid', visitaNombre: 'Ajax', nota: null },
  { clave: 'int-dificil-13', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2023, localRef: NEWCASTLE, visitaRef: PSG, marcador: [4, 1], objetivo: 'visita', competencia: 'UEFA Champions League', fase: 'Fase de grupos', anio: 2023, localNombre: 'Newcastle United', visitaNombre: 'PSG', nota: null },
  { clave: 'int-dificil-14', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2022, localRef: AC_MILAN, visitaRef: INTER, marcador: [0, 2], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Semifinal, ida', anio: 2023, localNombre: 'AC Milan', visitaNombre: 'Inter', nota: null },
  { clave: 'int-dificil-15', catalogo: 'internacional', dificultad: 'dificil', competenciaRef: CHAMPIONS, temporada: 2018, localRef: ATLETICO_MADRID, visitaRef: JUVENTUS, marcador: [2, 0], objetivo: 'local', competencia: 'UEFA Champions League', fase: 'Octavos de final, ida', anio: 2019, localNombre: 'Atlético de Madrid', visitaNombre: 'Juventus', nota: null },

  // ─── Peruano · Fácil ─────────────────────────────────────────────────────────────────────
  { clave: 'per-facil-1', catalogo: 'peruano', dificultad: 'facil', competenciaRef: MUNDIAL, temporada: 2018, localRef: PERU, visitaRef: AUSTRALIA, marcador: [2, 0], objetivo: 'local', competencia: 'Copa Mundial de la FIFA', fase: 'Fase de grupos', anio: 2018, localNombre: 'Perú', visitaNombre: 'Australia', nota: null },
  { clave: 'per-facil-2', catalogo: 'peruano', dificultad: 'facil', competenciaRef: COPA_AMERICA, temporada: 2019, localRef: PERU, visitaRef: CHILE, marcador: [3, 0], objetivo: 'local', competencia: 'Copa América', fase: 'Semifinal', anio: 2019, localNombre: 'Perú', visitaNombre: 'Chile', nota: null },
  { clave: 'per-facil-3', catalogo: 'peruano', dificultad: 'facil', competenciaRef: REPECHAJE, temporada: 2018, localRef: PERU, visitaRef: NUEVA_ZELANDA, marcador: [2, 0], objetivo: 'local', competencia: 'Repechaje intercontinental al Mundial', fase: 'Vuelta', anio: 2017, localNombre: 'Perú', visitaNombre: 'Nueva Zelanda', nota: null },
  { clave: 'per-facil-4', catalogo: 'peruano', dificultad: 'facil', competenciaRef: LIGA_1, temporada: 2023, localRef: ALIANZA_LIMA, visitaRef: UNIVERSITARIO, marcador: [0, 2], objetivo: 'visita', competencia: 'Liga 1', fase: 'Final, vuelta', anio: 2023, localNombre: 'Alianza Lima', visitaNombre: 'Universitario', nota: null },
  { clave: 'per-facil-5', catalogo: 'peruano', dificultad: 'facil', competenciaRef: LIBERTADORES, temporada: 2025, localRef: BOCA, visitaRef: ALIANZA_LIMA, marcador: [2, 1], objetivo: 'visita', competencia: 'Copa Libertadores', fase: 'Segunda fase, vuelta', anio: 2025, localNombre: 'Boca Juniors', visitaNombre: 'Alianza Lima', nota: 'global 2-2; Alianza ganó 5-4 en penales' },
  { clave: 'per-facil-6', catalogo: 'peruano', dificultad: 'facil', competenciaRef: LIGA_1, temporada: 2026, localRef: ALIANZA_LIMA, visitaRef: UNIVERSITARIO, marcador: [1, 2], objetivo: 'visita', competencia: 'Liga 1', fase: 'Torneo Clausura', anio: 2026, localNombre: 'Alianza Lima', visitaNombre: 'Universitario', nota: null },
  { clave: 'per-facil-7', catalogo: 'peruano', dificultad: 'facil', competenciaRef: LIGA_1, temporada: 2020, localRef: UNIVERSITARIO, visitaRef: SPORTING_CRISTAL, marcador: [1, 1], objetivo: 'visita', competencia: 'Liga 1', fase: 'Final, vuelta', anio: 2020, localNombre: 'Universitario', visitaNombre: 'Sporting Cristal', nota: null },

  // ─── Peruano · Normal ────────────────────────────────────────────────────────────────────
  { clave: 'per-normal-1', catalogo: 'peruano', dificultad: 'normal', competenciaRef: COPA_AMERICA, temporada: 2019, localRef: URUGUAY, visitaRef: PERU, marcador: [0, 0], objetivo: 'visita', competencia: 'Copa América', fase: 'Cuartos de final', anio: 2019, localNombre: 'Uruguay', visitaNombre: 'Perú', nota: 'Perú ganó 5-4 en penales' },
  { clave: 'per-normal-2', catalogo: 'peruano', dificultad: 'normal', competenciaRef: COPA_AMERICA, temporada: 2021, localRef: PERU, visitaRef: PARAGUAY, marcador: [3, 3], objetivo: 'local', competencia: 'Copa América', fase: 'Cuartos de final', anio: 2021, localNombre: 'Perú', visitaNombre: 'Paraguay', nota: 'Perú ganó 4-3 en penales' },
  { clave: 'per-normal-3', catalogo: 'peruano', dificultad: 'normal', competenciaRef: ELIMINATORIAS, temporada: 2022, localRef: COLOMBIA, visitaRef: PERU, marcador: [0, 1], objetivo: 'visita', competencia: 'Eliminatorias CONMEBOL al Mundial', fase: null, anio: 2022, localNombre: 'Colombia', visitaNombre: 'Perú', nota: null },
  { clave: 'per-normal-4', catalogo: 'peruano', dificultad: 'normal', competenciaRef: LIGA_1, temporada: 2020, localRef: UNIVERSITARIO, visitaRef: ALIANZA_LIMA, marcador: [2, 0], objetivo: 'local', competencia: 'Liga 1', fase: 'Torneo Apertura', anio: 2020, localNombre: 'Universitario', visitaNombre: 'Alianza Lima', nota: null },
  { clave: 'per-normal-5', catalogo: 'peruano', dificultad: 'normal', competenciaRef: LIGA_1, temporada: 2024, localRef: UNIVERSITARIO, visitaRef: SPORTING_CRISTAL, marcador: [4, 1], objetivo: 'local', competencia: 'Liga 1', fase: 'Torneo Apertura', anio: 2024, localNombre: 'Universitario', visitaNombre: 'Sporting Cristal', nota: null },
  { clave: 'per-normal-6', catalogo: 'peruano', dificultad: 'normal', competenciaRef: LIBERTADORES, temporada: 2023, localRef: LIBERTAD, visitaRef: ALIANZA_LIMA, marcador: [1, 2], objetivo: 'visita', competencia: 'Copa Libertadores', fase: 'Fase de grupos', anio: 2023, localNombre: 'Libertad', visitaNombre: 'Alianza Lima', nota: null },
  { clave: 'per-normal-7', catalogo: 'peruano', dificultad: 'normal', competenciaRef: LIGA_1, temporada: 2024, localRef: ALIANZA_LIMA, visitaRef: SPORTING_CRISTAL, marcador: [1, 2], objetivo: 'visita', competencia: 'Liga 1', fase: 'Torneo Apertura', anio: 2024, localNombre: 'Alianza Lima', visitaNombre: 'Sporting Cristal', nota: null },

  // ─── Peruano · Difícil ───────────────────────────────────────────────────────────────────
  { clave: 'per-dificil-1', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: COPA_AMERICA, temporada: 2021, localRef: PERU, visitaRef: BRASIL, marcador: [0, 1], objetivo: 'local', competencia: 'Copa América', fase: 'Semifinal', anio: 2021, localNombre: 'Perú', visitaNombre: 'Brasil', nota: null },
  { clave: 'per-dificil-2', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: COPA_AMERICA, temporada: 2019, localRef: BRASIL, visitaRef: PERU, marcador: [3, 1], objetivo: 'visita', competencia: 'Copa América', fase: 'Final', anio: 2019, localNombre: 'Brasil', visitaNombre: 'Perú', nota: null },
  { clave: 'per-dificil-3', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: SUDAMERICANA, temporada: 2023, localRef: UNIVERSITARIO, visitaRef: CORINTHIANS, marcador: [1, 2], objetivo: 'local', competencia: 'Copa Sudamericana', fase: 'Play-off de octavos, vuelta', anio: 2023, localNombre: 'Universitario', visitaNombre: 'Corinthians', nota: null },
  { clave: 'per-dificil-4', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: LIBERTADORES, temporada: 2024, localRef: UNIVERSITARIO, visitaRef: LDU_QUITO, marcador: [2, 1], objetivo: 'local', competencia: 'Copa Libertadores', fase: 'Fase de grupos', anio: 2024, localNombre: 'Universitario', visitaNombre: 'LDU Quito', nota: null },
  { clave: 'per-dificil-5', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: LIBERTADORES, temporada: 2022, localRef: ALIANZA_LIMA, visitaRef: RIVER, marcador: [0, 1], objetivo: 'local', competencia: 'Copa Libertadores', fase: 'Fase de grupos', anio: 2022, localNombre: 'Alianza Lima', visitaNombre: 'River Plate', nota: null },
  { clave: 'per-dificil-6', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: LIBERTADORES, temporada: 2022, localRef: SPORTING_CRISTAL, visitaRef: FLAMENGO, marcador: [0, 2], objetivo: 'local', competencia: 'Copa Libertadores', fase: 'Fase de grupos', anio: 2022, localNombre: 'Sporting Cristal', visitaNombre: 'Flamengo', nota: null },
  { clave: 'per-dificil-7', catalogo: 'peruano', dificultad: 'dificil', competenciaRef: SUDAMERICANA, temporada: 2025, localRef: ATLETICO_MINEIRO, visitaRef: CIENCIANO, marcador: [1, 1], objetivo: 'visita', competencia: 'Copa Sudamericana', fase: 'Fase de grupos', anio: 2025, localNombre: 'Atlético Mineiro', visitaNombre: 'Cienciano', nota: null },
];
