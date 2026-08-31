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
    id: 'dinero-primer-contrato',
    categoria: 'dinero',
    rareza: 'comun',
    titulo: 'El primer sueldo de verdad',
    texto: 'Firmaste tu primer contrato profesional. Es más dinero del que vio tu familia junta.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMax: 21, temporadasMin: 1, sinEtiquetas: ['dinero:primer-sueldo'] },
    cooldown: 0,
    peso: 2,
    opciones: [
      {
        id: 'casa-familia',
        texto: 'Comprarle la casa a tu familia',
        efectos: {
          vida: { dinero: -0.6, felicidad: 18 },
          personalidad: { lealtad: 5 },
          etiquetas: ['dinero:primer-sueldo', 'vida:familia'],
          balance: 6,
        },
        resultado: 'Los sacaste del barrio en el que crecieron. Tu viejo lloró y no te lo dijo nunca.',
      },
      {
        id: 'ahorrar',
        texto: 'Guardar todo',
        efectos: {
          vida: { dinero: 0.3, felicidad: -2 },
          personalidad: { profesionalismo: 3 },
          etiquetas: ['dinero:primer-sueldo', 'dinero:prudente'],
          balance: 4,
        },
        resultado: 'No gastaste un peso. Tu representante te dijo que era la mejor decisión de tu vida.',
      },
      {
        id: 'auto',
        texto: 'Comprarte el auto que soñabas',
        efectos: {
          vida: { dinero: -0.4, felicidad: 12, exposicion: 8 },
          relaciones: { companeros: { confianza: 4 } },
          etiquetas: ['dinero:primer-sueldo', 'dinero:ostentoso'],
          balance: 0,
        },
        resultado: 'Llegaste al entrenamiento con el auto y el plantel entero salió a mirarlo.',
      },
      {
        id: 'invertir',
        texto: 'Ponerlo todo en algo que crezca',
        pista: 'A los treinta y cinco lo vas a agradecer. O no.',
        efectos: {
          vida: { dinero: -0.5 },
          personalidad: { ambicion: 5 },
          etiquetas: ['dinero:primer-sueldo', 'dinero:negocio'],
        },
        riesgo: {
          prob: 0.6,
          bien: { vida: { dinero: 1.4 }, balance: 5 },
          mal: { vida: { dinero: -0.2, estres: 10 }, balance: -3 },
          relatoBien: 'A los cinco años valía el triple y ya no dependías del fútbol.',
          relatoMal: 'El fondo se hundió y aprendiste a leer contratos a los veinte años.',
        },
        resultado: 'Firmaste con un asesor que te recomendó el club.',
      },
    ],
  },
  {
    id: 'dinero-patrocinio',
    categoria: 'dinero',
    rareza: 'infrecuente',
    titulo: 'Una marca te busca',
    texto: 'Una marca de ropa deportiva te ofrece un contrato de imagen por tres años.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 35 },
    cooldown: 6,
    opciones: [
      {
        id: 'firmar',
        texto: 'Firmar',
        efectos: {
          vida: { dinero: 1.8, fama: 8, exposicion: 10 },
          etiquetas: ['dinero:patrocinio'],
          balance: 4,
        },
        resultado: 'Firmaste. Tu cara apareció en la vitrina de todos los centros comerciales del país.',
      },
      {
        id: 'negociar',
        texto: 'Pedir el doble',
        pista: 'Pueden aceptar. Pueden irse con otro.',
        efectos: {
          vida: { dinero: 3.4, reputacion: -3 },
          personalidad: { ambicion: 4 },
          etiquetas: ['dinero:patrocinio'],
          balance: 3,
        },
        resultado: 'Pediste el doble y lo pagaron sin discutir. Aprendiste algo ese día.',
      },
      {
        id: 'rechazar',
        texto: 'Concentrarte solo en jugar',
        efectos: {
          vida: { estres: -5, exposicion: -4 },
          personalidad: { profesionalismo: 4 },
          balance: 2,
        },
        resultado: 'Dijiste que no te querías distraer. Tu representante no te habló por tres días.',
      },
      {
        id: 'club-primero',
        texto: 'Consultarlo con el club antes de firmar',
        pista: 'Se pierde tiempo. Se gana tranquilidad.',
        efectos: {
          vida: { dinero: 0.4 },
          relaciones: { club: { confianza: 12, respeto: 8 } },
          personalidad: { profesionalismo: 6 },
          balance: 4,
        },
        resultado: 'Lo pasaste por el departamento comercial. Tardó un mes y salió sin un solo problema.',
      },
    ],
  },
  {
    id: 'profesional-representante',
    categoria: 'profesional',
    rareza: 'infrecuente',
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
        pista: 'Si funciona, seguís. Si no, chau.',
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
        pista: 'Puertas abiertas en todos lados. Sos uno más de doscientos.',
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
    id: 'profesional-nuevo-dt',
    categoria: 'profesional',
    rareza: 'comun',
    titulo: 'Llega un técnico nuevo',
    texto:
      'Echaron a {dt}. El que llega tiene fama de no creer en los jugadores que encontró en el plantel.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 4,
    peso: 1.5,
    opciones: [
      {
        id: 'ganarselo',
        texto: 'Ir a buscarlo y ponerte a disposición',
        efectos: {
          relaciones: { dt: { confianza: 10 } },
          vida: { estres: 4 },
          balance: 4,
        },
        resultado: 'Fuiste el primero en golpearle la puerta. Arrancó la temporada contigo de titular.',
      },
      {
        id: 'esperar',
        texto: 'Esperar que te vea entrenar',
        efectos: {
          relaciones: { dt: { confianza: -3 } },
          balance: 1,
        },
        resultado: 'No fuiste a buscarlo. Tardó cinco fechas en darte una oportunidad.',
      },
      {
        id: 'estudiarlo',
        texto: 'Estudiar todos sus equipos anteriores',
        pista: 'Llegás sabiendo qué te va a pedir.',
        efectos: {
          atributos: { pase: 2, defensa: 2 },
          relaciones: { dt: { respeto: 12 } },
          personalidad: { profesionalismo: 8 },
          etiquetas: ['futbol:estudioso'],
          balance: 6,
        },
        resultado: 'Viste catorce partidos suyos antes de la pretemporada. Lo notó en el primer entrenamiento.',
      },
      {
        id: 'pedir-salida',
        texto: 'Pedir salir antes de que empiece',
        pista: 'Nunca vas a saber si te iba a poner.',
        efectos: {
          relaciones: { dt: { rencor: 12 }, club: { confianza: -8 } },
          personalidad: { riesgo: 5 },
          etiquetas: ['futbol:quiere-jugar'],
          balance: -2,
        },
        resultado: 'Pediste salir en junio. El equipo terminó campeón sin vos.',
      },
    ],
  },
  {
    id: 'caos-vuelo',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'El avión que no salió',
    texto:
      'Una tormenta dejó al plantel doce horas en un aeropuerto. En el hall hay un piano y cincuenta hinchas del rival.',
    tipoDeRecuerdo: 'caos',
    cooldown: 10,
    opciones: [
      {
        id: 'piano',
        texto: 'Sentarte a tocar el piano',
        pista: 'Nadie sabía que sabías.',
        efectos: {
          vida: { fama: 10, exposicion: 12, felicidad: 8 },
          relaciones: { companeros: { confianza: 8 } },
          etiquetas: ['caos:piano'],
          titular: { texto: 'EL VIDEO DE {APELLIDO} TOCANDO EL PIANO EN EL AEROPUERTO', tono: 'elogio' },
          balance: 3,
        },
        resultado:
          'Toques dos canciones y alguien lo filmó. El video tiene más vistas que tus goles y todavía no lo puedes creer.',
      },
      {
        id: 'firmar-camisetas',
        texto: 'Firmarles camisetas a los hinchas del rival',
        efectos: {
          vida: { reputacion: 10, carinoDeLaHinchada: -4 },
          relaciones: { prensa: { respeto: 6 } },
          etiquetas: ['caos:gesto'],
          balance: 3,
        },
        resultado: 'Firmaste cincuenta camisetas del rival. En tu club no les gustó nada; el país lo aplaudió.',
      },
      {
        id: 'dormir',
        texto: 'Dormir en el suelo con la campera de almohada',
        efectos: { vida: { condicion: -4, felicidad: 2 }, balance: 1 },
        resultado: 'Dormiste doce horas en el piso del aeropuerto y llegaste al partido como pudiste.',
      },
      {
        id: 'ayudar',
        texto: 'Ayudar a la tripulación con los que peor la pasan',
        pista: 'Nadie te lo pidió.',
        efectos: {
          vida: { estres: 6, reputacion: 8 },
          relaciones: { companeros: { respeto: 18 } },
          personalidad: { carisma: 6, temperamento: -4 },
          etiquetas: ['social:lider'],
          balance: 5,
        },
        resultado: 'Te pasaste el vuelo sentado al lado del que más miedo tenía. No lo olvidó nunca.',
      },
    ],
  },
  {
    id: 'caos-invitacion-absurda',
    categoria: 'caos',
    rareza: 'epico',
    titulo: 'La invitación más rara de tu carrera',
    texto:
      'Un programa de televisión te invita a competir cocinando contra el arquero del rival. En vivo. Con delantal.',
    tipoDeRecuerdo: 'caos',
    condiciones: { famaMin: 45 },
    cooldown: 0,
    opciones: [
      {
        id: 'ir',
        texto: 'Ir y jugar el personaje',
        efectos: {
          vida: { fama: 14, exposicion: 16, felicidad: 8, reputacion: -4 },
          etiquetas: ['caos:tv'],
          titular: { texto: '{APELLIDO} EN LA TELE, CON DELANTAL Y TODO', tono: 'neutro' },
          balance: 1,
        },
        resultado: 'Fuiste, se te quemó todo y fue el momento más visto del programa en el año.',
      },
      {
        id: 'no-ir',
        texto: 'Decir que no, amablemente',
        efectos: { vida: { reputacion: 3, exposicion: -3 }, balance: 2 },
        resultado: 'Mandaste una nota de agradecimiento y no fuiste. Insistieron cuatro años.',
      },
      {
        id: 'cobrarlo',
        texto: 'Ir solo si pagan lo que pedís',
        pista: 'Si es un circo, que al menos pague.',
        efectos: {
          vida: { dinero: 0.6, fama: 8, exposicion: 10 },
          personalidad: { ambicion: 6 },
          balance: 2,
        },
        resultado: 'Pediste una cifra absurda pensando que dirían que no. Dijeron que sí.',
      },
      {
        id: 'mandar-a-otro',
        texto: 'Mandar a un compañero en tu lugar',
        pista: 'A él le viene bien y a vos no te cuesta nada.',
        efectos: {
          relaciones: { companeros: { confianza: 14 } },
          vida: { exposicion: -4 },
          personalidad: { carisma: 4 },
          balance: 3,
        },
        resultado: 'Fue el tercer arquero y la rompió. Todavía te lo agradece.',
      },
    ],
  },
  {
    id: 'caos-mitico',
    categoria: 'caos',
    rareza: 'mitico',
    titulo: 'Algo que nadie va a creer',
    texto:
      'Un hincha corrió a la cancha, te abrazó llorando y te dijo que su papá pidió ser enterrado con tu camiseta. Después se fue como si nada.',
    tipoDeRecuerdo: 'caos',
    condiciones: { temporadasMin: 2, famaMin: 40 },
    cooldown: 0,
    opciones: [
      {
        id: 'buscarlo',
        texto: 'Buscarlo después del partido',
        efectos: {
          vida: { felicidad: 20, carinoDeLaHinchada: 14, reputacion: 8 },
          relaciones: { hinchada: { confianza: 20 } },
          etiquetas: ['caos:mitico', 'leyenda:hinchada'],
          balance: 8,
        },
        resultado:
          'Pediste que lo buscaran y estuviste una hora con él en el vestuario. Nunca contaste de qué hablaron.',
      },
      {
        id: 'guardarlo',
        texto: 'Guardártelo para siempre',
        efectos: {
          vida: { felicidad: 12 },
          etiquetas: ['caos:mitico'],
          balance: 4,
        },
        resultado: 'No se lo contaste a nadie. Cada vez que entras a una cancha te acuerdas de ese abrazo.',
      },
      {
        id: 'contarlo',
        texto: 'Contarlo en una entrevista',
        pista: 'Nadie te va a creer. Todos lo van a repetir.',
        efectos: {
          vida: { fama: 14, exposicion: 16 },
          relaciones: { prensa: { confianza: 10 } },
          personalidad: { carisma: 6 },
          etiquetas: ['prensa:leyenda-urbana'],
          balance: 3,
        },
        resultado: 'Lo contaste en televisión y se convirtió en una historia que la gente jura que vio.',
      },
      {
        id: 'negarlo',
        texto: 'Negar que haya pasado',
        pista: 'Se apaga. O crece el doble.',
        efectos: {
          vida: { exposicion: 8 },
          personalidad: { sensibilidadMediatica: 5 },
          balance: 1,
        },
        resultado: 'Dijiste que era mentira. Al mes había tres versiones distintas dando vueltas.',
      },
    ],
  },
  {
    id: 'legado-numero-retirado',
    categoria: 'legado',
    rareza: 'legendario',
    titulo: 'Quieren retirar tu número',
    texto: 'El club te avisa que nadie más va a usar la {dorsal}. Van a poner tu nombre en una tribuna.',
    tipoDeRecuerdo: 'legado',
    condiciones: { edadMin: 32, temporadasMin: 6, famaMin: 60 },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar, con la familia presente',
        efectos: {
          vida: { felicidad: 20, reputacion: 14, carinoDeLaHinchada: 16 },
          etiquetas: ['legado:numero-retirado'],
          titular: { texto: 'LA {DORSAL} NO SE USA MÁS: EL CLUB HOMENAJEA A {APELLIDO}', tono: 'elogio' },
          balance: 10,
        },
        resultado:
          'El estadio entero cantó tu nombre con tu vieja en el círculo central. No pudiste hablar por el micrófono.',
      },
      {
        id: 'pedir-que-siga',
        texto: 'Pedir que la use el próximo chico de la cantera',
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
        pista: 'Menos foto, más huella.',
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
        texto: 'Rechazarlo: el club es más grande que vos',
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
    titulo: 'La última decisión',
    texto: 'El cuerpo ya no responde como antes. Tienes una temporada más adentro, tal vez dos.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMin: 34 },
    cooldown: 2,
    opciones: [
      {
        id: 'seguir',
        texto: 'Seguir mientras el cuerpo aguante',
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
        resultado: 'Dejaste de jugar en diciembre y en enero estabas con el buzo puesto en el mismo predio.',
      },
      {
        id: 'una-mas',
        texto: 'Estirarlo una temporada más',
        pista: 'El cuerpo ya avisó una vez.',
        efectos: {
          vida: { condicion: -14, felicidad: 8 },
          personalidad: { ambicion: 6 },
          etiquetas: ['legado:una-mas'],
        },
        riesgo: {
          prob: 0.55,
          bien: { vida: { carinoDeLaHinchada: 14, fama: 6 }, balance: 3 },
          mal: { vida: { condicion: -18, forma: -16, felicidad: -12 }, etiquetas: ['lesion:apurada'], balance: -6 },
          relatoBien: 'Jugaste un año más y te fuiste levantando algo. No todos pueden decir eso.',
          relatoMal: 'El cuerpo aguantó cuatro meses. El resto lo viste desde la tribuna.',
        },
        resultado: 'Firmaste una temporada más.',
      },
    ],
  },
  {
    id: 'profesional-oferta-arabe',
    categoria: 'profesional',
    rareza: 'raro',
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
        resultado: 'Firmaste. Te llovió el dinero y desapareciste de las conversaciones futbolísticas.',
      },
      {
        id: 'quedarse',
        texto: 'Quedarte a competir',
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
        pista: 'El dinero ahora y el final donde querés.',
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
          relatoBien: 'Te mejoraron el contrato en cuarenta y ocho horas.',
          relatoMal: 'Te dijeron que si querías irte, que te fueras. Y no mejoraron nada.',
        },
        resultado: 'Le llevaste la oferta al presidente.',
      },
    ],
  },
];
