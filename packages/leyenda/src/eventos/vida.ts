/**
 * Dinero, profesión, caos y legado.
 *
 * El caos existe para que una carrera pueda torcerse por algo que nadie planeó, y sus rarezas están
 * calibradas para que lo mítico aparezca una vez cada muchas partidas: si lo insólito pasa siempre,
 * deja de ser insólito y pasa a ser el tono del juego.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_VIDA: Evento[] = [
  {
    id: 'profesional-representante',
    categoria: 'profesional',
    rareza: 'infrecuente',
    picante: 1,
    titulo: 'Cambiar de representante',
    texto:
      'Una agencia grande te ofrece manejar tu carrera. El que te acompaña desde los 14 se enteró por la prensa.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1, ovrMin: 72 },
    cooldown: 8,
    opciones: [
      {
        id: 'cambiar',
        texto: 'Firmar con la agencia grande',
        pista: 'Más puertas. Menos lealtad.',
        efectos: {
          vida: { dinero: 0.8, fama: 6 },
          relaciones: { representante: { confianza: -20, rencor: 15 } },
          personalidad: { ambicion: 5, lealtad: -5 },
          etiquetas: ['profesional:agencia'],
          balance: 3,
        },
        resultado: 'Firmaste con ellos. Al que te llevó de la mano desde niño no lo volviste a ver.',
      },
      {
        id: 'quedarse',
        texto: 'Quedarte con el de siempre',
        pista: 'Menos puertas. Alguien que te debe la vida.',
        efectos: {
          relaciones: { representante: { confianza: 20, respeto: 15 } },
          personalidad: { lealtad: 6 },
          etiquetas: ['profesional:leal'],
          balance: 4,
        },
        resultado: 'Le dijiste que no a la agencia por teléfono, delante de él. Nunca lo olvidó.',
      },
      {
        id: 'probar',
        texto: 'Darle seis meses de prueba',
        pista: 'Si funciona, sigues. Si no, se acabó.',
        efectos: {
          relaciones: { representante: { confianza: 8 } },
          personalidad: { profesionalismo: 5 },
          balance: 3,
        },
        resultado: 'Le pusiste seis meses y un objetivo claro. Los cumplió con tres semanas de sobra.',
      },
      {
        id: 'agencia-grande',
        texto: 'Firmar con la agencia más grande del continente',
        pista: 'Puertas abiertas en todos lados. Eres uno más de doscientos.',
        efectos: {
          vida: { fama: 8 },
          relaciones: { representante: { confianza: -10 } },
          personalidad: { ambicion: 6 },
          etiquetas: ['dinero:agencia-grande'],
          balance: 2,
        },
        resultado: 'Firmaste con los que manejan a media Europa. Tu carpeta era la número ciento ochenta.',
      },
    ],
  },
  {
    id: 'legado-numero-retirado',
    categoria: 'legado',
    rareza: 'legendario',
    picante: 3,
    titulo: 'Quieren retirar tu número',
    texto: 'El club te avisa que nadie más va a usar la {dorsal}. Van a poner tu nombre en una tribuna.',
    tipoDeRecuerdo: 'legado',
    condiciones: { edadMin: 34, temporadasMin: 6, famaMin: 60 },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar, con la familia presente',
        pista: 'La foto de tu vida, con los tuyos ahí.',
        efectos: {
          vida: { felicidad: 20, reputacion: 14, carinoDeLaHinchada: 16 },
          etiquetas: ['legado:numero-retirado'],
          titular: { texto: 'LA {DORSAL} NO SE USA MÁS: EL CLUB HOMENAJEA A {APELLIDO}', tono: 'elogio' },
          balance: 10,
        },
        resultado:
          'El estadio entero cantó tu nombre con tu mamá en el círculo central. No pudiste hablar por el micrófono.',
      },
      {
        id: 'pedir-que-siga',
        texto: 'Pedir que la use el próximo chico de la cantera',
        pista: 'El número sigue vivo. Con alguien más adentro.',
        efectos: {
          vida: { reputacion: 18, carinoDeLaHinchada: 12 },
          personalidad: { ego: -6 },
          etiquetas: ['legado:generoso'],
          titular: { texto: '{APELLIDO}: "QUE LA USE UN CHICO DE LA CASA"', tono: 'elogio' },
          balance: 10,
        },
        resultado:
          'Pediste que la camiseta siguiera viva en la cantera. El club puso tu nombre en la puerta del vestuario juvenil.',
      },
      {
        id: 'pedir-tribuna',
        texto: 'Pedir que en vez del dorsal le pongan tu nombre a la escuela del club',
        pista: 'Menos vitrina, más chicos entrando por la puerta.',
        efectos: {
          vida: { carinoDeLaHinchada: 22, felicidad: 16 },
          relaciones: { club: { respeto: 20 }, hinchada: { confianza: 18 } },
          personalidad: { lealtad: 8, ego: -4 },
          etiquetas: ['leyenda:hinchada'],
          balance: 8,
        },
        resultado:
          'Pediste que el dorsal siguiera en la cancha y que tu nombre fuera a las divisiones inferiores.',
      },
      {
        id: 'rechazar',
        texto: 'Rechazarlo: el club es más grande que tú',
        pista: 'Nadie va a entenderlo. Algunos sí.',
        efectos: {
          vida: { reputacion: 14 },
          relaciones: { hinchada: { respeto: 22 } },
          personalidad: { ego: -8, lealtad: 6 },
          titular: { texto: '"NINGÚN NÚMERO ES MÍO", DIJO {APELLIDO}', tono: 'elogio' },
          balance: 6,
        },
        resultado: 'Dijiste que ningún jugador está por encima de una camiseta. Se aplaudió de pie.',
      },
    ],
  },
  {
    id: 'legado-ultimo-baile',
    categoria: 'legado',
    rareza: 'raro',
    picante: 3,
    titulo: 'La última decisión',
    texto: 'El cuerpo ya no responde como antes. Tienes una temporada más adentro, tal vez dos.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMin: 34 },
    cooldown: 2,
    opciones: [
      {
        id: 'seguir',
        texto: 'Seguir mientras el cuerpo aguante',
        pista: 'Un año más. El cuerpo ya avisó una vez.',
        efectos: {
          vida: { condicion: -6, felicidad: 6 },
          personalidad: { ambicion: 3 },
          etiquetas: ['retiro:postergado'],
          balance: 1,
        },
        resultado: 'Firmaste un año más. Cada partido lo jugaste como si fuera el último, porque podía serlo.',
      },
      {
        id: 'anunciar',
        texto: 'Anunciar que esta es la última',
        pista: 'Cada cancha te va a despedir.',
        efectos: {
          vida: { felicidad: 12, exposicion: 14, carinoDeLaHinchada: 10 },
          etiquetas: ['retiro:anunciado'],
          titular: { texto: '{APELLIDO} ANUNCIÓ QUE SE RETIRA A FIN DE TEMPORADA', tono: 'elogio' },
          balance: 5,
        },
        resultado:
          'Lo anunciaste en una conferencia de doce minutos. En cada estadio te hicieron pasillo el resto del año.',
      },
      {
        id: 'ayudante',
        texto: 'Colgar los botines y quedarte de ayudante',
        pista: 'Se termina una carrera y empieza otra.',
        efectos: {
          vida: { felicidad: 12, estres: -10 },
          relaciones: { dt: { confianza: 16 }, club: { confianza: 14 } },
          personalidad: { profesionalismo: 8 },
          etiquetas: ['legado:cuerpo-tecnico'],
          balance: 5,
        },
        resultado: 'Dejaste de jugar en diciembre y en enero estabas con el buzo puesto en el mismo complejo.',
      },
      {
        id: 'volver-abajo',
        texto: 'Bajar de categoría para retirarte en tu primer club',
        pista: 'Se termina la vitrina. Empieza la despedida que quieres.',
        efectos: {
          vida: { dinero: -0.4, felicidad: 22, carinoDeLaHinchada: 20, fama: -8 },
          relaciones: { hinchada: { confianza: 24, respeto: 20 } },
          personalidad: { lealtad: 10, ego: -8 },
          etiquetas: ['legado:volvio-a-casa'],
          titular: { texto: '{APELLIDO} VUELVE A DONDE EMPEZÓ PARA COLGAR LOS BOTINES', tono: 'elogio' },
          balance: 7,
        },
        resultado:
          'Firmaste por un tercio de lo que cobrabas, en el club donde debutaste, que ahora juega en la segunda. Fueron nueve mil personas a un estadio para seis mil el día de tu último partido, y la mitad no te había visto jugar nunca en vivo.',
      },
    ],
  },
  {
    id: 'profesional-oferta-arabe',
    categoria: 'profesional',
    rareza: 'raro',
    picante: 3,
    titulo: 'Una cifra que no tiene sentido',
    texto:
      'Llega una oferta de un club sin historia y con dinero infinito. Te ofrecen en un año lo que ganarías en seis.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMin: 27, ovrMin: 78 },
    cooldown: 8,
    opciones: [
      {
        id: 'ir',
        texto: 'Ir por el dinero',
        pista: 'Nadie te va a ver jugar. Tu familia no vuelve a trabajar nunca.',
        efectos: {
          vida: { dinero: 14, fama: -6, reputacion: -8, felicidad: 4 },
          personalidad: { ambicion: 4 },
          etiquetas: ['profesional:mercenario'],
          titular: { texto: '{APELLIDO} SE VA POR UNA FORTUNA', tono: 'duda' },
          balance: -2,
        },
        resultado: 'Firmaste por dos años y cobraste en una temporada lo de cinco. Jugaste en estadios medio vacíos, dejaste de aparecer en los resúmenes y a los treinta y cuatro nadie de Europa se acordaba de tu nombre.',
      },
      {
        id: 'quedarse',
        texto: 'Quedarte a competir',
        pista: 'Menos dinero, más fútbol.',
        efectos: {
          vida: { reputacion: 10, carinoDeLaHinchada: 8 },
          personalidad: { ambicion: 4, lealtad: 4 },
          etiquetas: ['profesional:competidor'],
          balance: 6,
        },
        resultado: 'Dijiste que querías seguir jugando cosas importantes. La frase te ganó respeto en todas partes.',
      },
      {
        id: 'negociar-vuelta',
        texto: 'Aceptar con una cláusula de vuelta a tu país',
        pista: 'El dinero ahora y el final donde quieres.',
        efectos: {
          vida: { dinero: 5.5, fama: 6 },
          personalidad: { ambicion: 6, lealtad: 4 },
          etiquetas: ['dinero:contrato-oro', 'legado:vuelta-pactada'],
          balance: 5,
        },
        resultado: 'Firmaste dos años con una cláusula que te devolvía a casa. Se cumplió.',
      },
      {
        id: 'usarla',
        texto: 'Usarla para renegociar donde estás',
        pista: 'Puede salirte muy bien. O que te dejen ir.',
        efectos: { personalidad: { ambicion: 8 } },
        riesgo: {
          prob: 0.55,
          bien: { vida: { dinero: 1.4 }, relaciones: { club: { respeto: 8 } }, balance: 5 },
          mal: {
            relaciones: { club: { rencor: 16 }, hinchada: { rencor: 10 } },
            vida: { reputacion: -8 },
            titular: { texto: 'EN EL CLUB NO LE PERDONAN A {APELLIDO} HABER USADO LA OFERTA', tono: 'duda' },
            balance: -5,
          },
          relatoBien: 'Te mejoraron el contrato en cuarenta y ocho horas y te subieron la cláusula. El presidente lo contó como un triunfo suyo y quedaron los dos contentos.',
          relatoMal: 'Te dijeron que si querías irte, que te fueras. Y no mejoraron nada.',
        },
        resultado: 'Le llevaste la oferta al presidente.',
      },
    ],
  },
];
