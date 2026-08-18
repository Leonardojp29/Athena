/**
 * El estado de una carrera. Es lo único que se guarda y lo único que el motor recibe y devuelve.
 *
 * Dos principios lo ordenan. **Habilidad y personalidad son sistemas separados**: un tipo tranquilo
 * puede ser un crack y un polémico puede ser mediocre, y ninguna combinación está premiada de
 * antemano. Y **nada se borra**: la carrera acumula recuerdos y temporadas, porque una decisión de
 * los 19 tiene que poder aparecer a los 28 —la prensa recordando una frase vieja es el corazón del
 * juego, y sin historia guardada no existe—.
 */

export type Puesto = 'POR' | 'DFC' | 'LAT' | 'MC' | 'MO' | 'EXT' | 'DC';
export type Pie = 'derecha' | 'izquierda';
export type Ritmo = 'expres' | 'normal' | 'intenso';

/** Los siete materiales de la carta. El orden es la progresión. */
export const NIVELES = [
  'cantera',
  'promesa',
  'profesional',
  'elite',
  'clase-mundial',
  'icono',
  'inmortal',
] as const;
export type Nivel = (typeof NIVELES)[number];

/** Atributos de campo. El arquero usa los mismos casilleros con otra lectura (ver `ovr.ts`). */
export interface Atributos {
  ritmo: number;
  tiro: number;
  pase: number;
  regate: number;
  defensa: number;
  fisico: number;
}

export interface Personalidad {
  ambicion: number;
  disciplina: number;
  ego: number;
  carisma: number;
  lealtad: number;
  temperamento: number;
  riesgo: number;
  profesionalismo: number;
  vidaSocial: number;
  sensibilidadMediatica: number;
}

/** Lo que no se juega en la cancha pero decide la carrera igual. */
export interface Vida {
  dinero: number;
  fama: number;
  reputacion: number;
  exposicion: number;
  confianza: number;
  estres: number;
  felicidad: number;
  carinoDeLaHinchada: number;
  forma: number;
  condicion: number;
}

export type Vinculo = 'dt' | 'companeros' | 'representante' | 'club' | 'hinchada' | 'prensa' | 'pareja';

export interface Relacion {
  confianza: number;
  respeto: number;
  rencor: number;
}

/** Un club del mundo real, tal como el juego lo necesita. */
export interface Club {
  slug: string;
  nombre: string;
  corto: string;
  escudo: string | null;
  primario: string | null;
  secundario: string | null;
  /** 0-100, derivada de sus posiciones reales en la tabla. */
  fuerza: number;
  ligaSlug: string;
  ligaNombre: string;
  pais: string;
  paisCodigo: string | null;
  continente: string;
}

export interface Liga {
  slug: string;
  nombre: string;
  pais: string;
  paisCodigo: string | null;
  bandera: string | null;
  continente: string;
  /** 0-100: el peso futbolístico de la liga, para saber qué es un ascenso de categoría. */
  peso: number;
  clubes: Club[];
}

export interface CopaContinental {
  slug: string;
  nombre: string;
  continente: string;
  /** Cuántos clubes de cada liga clasifican, de mejor a peor. */
  plazas: number;
  jerarquia: number;
}

export interface Mundo {
  ligas: Liga[];
  copas: CopaContinental[];
  generadoEn: string;
}

export type TipoRecuerdo =
  | 'debut'
  | 'decision'
  | 'declaracion'
  | 'promesa'
  | 'fichaje'
  | 'titulo'
  | 'premio'
  | 'lesion'
  | 'conflicto'
  | 'romance'
  | 'polemica'
  | 'caos'
  | 'gol'
  | 'legado';

/**
 * Un recuerdo. Las etiquetas son la memoria consultable: un evento puede exigir
 * `promesa:nunca:boca-juniors` y así, nueve años después, el juego sabe lo que dijiste.
 */
export interface Recuerdo {
  id: string;
  temporada: number;
  edad: number;
  tipo: TipoRecuerdo;
  texto: string;
  etiquetas: string[];
  /** Impacto medido de la decisión, para inferir después la mejor y la peor. */
  balance?: number;
  /** El evento que lo creó, para poder abrirlo desde la línea de tiempo. */
  eventoId?: string;
}

export interface Titular {
  temporada: number;
  texto: string;
  tono: 'elogio' | 'duda' | 'polemica' | 'neutro';
}

export type ClaseDeTrofeo = 'liga' | 'copa' | 'continental' | 'seleccion' | 'individual';

export interface Trofeo {
  id: string;
  nombre: string;
  clase: ClaseDeTrofeo;
  temporada: number;
  clubSlug: string | null;
  clubNombre: string | null;
  /** Contexto para la sala de trofeos: rival de la final, marcador, tu aporte. */
  detalle?: string;
  aporte?: { partidos: number; goles: number; asistencias: number };
}

/** El rendimiento de una temporada: lo que la carta y los gráficos leen. */
export interface Temporada {
  anio: number;
  edad: number;
  clubSlug: string;
  clubNombre: string;
  ligaSlug: string;
  ligaNombre: string;
  rol: Rol;
  partidos: number;
  goles: number;
  asistencias: number;
  notaMedia: number;
  minutos: number;
  amarillas: number;
  rojas: number;
  ovrInicio: number;
  ovrFin: number;
  nivel: Nivel;
  valor: number;
  posicionEnLaTabla: number | null;
  campeonDeLiga: boolean;
  trofeos: string[];
  seleccion: { convocatorias: number; goles: number };
  lesiones: number;
}

