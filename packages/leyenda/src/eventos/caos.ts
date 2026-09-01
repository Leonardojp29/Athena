/**
 * El caos: lo que no estaba en el plan.
 *
 * Peleas, denuncias, filtraciones, cuerpos que dicen basta. Es el bloque que hace que una carrera
 * pueda torcerse por algo que nadie eligió, y por eso sus rarezas están bajas: si lo insólito pasa
 * todas las partidas deja de ser insólito y pasa a ser el tono del juego.
 *
 * Los dos finales que terminan una carrera antes de tiempo viven acá, y los dos avisan en la pista.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_CAOS: Evento[] = [
  {
    id: 'caos-cobrar-la-deuda',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'Vinieron a cobrar',
    texto:
      'Dos personas te esperan a la salida del entrenamiento. No levantan la voz. Solo recuerdan cuánto debes y desde cuándo.',
    tipoDeRecuerdo: 'caos',
    condiciones: { conEtiquetas: ['caos:deuda-grande'] },
    cooldown: 0,
    opciones: [
      {
        id: 'pagar',
        texto: 'Pagar todo hoy mismo',
        pista: 'Duele en la cuenta y se termina.',
        efectos: {
          vida: { dinero: -2.4, estres: -12 },
          etiquetas: ['caos:deuda-saldada'],
          balance: 2,
        },
        resultado: 'Transferiste todo esa misma tarde desde el estacionamiento del club. No los volviste a ver y tampoco volviste a pisar un casino.',
      },
      {
        id: 'club',
        texto: 'Contárselo al club y pedir ayuda',
        pista: 'Se enteran todos. Te sacan del problema.',
        efectos: {
          vida: { dinero: -1.2, reputacion: -10, exposicion: 12, estres: -10 },
          relaciones: { club: { confianza: 10, rencor: 8 } },
          etiquetas: ['caos:deuda-saldada'],
          balance: 1,
        },
        resultado: 'El club adelantó el dinero y te lo descontó del contrato. Y te lo recordó dos años.',
      },
      {
        id: 'ignorar',
        texto: 'Decirles que después',
        pista: 'Esta gente no se olvida. Puede terminar muy mal.',
        efectos: { vida: { estres: 24 }, personalidad: { riesgo: 8 } },
        riesgo: {
          prob: 0.55,
          bien: { vida: { estres: -6 }, etiquetas: ['caos:deuda-saldada'], balance: -1 },
          mal: {
            vida: { condicion: -22, reputacion: -14, exposicion: 22 },
            titular: { texto: 'ATACAN A {APELLIDO} A LA SALIDA DE SU CASA', tono: 'polemica' },
            etiquetas: ['caos:agresion'],
            balance: -12,
          },
          relatoBien: 'Aparecieron dos veces más en la puerta del predio y después dejaron de venir. Nunca supiste quién les pagó ni por qué, y preferiste no averiguarlo.',
          relatoMal: 'Te esperaron una noche en el garaje. Estuviste cuatro meses sin jugar.',
        },
        resultado: 'Les dijiste que la semana que viene.',
      },
      {
        id: 'denunciar',
        texto: 'Ir a la policía',
        pista: 'Lo correcto. Y sale en todos lados.',
        efectos: {
          vida: { exposicion: 20, estres: 10, reputacion: -4 },
          titular: { texto: '{APELLIDO} DENUNCIA AMENAZAS POR UNA DEUDA DE JUEGO', tono: 'duda' },
          etiquetas: ['caos:denuncia'],
          balance: 2,
        },
        resultado: 'Hiciste la denuncia el mismo día. Toda la ciudad supo cuánto habías perdido jugando.',
      },
    ],
  },
  {
    id: 'caos-otra-vez-al-volante',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'Otra vez a las cuatro de la mañana',
    texto:
      'Ya te pasó una vez y la rodilla todavía se acuerda. Estás en el mismo lugar, a la misma hora, con las llaves en la mano.',
    tipoDeRecuerdo: 'caos',
    condiciones: { conEtiquetas: ['caos:accidente'] },
    cooldown: 0,
    opciones: [
      {
        id: 'dejar-las-llaves',
        texto: 'Dejar las llaves y llamar a alguien',
        pista: 'Aprendiste. Es todo lo que hace falta.',
        efectos: {
          vida: { estres: -8 },
          personalidad: { profesionalismo: 10, riesgo: -10 },
          etiquetas: ['caos:aprendio'],
          balance: 5,
        },
        resultado: 'Le diste las llaves al de la puerta y esperaste sentado. Nunca más manejaste así.',
      },
      {
        id: 'manejar',
        texto: 'Manejar igual',
        pista: 'Ya sabes cómo termina esto. Puede terminar peor.',
        efectos: { vida: { estres: 10 }, personalidad: { riesgo: 12 } },
        riesgo: {
          prob: 0.55,
          bien: { vida: { reputacion: -6 }, balance: -4 },
          mal: {
            final: {
              motivo: 'accidente',
              texto:
                'La curva de siempre, la hora de siempre. Esta vez no saliste caminando: la carrera —y todo lo demás— se apagó esa madrugada, a los {edad}, con el auto contra el guardarraíl.',
            },
            balance: -25,
          },
          relatoBien: 'Llegaste. Te temblaban las manos al abrir la puerta de tu casa.',
          relatoMal: 'No llegaste.',
        },
        resultado: 'Subiste al auto igual.',
      },
      {
        id: 'quedarse',
        texto: 'Dormir donde estás y explicarlo mañana',
        pista: 'Vergüenza y multa. Nada más.',
        efectos: {
          vida: { condicion: -4, exposicion: 10, reputacion: -6 },
          relaciones: { dt: { rencor: 8 }, club: { rencor: 6 } },
          balance: 0,
        },
        resultado: 'Dormiste ahí. Llegaste tarde al entrenamiento y pagaste la multa sin discutir.',
      },
      {
        id: 'ayuda',
        texto: 'Pedir ayuda de verdad',
        pista: 'La segunda vez ya no es mala suerte.',
        efectos: {
          vida: { estres: -20, felicidad: 10, reputacion: 6 },
          relaciones: { club: { confianza: 16 } },
          personalidad: { profesionalismo: 12, riesgo: -14, vidaSocial: -6 },
          etiquetas: ['vida:cabeza', 'caos:aprendio'],
          balance: 7,
        },
        resultado:
          'Llamaste al psicólogo del club esa misma madrugada. Fue la conversación que te cambió la carrera.',
      },
    ],
  },
  {
    id: 'caos-pelea-vestuario',
    categoria: 'caos',
    rareza: 'infrecuente',
    titulo: 'A las manos en el vestuario',
    texto:
      'Perdieron el clásico y un compañero te echó la culpa delante de todos. Está a dos metros y no piensa retroceder.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 2 },
    cooldown: 6,
    opciones: [
      {
        id: 'pegarle',
        texto: 'Ir a las manos',
        pista: 'El vestuario se parte en dos. Y alguien filma.',
        efectos: {
          vida: { estres: 16, reputacion: -6 },
          personalidad: { temperamento: 10 },
          relaciones: { companeros: { rencor: 18 } },
          etiquetas: ['conflicto:vestuario'],
        },
        riesgo: {
          prob: 0.5,
          bien: { relaciones: { companeros: { respeto: 10 } }, balance: -2 },
          mal: {
            vida: { exposicion: 24, reputacion: -14 },
            relaciones: { club: { rencor: 16 }, dt: { rencor: 14 } },
            titular: { texto: 'EL VIDEO DE LA PELEA ENTRE {APELLIDO} Y SU COMPAÑERO', tono: 'polemica' },
            balance: -8,
          },
          relatoBien: 'Los separaron antes de que llegara el segundo golpe y el lunes se dieron la mano delante del plantel. El sábado siguiente ganaron y él te buscó para el abrazo.',
          relatoMal: 'Alguien lo filmó desde el pasillo. El video se vio ocho millones de veces.',
        },
        resultado: 'Fuiste al choque.',
      },
      {
        id: 'contestar',
        texto: 'Contestarle de frente, sin tocarlo',
        pista: 'Se dice todo y no pasa nada. En teoría.',
        efectos: {
          vida: { estres: 8 },
          personalidad: { carisma: 4, temperamento: 4 },
          relaciones: { companeros: { respeto: 10 } },
          balance: 3,
        },
        resultado: 'Le dijiste todo lo que pensabas a diez centímetros. Nadie tuvo que separar a nadie.',
      },
      {
        id: 'callar',
        texto: 'Ducharte y no decir una palabra',
        pista: 'Se apaga solo. O se acumula.',
        efectos: {
          vida: { estres: 14 },
          personalidad: { profesionalismo: 5, temperamento: -4 },
          etiquetas: ['conflicto:tragado'],
          balance: 1,
        },
        resultado: 'No le contestaste. Te lo guardaste tres meses y se te notaba en la cara.',
      },
      {
        id: 'dt',
        texto: 'Hablarlo con el técnico al día siguiente',
        pista: 'Lo maneja quien tiene que manejarlo.',
        efectos: {
          relaciones: { dt: { confianza: 12, respeto: 8 }, companeros: { confianza: 4 } },
          personalidad: { profesionalismo: 7 },
          balance: 5,
        },
        resultado: 'Se lo contaste al técnico el martes. Los sentó a los dos y se terminó ahí.',
      },
    ],
  },
  {
    id: 'caos-lesion-grave',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'La rodilla',
    texto:
      'Caíste mal en un entrenamiento. El médico mira la resonancia dos veces antes de decirte cuánto tiempo.',
    tipoDeRecuerdo: 'lesion',
    condiciones: { temporadasMin: 3, vida: { condicion: [0, 62] } },
    cooldown: 8,
    opciones: [
      {
        id: 'operarse',
        texto: 'Operarte y hacer la recuperación completa',
        pista: 'Un año perdido. Y una rodilla que aguanta lo que queda.',
        efectos: {
          vida: { condicion: 22, forma: -22, estres: 16, felicidad: -10 },
          personalidad: { profesionalismo: 8 },
          etiquetas: ['lesion:operado'],
          balance: 4,
        },
        resultado: 'Once meses de gimnasio y piscina. Volviste entero, un poco más lento y sin dolor.',
      },
      {
        id: 'volver-antes',
        texto: 'Volver antes de tiempo',
        pista: 'El equipo te necesita. La rodilla no opina lo mismo. Puede ser el final.',
        efectos: {
          vida: { forma: 8, condicion: -14, estres: 12 },
          relaciones: { dt: { confianza: 10 }, hinchada: { confianza: 12 } },
          personalidad: { riesgo: 8 },
          etiquetas: ['lesion:apurada'],
        },
        riesgo: {
          prob: 0.62,
          bien: { vida: { carinoDeLaHinchada: 14 }, balance: 3 },
          mal: {
            final: {
              motivo: 'lesion',
              texto:
                'A los veinte minutos del primer partido la rodilla dijo basta y esta vez no había vuelta: el ligamento se llevó lo que quedaba de carrera.',
            },
            balance: -18,
          },
          relatoBien: 'Aguantó. Jugaste el resto del año con una rodillera y sin decir nada.',
          relatoMal: 'No aguantó.',
        },
        resultado: 'Firmaste el alta antes de tiempo.',
      },
      {
        id: 'segunda-opinion',
        texto: 'Buscar una segunda opinión afuera',
        pista: 'Cuesta dinero y tiempo. A veces cambia todo.',
        efectos: { vida: { dinero: -0.4, estres: 8 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { condicion: 18, forma: -6 },
            etiquetas: ['lesion:bien-tratada'],
            balance: 6,
          },
          mal: { vida: { condicion: 8, forma: -18, estres: 10 }, balance: 0 },
          relatoBien: 'El especialista de afuera vio otra cosa: tres meses en lugar de un año.',
          relatoMal: 'Dijo lo mismo que el médico del club, y perdiste seis semanas averiguándolo.',
        },
        resultado: 'Viajaste a ver al que opera a todos.',
      },
      {
        id: 'cambiar-cuerpo',
        texto: 'Rearmar tu juego alrededor de la rodilla',
        pista: 'Menos velocidad, más cabeza. Cambia lo que eres.',
        efectos: {
          vida: { condicion: 12, forma: -8 },
          atributos: { ritmo: -6, pase: 5, defensa: 3 },
          personalidad: { profesionalismo: 8 },
          etiquetas: ['futbol:reinventado'],
          balance: 5,
        },
        resultado:
          'Dejaste de correr al espacio y empezaste a jugar de memoria. Perdiste una pierna y ganaste diez años.',
      },
    ],
  },
  {
    id: 'caos-filtracion',
    categoria: 'prensa',
    rareza: 'infrecuente',
    titulo: 'Se filtró el audio',
    texto:
      'Un audio tuyo del grupo del plantel llegó a un programa de televisión. Hablas del técnico y no bien.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { temporadasMin: 3 },
    cooldown: 8,
    opciones: [
      {
        id: 'asumir',
        texto: 'Asumirlo y hablar con el técnico primero',
        pista: 'Lo dijiste. Al menos que lo escuche de ti.',
        efectos: {
          vida: { exposicion: 14, reputacion: 4, estres: 12 },
          relaciones: { dt: { rencor: 8, respeto: 12 } },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['prensa:sincero'],
          balance: 3,
        },
        resultado: 'Golpeaste su puerta antes de que saliera al aire. Te escuchó sin interrumpir.',
      },
      {
        id: 'negar',
        texto: 'Decir que el audio está editado',
        pista: 'Puede colar. Si no cuela, es peor que el audio.',
        efectos: { vida: { exposicion: 16 }, personalidad: { sensibilidadMediatica: 6 } },
        riesgo: {
          prob: 0.35,
          bien: { vida: { reputacion: 2 }, balance: 0 },
          mal: {
            vida: { reputacion: -18 },
            relaciones: { prensa: { rencor: 18 }, dt: { rencor: 20 } },
            titular: { texto: 'EL AUDIO COMPLETO DEJA A {APELLIDO} SIN SALIDA', tono: 'polemica' },
            balance: -9,
          },
          relatoBien: 'Nadie pudo probar lo contrario y a la semana hablaban de otra cosa.',
          relatoMal: 'Al día siguiente pusieron el audio entero, sin cortes. Duraba cuatro minutos.',
        },
        resultado: 'Saliste a decir que lo habían editado.',
      },
      {
        id: 'buscar-al-que-filtro',
        texto: 'Buscar al que lo filtró',
        pista: 'Vas a encontrarlo. Y va a ser alguien del vestuario.',
        efectos: {
          vida: { estres: 18 },
          relaciones: { companeros: { confianza: -14, rencor: 10 } },
          personalidad: { temperamento: 6 },
          etiquetas: ['conflicto:vestuario'],
          balance: -3,
        },
        resultado: 'Lo encontraste en dos días. Era el que menos jugaba, y no lo negó.',
      },
      {
        id: 'silencio',
        texto: 'No decir absolutamente nada',
        pista: 'Tres días de ruido y se apaga.',
        efectos: {
          vida: { exposicion: 8, estres: 10 },
          relaciones: { prensa: { rencor: 6 } },
          personalidad: { profesionalismo: 4 },
          balance: 2,
        },
        resultado: 'No contestaste una sola pregunta en dos semanas. Se les acabó el tema.',
      },
    ],
  },
  {
    id: 'caos-hinchada-en-la-puerta',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'Fueron a esperarte',
    texto:
      'Después de la cuarta derrota seguida, treinta personas están en la puerta del predio. Piden hablar con el plantel.',
    tipoDeRecuerdo: 'caos',
    condiciones: { temporadasMin: 3, notaMax: 6.7 },
    cooldown: 8,
    opciones: [
      {
        id: 'salir',
        texto: 'Salir a dar la cara tú solo',
        pista: 'Es lo que nadie hace. Por algo será.',
        efectos: {
          vida: { carinoDeLaHinchada: 22, reputacion: 10, estres: 20 },
          personalidad: { carisma: 6 },
          relaciones: { hinchada: { respeto: 20 } },
          etiquetas: ['leyenda:hinchada'],
          titular: { texto: '{APELLIDO} SALIÓ SOLO A HABLAR CON LA HINCHADA', tono: 'elogio' },
          balance: 8,
        },
        resultado:
          'Saliste sin custodia y escuchaste veinte minutos de reproches. Cuando terminó, te aplaudieron.',
      },
      {
        id: 'plantel',
        texto: 'Convencer al plantel de salir juntos',
        pista: 'Nadie queda expuesto. Nadie queda como héroe tampoco.',
        efectos: {
          vida: { carinoDeLaHinchada: 10, estres: 10 },
          relaciones: { companeros: { respeto: 14 }, hinchada: { confianza: 8 } },
          personalidad: { carisma: 4 },
          balance: 5,
        },
        resultado: 'Salieron los veinticinco y habló el capitán mientras todos asentían detrás. La gente aplaudió al final y el domingo el estadio se llenó como no pasaba en dos años.',
      },
      {
        id: 'esperar',
        texto: 'Esperar adentro a que se vayan',
        pista: 'Se van. Y se acuerdan.',
        efectos: {
          vida: { carinoDeLaHinchada: -16, estres: 8 },
          relaciones: { hinchada: { rencor: 16 } },
          balance: -4,
        },
        resultado: 'Se fueron a las once de la noche. En el partido siguiente hubo una bandera con tu nombre.',
      },
      {
        id: 'policia',
        texto: 'Llamar a la policía',
        pista: 'Se termina hoy y no se termina nunca.',
        efectos: {
          vida: { carinoDeLaHinchada: -26, exposicion: 18, estres: 6 },
          relaciones: { hinchada: { rencor: 28 } },
          titular: { texto: 'DESALOJAN A LA HINCHADA DEL PREDIO A PEDIDO DEL PLANTEL', tono: 'polemica' },
          etiquetas: ['conflicto:hinchada'],
          balance: -8,
        },
        resultado: 'Llegaron dos patrullas y desalojaron el predio a las once de la noche. En la tribuna colgaron tu nombre con una cruz y te lo cantaron durante tres temporadas.',
      },
    ],
  },
];
