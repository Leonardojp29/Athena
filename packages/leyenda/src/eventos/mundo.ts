/**
 * Lo que te pasa según dónde juegas.
 *
 * El catálogo tenía veinticuatro eventos con color peruano y ninguna condición de país, así que el
 * juego te preguntaba por el mundialito del barrio mientras jugabas en Alemania. Con el `ambito`
 * puesto, esos se quedan en su lugar —y afuera quedaba un hueco: media carrera sin textura—.
 *
 * Acá está el equivalente de cada región, escrito con lo que de verdad pasa ahí: el tabloide inglés
 * que le compra la exclusiva a cualquiera, la carpa de cerveza alemana en la que no deberías estar,
 * el carnaval en mitad del Brasileirão, la torcida organizada entrando al CT, la parrilla del plantel
 * rioplatense y el programa de la tarde que te arma un juicio sin jurado.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DEL_MUNDO: Evento[] = [
  {
    id: 'mundo-tabloide',
    categoria: 'prensa',
    rareza: 'comun',
    picante: 2,
    titulo: 'El tabloide compró la exclusiva',
    texto:
      'Un tabloide inglés le pagó a alguien que estuvo en la mesa contigo el sábado a las cinco de la mañana. Mañana sale con foto, y en este país eso no dura un día: dura toda la temporada y te lo cantan las tribunas visitantes.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { ambito: ['europeo'], famaMin: 30, temporadasMin: 1 },
    cooldown: 5,
    peso: 1.6,
    opciones: [
      {
        id: 'comunicado',
        texto: 'Sacar un comunicado seco por el club',
        pista: 'Lo institucional. Y acá eso es sangre en el agua.',
        efectos: {
          vida: { exposicion: 18, reputacion: -4 },
          relaciones: { club: { confianza: 10 }, prensa: { rencor: 10 } },
          personalidad: { profesionalismo: 6 },
          balance: -1,
        },
        resultado:
          'El club sacó cuatro líneas hablando de "asuntos privados" y el tabloide dedicó la contratapa a analizar las cuatro líneas. Durante seis meses, cada estadio al que fuiste te cantó una versión de eso.',
      },
      {
        id: 'reirse',
        texto: 'Contestarles con humor en tus redes',
        pista: 'En este país el humor sirve. Cuando sale bien.',
        efectos: { vida: { exposicion: 22, fama: 10 }, personalidad: { carisma: 7 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { carinoDeLaHinchada: 18, reputacion: 8 },
            relaciones: { hinchada: { confianza: 16 } },
            titular: { texto: 'LA RESPUESTA DE {APELLIDO} FUE MEJOR QUE LA PORTADA', tono: 'elogio' },
            balance: 5,
          },
          mal: {
            vida: { reputacion: -14, exposicion: 26 },
            relaciones: { club: { rencor: 16 } },
            titular: { texto: 'AL VESTUARIO DE {CLUB} NO LE CAUSÓ GRACIA EL CHISTE DE {APELLIDO}', tono: 'polemica' },
            balance: -6,
          },
          relatoBien:
            'Publicaste una foto tuya con un té a las cinco de la mañana y el pie decía "misma hora, otro país". Tres millones de vistas y el tabloide quedó como el que no entendió el chiste.',
          relatoMal:
            'El chiste que hiciste tocaba al club sin que te dieras cuenta. El técnico lo leyó en voz alta en la charla del viernes y no se rió nadie. Jugaste el domingo desde el banco.',
        },
        resultado: 'Publicaste una respuesta a las diez de la mañana, antes de que saliera la portada.',
      },
      {
        id: 'abogados',
        texto: 'Mandar a los abogados del club',
        pista: 'Acá hay tribunales para esto. Y también hay memoria.',
        efectos: {
          vida: { dinero: -0.2, exposicion: 24, reputacion: 6 },
          relaciones: { prensa: { rencor: 26 } },
          etiquetas: ['prensa:enemigo'],
          balance: -2,
        },
        resultado:
          'Los abogados consiguieron una rectificación de dos párrafos en la página veintiocho, once semanas después. Para entonces el titular original ya era una canción, y ese diario no volvió a escribir una línea neutral sobre ti.',
      },
      {
        id: 'ignorar',
        texto: 'No decir nada, en ningún idioma',
        pista: 'Acá el silencio también se interpreta.',
        efectos: { vida: { exposicion: 14, estres: 12 }, personalidad: { profesionalismo: 4 } },
        riesgo: {
          prob: 0.5,
          bien: { vida: { reputacion: 6 }, balance: 2 },
          mal: {
            vida: { reputacion: -10, carinoDeLaHinchada: -10 },
            relaciones: { prensa: { rencor: 14 } },
            balance: -4,
          },
          relatoBien:
            'No dijiste nada y a las dos semanas encontraron a alguien más interesante. El vestuario inglés lo entiende: acá el que contesta pierde.',
          relatoMal:
            'El silencio lo llenaron ellos con tres notas más, cada una con una fuente distinta. Cuando quisiste hablar, un mes después, ya no había versión que valiera.',
        },
        resultado: 'No dijiste una palabra en ningún idioma.',
      },
    ],
  },
  {
    id: 'mundo-carpa-cerveza',
    categoria: 'social',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'La carpa de cerveza',
    texto:
      'Es la fiesta más grande del año en la ciudad y medio club está ahí, con el patrocinador invitando. Es jueves y el sábado se juega. En la carpa hay tres mil personas y todas tienen teléfono.',
    tipoDeRecuerdo: 'decision',
    condiciones: { ambito: ['europeo'], temporadasMin: 1 },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'ir-con-el-club',
        texto: 'Ir con la delegación oficial y una hora',
        pista: 'Cumples con el patrocinador y con el sábado.',
        efectos: {
          vida: { exposicion: 10, felicidad: 6, carinoDeLaHinchada: 8 },
          relaciones: { club: { confianza: 12 } },
          personalidad: { profesionalismo: 6 },
          balance: 3,
        },
        resultado:
          'Fuiste una hora con el traje regional que te dio el club, te sacaste ochenta fotos con socios y te fuiste antes de la segunda ronda. El patrocinador renovó y el técnico lo supo.',
      },
      {
        id: 'quedarse',
        texto: 'Quedarte cuando se va la delegación',
        pista: 'Ahí empieza la fiesta de verdad. Y las fotos también.',
        efectos: { vida: { felicidad: 14, condicion: -10, exposicion: 18 }, personalidad: { vidaSocial: 7 } },
        riesgo: {
          prob: 0.35,
          bien: { relaciones: { hinchada: { confianza: 14 } }, vida: { carinoDeLaHinchada: 12 }, balance: 2 },
          mal: {
            vida: { reputacion: -16, forma: -12, dinero: -0.15, exposicion: 28 },
            relaciones: { club: { rencor: 20 }, dt: { rencor: 14 } },
            etiquetas: ['social:noctambulo'],
            titular: { texto: '{APELLIDO}, EN LA CARPA A LA UNA Y MEDIA. EL SÁBADO SE JUEGA', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Te quedaste hasta las once, cantaste con la mesa de al lado y las fotos que salieron eran de un jugador querido en su ciudad. El sábado metiste el segundo.',
          relatoMal:
            'A la una y media alguien te grabó de pie sobre un banco. El video lo vio el país entero antes del desayuno, el club te multó y el técnico armó el equipo sin ti.',
        },
        resultado: 'Te quedaste cuando el bus del club se fue.',
      },
      {
        id: 'no-ir',
        texto: 'No ir y avisarle al patrocinador',
        pista: 'Lo profesional. Y el que paga la camiseta pregunta por qué.',
        efectos: {
          vida: { condicion: 6, carinoDeLaHinchada: -8 },
          relaciones: { club: { rencor: 8 }, dt: { confianza: 10 } },
          personalidad: { profesionalismo: 8, vidaSocial: -5 },
          balance: 1,
        },
        resultado:
          'Avisaste el martes con una explicación razonable y aun así el gerente comercial lo mencionó dos veces en el año. Fuiste el único del plantel que faltó, y en esta ciudad eso se nota.',
      },
      {
        id: 'llevar-al-plantel',
        texto: 'Ir y hacerte cargo de que el plantel vuelva temprano',
        pista: 'Nadie te lo pidió. Es lo que hace un capitán.',
        efectos: {
          vida: { exposicion: 12, carinoDeLaHinchada: 10 },
          relaciones: { companeros: { respeto: 18 }, dt: { confianza: 14 }, club: { confianza: 12 } },
          personalidad: { carisma: 8, profesionalismo: 6 },
          etiquetas: ['vestuario:referente'],
          balance: 5,
        },
        resultado:
          'Fuiste, te quedaste dos horas y a las diez estabas juntando a los cinco más jóvenes para subirlos al bus. Uno se quejó y volvió igual. El sábado ganaron y el técnico contó esta historia en la conferencia sin dar nombres, mirándote a ti.',
      },
    ],
  },
  {
    id: 'mundo-carnaval',
    categoria: 'social',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Carnaval en mitad del campeonato',
    texto:
      'Una escuela de samba te ofrece un carro alegórico y un lugar en la avenida. Es la semana de carnaval, el campeonato no se detiene y tres compañeros ya dijeron que sí.',
    tipoDeRecuerdo: 'decision',
    condiciones: { ambito: ['brasileno'], famaMin: 25, temporadasMin: 1 },
    cooldown: 6,
    peso: 1.5,
    opciones: [
      {
        id: 'subir',
        texto: 'Subir al carro y desfilar',
        pista: 'Te ama un país entero. Y estás desfilando un martes.',
        efectos: { vida: { fama: 18, exposicion: 24, felicidad: 14 }, personalidad: { carisma: 7, vidaSocial: 6 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 16, dinero: 0.3 },
            relaciones: { hinchada: { confianza: 18 } },
            titular: { texto: '{APELLIDO} DESFILÓ Y LA AVENIDA CANTÓ SU NOMBRE', tono: 'elogio' },
            balance: 4,
          },
          mal: {
            vida: { condicion: -14, forma: -12, reputacion: -10 },
            relaciones: { dt: { rencor: 16 } },
            titular: { texto: 'DESFILÓ EL MARTES Y JUGÓ EL DOMINGO COMO SI HUBIERA DESFILADO EL MARTES', tono: 'duda' },
            balance: -6,
          },
          relatoBien:
            'Desfilaste dos horas y la avenida se aprendió tu nombre. La escuela salió campeona, te hicieron miembro honorario y el domingo metiste de cabeza.',
          relatoMal:
            'Desfilaste hasta las cuatro de la mañana del miércoles y el domingo no llegabas a nada. El técnico te sacó a los cincuenta y en la conferencia le preguntaron por el carnaval, no por el partido.',
        },
        resultado: 'Subiste al carro el martes de carnaval.',
      },
      {
        id: 'ir-a-mirar',
        texto: 'Ir a mirar desde un palco y nada más',
        pista: 'Estás y no desfilas. Casi nadie nota la diferencia.',
        efectos: {
          vida: { fama: 8, exposicion: 12, felicidad: 8 },
          personalidad: { profesionalismo: 5 },
          balance: 2,
        },
        resultado:
          'Fuiste al palco de la escuela dos horas y te fuiste a dormir a la una. Salieron fotos tuyas aplaudiendo y en los programas discutieron igual si un jugador debía estar ahí. Al menos el domingo corriste.',
      },
      {
        id: 'cobrar-sin-ir',
        texto: 'Cederles tu imagen y no aparecer',
        pista: 'Cobras y descansas. Y ellos venden algo que no está.',
        efectos: {
          vida: { dinero: 0.25, exposicion: 8, carinoDeLaHinchada: -6 },
          personalidad: { ambicion: 6 },
          balance: 1,
        },
        resultado:
          'Firmaste el uso de tu imagen, cobraste y dormiste ocho horas los tres días. Pusieron tu cara de dos metros en el carro y la gente esperó verte ahí arriba. Cuando entendieron que no ibas a estar, la escuela recibió más quejas que tu club.',
      },
      {
        id: 'no',
        texto: 'Decir que no y quedarte entrenando',
        pista: 'En este país eso también se lee como un mensaje.',
        efectos: {
          vida: { condicion: 8, carinoDeLaHinchada: -10 },
          relaciones: { dt: { confianza: 12 } },
          personalidad: { profesionalismo: 9 },
          balance: 1,
        },
        resultado:
          'Entrenaste los tres días con los juveniles y el preparador físico lo contó en una entrevista. La mitad del país lo aplaudió y la otra mitad dijo que no habías entendido dónde estabas jugando. Las dos mitades tenían un punto.',
      },
    ],
  },
  {
    id: 'mundo-torcida',
    categoria: 'caos',
    rareza: 'raro',
    picante: 2,
    titulo: 'La torcida entró al CT',
    texto:
      'Cuatro derrotas seguidas y doscientas personas de la torcida organizada entraron al centro de entrenamiento cuando terminaba la práctica. No vinieron a conversar y el plantel está contra el alambrado.',
    tipoDeRecuerdo: 'caos',
    condiciones: { ambito: ['brasileno'], temporadasMin: 2, notaMax: 6.9 },
    cooldown: 8,
    peso: 1.3,
    opciones: [
      {
        id: 'dar-la-cara',
        texto: 'Ir tú a hablar con ellos',
        pista: 'Nadie más va a ir. Y son doscientos.',
        efectos: { vida: { estres: 20 }, personalidad: { temperamento: 6 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 24, reputacion: 14 },
            relaciones: { hinchada: { respeto: 26 }, companeros: { respeto: 20 } },
            etiquetas: ['leyenda:hinchada'],
            titular: { texto: '{APELLIDO} FUE EL ÚNICO QUE CAMINÓ HASTA EL ALAMBRADO', tono: 'elogio' },
            balance: 7,
          },
          mal: {
            vida: { estres: 26, reputacion: -8, exposicion: 24 },
            relaciones: { hinchada: { rencor: 18 } },
            titular: { texto: 'LE GRITARON EN LA CARA A {APELLIDO} Y EL VIDEO ESTÁ EN TODAS PARTES', tono: 'polemica' },
            balance: -6,
          },
          relatoBien:
            'Caminaste solo los treinta metros y hablaste veinte minutos con los cuatro que mandaban. Se fueron sin romper nada. El domingo la tribuna cantó tu nombre antes del himno y el plantel no lo olvidó nunca.',
          relatoMal:
            'Caminaste y no te dejaron hablar: te gritaron a diez centímetros durante cuatro minutos y alguien lo filmó completo. No pasó nada más y el video se pasó cien veces. Esa semana no dormiste.',
        },
        resultado: 'Cruzaste el campo solo y caminaste hasta el alambrado.',
      },
      {
        id: 'con-el-capitan',
        texto: 'Ir con el capitán y dos más',
        pista: 'Más seguro. Y menos gesto.',
        efectos: {
          vida: { estres: 12, carinoDeLaHinchada: 10 },
          relaciones: { companeros: { confianza: 14 }, hinchada: { respeto: 10 } },
          personalidad: { carisma: 5 },
          balance: 3,
        },
        resultado:
          'Fueron cuatro y habló el capitán. Los escucharon, pidieron actitud y se fueron en veinte minutos. Funcionó y nadie lo recordó dos semanas después, que era exactamente el objetivo.',
      },
      {
        id: 'seguridad',
        texto: 'Meterse al vestuario y dejar que actúe la seguridad',
        pista: 'Es lo que dice el protocolo. Y ellos lo van a leer distinto.',
        efectos: {
          vida: { carinoDeLaHinchada: -18, estres: 10 },
          relaciones: { hinchada: { rencor: 22 }, club: { confianza: 8 } },
          etiquetas: ['hinchada:rencor'],
          balance: -4,
        },
        resultado:
          'Entraron todos al vestuario y la seguridad los sacó en cuarenta minutos, sin golpes. El domingo la tribuna organizada no cantó ni una vez en noventa minutos, que es lo peor que puede hacer una tribuna, y lo mantuvieron tres meses.',
      },
      {
        id: 'renunciar-a-la-prima',
        texto: 'Ofrecerles que el plantel resigne la prima si no clasifican',
        pista: 'Se van tranquilos hoy. Y veinticuatro compañeros no votaron eso.',
        efectos: {
          vida: { carinoDeLaHinchada: 20, dinero: -0.3 },
          relaciones: { hinchada: { confianza: 22 }, companeros: { rencor: 20 } },
          personalidad: { ego: 6, riesgo: 6 },
          etiquetas: ['vestuario:aparte'],
          balance: 0,
        },
        resultado:
          'Lo dijiste en el alambrado sin consultarlo y se fueron aplaudiendo. En el vestuario te esperaban veinticuatro caras: nadie te había autorizado a hablar de la plata de todos. Terminaron resignándola y ganándose la clasificación, y la mitad del plantel siguió con bronca hasta diciembre.',
      },
    ],
  },
  {
    id: 'mundo-parrilla',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'La parrilla del plantel',
    texto:
      'Parrilla en la quinta de un compañero para cortar la mala racha. A la tercera hora un juvenil dijo algo del último partido, contestó un referente y terminaron dos de pie, frente a frente, con el humo de la parrilla entre los dos.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { ambito: ['rioplatense'], temporadasMin: 1 },
    cooldown: 6,
    peso: 1.5,
    opciones: [
      {
        id: 'separarlos',
        texto: 'Meterte a separarlos',
        pista: 'Alguien tiene que hacerlo. Los dos te van a empujar primero.',
        efectos: {
          relaciones: { companeros: { respeto: 20, confianza: 14 } },
          vida: { estres: 8 },
          personalidad: { carisma: 7 },
          etiquetas: ['vestuario:referente'],
          balance: 5,
        },
        resultado:
          'Te metiste en el medio y te llevaste un empujón de cada lado antes de que se dieran cuenta de quién eras. A los diez minutos estaban comiendo en la misma mesa. El lunes el técnico no se enteró de nada y eso también fue tu trabajo.',
      },
      {
        id: 'apoyar-al-juvenil',
        texto: 'Ponerte del lado del juvenil, que tenía razón',
        pista: 'Tenía razón. Y el otro lleva ocho años en el club.',
        efectos: { personalidad: { lealtad: 5, temperamento: 5 } },
        riesgo: {
          prob: 0.45,
          bien: {
            relaciones: { companeros: { respeto: 16 } },
            vida: { reputacion: 8, forma: 6 },
            balance: 4,
          },
          mal: {
            relaciones: { companeros: { rencor: 22 } },
            vida: { estres: 14 },
            etiquetas: ['vestuario:aparte'],
            balance: -6,
          },
          relatoBien:
            'Dijiste en voz alta que el pibe tenía razón y hubo tres segundos de silencio. El referente se sentó, lo pensó y le pidió disculpas él mismo. Ese vestuario cambió esa noche.',
          relatoMal:
            'Dijiste que el pibe tenía razón y el referente lo tomó como que le habías pasado por encima delante del grupo. No te dirigió la palabra en cuatro meses y arrastró a tres más con él.',
        },
        resultado: 'Dijiste, delante de todos, que el juvenil tenía razón.',
      },
      {
        id: 'no-meterse',
        texto: 'Quedarte sentado y seguir comiendo',
        pista: 'No es tu problema. Hasta el lunes.',
        efectos: {
          vida: { estres: 6 },
          relaciones: { companeros: { rencor: 8 } },
          personalidad: { lealtad: -4 },
          balance: -2,
        },
        resultado:
          'No te moviste y lo resolvieron otros dos. El lunes el técnico preguntó qué había pasado y nadie contó nada. Semanas después, en una charla de vestuario, el capitán dijo que "acá hay gente que mira" y no miró a nadie en particular.',
      },
      {
        id: 'terminar-la-parrilla',
        texto: 'Levantar la parrilla y mandar a todos a su casa',
        pista: 'Se corta el problema. Y la idea era juntarse.',
        efectos: {
          relaciones: { companeros: { confianza: 8, rencor: 10 } },
          vida: { condicion: 6 },
          personalidad: { disciplina: 7 },
          balance: 1,
        },
        resultado:
          'Apagaste la parrilla y dijiste que se había terminado. Se fueron todos en veinte minutos, medio enojados. No hubo pelea y no hubo asado: la racha se cortó tres semanas después, sin que nadie pudiera decir por qué.',
      },
    ],
  },
  {
    id: 'mundo-programa-tarde',
    categoria: 'prensa',
    rareza: 'comun',
    picante: 3,
    titulo: 'El juicio de la tarde',
    texto:
      'Un programa de la tarde le dio treinta minutos a una historia sobre tu pareja: cuatro panelistas, un abogado y una encuesta al aire con tu nombre. No hay una sola prueba y hay dos millones de personas mirando.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { ambito: ['rioplatense'], famaMin: 35, temporadasMin: 2 },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'ir-al-programa',
        texto: 'Ir al programa y sentarte en esa mesa',
        pista: 'Es su cancha. Y es la única cámara que están mirando.',
        efectos: { vida: { exposicion: 30, fama: 12, estres: 20 }, personalidad: { sensibilidadMediatica: 8 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { reputacion: 14, carinoDeLaHinchada: 12 },
            relaciones: { prensa: { respeto: 16 } },
            titular: { texto: 'SE SENTÓ, CONTESTÓ TODO Y SE LEVANTÓ: LA TARDE DE {APELLIDO}', tono: 'elogio' },
            balance: 5,
          },
          mal: {
            vida: { reputacion: -18, estres: 24, forma: -8 },
            relaciones: { pareja: { rencor: 20 } },
            titular: { texto: 'LO CRUZARON CUATRO A UNO Y {APELLIDO} SE FUE A LA MITAD', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Fuiste solo, sin abogado, y contestaste las once preguntas mirando a quien te las hacía. La encuesta al aire cambió de lado en veinte minutos y el programa nunca volvió a tocar el tema.',
          relatoMal:
            'Fueron cuatro contra uno y a los dieciocho minutos te levantaste de la mesa. Ese momento fue el más visto del año en ese canal, se repitió durante meses, y en tu casa fue peor que en la tele.',
        },
        resultado: 'Fuiste al piso el jueves a las cinco de la tarde.',
      },
      {
        id: 'defender-a-la-pareja',
        texto: 'Salir a defenderla tú, sin hablar del tema',
        pista: 'Se banca a la persona y no se entra en el juego.',
        efectos: {
          vida: { exposicion: 18, reputacion: 12 },
          relaciones: { pareja: { confianza: 24, respeto: 18 }, prensa: { rencor: 12 } },
          personalidad: { lealtad: 9 },
          etiquetas: ['vida:pareja-estable'],
          titular: { texto: '"NO VOY A HABLAR DEL TEMA, VOY A HABLAR DE ELLA": {APELLIDO}', tono: 'elogio' },
          balance: 5,
        },
        resultado:
          'Grabaste cuarenta segundos en el vestuario diciendo una sola cosa: quién es ella y qué hace, sin mencionar una palabra de la historia. Lo pasaron igual porque no podían no pasarlo, y esa vez no les sirvió para nada.',
      },
      {
        id: 'demandar',
        texto: 'Demandar al programa',
        pista: 'Acá una demanda es material para dos semanas más.',
        efectos: {
          vida: { dinero: -0.15, exposicion: 26, reputacion: -6 },
          relaciones: { prensa: { rencor: 30 } },
          etiquetas: ['prensa:enemigo'],
          balance: -3,
        },
        resultado:
          'Tu abogado presentó la demanda y el programa la leyó en vivo, entera, con un panelista haciendo de juez. Le dedicaron dos semanas más y el juicio se resolvió tres años después, cuando ya no jugabas en ese país.',
      },
      {
        id: 'nada',
        texto: 'No decir nada y jugar el domingo',
        pista: 'El domingo tapa. O no tapa nada.',
        efectos: { vida: { estres: 16, exposicion: 12 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 16, confianza: 12, reputacion: 8 },
            titular: { texto: 'CONTESTÓ CON DOS GOLES: LA SEMANA DE {APELLIDO}', tono: 'elogio' },
            balance: 6,
          },
          mal: {
            vida: { reputacion: -12, forma: -10, estres: 18 },
            relaciones: { pareja: { rencor: 16 } },
            balance: -6,
          },
          relatoBien:
            'No dijiste nada en cinco días y el domingo metiste dos. El programa tuvo que arrancar el lunes con tus goles y el tema se murió esa misma tarde.',
          relatoMal:
            'No dijiste nada y el domingo jugaste con la cabeza en otra parte: te sacaron a los sesenta. El lunes el programa tenía material nuevo, ahora también futbolístico, y en tu casa alguien te preguntó por qué no habías dicho nada.',
        },
        resultado: 'No dijiste una palabra en toda la semana.',
      },
    ],
  },
];