export type Rol = 'promesa' | 'suplente' | 'rotacion' | 'titular' | 'estrella' | 'capitan';

export interface Contrato {
  clubSlug: string;
  hasta: number;
  salario: number;
  rolPrometido: Rol;
}

export interface Oferta {
  id: string;
  club: Club;
  salario: number;
  rolPrometido: Rol;
  /** Lo que el club dice que quiere hacer contigo. */
  proyecto: string;
  temporadas: number;
  /** Etiquetas que la decisión va a dejar en la memoria: `rival`, `regreso`, `promesa-rota`. */
  matices: string[];
  riesgo: 'bajo' | 'medio' | 'alto';
}

export interface Futbolista {
  nombre: string;
  dorsal: number;
  puesto: Puesto;
  pie: Pie;
  /** Nacionalidad: define la selección. */
  pais: string;
  paisCodigo: string | null;
  bandera: string | null;
  edad: number;
  atributos: Atributos;
  /** Techo oculto: el jugador nunca lo ve como número. */
  potencial: number;
  personalidad: Personalidad;
}

export type Etapa =
  | 'creacion'
  | 'debut'
  | 'pretemporada'
  | 'tramo'
  | 'decision'
  | 'momento'
  | 'cierre'
  | 'mercado'
  | 'retiro'
  | 'legado';

export interface Carrera {
  version: 1;
  semilla: number;
  /** El estado del generador: guardar y retomar sin cortar el hilo del azar. */
  azar: number;
  ritmo: Ritmo;
  /** La liga que el jugador eligió al crear: de ahí salen los clubes que lo quieren al debutar. */
  ligaDeOrigen: string;
  etapa: Etapa;
  futbolista: Futbolista;
  vida: Vida;
  relaciones: Record<Vinculo, Relacion>;
  clubActual: Club | null;
  clubDeOrigen: Club | null;
  contrato: Contrato | null;
  rol: Rol;
  anio: number;
  /** En qué tramo de la temporada va, de 0 a `tramosPorTemporada`. */
  tramo: number;
  /** Acumulado de la temporada en curso, se cierra en `cierre`. */
  enCurso: Temporada | null;
  temporadas: Temporada[];
  trofeos: Trofeo[];
  recuerdos: Recuerdo[];
  titulares: Titular[];
  /** Última vez que se vio cada evento, para los cooldowns. */
  vistos: Record<string, number>;
  ofertas: Oferta[];
  /** Lo pendiente que la interfaz tiene que resolver antes de seguir. */
  pendiente: Pendiente | null;
  retiro: Retiro | null;
  clubes: string[];
  ovr: number;
  nivel: Nivel;
  valor: number;
}

export type Pendiente =
  | { clase: 'decision'; eventoId: string }
  | { clase: 'momento'; momento: ClaseDeMomento; contexto: ContextoDeMomento }
  | { clase: 'mercado' };

export type ClaseDeMomento = 'penal' | 'mano-a-mano' | 'tiro-libre' | 'atajada';

export interface ContextoDeMomento {
  /** Qué se juega: le da peso al momento y multiplica sus consecuencias. */
  escena: string;
  rival: string;
  minuto: number;
  marcador: [number, number];
  presion: number;
  /** Competencia donde ocurre, para el trofeo o el titular. */
  competencia: string;
}

export interface Retiro {
  anio: number;
  edad: number;
  clubSlug: string;
  clubNombre: string;
  /** Si se retiró donde debutó, el juego lo reconoce. */
  enCasa: boolean;
  motivo: 'edad' | 'lesion' | 'decision';
}

export const VINCULOS: Vinculo[] = [
  'dt',
  'companeros',
  'representante',
  'club',
  'hinchada',
  'prensa',
  'pareja',
];

export const ROLES: Rol[] = ['promesa', 'suplente', 'rotacion', 'titular', 'estrella', 'capitan'];

export const NOMBRE_DE_ROL: Record<Rol, string> = {
  promesa: 'Promesa',
  suplente: 'Suplente',
  rotacion: 'Rotación',
  titular: 'Titular',
  estrella: 'Estrella',
  capitan: 'Capitán',
};

export const NOMBRE_DE_PUESTO: Record<Puesto, string> = {
  POR: 'Arquero',
  DFC: 'Defensor central',
  LAT: 'Lateral',
  MC: 'Mediocampista',
  MO: 'Mediapunta',
  EXT: 'Extremo',
  DC: 'Delantero',
};

export const NOMBRE_DE_NIVEL: Record<Nivel, string> = {
  cantera: 'Cantera',
  promesa: 'Promesa',
  profesional: 'Profesional',
  elite: 'Élite',
  'clase-mundial': 'Clase mundial',
  icono: 'Ícono',
  inmortal: 'Inmortal',
};

/** Cuántos tramos tiene una temporada según el ritmo elegido. */
export const TRAMOS_POR_RITMO: Record<Ritmo, number> = { expres: 2, normal: 4, intenso: 6 };

/** Nunca más de cuatro clubes te quieren a la vez. Es una regla del juego, no un tope técnico. */
export const MAX_OFERTAS = 4;
