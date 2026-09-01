/**
 * La vida de afuera: fiestas, farándula, marcas y todo lo que pasa entre semana.
 *
 * Es el bloque que hace que dos carreras no se parezcan. Un futbolista joven con dinero y fama es la
 * persona más expuesta de su ciudad, y el juego tiene que poder contarlo: la discoteca a la que no
 * había que ir, el video que alguien grabó, la marca que paga por tu cara, la modelo que aparece en
 * las portadas al día siguiente.
 *
 * Dos reglas de tono, que valen para todo el catálogo. Ninguna figura pública es real: son parodias
 * con nombre inventado, porque poner el nombre de una persona de verdad en una historia inventada es
 * otra cosa y no es esto. Y no hay nada sexual ni drogas: el escándalo se cuenta como lo cuenta un
 * diario, con lo que se insinúa, que además funciona mejor.
 */
import type { Evento } from './motor.js';

export const EVENTOS_SOCIALES: Evento[] = [
  {
    id: 'social-primera-fiesta',
    categoria: 'social',
    rareza: 'comun',
    titulo: 'La fiesta del ascenso',
    texto:
      'El plantel alquiló un local para festejar y hay tres cumpleaños juntos. Mañana hay entrenamiento a las nueve.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1, edadMax: 27 },
    cooldown: 6,
    peso: 1.6,
    opciones: [
      {
        id: 'una-hora',
        texto: 'Pasar una hora y volver a casa',
        pista: 'Nadie te va a criticar. Nadie se va a acordar tampoco.',
        efectos: {
          vida: { felicidad: 4, estres: -6 },
          personalidad: { profesionalismo: 3 },
          relaciones: { companeros: { confianza: 3 } },
          balance: 3,
        },
        resultado: 'Saludaste a todos, comiste algo y a las once ya estabas durmiendo.',
      },
      {
        id: 'quedarse',
        texto: 'Quedarte hasta que cierren',
        pista: 'El vestuario te va a querer. El preparador físico, no.',
        efectos: {
          vida: { felicidad: 14, estres: -12, condicion: -8, exposicion: 6 },
          personalidad: { vidaSocial: 6, profesionalismo: -4 },
          relaciones: { companeros: { confianza: 10 } },
          etiquetas: ['social:noctambulo'],
          balance: 0,
        },
        riesgo: {
          prob: 0.68,
          bien: { vida: { fama: 3 } },
          mal: {
            vida: { reputacion: -10, exposicion: 14 },
            relaciones: { dt: { rencor: 12 } },
            titular: { texto: '{APELLIDO}, DE FIESTA A DOCE HORAS DEL PARTIDO', tono: 'polemica' },
            etiquetas: ['social:filtrado'],
            balance: -6,
          },
          relatoBien: 'Nadie sacó una foto y a las nueve estabas en el campo.',
          relatoMal: 'Alguien filmó. A las siete de la mañana el video estaba en todos lados.',
        },
        resultado: 'Te quedaste hasta el final.',
      },
      {
        id: 'organizar',
        texto: 'Organizarla tú y poner las reglas',
        pista: 'Si vas a estar, que sea a tu manera.',
        efectos: {
          vida: { dinero: -0.2, felicidad: 10, fama: 4 },
          personalidad: { carisma: 5, ego: 3 },
          relaciones: { companeros: { confianza: 12, respeto: 6 } },
          etiquetas: ['social:lider'],
          balance: 4,
        },
        resultado: 'Pusiste la casa, la hora de cierre y el que manejaba. Salió perfecta.',
      },
      {
        id: 'no-ir',
        texto: 'No ir y avisarlo por el grupo',
        pista: 'El cuerpo te lo agradece. El vestuario lo anota.',
        efectos: {
          vida: { condicion: 5, felicidad: -4 },
          personalidad: { profesionalismo: 6, vidaSocial: -4 },
          relaciones: { companeros: { confianza: -8 } },
          etiquetas: ['social:aparte'],
          balance: 1,
        },
        resultado: 'Contestaste "no puedo" y nadie preguntó por qué. Tampoco te volvieron a invitar.',
      },
    ],
  },
  {
    id: 'social-modelo',
    categoria: 'social',
    rareza: 'infrecuente',
    titulo: 'La cámara te encontró',
    texto:
      'Te vieron cenando con Valeria Rissi, la modelo del momento. El Popular tiene cuatro fotos y ninguna es tuya.',
    tipoDeRecuerdo: 'romance',
    condiciones: { famaMin: 30, edadMin: 20, sinEtiquetas: ['vida:pareja-estable'] },
    cooldown: 6,
    opciones: [
      {
        id: 'blanquear',
        texto: 'Blanquearlo tú, antes que ellos',
        pista: 'Se acaba el misterio y se acaba el negocio de venderlo.',
        efectos: {
          vida: { fama: 16, exposicion: 18, felicidad: 8 },
          personalidad: { carisma: 4 },
          relaciones: { prensa: { respeto: 6 } },
          etiquetas: ['social:pareja-publica'],
          titular: { texto: '{APELLIDO} LO CONFIRMA Y LE SACA LA NOTA A TODOS', tono: 'neutro' },
          balance: 3,
        },
        resultado: 'Subiste una foto tú mismo. La revista que la tenía perdió la portada.',
      },
      {
        id: 'negar',
        texto: 'Negarlo todo',
        pista: 'Funciona hasta que aparece la quinta foto.',
        efectos: { vida: { exposicion: 8 }, personalidad: { sensibilidadMediatica: 4 } },
        riesgo: {
          prob: 0.45,
          bien: { vida: { fama: 2 }, balance: 1 },
          mal: {
            vida: { reputacion: -12, exposicion: 16 },
            relaciones: { prensa: { rencor: 14 } },
            titular: { texto: 'LAS FOTOS QUE DEJAN A {APELLIDO} SIN EXPLICACIÓN', tono: 'polemica' },
            etiquetas: ['prensa:mentira'],
            balance: -7,
          },
          relatoBien: 'Nadie consiguió otra foto y el tema murió en tres días. La revista que la tenía cerró la nota y pasó a otra pareja.',
          relatoMal: 'Al día siguiente salió la quinta foto y ya no había nada que negar.',
        },
        resultado: 'Dijiste que era una amiga.',
      },
      {
        id: 'privado',
        texto: 'Pedirle a tu representante que lo maneje',
        pista: 'Para eso le pagas.',
        efectos: {
          vida: { dinero: -0.15, exposicion: -6, estres: -6 },
          relaciones: { representante: { confianza: 10 } },
          balance: 2,
        },
        resultado: 'Se ocupó él. Nunca supiste a quién llamó ni qué le prometió.',
      },
      {
        id: 'cortar',
        texto: 'Cortar por lo sano y desaparecer un mes',
        pista: 'El fútbol vuelve al centro. Lo otro se apaga solo.',
        efectos: {
          vida: { fama: -8, exposicion: -14, condicion: 6, forma: 6 },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['social:reservado'],
          balance: 4,
        },
        resultado: 'Borraste todo, apagaste el teléfono un mes y volviste a entrenar doble turno. En cinco semanas eras el que más corría del plantel y no hubo una sola foto más.',
      },
    ],
  },
  {
    id: 'social-influencer',
    categoria: 'social',
    rareza: 'comun',
    titulo: 'El influencer quiere contenido',
    texto:
      'Kevin Roldán —dos millones de seguidores, ninguna vergüenza— te propone un video juntos en el vestuario.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 20, temporadasMin: 2 },
    cooldown: 4,
    opciones: [
      {
        id: 'hacerlo',
        texto: 'Hacerlo y que salga como salga',
        pista: 'Dos millones de personas te van a ver. No todas te van a querer.',
        efectos: {
          vida: { fama: 14, exposicion: 12, dinero: 0.1 },
          personalidad: { carisma: 4, vidaSocial: 4 },
          etiquetas: ['social:viral'],
          balance: 1,
        },
        riesgo: {
          prob: 0.6,
          bien: { vida: { fama: 8, felicidad: 5 }, relaciones: { hinchada: { confianza: 8 } }, balance: 3 },
          mal: {
            vida: { reputacion: -8 },
            relaciones: { club: { rencor: 12 }, dt: { rencor: 8 } },
            titular: { texto: 'EL CLUB LE PIDE A {APELLIDO} QUE DEJE EL VESTUARIO EN PAZ', tono: 'duda' },
            balance: -4,
          },
          relatoBien: 'El video explotó: cuatro millones de vistas en dos días y hasta el técnico lo mostró en la charla. Te ganaste el vestuario y dos marcas te escribieron esa semana.',
          relatoMal: 'En el club no les gustó nada que la cámara entrara ahí.',
        },
        resultado: 'Grabaron media hora dentro del vestuario.',
      },
      {
        id: 'fuera',
        texto: 'Sí, pero afuera del club',
        pista: 'Lo mismo, sin meter a nadie más en el problema.',
        efectos: {
          vida: { fama: 8, exposicion: 6, dinero: 0.08 },
          personalidad: { profesionalismo: 3 },
          balance: 3,
        },
        resultado: 'Lo grabaron en una cancha de barrio. Salió mejor de lo que esperabas.',
      },
      {
        id: 'cobrar',
        texto: 'Aceptar solo si paga',
        pista: 'Tu cara vale. Que lo sepa él también.',
        efectos: {
          vida: { dinero: 0.35, fama: 6 },
          personalidad: { ambicion: 4 },
          relaciones: { representante: { respeto: 6 } },
          etiquetas: ['dinero:cobra-todo'],
          balance: 2,
        },
        resultado: 'Le pusiste precio. Pagó sin discutir, que es lo que más te sorprendió.',
      },
      {
        id: 'no',
        texto: 'Decir que no',
        pista: 'Menos ruido, menos alcance.',
        efectos: { vida: { exposicion: -4 }, personalidad: { profesionalismo: 4 }, balance: 1 },
        resultado: 'Le dijiste que no y lo contó en un video. Duró dos días.',
      },
    ],
  },
  {
    id: 'social-marca',
    categoria: 'social',
    rareza: 'infrecuente',
    titulo: 'La marca de la calle',
    texto:
      'Una marca de ropa que arrancó en tu barrio te ofrece ser su cara. Pagan poco y venden en toda la ciudad.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 25, temporadasMin: 2 },
    cooldown: 8,
    opciones: [
      {
        id: 'gratis',
        texto: 'Hacerlo gratis',
        pista: 'No entra un peso. Entra otra cosa.',
        efectos: {
          vida: { carinoDeLaHinchada: 14, fama: 6, felicidad: 8 },
          personalidad: { lealtad: 6 },
          etiquetas: ['leyenda:hinchada', 'social:del-barrio'],
          balance: 6,
        },
        resultado: 'No cobraste un peso. En tu barrio no se habla de otra cosa desde entonces.',
      },
      {
        id: 'socio',
        texto: 'Entrar como socio',
        pista: 'Si funciona, es tuyo. Si no, también.',
        efectos: { vida: { dinero: -0.5 }, personalidad: { ambicion: 6 }, etiquetas: ['dinero:negocio'] },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { dinero: 2.4, fama: 8 },
            titular: { texto: 'LA MARCA DE {APELLIDO} ABRE SU TERCERA TIENDA', tono: 'elogio' },
            balance: 7,
          },
          mal: { vida: { dinero: -0.4, estres: 12 }, etiquetas: ['dinero:mal-negocio'], balance: -5 },
          relatoBien: 'En dos años abrieron tres locales y ya no dependes del fútbol.',
          relatoMal: 'Cerró en dieciocho meses dejando deudas con dos proveedores. Todavía te llaman por esas facturas y tu nombre figura en la demanda.',
        },
        resultado: 'Pusiste plata y tu nombre.',
      },
      {
        id: 'cobrar-mucho',
        texto: 'Pedirles lo que pedirías a una marca grande',
        pista: 'Puede que no puedan pagarlo.',
        efectos: {
          vida: { dinero: 0.3, carinoDeLaHinchada: -8 },
          personalidad: { ego: 5 },
          balance: -1,
        },
        resultado: 'Pagaron lo que pediste y se les fue medio año de ganancia en eso.',
      },
      {
        id: 'no',
        texto: 'Decir que no',
        pista: 'Nada cambia, y a veces eso está bien.',
        efectos: { personalidad: { profesionalismo: 2 }, balance: 0 },
        resultado: 'Les dijiste que no. Un año después la marca estaba en todos lados igual.',
      },
    ],
  },
  {
    id: 'social-auto',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'Las cuatro de la mañana',
    texto:
      'Saliste tarde de una fiesta a la que no tendrías que haber ido y hay una hora de camino hasta tu casa.',
    tipoDeRecuerdo: 'caos',
    condiciones: { conEtiquetas: ['social:noctambulo'], edadMin: 19 },
    cooldown: 6,
    opciones: [
      {
        id: 'chofer',
        texto: 'Llamar a alguien que te lleve',
        pista: 'Veinte minutos de espera y ningún problema.',
        efectos: {
          vida: { dinero: -0.02, estres: -4 },
          personalidad: { profesionalismo: 5 },
          balance: 3,
        },
        resultado: 'Esperaste sentado en la vereda hasta que llegó. Llegaste a tu casa a las cinco.',
      },
      {
        id: 'manejar',
        texto: 'Manejar tú',
        pista: 'Es tarde, estás cansado y la carretera está vacía. Puede terminar muy mal.',
        efectos: { vida: { estres: 6 }, personalidad: { riesgo: 6 }, etiquetas: ['caos:volante'] },
        riesgo: {
          prob: 0.82,
          bien: { balance: -1 },
          mal: {
            vida: { condicion: -30, reputacion: -20, exposicion: 26 },
            titular: { texto: 'EL AUTO DE {APELLIDO}, CONTRA UN POSTE A LAS CUATRO DE LA MAÑANA', tono: 'polemica' },
            etiquetas: ['caos:accidente'],
            luego: { eventoId: 'caos-otra-vez-al-volante', enCapitulos: 2 },
            balance: -14,
          },
          relatoBien: 'Llegaste bien. Al otro día ni te acordabas del riesgo que corriste.',
          relatoMal: 'Frenaste tarde. Saliste caminando de milagro, pero la rodilla no volvió a ser la misma.',
        },
        resultado: 'Subiste al auto.',
      },
      {
        id: 'quedarse',
        texto: 'Quedarte a dormir donde estás',
        pista: 'Mañana hay que explicar dónde estuviste.',
        efectos: {
          vida: { condicion: -4, exposicion: 6 },
          relaciones: { dt: { rencor: 5 } },
          balance: 0,
        },
        resultado: 'Dormiste ahí y llegaste al entrenamiento con la ropa del día anterior. El técnico no dijo nada, te dejó en el banco el domingo y ahí se entendió todo.',
      },
      {
        id: 'club',
        texto: 'Llamar al club y contar la verdad',
        pista: 'Se enteran igual. Mejor por ti.',
        efectos: {
          vida: { estres: 8 },
          relaciones: { club: { confianza: 12, respeto: 8 }, dt: { rencor: -6 } },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['social:sincero'],
          balance: 4,
        },
        resultado: 'Llamaste al utilero a las cuatro y media. Te fue a buscar sin decir una palabra.',
      },
    ],
  },
  {
    id: 'social-yate',
    categoria: 'social',
    rareza: 'raro',
    titulo: 'Vacaciones con público',
    texto:
      'Te invitan a un yate en pretemporada. Van dos cantantes, un tenista y todo el que quiera una foto.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 45, edadMin: 22 },
    cooldown: 8,
    opciones: [
      {
        id: 'ir',
        texto: 'Ir y disfrutarlo',
        pista: 'Vuelves descansado o vuelves en las portadas. A veces las dos.',
        efectos: {
          vida: { felicidad: 16, fama: 12, exposicion: 16, condicion: -8 },
          personalidad: { vidaSocial: 6 },
          etiquetas: ['social:jet-set'],
        },
        riesgo: {
          prob: 0.55,
          bien: { vida: { estres: -18, forma: 5 }, balance: 3 },
          mal: {
            vida: { reputacion: -10 },
            relaciones: { hinchada: { rencor: 12 } },
            titular: { texto: 'MIENTRAS EL CLUB PIERDE, {APELLIDO} EN UN YATE', tono: 'polemica' },
            balance: -6,
          },
          relatoBien: 'Volviste descansado como no lo estabas en años y sin una sola foto incómoda. Arrancaste el torneo metiendo en los tres primeros partidos.',
          relatoMal: 'La foto salió el mismo día que el club perdió en casa. La hinchada no lo olvidó.',
        },
        resultado: 'Fuiste diez días.',
      },
      {
        id: 'discreto',
        texto: 'Ir sin teléfono y sin fotos',
        pista: 'Lo mismo, pero nadie se entera.',
        efectos: {
          vida: { felicidad: 12, estres: -14, exposicion: -4 },
          personalidad: { profesionalismo: 3 },
          balance: 4,
        },
        resultado: 'Dejaste el teléfono en la cabina toda la semana. Nadie supo que estuviste ahí.',
      },
      {
        id: 'entrenar',
        texto: 'No ir: pretemporada en serio',
        pista: 'Llegas fino a agosto.',
        efectos: {
          vida: { condicion: 14, forma: 10, felicidad: -6 },
          personalidad: { profesionalismo: 8 },
          relaciones: { dt: { respeto: 10 } },
          etiquetas: ['futbol:obsesivo'],
          balance: 6,
        },
        resultado: 'Hiciste la pretemporada completa mientras medio plantel volvía con tres kilos de más. En agosto eras el único que llegaba a los noventa minutos entero.',
      },
      {
        id: 'familia',
        texto: 'Irte con tu familia a donde sea',
        pista: 'Ni fotos ni entrenamiento. Vacaciones de verdad.',
        efectos: {
          vida: { felicidad: 20, estres: -20, condicion: 4 },
          personalidad: { lealtad: 4 },
          etiquetas: ['vida:familia'],
          balance: 5,
        },
        resultado: 'Diez días en la playa con los tuyos, sin que nadie supiera dónde estabas.',
      },
    ],
  },
];
