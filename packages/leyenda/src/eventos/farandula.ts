/**
 * Farándula: los que aparecen cuando empiezas a ser conocido.
 *
 * Videoclips, canciones de la tribuna, la primera vez que vas a ser padre. Lo que se publica **de**
 * ti vive en `prensa.ts`; acá está lo que haces tú con la fama que tienes.
 *
 * Las figuras que aparecen son inventadas —una modelo, un cantante, un conductor— y ninguna se
 * parece a nadie real. Y no hay nada sexual ni drogas: el escándalo se cuenta como lo cuenta un
 * diario, con lo que insinúa, que además dura más.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_FARANDULA: Evento[] = [
  {
    id: 'relaciones-hijo',
    categoria: 'relaciones',
    rareza: 'raro',
    picante: 2,
    titulo: 'Vas a ser padre',
    texto: 'Te enteras en plena temporada, a mitad de una pelea por el descenso.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMin: 23, temporadasMin: 4 },
    cooldown: 0,
    opciones: [
      {
        id: 'todo',
        texto: 'Estar en todo, cueste lo que cueste',
        pista: 'Vas a llegar a algún entrenamiento sin dormir.',
        efectos: {
          vida: { felicidad: 26, estres: 10, condicion: -6 },
          personalidad: { lealtad: 8, profesionalismo: -3 },
          relaciones: { pareja: { confianza: 22 } },
          etiquetas: ['vida:padre'],
          balance: 7,
        },
        resultado: 'No te perdiste un control. Llegaste a dos partidos sin haber dormido y jugaste igual.',
      },
      {
        id: 'equilibrio',
        texto: 'Poner el fútbol primero hasta junio',
        pista: 'Se entiende. No siempre se perdona.',
        efectos: {
          vida: { forma: 8, felicidad: -6 },
          relaciones: { pareja: { rencor: 12 } },
          personalidad: { profesionalismo: 6 },
          balance: 0,
        },
        resultado: 'Te concentraste en salvar la categoría. Lo lograste y te lo cobraron en casa.',
      },
      {
        id: 'anunciarlo',
        texto: 'Anunciarlo y dedicar el próximo gol',
        pista: 'Lo público entra en tu casa.',
        efectos: {
          vida: { felicidad: 18, exposicion: 14, carinoDeLaHinchada: 10 },
          personalidad: { carisma: 4 },
          etiquetas: ['vida:padre', 'social:pareja-publica'],
          balance: 4,
        },
        resultado: 'Lo dedicaste con las dos manos en la boca. La foto la tienes colgada en el living.',
      },
      {
        id: 'privado',
        texto: 'No contárselo a nadie del club',
        pista: 'Lo tuyo, tuyo.',
        efectos: {
          vida: { felicidad: 14, estres: 8, exposicion: -6 },
          personalidad: { profesionalismo: 4 },
          etiquetas: ['vida:padre', 'social:reservado'],
          balance: 3,
        },
        resultado: 'En el club se enteraron cuatro meses después, cuando ya no había cómo esconderlo. Nadie te lo tomó a mal y esos cuatro meses fueron tuyos y de nadie más.',
      },
    ],
  },
  {
    id: 'social-fiesta',
    categoria: 'social',
    rareza: 'comun',
    picante: 1,
    titulo: 'La fiesta',
    texto:
      'Un compañero cumple años y arma algo grande. Es jueves, y el domingo se juega contra el segundo de {liga}.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1, edadMax: 30 },
    cooldown: 5,
    peso: 1.5,
    opciones: [
      {
        id: 'quedarse',
        texto: 'Ir y quedarte hasta el final',
        pista: 'El vestuario te va a querer. El domingo puede pasarte factura.',
        efectos: {
          vida: { felicidad: 12, estres: -10 },
          personalidad: { vidaSocial: 6, profesionalismo: -4 },
          relaciones: { companeros: { confianza: 12 } },
          etiquetas: ['social:noctambulo'],
        },
        riesgo: {
          prob: 0.42,
          bien: {
            vida: { confianza: 8, carinoDeLaHinchada: 8, forma: 4 },
            relaciones: { companeros: { respeto: 10 } },
            balance: 3,
          },
          mal: {
            vida: { condicion: -14, forma: -14, reputacion: -12, exposicion: 16 },
            atributos: { ritmo: -2, fisico: -1 },
            relaciones: { dt: { rencor: 16 }, hinchada: { rencor: 10 } },
            titular: { texto: 'FIESTA EL JUEVES Y DERROTA EL DOMINGO: EL VIDEO DE {APELLIDO}', tono: 'polemica' },
            etiquetas: ['social:filtrado'],
            balance: -8,
          },
          relatoBien:
            'Te fuiste a las cuatro y el domingo metiste el gol del triunfo. En el vestuario te aplaudieron dos veces: por el gol y por haber aguantado.',
          relatoMal:
            'Alguien filmó tu salida a las cinco. El video llegó al club el viernes, el domingo perdieron 3-0 y te cambiaron a los cuarenta minutos con la tribuna cantando.',
        },
        resultado: 'Te quedaste hasta que cerraron.',
      },
      {
        id: 'rato',
        texto: 'Pasar un rato y volver temprano',
        pista: 'Quedas bien con todos y llegas entero al domingo.',
        efectos: {
          vida: { felicidad: 6, estres: -6, condicion: 2 },
          personalidad: { profesionalismo: 4 },
          relaciones: { companeros: { confianza: 6 } },
          balance: 4,
        },
        resultado:
          'Estuviste dos horas, saludaste a todos y a las once estabas durmiendo. El domingo fuiste el que más corrió y nadie supo que habías ido.',
      },
      {
        id: 'no-ir',
        texto: 'No ir',
        pista: 'El cuerpo lo agradece. El vestuario lo anota.',
        efectos: {
          vida: { condicion: 6, forma: 4, felicidad: -6 },
          personalidad: { profesionalismo: 7, vidaSocial: -5 },
          relaciones: { companeros: { confianza: -10 } },
          etiquetas: ['social:aparte'],
          balance: 1,
        },
        resultado:
          'Contestaste "no puedo" en el grupo y nadie preguntó por qué. Jugaste un partidazo el domingo y en el festejo del gol te abrazaron dos.',
      },
      {
        id: 'comida',
        texto: 'Convertirla en una comida de plantel',
        pista: 'El vestuario se une y nadie termina en una portada.',
        efectos: {
          vida: { dinero: -0.15, felicidad: 12, estres: -8, condicion: 2 },
          relaciones: { companeros: { confianza: 18, respeto: 12 } },
          personalidad: { carisma: 7 },
          etiquetas: ['social:lider'],
          balance: 6,
        },
        resultado:
          'Convenciste a todos de cambiar la discoteca por una parrilla en tu casa. Terminó a las once, ganaron el domingo y el técnico lo contó en rueda de prensa como el punto de quiebre del año.',
      },
    ],
  },
  {
    id: 'social-romance',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Alguien te está esperando',
    texto:
      'Conociste a alguien en la presentación de una marca. Al día siguiente El Popular abre con tres fotos suyas y una tuya al lado.',
    tipoDeRecuerdo: 'romance',
    condiciones: { edadMin: 22, famaMin: 25, sinEtiquetas: ['vida:pareja-estable'] },
    cooldown: 6,
    opciones: [
      {
        id: 'en-serio',
        texto: 'Apostar en serio',
        pista: 'Puede ordenarte la vida entera. O desordenártela.',
        efectos: { etiquetas: ['vida:pareja'], personalidad: { lealtad: 4 } },
        riesgo: {
          prob: 0.62,
          bien: {
            vida: { felicidad: 22, estres: -14, condicion: 6, forma: 6 },
            relaciones: { pareja: { confianza: 22, respeto: 16 } },
            etiquetas: ['vida:pareja-estable'],
            balance: 7,
          },
          mal: {
            vida: { felicidad: -16, estres: 20, exposicion: 20, forma: -10 },
            atributos: { regate: -1 },
            relaciones: { pareja: { rencor: 18 } },
            titular: { texto: 'LA SEPARACIÓN DE {APELLIDO} OCUPA MÁS PANTALLA QUE SU ÚLTIMO GOL', tono: 'polemica' },
            balance: -7,
          },
          relatoBien:
            'Se mudaron juntos en seis meses. Fue la persona que te esperaba despierta después de cada derrota, y eso se notó en la cancha durante años.',
          relatoMal:
            'Duró catorce meses y terminó en los programas de la tarde durante tres semanas. Jugaste ese tramo con la cabeza en cualquier lado.',
        },
        resultado: 'Decidiste que esto iba en serio.',
      },
      {
        id: 'privado',
        texto: 'Blindarlo de la prensa desde el primer día',
        pista: 'Se enteran igual, pero de nada.',
        efectos: {
          vida: { felicidad: 16, exposicion: -8, estres: -8, condicion: 4 },
          relaciones: { pareja: { confianza: 18, respeto: 12 } },
          personalidad: { lealtad: 6 },
          etiquetas: ['vida:pareja-estable', 'social:reservado'],
          balance: 6,
        },
        resultado:
          'Nunca subiste una foto ni diste un nombre, y pediste que en el club tampoco. Duró más que cualquier contrato tuyo y nadie pudo hacer un programa con eso.',
      },
      {
        id: 'aprovechar',
        texto: 'Aprovechar el momento y salir en todas',
        pista: 'La fama sube. Y con ella todo lo demás.',
        efectos: {
          vida: { fama: 22, exposicion: 24, felicidad: 8, estres: 10 },
          personalidad: { ego: 6, vidaSocial: 5 },
          etiquetas: ['social:pareja-publica'],
          balance: 0,
        },
        resultado:
          'Salieron juntos en cinco portadas en un mes y tus seguidores se duplicaron. También se duplicaron los fotógrafos en la puerta de tu casa, que ya no se fueron nunca.',
      },
      {
        id: 'cortar',
        texto: 'Cortar antes de que crezca',
        pista: 'Nada cambia. Nada te distrae tampoco.',
        efectos: {
          vida: { felicidad: -8, exposicion: -10, forma: 5, condicion: 3 },
          personalidad: { profesionalismo: 6 },
          balance: 2,
        },
        resultado:
          'Cortaste por mensaje y borraste todo. Tuviste la mejor pretemporada de tu carrera y a veces, en un avión, te acuerdas.',
      },
    ],
  },
  {
    id: 'relaciones-conflicto-companero',
    categoria: 'relaciones',
    rareza: 'comun',
    picante: 1,
    titulo: 'El que no te pasa la pelota',
    texto:
      'Hace seis partidos que un compañero no te mira aunque estés solo. En el vestuario ya se nota y el técnico también.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 1 },
    cooldown: 5,
    opciones: [
      {
        id: 'encarar',
        texto: 'Encararlo delante de todos',
        pista: 'Se resuelve hoy. De una manera o de la otra.',
        efectos: { personalidad: { temperamento: 7 } },
        riesgo: {
          prob: 0.45,
          bien: {
            relaciones: { companeros: { respeto: 16, confianza: 8 } },
            vida: { confianza: 10, forma: 6 },
            balance: 5,
          },
          mal: {
            relaciones: { companeros: { rencor: 20 }, dt: { rencor: 8 } },
            vida: { forma: -10, confianza: -8 },
            atributos: { pase: -1 },
            etiquetas: ['conflicto:vestuario'],
            balance: -6,
          },
          relatoBien:
            'Se lo dijiste con todo el plantel escuchando y él contestó "tienes razón". El sábado te buscó tres veces y una terminó en gol.',
          relatoMal:
            'Terminaron a los gritos y hubo que separarlos. El vestuario se partió en dos y el técnico los sacó a los dos del once por cuatro fechas.',
        },
        resultado: 'Lo encaraste en el medio del vestuario.',
      },
      {
        id: 'invitarlo',
        texto: 'Invitarlo a comer y arreglarlo afuera',
        pista: 'Lo que no se arregla en el vestuario a veces se arregla en una mesa.',
        efectos: {
          vida: { estres: -8, forma: 6 },
          relaciones: { companeros: { confianza: 20, respeto: 12 } },
          personalidad: { carisma: 7 },
          balance: 6,
        },
        resultado:
          'Lo llamaste un jueves y comieron los dos solos. Te contó que estaba pasando algo en su casa y no tenía nada que ver contigo; terminaron la temporada siendo la mejor sociedad del equipo.',
      },
      {
        id: 'dt',
        texto: 'Contárselo al técnico',
        pista: 'Lo maneja quien tiene que manejarlo.',
        efectos: {
          relaciones: { dt: { confianza: 12 }, companeros: { rencor: 8 } },
          personalidad: { profesionalismo: 5 },
          balance: 2,
        },
        resultado:
          'Se lo contaste el martes. Los sentó a los dos en su oficina, se dieron la mano sin mirarse y el problema no se arregló: solo dejó de verse.',
      },
      {
        id: 'ignorar',
        texto: 'Jugar como si no existiera',
        pista: 'Once contra once, pero de a diez.',
        efectos: {
          vida: { forma: -8, estres: 12 },
          relaciones: { companeros: { rencor: 6 } },
          personalidad: { temperamento: -3 },
          etiquetas: ['conflicto:tragado'],
          balance: -3,
        },
        resultado:
          'Dejaste de buscarlo tú también. El equipo empezó a jugar de a diez y en tres meses los vendieron a los dos, cada uno a un país distinto.',
      },
    ],
  },
];
