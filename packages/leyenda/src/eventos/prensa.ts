/**
 * Prensa y vida social.
 *
 * Acá vive la promesa que el juego tiene que cumplir: **lo que dijiste queda**. El evento de la
 * declaración deja una etiqueta con el club nombrado, y años después el mercado y la prensa la
 * encuentran. Es un solo `etiquetas: ['promesa:nunca:{rivalSlug}']`, y de ahí sale la mejor historia
 * que este juego puede contar.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_PRENSA: Evento[] = [
  {
    id: 'prensa-jamas-jugaria',
    categoria: 'prensa',
    rareza: 'infrecuente',
    titulo: 'La pregunta incómoda',
    texto:
      'En zona mixta, un periodista te tira la pregunta de frente: "¿Jugarías alguna vez en {rival}?". Hay ocho grabadores esperando.',
    tipoDeRecuerdo: 'declaracion',
    condiciones: { edadMax: 24, temporadasMin: 1 },
    cooldown: 0,
    peso: 2.2,
    opciones: [
      {
        id: 'jamas',
        texto: '"Jamás. Nunca. Ni por todo el dinero del mundo."',
        pista: 'La hinchada te va a adorar. La frase va a existir para siempre.',
        efectos: {
          vida: { carinoDeLaHinchada: 16, exposicion: 12, fama: 6 },
          relaciones: { hinchada: { confianza: 14 } },
          etiquetas: ['promesa:nunca:{rivalSlug}', 'declaracion:fuerte'],
          titular: { texto: '"JAMÁS": {APELLIDO} CIERRA LA PUERTA A {RIVAL}', tono: 'polemica' },
          balance: 4,
        },
        resultado:
          'Lo dijiste mirando a la cámara. En diez minutos estaba en todos los portales y la popular te cantó el nombre el domingo.',
      },
      {
        id: 'nunca-se-sabe',
        texto: '"En el fútbol nunca se sabe."',
        pista: 'Honesto. La hinchada odia la honestidad en esta pregunta.',
        efectos: {
          vida: { carinoDeLaHinchada: -10, reputacion: 3 },
          relaciones: { hinchada: { rencor: 8 }, prensa: { respeto: 5 } },
          etiquetas: ['declaracion:tibia'],
          titular: { texto: '{APELLIDO} NO DESCARTA A {RIVAL}', tono: 'polemica' },
          balance: 0,
        },
        resultado: 'Contestaste la verdad y se te vino el mundo encima durante una semana.',
      },
      {
        id: 'esquivar',
        texto: 'Esquivarla con una sonrisa',
        efectos: {
          vida: { exposicion: -3 },
          relaciones: { prensa: { confianza: -3 } },
          balance: 2,
        },
        resultado: 'Sonreíste, dijiste que estabas concentrado en el próximo partido y seguiste caminando.',
      },
    ],
  },
  {
    id: 'prensa-cumple-promesa',
    categoria: 'prensa',
    rareza: 'raro',
    titulo: 'Te recuerdan la frase',
    texto:
      'Un programa de televisión abrió con tu declaración de hace años, con el año en pantalla y tu cara de niño. Debajo, tu camiseta nueva.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { conEtiquetas: ['promesa:rota'] },
    cooldown: 0,
    peso: 6,
    opciones: [
      {
        id: 'explicar',
        texto: 'Explicar que el fútbol cambia',
        pista: 'La verdad, dicha de frente.',
        efectos: {
          vida: { reputacion: 4, exposicion: 10, estres: 8 },
          relaciones: { prensa: { respeto: 6 }, hinchada: { rencor: 6 } },
          titular: { texto: '{APELLIDO}: "TENÍA 19 AÑOS Y HOY TENGO UNA FAMILIA"', tono: 'duda' },
          balance: 2,
        },
        resultado:
          'Dijiste que el chico que dijo eso no conocía nada de la vida. La mitad te entendió; la otra mitad no perdona.',
      },
      {
        id: 'pedir-perdon',
        texto: 'Pedir perdón a la hinchada que dejaste',
        efectos: {
          vida: { reputacion: 8, carinoDeLaHinchada: 6 },
          relaciones: { hinchada: { rencor: -8 } },
          personalidad: { ego: -4 },
          balance: 5,
        },
        resultado: 'Pediste perdón sin excusas. Fue lo único que podía bajar la temperatura, y la bajó.',
      },
      {
        id: 'desafiar',
        texto: 'Contestar con soberbia',
        pista: 'Se va a hablar de esto por años.',
        efectos: {
          vida: { exposicion: 18, reputacion: -10, fama: 8 },
          relaciones: { hinchada: { rencor: 16 }, prensa: { rencor: 8 } },
          personalidad: { ego: 6 },
          etiquetas: ['polemica:grande'],
          titular: { texto: '{APELLIDO} LE CONTESTÓ A TODOS Y NADIE LO PUEDE CREER', tono: 'polemica' },
          balance: -5,
        },
        resultado:
          'Dijiste que los que hablan no pagan tus cuentas. El clip se viralizó y todavía lo pasan cada vez que juegas.',
      },
    ],
  },
  {
    id: 'prensa-critica-dura',
    categoria: 'prensa',
    rareza: 'comun',
    titulo: 'Te bajaron en la tele',
    texto:
      'Un panelista dijo que eres "el jugador más sobrevalorado de {liga}" y el clip tiene cuatro millones de vistas.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { temporadasMin: 1, famaMin: 20 },
    cooldown: 4,
    opciones: [
      {
        id: 'ignorar',
        texto: 'No contestar',
        efectos: {
          vida: { estres: 5 },
          personalidad: { profesionalismo: 3 },
          balance: 3,
        },
        resultado: 'No dijiste una palabra. A la semana el panelista tuvo que hablar de otro.',
      },
      {
        id: 'contestar-en-la-cancha',
        texto: 'Contestar en la cancha',
        pista: 'Sube la presión propia, pero también la motivación.',
        efectos: {
          vida: { confianza: 8, estres: 8, forma: 4 },
          personalidad: { ambicion: 3 },
          balance: 4,
        },
        resultado: 'Guardaste el recorte. Cada partido lo jugaste como si él estuviera en la tribuna.',
      },
      {
        id: 'redes',
        texto: 'Responderle en redes',
        efectos: {
          vida: { exposicion: 14, reputacion: -6, fama: 6 },
          relaciones: { prensa: { rencor: 10 } },
          etiquetas: ['polemica:redes'],
          titular: { texto: 'CRUCE EN REDES: {APELLIDO} CONTRA LA PRENSA', tono: 'polemica' },
          balance: -3,
        },
        resultado: 'Le contestaste con una historia de tres líneas. Lo levantaron todos los programas.',
      },
    ],
  },
  {
    id: 'prensa-documental',
    categoria: 'prensa',
    rareza: 'raro',
    titulo: 'Quieren filmar tu vida',
    texto: 'Una plataforma te ofrece un documental de tres capítulos sobre tu carrera. Con cámaras en tu casa.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 55, temporadasMin: 3 },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Abrir la puerta',
        efectos: {
          vida: { dinero: 2.5, fama: 16, exposicion: 20, felicidad: 4 },
          relaciones: { pareja: { rencor: 5 } },
          etiquetas: ['fama:documental'],
          balance: 3,
        },
        resultado: 'Entraron con cámaras a tu casa tres meses. Tu familia todavía te lo recuerda.',
      },
      {
        id: 'rechazar',
        texto: 'Decir que no',
        efectos: {
          vida: { exposicion: -6, felicidad: 5 },
          personalidad: { vidaSocial: -3 },
          balance: 2,
        },
        resultado: 'Dijiste que tu casa no es un set. Perdiste una fortuna y ganaste tranquilidad.',
      },
    ],
  },
  {
    id: 'social-fiesta',
    categoria: 'social',
    rareza: 'comun',
    titulo: 'La fiesta',
    texto:
      'Un compañero cumple años y arma algo grande. Es jueves, y el domingo se juega contra el segundo de {liga}.',
    tipoDeRecuerdo: 'decision',
    cooldown: 4,
    opciones: [
      {
        id: 'ir-y-quedarse',
        texto: 'Ir y quedarte hasta el final',
        pista: 'El vestuario te va a querer. El técnico se va a enterar.',
        efectos: {
          vida: { felicidad: 10, condicion: -10, exposicion: 8 },
          relaciones: { companeros: { confianza: 10 }, dt: { rencor: 6 } },
          personalidad: { vidaSocial: 4 },
          etiquetas: ['social:noche'],
          balance: -1,
        },
        resultado: 'Te fuiste a las cinco de la mañana. Alguien filmó la salida y el video llegó al club.',
      },
      {
        id: 'ir-un-rato',
        texto: 'Pasar un rato y volver temprano',
        efectos: {
          vida: { felicidad: 5, condicion: -2 },
          relaciones: { companeros: { confianza: 5 } },
          balance: 3,
        },
        resultado: 'Te tomaste una gaseosa, saludaste a todos y a las once estabas en tu casa.',
      },
      {
        id: 'no-ir',
        texto: 'No ir',
        efectos: {
          vida: { condicion: 4 },
          relaciones: { companeros: { confianza: -5 } },
          personalidad: { vidaSocial: -3, profesionalismo: 3 },
          balance: 2,
        },
        resultado: 'Mandaste un mensaje disculpándote. Un par de compañeros te cargaron una semana.',
      },
    ],
  },
  {
    id: 'social-vida-tranquila',
    categoria: 'social',
    rareza: 'comun',
    titulo: 'El día libre',
    texto: 'Tienes cuarenta y ocho horas sin obligaciones por primera vez en cuatro meses.',
    tipoDeRecuerdo: 'decision',
    cooldown: 4,
    opciones: [
      {
        id: 'familia',
        texto: 'Ir a ver a tu familia',
        efectos: {
          vida: { felicidad: 12, estres: -10 },
          personalidad: { lealtad: 3 },
          etiquetas: ['vida:familia'],
          balance: 4,
        },
        resultado: 'Manejaste seis horas para comer con los tuyos. Volviste distinto.',
      },
      {
        id: 'invertir-tiempo',
        texto: 'Aprovechar para trabajar en tu juego',
        efectos: {
          atributos: { pase: 1, regate: 1 },
          vida: { estres: 4, felicidad: -3 },
          personalidad: { profesionalismo: 4 },
          balance: 3,
        },
        resultado: 'Alquilaste una cancha y estuviste dos días con un profe y treinta pelotas.',
      },
      {
        id: 'desaparecer',
        texto: 'Desaparecer del mundo',
        efectos: {
          vida: { estres: -14, felicidad: 8, exposicion: -5 },
          balance: 3,
        },
        resultado: 'Apagaste el teléfono dos días. Nadie supo dónde estabas y fue perfecto.',
      },
    ],
  },
  {
    id: 'social-romance',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    titulo: 'Alguien',
    texto:
      'Conociste a alguien en la presentación de una marca. Al día siguiente hay tres fotos suyas en los portales, y una tuya al lado.',
    tipoDeRecuerdo: 'romance',
    condiciones: { edadMin: 19, sinEtiquetas: ['vida:pareja'] },
    cooldown: 8,
    opciones: [
      {
        id: 'apostar',
        texto: 'Apostar en serio',
        efectos: {
          vida: { felicidad: 14, exposicion: 12, estres: -4 },
          relaciones: { pareja: { confianza: 20, respeto: 15 } },
          etiquetas: ['vida:pareja'],
          balance: 4,
        },
        resultado: 'Empezaron a salir en serio. Tu vida cambió de ritmo y tu juego lo notó.',
      },
      {
        id: 'discreto',
        texto: 'Llevarlo en privado',
        efectos: {
          vida: { felicidad: 8, exposicion: -4 },
          relaciones: { pareja: { confianza: 12 } },
          etiquetas: ['vida:pareja', 'vida:privada'],
          balance: 4,
        },
        resultado: 'Nadie se enteró de nada durante dos años, y eso los mantuvo sanos.',
      },
      {
        id: 'nada',
        texto: 'Dejarlo ahí',
        efectos: { vida: { felicidad: -3 }, balance: 0 },
        resultado: 'No pasó nada. A veces te preguntas qué hubiera pasado.',
      },
    ],
  },
  {
    id: 'relaciones-conflicto-companero',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    titulo: 'Pelea en el vestuario',
    texto:
      'Un referente del plantel te grita delante de todos por una jugada. El vestuario queda en silencio.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 1 },
    cooldown: 6,
    opciones: [
      {
        id: 'plantarse',
        texto: 'Plantarte y contestarle',
        efectos: {
          relaciones: { companeros: { respeto: 8, rencor: 10 } },
          vida: { confianza: 6, estres: 8 },
          personalidad: { temperamento: 5 },
          etiquetas: ['conflicto:vestuario'],
          balance: 0,
        },
        resultado: 'Le contestaste de igual a igual. Terminaron separados por dos compañeros.',
      },
      {
        id: 'aguantar',
        texto: 'Bajar la cabeza',
        efectos: {
          relaciones: { companeros: { confianza: 5 } },
          vida: { confianza: -6 },
          balance: 1,
        },
        resultado: 'Te callaste. Después, en la ducha, se te acercó a pedirte perdón.',
      },
      {
        id: 'hablar-despues',
        texto: 'Buscarlo a solas después',
        efectos: {
          relaciones: { companeros: { confianza: 10, respeto: 6 } },
          personalidad: { profesionalismo: 4 },
          balance: 5,
        },
        resultado: 'Lo esperaste en el estacionamiento y hablaron veinte minutos. Terminaron siendo amigos.',
      },
    ],
  },
];
