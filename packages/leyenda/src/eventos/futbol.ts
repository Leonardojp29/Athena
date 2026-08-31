/**
 * Eventos de fútbol: lo que pasa en la cancha y en el vestuario alrededor de ella.
 *
 * Cada opción cambia algo medible. Ninguna es "la correcta": entrenar de más sube el físico y baja la
 * frescura, pedirle la titularidad al técnico puede ganarte el puesto o el banco. Si una opción fuera
 * siempre mejor, dejaría de ser una decisión.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_FUTBOL: Evento[] = [
  {
    id: 'futbol-primer-entrenamiento',
    categoria: 'futbol',
    rareza: 'comun',
    titulo: 'La primera práctica con los grandes',
    texto:
      'Te suben a entrenar con el plantel profesional de {club}. En el primer rondo te toca al lado de los referentes y todos miran cómo te movés.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMax: 20, temporadasMin: 0 },
    cooldown: 0,
    peso: 2.5,
    opciones: [
      {
        id: 'mostrarse',
        texto: 'Pedir la pelota y jugar como sabés',
        pista: 'Alto riesgo, alta recompensa: si sale bien, el técnico te ve.',
        efectos: {
          vida: { confianza: 8, estres: 4 },
          relaciones: { dt: { confianza: 6 }, companeros: { respeto: 4 } },
          etiquetas: ['personalidad:atrevido'],
          balance: 6,
        },
        resultado:
          'Pediste la pelota siempre. Perdiste tres, ganaste diez, y el técnico se quedó mirándote más de lo normal.',
      },
      {
        id: 'perfil-bajo',
        texto: 'Pasarla simple y escuchar',
        pista: 'Nadie se quema el primer día. Tampoco nadie te descubre.',
        efectos: {
          vida: { estres: -4 },
          relaciones: { companeros: { confianza: 5 } },
          personalidad: { disciplina: 2 },
          etiquetas: ['personalidad:prudente'],
          balance: 2,
        },
        resultado: 'Tocaste corto, sin sobresaltos. Los veteranos te bancaron y el técnico apenas te registró.',
      },
    ],
  },
  {
    id: 'futbol-doble-turno',
    categoria: 'futbol',
    rareza: 'comun',
    titulo: 'Doble turno',
    texto: 'El preparador físico te ofrece quedarte a un segundo turno tres veces por semana.',
    tipoDeRecuerdo: 'decision',
    cooldown: 6,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Quedarte a entrenar',
        pista: 'El físico sube. El cuerpo lo paga.',
        efectos: {
          atributos: { fisico: 3, ritmo: 1 },
          vida: { condicion: -6, felicidad: -3 },
          personalidad: { profesionalismo: 3 },
          balance: 4,
        },
        resultado: 'Te quedaste. En dos meses te notaron el cambio en los duelos.',
      },
      {
        id: 'descansar',
        texto: 'Priorizar el descanso',
        pista: 'Llegás fresco al fin de semana.',
        efectos: { vida: { condicion: 7, felicidad: 3 }, balance: 1 },
        resultado: 'Elegiste llegar entero al domingo. El cuerpo te lo agradeció.',
      },
      {
        id: 'tecnica',
        texto: 'Cambiarlo por trabajo de pelota',
        pista: 'Menos músculo, más pie.',
        efectos: {
          atributos: { regate: 2, tiro: 2 },
          vida: { condicion: -2 },
          balance: 3,
        },
        resultado: 'Te quedaste, pero pateando. Mil tiros al arco vacío antes de irte.',
      },
    ],
  },
  {
    id: 'futbol-pedir-titularidad',
    categoria: 'futbol',
    rareza: 'infrecuente',
    titulo: 'Hablar con el técnico',
    texto:
      '{dt} te dejó afuera del once tres partidos seguidos. Tenés la puerta de su oficina a diez metros.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { roles: ['suplente', 'rotacion', 'promesa'], temporadasMin: 1 },
    cooldown: 4,
    peso: 1.6,
    opciones: [
      {
        id: 'encarar',
        texto: 'Entrar y pedir explicaciones',
        pista: 'Puede respetarte más. O puede cerrarte la puerta.',
        efectos: {
          relaciones: { dt: { respeto: 8, rencor: 10 } },
          vida: { confianza: 5, estres: 8 },
          etiquetas: ['conflicto:dt'],
          balance: 0,
        },
        resultado:
          'Le dijiste todo lo que pensabas. Te escuchó con los brazos cruzados y te contestó dos palabras: "entrená mejor".',
      },
      {
        id: 'trabajar',
        texto: 'Callarte y romperla en los entrenamientos',
        pista: 'El camino largo.',
        efectos: {
          relaciones: { dt: { confianza: 7 }, companeros: { respeto: 3 } },
          atributos: { fisico: 1 },
          personalidad: { profesionalismo: 4 },
          balance: 5,
        },
        resultado: 'No dijiste nada. Fuiste el primero en llegar durante un mes y el técnico lo notó.',
      },
      {
        id: 'representante',
        texto: 'Que lo maneje tu representante',
        pista: 'Te sacás el problema de encima. La prensa se enterará.',
        efectos: {
          relaciones: { representante: { confianza: 6 }, dt: { rencor: 6 }, prensa: { confianza: 4 } },
          vida: { exposicion: 8 },
          titular: { texto: 'EL ENTORNO DE {APELLIDO} PRESIONA POR MINUTOS', tono: 'duda' },
          balance: -2,
        },
        resultado: 'Tu representante habló con el club. Al día siguiente estaba en todos los portales.',
      },
    ],
  },
  {
    id: 'futbol-clasico',
    categoria: 'futbol',
    rareza: 'comun',
    titulo: 'Semana de clásico',
    texto: 'Se viene {rival}. La ciudad no habla de otra cosa y a vos te preguntan en cada semáforo.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 4,
    peso: 1.8,
    opciones: [
      {
        id: 'prometer',
        texto: 'Prometer que lo van a ganar',
        pista: 'La hinchada te va a amar. Si pierden, te lo van a recordar.',
        efectos: {
          vida: { carinoDeLaHinchada: 10, exposicion: 10, estres: 8 },
          relaciones: { hinchada: { confianza: 10 } },
          etiquetas: ['declaracion:clasico'],
          titular: { texto: '"VAMOS A GANAR": LA PROMESA DE {APELLIDO}', tono: 'polemica' },
          balance: 2,
        },
        resultado: 'Dijiste que iban a ganar. La frase quedó en la portada de todos los diarios.',
      },
      {
        id: 'respeto',
        texto: 'Hablar con respeto del rival',
        pista: 'Nadie se enoja. Nadie se entusiasma.',
        efectos: {
          vida: { reputacion: 4 },
          relaciones: { prensa: { respeto: 3 } },
          balance: 2,
        },
        resultado: 'Elegiste el elogio medido. Los periodistas buscaron su título en otro lado.',
      },
      {
        id: 'silencio',
        texto: 'No hablar hasta después del partido',
        pista: 'Concentrado. Aburrido.',
        efectos: { vida: { estres: -5, exposicion: -4 }, personalidad: { profesionalismo: 2 }, balance: 3 },
        resultado: 'No hablaste. En el club te lo agradecieron; en la tele lo criticaron.',
      },
    ],
  },
  {
    id: 'futbol-capitania',
    categoria: 'futbol',
    rareza: 'raro',
    titulo: 'La cinta',
    texto: 'El capitán se va del club. {dt} te llama a su oficina con la cinta sobre el escritorio.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMin: 24, roles: ['titular', 'estrella'], temporadasMin: 2 },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar la capitanía',
        pista: 'Más peso, más responsabilidad, más historia.',
        efectos: {
          relaciones: { dt: { confianza: 10 }, companeros: { respeto: 10 }, hinchada: { confianza: 12 } },
          vida: { reputacion: 10, estres: 10, exposicion: 6 },
          personalidad: { ambicion: 3 },
          etiquetas: ['rol:capitan'],
          titular: { texto: '{APELLIDO}, NUEVO CAPITÁN', tono: 'elogio' },
          balance: 8,
        },
        resultado: 'Te pusiste la cinta. Desde ese día, cada micrófono del país te busca a vos.',
      },
      {
        id: 'rechazar',
        texto: 'Pedir que la lleve un veterano',
        pista: 'Menos ruido. El vestuario lo va a notar.',
        efectos: {
          relaciones: { companeros: { confianza: 8 }, dt: { respeto: -4 } },
          vida: { estres: -6 },
          etiquetas: ['personalidad:prudente'],
          balance: 1,
        },
        resultado: 'Dijiste que todavía no era tu momento. Un compañero mayor te abrazó por eso.',
      },
    ],
  },
  {
    id: 'futbol-penal-decisivo',
    categoria: 'futbol',
    rareza: 'infrecuente',
    titulo: 'Un penal para ganarlo',
    texto:
      'Minuto 89 contra {rival}. Penal a favor y el pateador habitual está en el banco. La pelota te queda a los pies.',
    tipoDeRecuerdo: 'gol',
    condiciones: { temporadasMin: 1 },
    cooldown: 2,
    peso: 1.4,
    opciones: [
      {
        id: 'patear',
        texto: 'Agarrar la pelota',
        pista: 'Vas a patear vos. Se juega en el próximo momento.',
        efectos: { vida: { estres: 6 }, etiquetas: ['acepta:presion'], balance: 4, luego: 'MOMENTO:penal' },
        resultado: 'Levantaste la pelota del suelo y caminaste hasta el punto.',
      },
      {
        id: 'ceder',
        texto: 'Dársela a otro',
        pista: 'Nadie te va a culpar. Nadie te va a recordar.',
        efectos: {
          vida: { confianza: -5, carinoDeLaHinchada: -4 },
          relaciones: { companeros: { confianza: 3 } },
          balance: -1,
        },
        resultado: 'Se la diste a un compañero y te fuiste al borde del área a mirar.',
      },
    ],
  },
  {
    id: 'futbol-lesion-grave',
    categoria: 'futbol',
    rareza: 'raro',
    titulo: 'La rodilla',
    texto:
      'Sentiste el crujido antes del dolor. El parte médico dice seis meses y la palabra "ligamento" aparece tres veces.',
    tipoDeRecuerdo: 'lesion',
    condiciones: { temporadasMin: 1 },
    cooldown: 12,
    opciones: [
      {
        id: 'apurar',
        texto: 'Apurar la vuelta',
        pista: 'Volvés antes. El cuerpo puede no perdonarlo.',
        efectos: {
          vida: { condicion: -14, forma: -10, estres: 10 },
          atributos: { ritmo: -3 },
          etiquetas: ['lesion:apurada'],
          balance: -6,
        },
        resultado: 'Volviste dos meses antes de lo que decían los médicos. La rodilla te lo recordó todo el año.',
      },
      {
        id: 'respetar',
        texto: 'Respetar los tiempos',
        pista: 'Perdés la temporada. Salvás la carrera.',
        efectos: {
          vida: { condicion: 8, felicidad: -8, forma: -14 },
          personalidad: { profesionalismo: 5 },
          etiquetas: ['lesion:cuidada'],
          balance: 5,
        },
        resultado:
          'Hiciste cada día de la recuperación como decía el protocolo. Volviste tarde, pero volviste entero.',
      },
    ],
  },
  {
    id: 'futbol-seleccion-primera',
    categoria: 'futbol',
    rareza: 'infrecuente',
    titulo: 'Te llaman de la selección',
    texto: 'Suena el teléfono con un número que no conocés. Es el cuerpo técnico de {pais}.',
    tipoDeRecuerdo: 'premio',
    condiciones: { ovrMin: 70, temporadasMin: 1, sinEtiquetas: ['seleccion:debut'] },
    cooldown: 0,
    peso: 2,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Ir sin dudarlo',
        efectos: {
          vida: { fama: 12, reputacion: 8, felicidad: 12, exposicion: 10 },
          etiquetas: ['seleccion:debut'],
          titular: { texto: '{APELLIDO}, CONVOCADO POR PRIMERA VEZ', tono: 'elogio' },
          balance: 9,
        },
        resultado: 'Colgaste el teléfono y te quedaste mirando la pared diez minutos.',
      },
    ],
  },
  {
    id: 'futbol-descenso',
    categoria: 'futbol',
    rareza: 'raro',
    titulo: 'Pelear el descenso',
    texto:
      '{club} está a tres puntos de la zona roja y faltan cinco fechas. En el vestuario ya nadie habla de la copa.',
    tipoDeRecuerdo: 'decision',
    condiciones: { clubFuerzaMax: 62, temporadasMin: 1 },
    cooldown: 6,
    opciones: [
      {
        id: 'liderar',
        texto: 'Hacerte cargo del equipo',
        pista: 'Si se salvan, sos ídolo. Si se van, sos parte.',
        efectos: {
          vida: { estres: 14, carinoDeLaHinchada: 12, reputacion: 6 },
          relaciones: { companeros: { respeto: 8 }, hinchada: { confianza: 10 } },
          etiquetas: ['lider:crisis'],
          balance: 6,
        },
        resultado: 'Hablaste en el vestuario y te pusiste el equipo al hombro los últimos cinco partidos.',
      },
      {
        id: 'salvarse',
        texto: 'Cuidar tu carrera y mirar el mercado',
        pista: 'La hinchada tiene memoria.',
        efectos: {
          vida: { carinoDeLaHinchada: -14, estres: -6 },
          relaciones: { hinchada: { rencor: 12 } },
          etiquetas: ['polemica:desapego'],
          titular: { texto: '¿SE VA {APELLIDO} EN EL PEOR MOMENTO?', tono: 'polemica' },
          balance: -4,
        },
        resultado: 'Empezaste a atender llamados de representantes mientras el equipo se hundía.',
      },
    ],
  },
  {
    id: 'futbol-golazo',
    categoria: 'futbol',
    rareza: 'raro',
    titulo: 'El gol del año',
    texto:
      'La agarraste de treinta metros y entró en el ángulo. El estadio hizo un ruido que no habías escuchado nunca.',
    tipoDeRecuerdo: 'gol',
    condiciones: { temporadasMin: 1 },
    cooldown: 4,
    opciones: [
      {
        id: 'dedicar',
        texto: 'Dedicárselo a la hinchada',
        efectos: {
          vida: { carinoDeLaHinchada: 12, fama: 8 },
          relaciones: { hinchada: { confianza: 10 } },
          titular: { texto: 'EL GOLAZO DE {APELLIDO} QUE DIO LA VUELTA AL MUNDO', tono: 'elogio' },
          balance: 5,
        },
        resultado: 'Corriste hasta la popular y te la dedicaste a ellos. El video superó los diez millones.',
      },
      {
        id: 'festejo-frio',
        texto: 'Festejarlo serio, señalando al que asistió',
        efectos: {
          relaciones: { companeros: { confianza: 8 } },
          vida: { reputacion: 5 },
          balance: 4,
        },
        resultado: 'Ni una mueca: levantaste el brazo señalando a quien te la dio y volviste al medio.',
      },
    ],
  },
  {
    id: 'futbol-final',
    categoria: 'futbol',
    rareza: 'epico',
    titulo: 'La final',
    texto: 'Llegaron a la final. Noventa minutos entre una vida de trabajo y una vitrina vacía.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1, clubFuerzaMin: 62 },
    cooldown: 4,
    opciones: [
      {
        id: 'concentrado',
        texto: 'Encerrarte a preparar el partido',
        efectos: {
          vida: { estres: 8, forma: 6 },
          personalidad: { profesionalismo: 3 },
          balance: 5,
        },
        resultado: 'Apagaste el teléfono cuatro días. Llegaste al partido como si fuera un entrenamiento más.',
      },
      {
        id: 'disfrutar',
        texto: 'Disfrutar la semana con tu gente',
        efectos: {
          vida: { felicidad: 10, estres: -6, forma: -3 },
          relaciones: { pareja: { confianza: 6 } },
          balance: 3,
        },
        resultado: 'Pasaste la semana con los tuyos. Salías a la cancha con una calma rara.',
      },
    ],
  },
];
