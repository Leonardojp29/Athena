/**
 * La selección: lo que pasa alrededor de la camiseta del país.
 *
 * El torneo lo juega el motor; acá está lo que decide el jugador. Renunciar, pelearse con el técnico
 * nacional, elegir entre dos banderas, llegar tocado a un Mundial. Son las decisiones que hacen que
 * una convocatoria pese, porque una convocatoria que solo suma un número no pesa nada.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_SELECCION: Evento[] = [
  {
    id: 'seleccion-dt-no-te-quiere',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'El técnico de {pais} no te llama',
    texto:
      'Llevas tres listas sin aparecer y eres el que más juega de los de tu puesto. Un periodista te pregunta en zona mixta.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { ovrMin: 74, temporadasMin: 3 },
    cooldown: 6,
    opciones: [
      {
        id: 'quejarse',
        texto: 'Decir en voz alta que es injusto',
        pista: 'La gente te va a dar la razón. El técnico no.',
        efectos: {
          vida: { exposicion: 16, carinoDeLaHinchada: 10 },
          relaciones: { dt: { rencor: 18 }, prensa: { confianza: 8 } },
          titular: { texto: '{APELLIDO}: "MERECÍA ESTAR EN ESA LISTA"', tono: 'polemica' },
          etiquetas: ['seleccion:conflicto'],
          balance: -1,
        },
        resultado: 'Lo dijiste con la cámara encima. Tardaste dos años en volver a la lista.',
      },
      {
        id: 'callar',
        texto: 'Decir que se respeta la decisión',
        pista: 'La respuesta correcta. Y la que abre la puerta.',
        efectos: {
          relaciones: { dt: { respeto: 12, confianza: 8 } },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['seleccion:paciente'],
          balance: 4,
        },
        resultado: 'Dijiste que el técnico elige y que tú entrenas. Te llamaron en la lista siguiente.',
      },
      {
        id: 'llamarlo',
        texto: 'Llamarlo por teléfono y preguntarle',
        pista: 'Nadie hace esto. Puede salir muy bien.',
        efectos: { vida: { estres: 10 } },
        riesgo: {
          prob: 0.6,
          bien: {
            relaciones: { dt: { confianza: 20, respeto: 14 } },
            etiquetas: ['seleccion:hablado'],
            balance: 6,
          },
          mal: { relaciones: { dt: { rencor: 14 } }, etiquetas: ['seleccion:conflicto'], balance: -4 },
          relatoBien: 'Te atendió, te explicó qué le faltaba a tu juego y en tres meses eras titular.',
          relatoMal: 'Te contestó que esas cosas no se preguntan y colgó a los cuarenta segundos. Tardaste tres listas más en volver a estar, y esa llamada la contó él mismo años después.',
        },
        resultado: 'Conseguiste su número y lo llamaste un martes en la noche.',
      },
      {
        id: 'renunciar',
        texto: 'Anunciar que no vas a ir más',
        pista: 'Es una puerta que se cierra con llave.',
        efectos: {
          vida: { exposicion: 22, carinoDeLaHinchada: -14, estres: -8 },
          relaciones: { dt: { rencor: 30 } },
          titular: { texto: '{APELLIDO} RENUNCIA A LA SELECCIÓN DE {pais}', tono: 'polemica' },
          etiquetas: ['seleccion:renuncia'],
          balance: -6,
        },
        resultado: 'Publicaste un comunicado de cuatro líneas. En tu país todavía se discute.',
      },
    ],
  },
  {
    id: 'seleccion-lesionado-antes-del-mundial',
    categoria: 'futbol',
    rareza: 'raro',
    picante: 2,
    titulo: 'A tres semanas del Mundial',
    texto:
      'Te desgarraste en el último partido de liga. El médico de la selección dice que llegas justo. El del club dice que no llegas.',
    tipoDeRecuerdo: 'lesion',
    condiciones: { ovrMin: 76, edadMin: 22 },
    cooldown: 8,
    opciones: [
      {
        id: 'forzar',
        texto: 'Forzar y viajar igual',
        pista: 'Un Mundial es un Mundial. El músculo puede cobrarte el año entero.',
        efectos: { vida: { estres: 20, condicion: -12 }, personalidad: { riesgo: 8 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { fama: 14, carinoDeLaHinchada: 16 },
            etiquetas: ['seleccion:mundial'],
            titular: { texto: '{APELLIDO} LLEGÓ, JUGÓ Y NADIE LE PREGUNTÓ CÓMO', tono: 'elogio' },
            balance: 7,
          },
          mal: {
            vida: { condicion: -20, forma: -20, felicidad: -18 },
            etiquetas: ['lesion:apurada'],
            titular: { texto: '{APELLIDO} SE ROMPIÓ EN EL PRIMER ENTRENAMIENTO', tono: 'duda' },
            balance: -10,
          },
          relatoBien: 'Llegaste al primer partido justo y jugaste los siete con infiltraciones antes de cada uno. Nadie te preguntó cómo estabas y tú tampoco lo dijiste.',
          relatoMal: 'Te rompiste en el primer entrenamiento y viste el Mundial desde el hotel.',
        },
        resultado: 'Subiste al avión con el muslo vendado.',
      },
      {
        id: 'avisar',
        texto: 'Avisar que no estás y quedarte',
        pista: 'Te pierdes el Mundial. Y el año que viene estás entero.',
        efectos: {
          vida: { condicion: 14, felicidad: -16, estres: -6 },
          relaciones: { dt: { respeto: 10 }, club: { confianza: 12 } },
          personalidad: { profesionalismo: 8 },
          etiquetas: ['seleccion:renuncio-mundial'],
          balance: 2,
        },
        resultado: 'Llamaste tú mismo al técnico. Fue la llamada más difícil de tu carrera.',
      },
      {
        id: 'callar',
        texto: 'No decir nada y que decidan ellos',
        pista: 'Que la responsabilidad sea de otro.',
        efectos: {
          vida: { estres: 16 },
          relaciones: { dt: { confianza: -8 }, club: { rencor: 8 } },
          balance: -2,
        },
        resultado: 'Los dos médicos discutieron una semana. Te dejaron afuera el día del anuncio.',
      },
      {
        id: 'infiltrarse',
        texto: 'Pedir que te infiltren para los partidos importantes',
        pista: 'Juegas. El precio se paga después.',
        efectos: {
          vida: { condicion: -18, fama: 10 },
          atributos: { fisico: -3 },
          etiquetas: ['lesion:infiltrado', 'seleccion:mundial'],
          balance: 1,
        },
        resultado:
          'Te infiltraron antes de cada partido. Jugaste el Mundial entero y no volviste a correr igual.',
      },
    ],
  },
  {
    id: 'seleccion-doble-nacionalidad',
    categoria: 'relaciones',
    rareza: 'raro',
    picante: 2,
    titulo: 'La otra bandera',
    texto:
      'Llevas años jugando afuera y el país donde vives te ofrece la nacionalidad. Su selección juega el Mundial; la tuya está peleando por entrar.',
    tipoDeRecuerdo: 'decision',
    condiciones: { clubesMin: 2, temporadasMin: 5, ovrMin: 74 },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar la otra nacionalidad',
        pista: 'Ganas un Mundial de chance. Pierdes tu país.',
        efectos: {
          vida: { carinoDeLaHinchada: -24, fama: 12, exposicion: 20 },
          relaciones: { hinchada: { rencor: 22 } },
          titular: { texto: '{APELLIDO} CAMBIA DE SELECCIÓN Y SU PAÍS NO LO PERDONA', tono: 'polemica' },
          etiquetas: ['seleccion:cambio-bandera'],
          balance: -3,
        },
        resultado: 'Cantaste otro himno en tu primer partido. En tu barrio bajaron tu foto del club.',
      },
      {
        id: 'rechazar',
        texto: 'Decir que no, con todo lo que cuesta',
        pista: 'Puede que nunca juegues un Mundial.',
        efectos: {
          vida: { carinoDeLaHinchada: 26, felicidad: 10 },
          relaciones: { hinchada: { confianza: 22, respeto: 18 } },
          personalidad: { lealtad: 10 },
          titular: { texto: '"NACÍ AQUÍ Y ME RETIRO AQUÍ", DIJO {APELLIDO}', tono: 'elogio' },
          etiquetas: ['leyenda:hinchada', 'seleccion:fiel'],
          balance: 8,
        },
        resultado: 'Dijiste que no en una entrevista de tres minutos. Se pasó en bucle durante una semana.',
      },
      {
        id: 'pensarlo',
        texto: 'Tomarte el trámite y no decidir',
        pista: 'Tener el pasaporte no obliga a nada.',
        efectos: {
          vida: { estres: 10, exposicion: 8 },
          etiquetas: ['seleccion:doble-pasaporte'],
          balance: 1,
        },
        resultado: 'Hiciste el trámite y guardaste el pasaporte en un cajón. Nunca lo usaste para eso.',
      },
      {
        id: 'condicion',
        texto: 'Aceptar solo si te garantizan el Mundial',
        pista: 'Nadie garantiza nada. Y queda por escrito que preguntaste.',
        efectos: { vida: { exposicion: 14, reputacion: -6 }, personalidad: { ambicion: 8 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { fama: 14 },
            etiquetas: ['seleccion:cambio-bandera', 'seleccion:mundial'],
            balance: 4,
          },
          mal: {
            vida: { carinoDeLaHinchada: -14, reputacion: -10 },
            titular: { texto: 'FILTRAN LA CONDICIÓN QUE PUSO {APELLIDO} PARA CAMBIAR DE SELECCIÓN', tono: 'polemica' },
            balance: -7,
          },
          relatoBien: 'Te lo dieron por escrito, firmado por el presidente de la federación, y jugaste el Mundial de titular los cinco partidos.',
          relatoMal: 'Se filtró la exigencia y quedaste mal en los dos países a la vez.',
        },
        resultado: 'Pusiste una condición sobre la mesa.',
      },
    ],
  },
  {
    id: 'seleccion-capitania',
    categoria: 'profesional',
    rareza: 'raro',
    picante: 3,
    titulo: 'La cinta de tu país',
    texto: 'El capitán histórico se retiró y el técnico te pregunta si quieres la cinta.',
    tipoDeRecuerdo: 'decision',
    condiciones: { ovrMin: 80, edadMin: 28, temporadasMin: 6 },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptarla',
        pista: 'Más peso, más micrófonos, más historia.',
        efectos: {
          vida: { fama: 16, exposicion: 16, carinoDeLaHinchada: 14 },
          personalidad: { carisma: 8, ego: 4 },
          relaciones: { dt: { confianza: 14 } },
          etiquetas: ['seleccion:capitan'],
          titular: { texto: '{APELLIDO}, NUEVO CAPITÁN DE {pais}', tono: 'elogio' },
          balance: 7,
        },
        resultado: 'Te la pusiste en el brazo en un amistoso de martes. No te la sacaste más.',
      },
      {
        id: 'proponer-otro',
        texto: 'Proponer al que lleva más partidos',
        pista: 'El vestuario lo va a recordar.',
        efectos: {
          relaciones: { companeros: { respeto: 20, confianza: 12 } },
          personalidad: { ego: -6, lealtad: 6 },
          balance: 5,
        },
        resultado: 'Dijiste que le correspondía a otro. Ese otro te la dio dos años después.',
      },
      {
        id: 'compartida',
        texto: 'Pedir que roten la cinta',
        pista: 'Nadie manda solo. Nadie carga solo tampoco.',
        efectos: {
          relaciones: { companeros: { confianza: 16 }, dt: { confianza: -4 } },
          personalidad: { carisma: 5 },
          balance: 3,
        },
        resultado: 'La rotaron entre cuatro durante dos años y funcionó mejor de lo que esperaba cualquiera: el vestuario dejó de tener un solo dueño y empezó a tener cuatro responsables.',
      },
      {
        id: 'rechazar',
        texto: 'Rechazarla: no quieres el ruido',
        pista: 'Menos peso encima. Y menos historia también.',
        efectos: {
          vida: { estres: -12, exposicion: -8 },
          relaciones: { dt: { confianza: -8 } },
          personalidad: { ego: -4 },
          balance: 0,
        },
        resultado: 'Dijiste que preferías jugar y nada más. El técnico no volvió a preguntarte.',
      },
    ],
  },
];
