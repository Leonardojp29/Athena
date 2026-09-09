/**
 * El fútbol: lo que pasa en la cancha, en el vestuario y con el técnico.
 *
 * La regla de este catálogo, y la que costó aprender: **el resultado cuenta el desenlace, no la
 * acción**. "Dijiste que iban a ganar" no es una consecuencia, es la crónica de lo que el jugador ya
 * sabe que hizo. La consecuencia es si ganaron o si perdieron, y qué le pasó a él después.
 *
 * De ahí que casi toda opción lleve `riesgo`: cuando el desenlace es incierto por naturaleza —un
 * clásico, una promesa pública, pedir la titularidad— el juego lo tira y cuenta dos finales
 * distintos y concretos. Y una mala salida puede **restar media**: el cuerpo y la cabeza también se
 * pagan en la carta.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_FUTBOL: Evento[] = [
  {
    id: 'futbol-pedir-titularidad',
    categoria: 'futbol',
    rareza: 'comun',
    picante: 1,
    titulo: 'Tres partidos en el banco',
    texto:
      '{dt} te dejó fuera del once tres partidos seguidos. Tienes la puerta de su oficina a diez metros.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 1, roles: ['suplente', 'rotacion', 'promesa'] },
    cooldown: 4,
    peso: 1.6,
    opciones: [
      {
        id: 'encarar',
        texto: 'Entrar y decirle lo que piensas',
        pista: 'Puede respetarte más. O puede cerrarte la puerta hasta junio.',
        efectos: { personalidad: { temperamento: 6, ambicion: 4 } },
        riesgo: {
          prob: 0.45,
          bien: {
            relaciones: { dt: { respeto: 18, confianza: 10 } },
            vida: { confianza: 12, forma: 6 },
            etiquetas: ['futbol:encaro'],
            balance: 6,
          },
          mal: {
            relaciones: { dt: { rencor: 22 } },
            vida: { confianza: -14, forma: -8 },
            etiquetas: ['conflicto:dt'],
            balance: -7,
          },
          relatoBien:
            'Te escuchó de brazos cruzados y no dijo nada. El domingo estabas en el once y jugaste los siguientes catorce partidos.',
          relatoMal:
            'Te contestó dos palabras: "entrena mejor". No volviste a entrar ni en los últimos minutos hasta que lo echaron.',
        },
        resultado: 'Golpeaste la puerta de su oficina un martes a las nueve de la mañana.',
      },
      {
        id: 'trabajar',
        texto: 'Callarte y ser el primero en llegar',
        pista: 'Lento y seguro. Si es que llega.',
        efectos: { personalidad: { profesionalismo: 7 } },
        riesgo: {
          prob: 0.62,
          bien: {
            relaciones: { dt: { confianza: 14, respeto: 12 } },
            vida: { forma: 8, confianza: 8 },
            atributos: { fisico: 1 },
            balance: 5,
          },
          mal: {
            vida: { confianza: -10, felicidad: -8 },
            etiquetas: ['futbol:olvidado'],
            balance: -3,
          },
          relatoBien:
            'Ocho semanas llegando primero y yéndote último. Un lesionado te abrió la puerta y ya no la soltaste.',
          relatoMal:
            'Ocho semanas llegando primero y yéndote último, y el técnico ni te miró. Terminaste la temporada con noventa minutos jugados.',
        },
        resultado: 'No dijiste una palabra y empezaste a llegar cuarenta minutos antes que todos.',
      },
      {
        id: 'representante',
        texto: 'Que hable tu representante con el club',
        pista: 'Se resuelve arriba. El vestuario se entera igual.',
        efectos: {
          relaciones: { representante: { confianza: 8 }, dt: { rencor: 10 }, club: { confianza: 4 } },
          vida: { exposicion: 8 },
          balance: 0,
        },
        resultado:
          'Tu representante desayunó con el presidente. El técnico se enteró esa tarde y te lo hizo saber sin decir nada: seguiste en el banco, pero ahora con motivo.',
      },
      {
        id: 'pedir-salida',
        texto: 'Pedir salir a préstamo',
        pista: 'Vas a jugar. Lejos, y con un técnico que no te conoce.',
        efectos: {
          relaciones: { dt: { respeto: 8 }, club: { confianza: -6 } },
          personalidad: { ambicion: 6 },
          etiquetas: ['futbol:quiere-jugar'],
          vida: { forma: 6 },
          balance: 3,
        },
        resultado:
          'Le dijiste que preferías jugar en otro lado antes que entrenar en este. Te entendió, y en enero estabas en otra ciudad jugando todos los domingos.',
      },
    ],
  },
  {
    id: 'futbol-clasico',
    categoria: 'futbol',
    rareza: 'comun',
    picante: 1,
    titulo: 'Semana de clásico',
    texto: 'Se viene {rival}. Líbero abre con la previa cinco días antes, la ciudad no habla de otra cosa y a ti te preguntan en cada semáforo.',
    tipoDeRecuerdo: 'declaracion',
    condiciones: { temporadasMin: 1 },
    cooldown: 4,
    peso: 1.2,
    opciones: [
      {
        id: 'prometer',
        texto: 'Prometer que lo van a ganar',
        pista: 'Si ganan, la ciudad es tuya. Si pierden, esa frase te va a perseguir.',
        efectos: { vida: { exposicion: 14 }, personalidad: { ego: 5 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { carinoDeLaHinchada: 26, fama: 16, confianza: 16, forma: 8 },
            relaciones: { hinchada: { confianza: 22, respeto: 16 } },
            atributos: { tiro: 1 },
            titular: { texto: '{APELLIDO} LO PROMETIÓ Y LO CUMPLIÓ: 2-0 EN EL CLÁSICO', tono: 'elogio' },
            etiquetas: ['leyenda:hinchada', 'futbol:clasico-ganado'],
            balance: 9,
          },
          mal: {
            vida: { carinoDeLaHinchada: -24, confianza: -18, forma: -10, exposicion: 18 },
            relaciones: { hinchada: { rencor: 22 }, dt: { rencor: 6 } },
            atributos: { tiro: -1 },
            titular: { texto: '3-0 Y LA FRASE DE {APELLIDO} EN TODAS LAS PANTALLAS', tono: 'polemica' },
            etiquetas: ['futbol:clasico-perdido'],
            balance: -9,
          },
          relatoBien:
            'Ganaron 2-0 y el segundo lo hiciste tú. Esa noche cantaron tu nombre en la avenida hasta las cuatro de la mañana.',
          relatoMal:
            'Perdieron 3-0 en tu cancha. Pasaron tu declaración en bucle durante una semana y la hinchada te la cantó todo el año.',
        },
        resultado: 'Lo dijiste mirando a la cámara: "el domingo lo ganamos".',
      },
      {
        id: 'respeto',
        texto: 'Hablar con respeto del rival',
        pista: 'Nadie se enoja. Nadie se entusiasma.',
        efectos: { personalidad: { profesionalismo: 5 }, relaciones: { prensa: { respeto: 8 } } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 8, confianza: 8, forma: 5 },
            balance: 4,
          },
          mal: { vida: { carinoDeLaHinchada: -6, confianza: -6 }, balance: -2 },
          relatoBien:
            'Dijiste que era un rival enorme y el domingo lo ganaste 1-0. Quedaste como el único que habló en serio esa semana.',
          relatoMal:
            'Empataron 1-1 y de la semana no quedó nada: ni una frase, ni un gol, ni un recuerdo.',
        },
        resultado: 'Dijiste que era un partido más y que el rival te merecía respeto.',
      },
      {
        id: 'silencio',
        texto: 'No hablar hasta después del partido',
        pista: 'Concentrado y aburrido. A veces alcanza.',
        efectos: {
          vida: { estres: -8, confianza: 6, forma: 6 },
          personalidad: { profesionalismo: 6 },
          relaciones: { prensa: { rencor: 4 } },
          balance: 3,
        },
        resultado:
          'No diste una entrevista en toda la semana y el domingo fuiste el mejor de la cancha. En la rueda de prensa hablaste dos minutos y te fuiste.',
      },
      {
        id: 'provocar',
        texto: 'Meterte con el rival por redes',
        pista: 'La tribuna te ama. Si pierden, no hay dónde esconderse.',
        efectos: {
          vida: { exposicion: 20 },
          personalidad: { ego: 6, temperamento: 6 },
          etiquetas: ['prensa:provocador'],
        },
        riesgo: {
          prob: 0.4,
          bien: {
            vida: { carinoDeLaHinchada: 22, fama: 14, confianza: 12 },
            titular: { texto: '{APELLIDO} HABLÓ, JUGÓ Y GANÓ: NO SE HABLA DE OTRA COSA', tono: 'elogio' },
            etiquetas: ['futbol:clasico-ganado'],
            balance: 6,
          },
          mal: {
            vida: { carinoDeLaHinchada: -22, reputacion: -16, confianza: -14 },
            relaciones: { hinchada: { rencor: 20 }, club: { rencor: 12 } },
            atributos: { regate: -1 },
            titular: { texto: 'EL CLUB MULTA A {APELLIDO} POR LA PUBLICACIÓN DEL CLÁSICO', tono: 'polemica' },
            etiquetas: ['futbol:clasico-perdido'],
            balance: -10,
          },
          relatoBien:
            'Publicaste una foto del estadio vacío con la hora del partido. Ganaron 3-1, metiste dos, y esa publicación tiene más vistas que cualquier gol tuyo.',
          relatoMal:
            'Perdieron 2-1 con gol en el último minuto. Tu publicación quedó de fondo en todos los programas y el club te multó con dos fechas.',
        },
        resultado: 'Publicaste algo tres días antes del partido.',
      },
    ],
  },
  {
    id: 'futbol-capitania',
    categoria: 'futbol',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'La cinta',
    texto: 'Se fue el capitán y {dt} te pregunta si la quieres llevar tú.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 3, edadMin: 23, roles: ['titular', 'estrella'] },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptarla',
        pista: 'Más peso, más micrófonos, más historia. También más culpa.',
        efectos: { personalidad: { carisma: 6, ambicion: 5 } },
        riesgo: {
          prob: 0.62,
          bien: {
            vida: { carinoDeLaHinchada: 18, fama: 12, confianza: 14 },
            relaciones: { companeros: { respeto: 18 }, dt: { confianza: 14 } },
            atributos: { pase: 1 },
            titular: { texto: '{APELLIDO} SE PUSO EL EQUIPO AL HOMBRO Y LO SACÓ ADELANTE', tono: 'elogio' },
            etiquetas: ['futbol:capitan'],
            balance: 8,
          },
          mal: {
            vida: { estres: 22, confianza: -12, carinoDeLaHinchada: -10 },
            relaciones: { companeros: { rencor: 10 } },
            atributos: { tiro: -1 },
            etiquetas: ['futbol:capitan', 'futbol:cinta-pesada'],
            balance: -5,
          },
          relatoBien:
            'Te la pusiste y el equipo cambió de cara: nueve partidos sin perder y la gente cantando tu nombre en la despedida del año.',
          relatoMal:
            'Te la pusiste y el equipo se cayó igual. Cada derrota te la preguntaron a ti y en tres meses habías envejecido cinco años.',
        },
        resultado:
          'Aceptaste la cinta en el vestuario, delante de todos. Esa misma semana tuviste que ir a la oficina a pelear una prima que no era tuya y a decirle a un compañero de treinta y cuatro años que no iba a jugar el domingo.',
      },
      {
        id: 'rechazar',
        texto: 'Decir que todavía no',
        pista: 'Sin ruido y sin peso.',
        efectos: {
          vida: { estres: -10 },
          personalidad: { ego: -5, profesionalismo: 3 },
          relaciones: { dt: { confianza: -6 } },
          balance: 1,
        },
        resultado:
          'Dijiste que le tocaba a otro. El otro la llevó dos años y tú jugaste tranquilo los mejores partidos de tu vida.',
      },
      {
        id: 'compartir',
        texto: 'Pedir que la lleve el más veterano',
        pista: 'El vestuario lo agradece. El técnico no tanto.',
        efectos: {
          relaciones: { companeros: { respeto: 18, confianza: 12 }, dt: { confianza: -6 } },
          personalidad: { ego: -5, lealtad: 5 },
          vida: { confianza: 6 },
          balance: 5,
        },
        resultado:
          'Dijiste que le correspondía al que llevaba diez años. Te la dio él dos temporadas después, en su último partido y delante de todo el estadio.',
      },
      {
        id: 'condiciones',
        texto: 'Aceptar, pero pidiendo cambios en el plantel',
        pista: 'Vas a tener poder de verdad. Y enemigos de verdad.',
        efectos: {
          vida: { estres: 14 },
          personalidad: { ambicion: 8, ego: 6 },
          etiquetas: ['futbol:capitan', 'futbol:capitan-fuerte'],
        },
        riesgo: {
          prob: 0.5,
          bien: {
            relaciones: { club: { respeto: 16 }, companeros: { respeto: 10 } },
            vida: { carinoDeLaHinchada: 12, confianza: 10 },
            balance: 6,
          },
          mal: {
            relaciones: { companeros: { rencor: 24 }, club: { rencor: 10 } },
            vida: { confianza: -10, forma: -8 },
            etiquetas: ['conflicto:vestuario'],
            balance: -7,
          },
          relatoBien:
            'Los dos que sobraban se fueron en junio y el equipo empezó a funcionar. En diciembre levantaste una copa con la cinta puesta.',
          relatoMal:
            'Se filtró tu lista. Medio vestuario dejó de hablarte y el equipo terminó peleando el descenso contigo de capitán.',
        },
        resultado: 'Aceptaste con una lista de tres nombres que sobraban.',
      },
    ],
  },
  {
    id: 'futbol-lesion-grave',
    categoria: 'futbol',
    rareza: 'infrecuente',
    picante: 1,
    titulo: 'Se cortó algo',
    texto: 'Sentiste el tirón en el minuto sesenta y saliste sin que nadie te tocara.',
    tipoDeRecuerdo: 'lesion',
    condiciones: { temporadasMin: 2 },
    cooldown: 6,
    opciones: [
      {
        id: 'apurar',
        texto: 'Volver antes de tiempo',
        pista: 'El equipo te necesita. El músculo tiene otra opinión.',
        efectos: { personalidad: { riesgo: 7 }, etiquetas: ['lesion:apurada'] },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 16, confianza: 10, forma: 6 },
            relaciones: { dt: { confianza: 12 } },
            balance: 4,
          },
          mal: {
            vida: { condicion: -24, forma: -18, felicidad: -12 },
            atributos: { ritmo: -3, fisico: -2 },
            balance: -9,
          },
          relatoBien:
            'Volviste tres semanas antes, entraste a los setenta y asististe el gol del triunfo. Nadie te preguntó cómo estabas.',
          relatoMal:
            'Volviste, y a los doce minutos del primer partido se cortó otra vez y peor. Cinco meses afuera y una pierna que nunca volvió a ser la misma.',
        },
        resultado: 'Firmaste el alta antes de lo que decía el parte.',
      },
      {
        id: 'completa',
        texto: 'Hacer la recuperación completa',
        pista: 'Te pierdes media temporada. Vuelves entero.',
        efectos: {
          vida: { condicion: 18, forma: -10, felicidad: -6 },
          personalidad: { profesionalismo: 8 },
          balance: 4,
        },
        resultado:
          'Cuatro meses de gimnasio y piscina sin saltarte un día. Volviste en marzo y jugaste los siguientes tres años sin una sola recaída.',
      },
      {
        id: 'psicologo',
        texto: 'Empezar a ver al psicólogo del club',
        pista: 'La cabeza también se recupera.',
        efectos: {
          vida: { estres: -18, felicidad: 8, confianza: 14, condicion: 6 },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['vida:cabeza'],
          balance: 5,
        },
        resultado:
          'Ibas dos veces por semana y le contaste cosas que no habías dicho nunca. Volviste a la cancha sin miedo a la pierna, que es lo que en general no vuelve.',
      },
      {
        id: 'desaparecer',
        texto: 'Desaparecer del club hasta estar bien',
        pista: 'Nadie te ve fallar. Nadie te ve tampoco.',
        efectos: {
          vida: { estres: -8, carinoDeLaHinchada: -12, forma: -8 },
          relaciones: { companeros: { confianza: -14 }, club: { rencor: 10 } },
          etiquetas: ['lesion:aislado'],
          balance: -4,
        },
        resultado:
          'No apareciste por el complejo en cuatro meses. Cuando volviste, la mitad del plantel era nueva y ninguno sabía quién eras.',
      },
    ],
  },
  {
    id: 'futbol-descenso',
    categoria: 'futbol',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Se juega el descenso',
    texto: 'Última fecha, {club} se salva ganando y se va perdiendo. Cuarenta mil personas en la cancha.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 2, clubFuerzaMax: 72 },
    cooldown: 8,
    opciones: [
      {
        id: 'agarrar',
        texto: 'Agarrar el equipo y jugar todas',
        pista: 'Si sale, eres ídolo para siempre. Si no, también te van a recordar.',
        efectos: { personalidad: { ambicion: 6 }, vida: { estres: 18 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 30, confianza: 18, fama: 12 },
            relaciones: { hinchada: { confianza: 26, respeto: 20 } },
            atributos: { tiro: 1 },
            titular: { texto: '{APELLIDO} SALVÓ AL CLUB EN LA ÚLTIMA PELOTA', tono: 'elogio' },
            etiquetas: ['leyenda:hinchada'],
            balance: 10,
          },
          mal: {
            vida: { carinoDeLaHinchada: -18, confianza: -20, forma: -14, felicidad: -16 },
            atributos: { tiro: -1, regate: -1 },
            titular: { texto: 'DESCENSO: {APELLIDO} LLORANDO EN EL CÍRCULO CENTRAL', tono: 'duda' },
            etiquetas: ['futbol:descenso'],
            balance: -10,
          },
          relatoBien:
            'La agarraste en el 89, encaraste a tres y la metiste abajo. Ese gol tiene una pintada de veinte metros en la puerta del estadio.',
          relatoMal:
            'La tuviste en el 91 y le pegaste al travesaño. Se fueron a segunda y esa pelota la ves cada vez que cierras los ojos.',
        },
        resultado: 'Pediste la pelota en cada jugada de los últimos veinte minutos.',
      },
      {
        id: 'quedarse',
        texto: 'Prometer que te quedas pase lo que pase',
        pista: 'Un año en segunda. Y una tribuna que no te olvida.',
        efectos: {
          vida: { carinoDeLaHinchada: 28, fama: -8, forma: -4 },
          relaciones: { hinchada: { confianza: 26, respeto: 22 } },
          personalidad: { lealtad: 10 },
          etiquetas: ['leyenda:hinchada'],
          titular: { texto: '{APELLIDO} SE QUEDA: "ESTO LO ARREGLO YO"', tono: 'elogio' },
          balance: 7,
        },
        resultado:
          'Lo dijiste antes del partido y lo cumpliste: rechazaste tres ofertas y jugaste el año en segunda. Volvieron a primera y el estadio coreó tu nombre veinte minutos.',
      },
      {
        id: 'guardarse',
        texto: 'Jugar sin arriesgar: falta un contrato por firmar',
        pista: 'Ninguna imagen te va a perjudicar. Ninguna te va a servir tampoco.',
        efectos: {
          vida: { carinoDeLaHinchada: -14, confianza: -6 },
          personalidad: { ambicion: 4, lealtad: -6 },
          relaciones: { hinchada: { rencor: 12 } },
          balance: -4,
        },
        resultado:
          'Jugaste de espaldas los noventa minutos y no perdiste una pelota. Descendieron igual, y a la salida alguien te gritó lo que todos pensaban.',
      },
      {
        id: 'culpar',
        texto: 'Decir públicamente de quién fue la culpa',
        pista: 'Alguien tiene que decirlo. Te va a costar caro.',
        efectos: {
          vida: { exposicion: 22, reputacion: -8 },
          relaciones: { club: { rencor: 22 }, hinchada: { confianza: 14 } },
          personalidad: { temperamento: 8 },
          titular: { texto: '{APELLIDO} APUNTA A LA DIRIGENCIA TRAS EL DESCENSO', tono: 'polemica' },
          etiquetas: ['conflicto:dirigencia'],
          balance: -1,
        },
        resultado:
          'Dijiste que hacía tres años que no se armaba un equipo. La hinchada te aplaudió y el club te rescindió el contrato en junio.',
      },
    ],
  },
];
