/**
 * El salseo: la vida de futbolista contada como la cuenta un programa de espectáculos.
 *
 * Este bloque existe porque un futbolista no es solo un futbolista: es la persona más filmada de su
 * ciudad, y la mitad de lo que se dice de él no pasó en una cancha. Acá viven los ampays, los
 * realities, la orquesta de cumbia, la pollería del barrio y el periodista que te espera en la puerta
 * del jato con la cámara encendida.
 *
 * Tres reglas de tono, y ninguna es negociable:
 *
 * 1. **Toda figura pública es inventada.** Salen de `personajes/`, con nombres verosímiles y de
 *    nadie: el juego inventa escándalos, y un escándalo inventado sobre alguien que existe no es un
 *    juego, es una calumnia.
 * 2. **Nada sexual y nada de drogas.** El escándalo se cuenta como lo cuenta un diario popular: con
 *    lo que insinúa, con el titular y con la cara del que tiene que explicarlo al día siguiente.
 * 3. **El resultado cuenta el desenlace.** Nunca "te ampayaron"; siempre qué pasó después de que te
 *    ampayaran.
 *
 * Y los titulares están escritos como los escribe la prensa popular de verdad: en mayúsculas, con
 * juego de palabras y sin piedad. Eso es la mitad de la gracia.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_SALSEO: Evento[] = [
  {
    id: 'salseo-ampay',
    categoria: 'prensa',
    rareza: 'comun',
    titulo: 'Te ampayaron',
    texto:
      'El programa de la noche anuncia "ampay exclusivo" con tu silueta pixelada y música de suspenso, y El Popular ya tiene la portada armada. Sales de una pollería a la una de la mañana, tres días antes del clásico con {rival}.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { famaMin: 25, temporadasMin: 1 },
    cooldown: 4,
    peso: 1.7,
    opciones: [
      {
        id: 'adelantarse',
        texto: 'Subir tú el video completo antes que ellos',
        pista: 'Les quitas la exclusiva. O les das el titular servido.',
        efectos: { vida: { exposicion: 18 }, personalidad: { carisma: 5 } },
        riesgo: {
          prob: 0.6,
          bien: {
            vida: { fama: 16, carinoDeLaHinchada: 14, reputacion: 8 },
            relaciones: { prensa: { respeto: 12 } },
            titular: { texto: 'EL "AMPAY" DE {APELLIDO} ERA UN CUARTO DE POLLO', tono: 'elogio' },
            balance: 6,
          },
          mal: {
            vida: { exposicion: 22, reputacion: -10 },
            relaciones: { club: { rencor: 10 } },
            titular: { texto: '{APELLIDO} SE AMPAYÓ SOLITO', tono: 'polemica' },
            balance: -5,
          },
          relatoBien:
            'Subiste el video entero: eras tú, un cuarto de pollo y tu primo. El programa tuvo que emitir el "ampay" con la gente ya riéndose y el conductor cambió de tema en dos minutos.',
          relatoMal:
            'Subiste el video y en el segundo cuarenta se escuchaba a alguien decir tu apodo y el nombre de un local que no era la pollería. Ese audio duró más que el ampay original.',
        },
        resultado: 'Publicaste el video completo a las ocho de la noche, una hora antes del programa.',
      },
      {
        id: 'chiste',
        texto: 'Ir al programa a reírte de ti mismo',
        pista: 'Te ganas al país o quedas como el payaso de la semana.',
        efectos: { vida: { exposicion: 20, fama: 10 }, personalidad: { carisma: 6 } },
        riesgo: {
          prob: 0.62,
          bien: {
            vida: { reputacion: 12, carinoDeLaHinchada: 18, felicidad: 10 },
            relaciones: { prensa: { confianza: 16 } },
            titular: { texto: '{APELLIDO} FUE, SE RIÓ Y SE LLEVÓ EL PROGRAMA', tono: 'elogio' },
            etiquetas: ['prensa:televisivo'],
            balance: 7,
          },
          mal: {
            vida: { reputacion: -14 },
            relaciones: { club: { rencor: 14 }, dt: { rencor: 8 } },
            titular: { texto: 'EN EL CLUB NO LES CAUSÓ GRACIA EL PASEO DE {APELLIDO} POR LA TELE', tono: 'duda' },
            balance: -6,
          },
          relatoBien:
            'Fuiste, pediste un cuarto de pollo en vivo y le convidaste al conductor. El clip llegó a tres millones y la hinchada te sacó una canción con la palabra "pollería" adentro.',
          relatoMal:
            'Fuiste, hiciste chistes veinte minutos y no hablaste de fútbol ni una vez. El técnico lo vio, no dijo nada y el domingo empezaste en el banco.',
        },
        resultado: 'Aceptaste la invitación al programa de la noche.',
      },
      {
        id: 'callar',
        texto: 'No decir nada y jugar el clásico',
        pista: 'El domingo tapa todo. Para bien o para mal.',
        efectos: { vida: { estres: 10 }, personalidad: { profesionalismo: 6 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { carinoDeLaHinchada: 20, confianza: 14, forma: 8 },
            titular: { texto: 'DOS GOLES Y CERO PALABRAS: {APELLIDO} CONTESTÓ EN LA CANCHA', tono: 'elogio' },
            balance: 7,
          },
          mal: {
            vida: { carinoDeLaHinchada: -18, exposicion: 16, confianza: -12 },
            atributos: { tiro: -1 },
            titular: { texto: 'DEL POLLO AL BANCO: LA SEMANA DE {APELLIDO}', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'No contestaste una sola pregunta y el domingo metiste dos en el clásico. El conductor del programa tuvo que felicitarte al aire con la cara torcida.',
          relatoMal:
            'No contestaste nada y el domingo jugaste los peores cuarenta minutos del año. El lunes pasaron el ampay otra vez, ahora con las imágenes del partido de fondo.',
        },
        resultado: 'No dijiste una palabra en toda la semana.',
      },
      {
        id: 'demandar',
        texto: 'Amenazar con demandarlos',
        pista: 'Nadie que amenaza a un programa de espectáculos sale ganando.',
        efectos: {
          vida: { dinero: -0.15, exposicion: 24, reputacion: -8 },
          relaciones: { prensa: { rencor: 24 } },
          personalidad: { temperamento: 7 },
          titular: { texto: '{APELLIDO} MANDÓ ABOGADO Y EL PROGRAMA LE DEDICÓ MEDIA HORA MÁS', tono: 'polemica' },
          etiquetas: ['prensa:enemigo'],
          balance: -5,
        },
        resultado:
          'Tu abogado mandó una carta y el programa la leyó en vivo, palabra por palabra, con música de suspenso. Le dedicaron media hora más y desde entonces cada partido tuyo tiene su comentario.',
      },
    ],
  },
  {
    id: 'salseo-reality',
    categoria: 'social',
    rareza: 'infrecuente',
    titulo: 'Te quieren en el reality',
    texto:
      'Los productores de "Guerreros del Sur" te ofrecen entrar como refuerzo por cuatro semanas. Pagan bien, es en horario de entrenamiento y hay que competir en una piscina con arnés.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 35, edadMin: 20 },
    cooldown: 8,
    opciones: [
      {
        id: 'entrar',
        texto: 'Entrar y ganar el reality',
        pista: 'El país entero te va a conocer. El técnico también se va a enterar.',
        efectos: {
          vida: { dinero: 0.8, fama: 26, exposicion: 26, condicion: -8 },
          personalidad: { carisma: 6, vidaSocial: 6, profesionalismo: -5 },
          etiquetas: ['social:figureti'],
        },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { felicidad: 14, carinoDeLaHinchada: 10 },
            titular: { texto: 'DE LA CANCHA A LA PISCINA: {APELLIDO} GANÓ Y SE LLEVÓ TODO', tono: 'elogio' },
            balance: 4,
          },
          mal: {
            vida: { condicion: -18, forma: -16, reputacion: -14 },
            atributos: { ritmo: -2, fisico: -1 },
            relaciones: { dt: { rencor: 20 }, club: { rencor: 14 } },
            titular: { texto: 'SE LESIONÓ EN LA PISCINA: EL CLUB LE ABRIÓ EXPEDIENTE A {APELLIDO}', tono: 'polemica' },
            balance: -10,
          },
          relatoBien:
            'Ganaste el reality, cobraste el premio y volviste al plantel con el país entero conociéndote. El club terminó vendiendo tres mil camisetas con tu nombre ese mes.',
          relatoMal:
            'Te doblaste el tobillo en la prueba del arnés en el capítulo tres. El club te abrió expediente, la mutual no cubrió nada y volviste a jugar recién en agosto.',
        },
        resultado: 'Firmaste por cuatro semanas de reality.',
      },
      {
        id: 'una-noche',
        texto: 'Ir una sola noche como invitado',
        pista: 'La fama sin el riesgo. Casi.',
        efectos: {
          vida: { dinero: 0.2, fama: 12, exposicion: 12 },
          personalidad: { carisma: 4 },
          balance: 3,
        },
        resultado:
          'Fuiste un miércoles, jugaste una prueba de habilidad, la ganaste y te fuiste. Salió en todos los portales al día siguiente y no faltaste a un solo entrenamiento.',
      },
      {
        id: 'condicion',
        texto: 'Aceptar solo si graban en tus horarios libres',
        pista: 'Menos plata, cero problemas con el club.',
        efectos: {
          vida: { dinero: 0.4, fama: 14, exposicion: 14 },
          relaciones: { club: { confianza: 10 } },
          personalidad: { profesionalismo: 6 },
          balance: 5,
        },
        resultado:
          'Negociaron y grabaron los lunes, que es tu día libre. El club dio el visto bueno por escrito y hasta te prestaron la camiseta para las promos.',
      },
      {
        id: 'no',
        texto: 'Decir que no: eres futbolista, no artista',
        pista: 'Nada cambia. Y a alguien le va a gustar eso.',
        efectos: {
          vida: { exposicion: -8, forma: 5 },
          relaciones: { dt: { respeto: 12 } },
          personalidad: { profesionalismo: 8, vidaSocial: -4 },
          balance: 4,
        },
        resultado:
          'Dijiste que estabas en otra y lo contaron igual: "el que le dijo no al reality". El técnico lo leyó, te lo comentó en el desayuno y esa temporada jugaste todos los partidos.',
      },
    ],
  },
  {
    id: 'salseo-cumbia',
    categoria: 'social',
    rareza: 'infrecuente',
    titulo: 'La orquesta te escribió una canción',
    texto:
      'La orquesta de cumbia más escuchada de la región sacó un tema con tu apellido en el coro. Te invitan a subir al escenario el sábado, en un concierto de doce mil personas.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 30, temporadasMin: 2 },
    cooldown: 6,
    opciones: [
      {
        id: 'subir',
        texto: 'Subir y cantar el coro',
        pista: 'Va a ser el video de la semana. Cantes bien o cantes mal.',
        efectos: { vida: { fama: 20, exposicion: 20, felicidad: 12 }, personalidad: { carisma: 6 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { carinoDeLaHinchada: 22, reputacion: 6 },
            relaciones: { hinchada: { confianza: 20 } },
            titular: { texto: '{APELLIDO} CANTÓ, EL ESTADIO APRENDIÓ: LA CUMBIA DEL AÑO', tono: 'elogio' },
            etiquetas: ['leyenda:hinchada'],
            balance: 6,
          },
          mal: {
            vida: { reputacion: -10, exposicion: 14 },
            titular: { texto: 'MEJOR QUÉDATE EN LA CANCHA: EL SOLO DE {APELLIDO}', tono: 'polemica' },
            balance: -3,
          },
          relatoBien:
            'Subiste, cantaste desafinado y las doce mil personas lo cantaron por ti. La cumbia se volvió el tema del estadio y todavía la ponen cuando entras al campo.',
          relatoMal:
            'Subiste, agarraste el micrófono y te comiste dos versos. El video con el título "el peor coro de la historia" lo vieron ocho millones y en la cancha te lo cantan al revés.',
        },
        resultado: 'Subiste al escenario el sábado a la medianoche.',
      },
      {
        id: 'aparecer',
        texto: 'Ir, saludar y no cantar',
        pista: 'La foto sin el ridículo.',
        efectos: {
          vida: { fama: 12, carinoDeLaHinchada: 12, felicidad: 8 },
          personalidad: { carisma: 4 },
          balance: 5,
        },
        resultado:
          'Subiste, levantaste la mano, te sacaste la foto con el cantante y bajaste. Esa foto fue portada de dos diarios y ni una sola nota habló de tu voz.',
      },
      {
        id: 'regalias',
        texto: 'Pedir que te den un porcentaje del tema',
        pista: 'Es tu apellido. También es su canción.',
        efectos: { vida: { dinero: 0.5, carinoDeLaHinchada: -10 }, personalidad: { ambicion: 6 } },
        riesgo: {
          prob: 0.5,
          bien: { vida: { dinero: 1.2 }, balance: 3 },
          mal: {
            vida: { reputacion: -12, carinoDeLaHinchada: -12 },
            titular: { texto: '"LE PEDÍ UN SALUDO Y ME MANDÓ UN ABOGADO", DIJO EL CANTANTE', tono: 'polemica' },
            balance: -6,
          },
          relatoBien:
            'Aceptaron darte un porcentaje y el tema explotó: cobraste durante tres años algo que ni sabías que existía.',
          relatoMal:
            'El cantante lo contó en una entrevista y la frase se hizo meme. Sacaron el tema de todas las plataformas y en la tribuna dejaron de cantarlo.',
        },
        resultado: 'Le mandaste una carta pidiendo tu parte.',
      },
      {
        id: 'ignorar',
        texto: 'Agradecer por mensaje y no ir',
        pista: 'Amable y sin ruido.',
        efectos: {
          vida: { carinoDeLaHinchada: 4, condicion: 3, forma: 3 },
          personalidad: { profesionalismo: 5 },
          balance: 3,
        },
        resultado:
          'Mandaste un mensaje agradeciendo y te quedaste en tu casa durmiendo. El domingo corriste más que nadie y el cantante te dedicó el tema igual.',
      },
    ],
  },
  {
    id: 'salseo-primo-manager',
    categoria: 'relaciones',
    rareza: 'comun',
    titulo: 'Tu primo se hizo tu mánager',
    texto:
      'Tu primo imprimió tarjetas que dicen "representante de imagen" y ya está cerrando cosas por su cuenta. Ayer prometió tu presencia en la inauguración de una cevichería.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { famaMin: 25, temporadasMin: 2 },
    cooldown: 6,
    opciones: [
      {
        id: 'formalizar',
        texto: 'Ponerlo a trabajar en serio, con sueldo y reglas',
        pista: 'Nadie te va a robar. Nadie sabe hacerlo tampoco.',
        efectos: { vida: { dinero: -0.2 }, personalidad: { lealtad: 7 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { dinero: 0.6, felicidad: 10, estres: -8 },
            relaciones: { representante: { confianza: 14 } },
            etiquetas: ['vida:familia'],
            balance: 5,
          },
          mal: {
            vida: { dinero: -0.5, estres: 18, reputacion: -8 },
            relaciones: { representante: { rencor: 14 } },
            etiquetas: ['vida:familia-rota'],
            balance: -6,
          },
          relatoBien:
            'Lo mandaste a un curso, le pusiste sueldo y reglas por escrito. En dos años te consiguió tres contratos y aprendió a decir que no, que era lo único que faltaba.',
          relatoMal:
            'Firmó dos acuerdos sin leerlos y uno tenía exclusividad de por vida. Te costó una demanda, un almuerzo familiar arruinado y dos Navidades sin hablarse.',
        },
        resultado: 'Le pusiste sueldo, reglas y un curso pagado.',
      },
      {
        id: 'cortar',
        texto: 'Cortarlo de raíz delante de toda la familia',
        pista: 'Se termina hoy. Y se cuenta veinte años.',
        efectos: {
          vida: { felicidad: -12, estres: -6 },
          personalidad: { lealtad: -6, profesionalismo: 6 },
          etiquetas: ['vida:familia-rota'],
          balance: 0,
        },
        resultado:
          'Se lo dijiste en un almuerzo de domingo, con tu abuela escuchando. Se levantó de la mesa, no volvió a esa casa y tu tía todavía te lo recuerda cada vez que se cruzan.',
      },
      {
        id: 'ir-a-la-cevicheria',
        texto: 'Ir a la cevichería y cumplir lo que prometió',
        pista: 'Un sábado perdido. Y un primo que aprende que sí se puede.',
        efectos: {
          vida: { felicidad: 8, carinoDeLaHinchada: 12, exposicion: 8, dinero: 0.05 },
          personalidad: { carisma: 5, lealtad: 4 },
          etiquetas: ['social:del-barrio'],
          balance: 4,
        },
        resultado:
          'Fuiste, firmaste ciento veinte camisetas y comiste ceviche gratis. El dueño puso tu foto en la pared, la cevichería se llenó tres meses y tu primo lloró de emoción en el estacionamiento.',
      },
      {
        id: 'agencia',
        texto: 'Pasarle todo a una agencia y dejarlo mirando',
        pista: 'Profesional. Y con un resentido en la familia.',
        efectos: {
          vida: { dinero: 0.4, estres: -10 },
          relaciones: { representante: { confianza: 12 } },
          personalidad: { profesionalismo: 7, lealtad: -5 },
          balance: 2,
        },
        resultado:
          'La agencia le pidió que devolviera las tarjetas. Todo empezó a funcionar mejor y tu primo dejó de responderte los mensajes durante año y medio.',
      },
    ],
  },
  {
    id: 'salseo-figureti',
    categoria: 'prensa',
    rareza: 'infrecuente',
    titulo: 'Te dicen figureti',
    texto:
      'Líbero publicó una tabla con tus apariciones en televisión de este mes al lado de tus goles. Los números no te ayudan y el título es "¿futbolista o invitado?".',
    tipoDeRecuerdo: 'polemica',
    condiciones: { vida: { exposicion: [55, 100] }, temporadasMin: 2 },
    cooldown: 5,
    opciones: [
      {
        id: 'desaparecer',
        texto: 'Desaparecer de todo por tres meses',
        pista: 'Vuelves siendo futbolista otra vez. Si el fútbol acompaña.',
        efectos: {
          vida: { exposicion: -26, fama: -8, forma: 8, condicion: 6, estres: -12 },
          personalidad: { profesionalismo: 9, vidaSocial: -6 },
          etiquetas: ['social:reservado'],
          balance: 6,
        },
        resultado:
          'Borraste las redes, no diste una nota en tres meses y metiste nueve goles en ese tramo. El mismo panelista abrió su programa diciendo que se había equivocado con vos... y lo dijo mal, con tu apellido mal pronunciado.',
      },
      {
        id: 'mas-television',
        texto: 'Salir en más programas todavía',
        pista: 'Si te van a criticar por eso, que valga la pena.',
        efectos: {
          vida: { fama: 22, exposicion: 22, dinero: 0.3 },
          personalidad: { ego: 8, carisma: 5 },
          etiquetas: ['social:figureti'],
        },
        riesgo: {
          prob: 0.4,
          bien: {
            vida: { dinero: 0.8, felicidad: 10 },
            titular: { texto: 'DE FIGURETI A FIGURA: {APELLIDO} TIENE PROGRAMA PROPIO', tono: 'neutro' },
            balance: 3,
          },
          mal: {
            vida: { forma: -14, reputacion: -14 },
            atributos: { ritmo: -1, tiro: -1 },
            relaciones: { dt: { rencor: 16 }, hinchada: { rencor: 12 } },
            titular: { texto: 'MÁS PANTALLA QUE PELOTA: {APELLIDO} AL BANCO', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'Terminaste conduciendo un segmento los jueves y cobrando por eso. Al año siguiente firmaste una campaña nacional y en la cancha no se te notó nada.',
          relatoMal:
            'Cinco programas en un mes, tres kilos de más y el puesto perdido. El técnico contó en rueda de prensa que "algunos confunden la profesión" sin dar nombres, y no hizo falta.',
        },
        resultado: 'Aceptaste todas las invitaciones que llegaron.',
      },
      {
        id: 'reirse',
        texto: 'Contestar con un chiste y un dato',
        pista: 'La forma más elegante de callar a alguien.',
        efectos: {
          vida: { reputacion: 12, fama: 8, carinoDeLaHinchada: 10 },
          relaciones: { prensa: { respeto: 14 } },
          personalidad: { carisma: 7 },
          titular: { texto: '"CUENTE TAMBIÉN MIS ASISTENCIAS": LA RESPUESTA DE {APELLIDO}', tono: 'elogio' },
          balance: 6,
        },
        resultado:
          'Le contestaste que si iba a contar apariciones contara también las asistencias, y las leíste una por una en vivo. El clip se compartió más que la crítica y el panelista se disculpó al día siguiente en el mismo programa. Líbero lo puso de portada con tus números.',
      },
      {
        id: 'donar',
        texto: 'Anunciar que todo lo de televisión va a tu barrio',
        pista: 'Nadie puede criticar eso. Y hay que cumplirlo.',
        efectos: {
          vida: { dinero: -0.4, reputacion: 20, carinoDeLaHinchada: 22, exposicion: 10 },
          personalidad: { lealtad: 8 },
          etiquetas: ['leyenda:hinchada', 'social:del-barrio'],
          titular: { texto: '{APELLIDO} PONE UNA CANCHA DE GRASS EN SU BARRIO', tono: 'elogio' },
          balance: 8,
        },
        resultado:
          'Anunciaste que cada sol de televisión iba al club del barrio y lo cumpliste: pusiste grass sintético, arcos y luces. La cancha lleva tu nombre y ahí juegan doscientos chicos por semana.',
      },
    ],
  },
  {
    id: 'salseo-mototaxi',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'Se te fue el carro',
    texto:
      'Vas tarde al entrenamiento y el tráfico está parado desde hace cuarenta minutos. Un mototaxi se te pone al lado y el conductor te reconoce.',
    tipoDeRecuerdo: 'caos',
    condiciones: { temporadasMin: 1 },
    cooldown: 8,
    opciones: [
      {
        id: 'subirse',
        texto: 'Subirte al mototaxi con el bolso y todo',
        pista: 'Llegas. Y alguien lo va a filmar, seguro.',
        efectos: { vida: { exposicion: 16 }, personalidad: { carisma: 5 } },
        riesgo: {
          prob: 0.7,
          bien: {
            vida: { fama: 14, carinoDeLaHinchada: 20, felicidad: 10 },
            relaciones: { hinchada: { confianza: 18 }, dt: { confianza: 6 } },
            titular: { texto: 'LLEGÓ EN MOTOTAXI Y ENTRENÓ: EL VIDEO DE {APELLIDO} QUE EMOCIONÓ AL PAÍS', tono: 'elogio' },
            etiquetas: ['leyenda:hinchada', 'social:del-barrio'],
            balance: 7,
          },
          mal: {
            vida: { condicion: -12, reputacion: -6, exposicion: 18 },
            relaciones: { club: { rencor: 12 } },
            titular: { texto: 'EL CLUB LE PROHÍBE A {APELLIDO} VOLVER A SUBIRSE A UN MOTOTAXI', tono: 'duda' },
            balance: -4,
          },
          relatoBien:
            'Llegaste doce minutos antes, con el casco del mototaxista puesto y el bolso en la falda. El video llegó a cuatro millones, el conductor salió en televisión y el club le regaló una camiseta firmada.',
          relatoMal:
            'A tres cuadras del predio el mototaxi frenó de golpe y te golpeaste la rodilla contra el fierro. Nada grave, pero el club te prohibió por contrato subirte a otro y te multó por el susto.',
        },
        resultado: 'Le pediste que te llevara y te subiste con el bolso en la falda.',
      },
      {
        id: 'esperar',
        texto: 'Quedarte en el carro y avisar que llegas tarde',
        pista: 'Correcto y aburrido.',
        efectos: {
          vida: { estres: 8 },
          relaciones: { dt: { confianza: -6 } },
          personalidad: { profesionalismo: 3 },
          balance: 1,
        },
        resultado:
          'Llamaste al utilero, avisaste y llegaste cincuenta minutos tarde. El técnico te hizo entrenar aparte y no dijo una palabra, que a veces es peor.',
      },
      {
        id: 'correr',
        texto: 'Bajarte y correr las veinte cuadras que faltan',
        pista: 'Llegas cansado. Y con una historia.',
        efectos: {
          vida: { condicion: -6, carinoDeLaHinchada: 14, forma: 4, exposicion: 12 },
          relaciones: { dt: { respeto: 14 } },
          personalidad: { profesionalismo: 7 },
          titular: { texto: 'CORRIÓ VEINTE CUADRAS PARA NO FALTAR: {APELLIDO}', tono: 'elogio' },
          balance: 6,
        },
        resultado:
          'Dejaste el carro estacionado en doble fila y corriste veinte cuadras con el bolso. Llegaste empapado, entrenaste igual y el preparador dijo que era el mejor calentamiento que había visto.',
      },
      {
        id: 'no-ir',
        texto: 'Dar la vuelta y no ir',
        pista: 'Nadie llega. Todos se enteran.',
        efectos: {
          vida: { dinero: -0.05, forma: -6 },
          relaciones: { dt: { rencor: 16 }, companeros: { confianza: -8 } },
          personalidad: { profesionalismo: -7 },
          etiquetas: ['futbol:olvidado'],
          balance: -5,
        },
        resultado:
          'Diste la vuelta y te fuiste a tu casa. Te multaron con el diez por ciento del mes, el técnico te dejó fuera del viaje y en el vestuario alguien contó el chiste del tráfico todo el año.',
      },
    ],
  },
  {
    id: 'salseo-pollada',
    categoria: 'social',
    rareza: 'comun',
    titulo: 'La pollada del barrio',
    texto:
      'En tu barrio organizan una pollada para operar al hijo de un vecino. Te invitaron a las siete de la tarde y hay trescientas personas esperando ver si apareces.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'ir-y-quedarse',
        texto: 'Ir, servir platos y quedarte hasta el final',
        pista: 'Ese barrio no te va a olvidar nunca.',
        efectos: {
          vida: { carinoDeLaHinchada: 26, felicidad: 18, reputacion: 12, dinero: -0.05 },
          relaciones: { hinchada: { confianza: 22, respeto: 18 } },
          personalidad: { lealtad: 9, carisma: 6 },
          etiquetas: ['leyenda:hinchada', 'social:del-barrio'],
          titular: { texto: '{APELLIDO} SIRVIÓ POLLO Y JUNTÓ PARA LA OPERACIÓN', tono: 'elogio' },
          balance: 9,
        },
        resultado:
          'Fuiste, te pusiste el mandil y sirviste platos cuatro horas. Se juntó el doble de lo que faltaba, el chico se operó en dos semanas y en la puerta de esa casa hay una foto tuya con el mandil puesto.',
      },
      {
        id: 'pagar',
        texto: 'Pagar la operación completa y no ir',
        pista: 'Resuelves el problema. No la foto.',
        efectos: {
          vida: { dinero: -0.7, reputacion: 16, carinoDeLaHinchada: 8 },
          personalidad: { lealtad: 6, ego: -4 },
          balance: 6,
        },
        resultado:
          'Transferiste todo el lunes y pediste que no lo contaran. Se enteró el barrio igual, en dos semanas lo sabía la ciudad y a ti te siguió incomodando cada vez que te lo agradecían.',
      },
      {
        id: 'aparecer',
        texto: 'Pasar veinte minutos y sacarte fotos',
        pista: 'Cumples. A medias.',
        efectos: {
          vida: { carinoDeLaHinchada: 8, exposicion: 10, felicidad: 4 },
          personalidad: { carisma: 3 },
          balance: 2,
        },
        resultado:
          'Llegaste, te sacaste cuarenta fotos y te fuiste antes de las ocho. Se juntó lo que se tenía que juntar, pero alguien dijo en voz alta "vino por la foto" y esa frase quedó dando vueltas.',
      },
      {
        id: 'no-ir',
        texto: 'No ir y no explicar nada',
        pista: 'Trescientas personas esperando.',
        efectos: {
          vida: { carinoDeLaHinchada: -22, reputacion: -12 },
          relaciones: { hinchada: { rencor: 20 } },
          personalidad: { lealtad: -8 },
          etiquetas: ['social:aparte'],
          balance: -7,
        },
        resultado:
          'No fuiste y no avisaste. La pollada se hizo igual, faltó plata y el papá del chico salió en una nota diciendo que "el que se hace grande se olvida". En ese barrio te lo recordaron toda la carrera.',
      },
    ],
  },
  {
    id: 'salseo-urraca',
    categoria: 'prensa',
    rareza: 'raro',
    titulo: 'Tienes cámara en la puerta',
    texto:
      'Hay una camioneta parada frente a tu casa desde el martes. Cuando sales, dos personas bajan corriendo con la cámara ya encendida y te preguntan por algo que no hiciste.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { famaMin: 55, temporadasMin: 4 },
    cooldown: 6,
    opciones: [
      {
        id: 'hablar',
        texto: 'Parar, mirar a la cámara y contestar todo',
        pista: 'Puede terminar el asunto en dos minutos. O empezar otro.',
        efectos: { vida: { exposicion: 18 }, personalidad: { carisma: 5 } },
        riesgo: {
          prob: 0.58,
          bien: {
            vida: { reputacion: 16, carinoDeLaHinchada: 12 },
            relaciones: { prensa: { respeto: 16 } },
            titular: { texto: 'PARÓ, HABLÓ Y CERRÓ EL TEMA: {APELLIDO} EN LA PUERTA DE SU CASA', tono: 'elogio' },
            balance: 6,
          },
          mal: {
            vida: { reputacion: -14, exposicion: 22, estres: 16 },
            titular: { texto: 'LA CARA DE {APELLIDO} CUANDO LE PREGUNTARON POR LA OTRA COSA', tono: 'polemica' },
            balance: -7,
          },
          relatoBien:
            'Paraste, contestaste las cuatro preguntas mirando a la cámara y hasta les ofreciste agua. Emitieron la nota completa, La República publicó tu versión palabra por palabra y el asunto murió esa misma noche.',
          relatoMal:
            'Contestaste tres preguntas bien y en la cuarta te sacaron un tema que no esperabas. Tu cara de esos dos segundos se convirtió en la placa de apertura del programa por seis semanas.',
        },
        resultado: 'Paraste en la puerta y les dijiste que preguntaran lo que quisieran.',
      },
      {
        id: 'seco',
        texto: 'Decir "buenos días" y seguir caminando',
        pista: 'No das nada. No pierdes nada.',
        efectos: {
          vida: { exposicion: 8, estres: 8 },
          personalidad: { profesionalismo: 6 },
          relaciones: { prensa: { rencor: 8 } },
          balance: 3,
        },
        resultado:
          'Dijiste "buenos días" y subiste al carro sin acelerar. Emitieron los once segundos de video tres veces y sin declaración no había nota: al jueves ya estaban en la puerta de otro.',
      },
      {
        id: 'invitarlos',
        texto: 'Invitarlos a desayunar y hablar sin cámara',
        pista: 'Nadie hace esto. Puede desarmar todo.',
        efectos: { vida: { estres: -8 }, personalidad: { carisma: 7 } },
        riesgo: {
          prob: 0.65,
          bien: {
            relaciones: { prensa: { confianza: 22, respeto: 16 } },
            vida: { reputacion: 14, exposicion: -10 },
            etiquetas: ['prensa:aliado'],
            balance: 7,
          },
          mal: {
            vida: { reputacion: -12, exposicion: 20 },
            relaciones: { prensa: { rencor: 12 } },
            balance: -5,
          },
          relatoBien:
            'Los hiciste pasar, les diste café y hablaron una hora sin grabar. Esa noche no hubo nota, y desde entonces te llaman antes de publicar cualquier cosa tuya.',
          relatoMal:
            'Entraron, tomaron café y grabaron con el celular en la mesa. Emitieron el audio con el título "lo que dijo en su cocina" y no volviste a confiar en nadie con una libreta.',
        },
        resultado: 'Les abriste la puerta y pusiste la cafetera.',
      },
      {
        id: 'mudarse',
        texto: 'Mudarte esa misma semana',
        pista: 'Cara, incómoda y definitiva.',
        efectos: {
          vida: { dinero: -0.6, exposicion: -22, estres: -14, felicidad: 6 },
          personalidad: { vidaSocial: -4 },
          etiquetas: ['social:reservado'],
          balance: 4,
        },
        resultado:
          'Empaquetaste en cuatro días y te fuiste a un edificio con portería y estacionamiento cerrado. No volvieron a filmarte en tu puerta y tampoco volviste a saludar a un vecino.',
      },
    ],
  },
  {
    id: 'salseo-chibolo',
    categoria: 'legado',
    rareza: 'infrecuente',
    titulo: 'El chibolo que quiere ser tú',
    texto:
      'Un chico de quince de la cantera imita todo lo que haces: tus botines, tu festejo, tu forma de pararse en los tiros libres. Ayer le preguntaron a quién admiraba y dijo tu nombre en televisión.',
    tipoDeRecuerdo: 'legado',
    condiciones: { temporadasMin: 5, edadMin: 26 },
    cooldown: 6,
    opciones: [
      {
        id: 'apadrinar',
        texto: 'Tomarlo bajo tu ala en serio',
        pista: 'Puede salir un jugador. Puede salir un problema.',
        efectos: { personalidad: { carisma: 5, lealtad: 5 }, vida: { felicidad: 10 } },
        riesgo: {
          prob: 0.62,
          bien: {
            vida: { reputacion: 18, carinoDeLaHinchada: 16 },
            relaciones: { club: { respeto: 16 }, companeros: { respeto: 12 } },
            titular: { texto: 'EL CHICO QUE {APELLIDO} LLEVÓ DE LA MANO YA JUEGA EN PRIMERA', tono: 'elogio' },
            etiquetas: ['legado:maestro'],
            balance: 8,
          },
          mal: {
            vida: { felicidad: -12, reputacion: -6, estres: 12 },
            balance: -4,
          },
          relatoBien:
            'Lo llevabas a entrenar, le revisabas las notas del colegio y le prohibiste las redes un año. Debutó a los diecisiete, y en su primera entrevista dijo tu nombre otra vez.',
          relatoMal:
            'Lo cuidaste dos años y a los dieciocho se compró un carro, dejó de ir a entrenar y quedó libre. Cada vez que preguntan por él te preguntan a ti, y no sabes qué contestar.',
        },
        resultado: 'Le dijiste que a partir de mañana entrenaba contigo.',
      },
      {
        id: 'botines',
        texto: 'Regalarle tus botines y un consejo',
        pista: 'Un gesto. Nada más y nada menos.',
        efectos: {
          vida: { carinoDeLaHinchada: 12, felicidad: 8, reputacion: 8 },
          personalidad: { carisma: 4 },
          balance: 5,
        },
        resultado:
          'Le diste los botines del último clásico y le dijiste que estudiara igual. Los tiene colgados en su cuarto y los mostró en su primera entrevista, ocho años después.',
      },
      {
        id: 'frenarlo',
        texto: 'Bajarlo a tierra delante de todos',
        pista: 'Duele hoy. Puede salvarlo.',
        efectos: {
          relaciones: { companeros: { respeto: 10 } },
          personalidad: { profesionalismo: 7 },
          vida: { reputacion: 6 },
          balance: 4,
        },
        resultado:
          'Le dijiste en el vestuario, con todos escuchando, que todavía no había hecho nada. Se le llenaron los ojos, entrenó como un animal seis meses y hoy cuenta esa charla como la más importante de su vida.',
      },
      {
        id: 'ignorarlo',
        texto: 'No meterte: ya bastante tienes con lo tuyo',
        pista: 'Nada cambia para ti.',
        efectos: {
          personalidad: { ego: 3 },
          relaciones: { companeros: { confianza: -6 } },
          balance: -1,
        },
        resultado:
          'No le hablaste nunca. Se fue del club a los diecinueve sin debutar, y años después dijo en una nota que "el que era mi ídolo no me dio ni la hora".',
      },
    ],
  },
  {
    id: 'salseo-apuesta-amigos',
    categoria: 'dinero',
    rareza: 'comun',
    titulo: 'La apuesta del grupo',
    texto:
      'En el grupo del barrio armaron una polla para la fecha y te preguntan por dónde va tu partido. Son tus patas de toda la vida y hay dinero de verdad en juego.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 5,
    opciones: [
      {
        id: 'nada',
        texto: 'No decir nada y salirte del grupo',
        pista: 'Aburrido y limpísimo.',
        efectos: {
          vida: { reputacion: 8, felicidad: -4 },
          personalidad: { profesionalismo: 8 },
          balance: 4,
        },
        resultado:
          'Te saliste del grupo el mismo día y se lo dijiste sin dar explicaciones. Dos se ofendieron un mes, y cuando cuatro años después estalló un caso de apuestas en tu liga, los mismos dos te llamaron para decirte que habías tenido razón.',
      },
      {
        id: 'jugar',
        texto: 'Poner plata como cualquiera',
        pista: 'Es una polla de barrio. Y tú juegas ese partido.',
        efectos: { vida: { dinero: -0.02, felicidad: 6 }, personalidad: { riesgo: 6 } },
        riesgo: {
          prob: 0.72,
          bien: { vida: { felicidad: 8, dinero: 0.05 }, balance: 0 },
          mal: {
            vida: { reputacion: -16, exposicion: 20, estres: 18 },
            titular: { texto: 'APARECIÓ EL NOMBRE DE {APELLIDO} EN UNA POLLA CON SU PROPIO PARTIDO', tono: 'polemica' },
            etiquetas: ['amanio:coqueteo'],
            balance: -8,
          },
          relatoBien:
            'Pusiste veinte soles como todos, perdiste y pagaste las cervezas. No pasó absolutamente nada y sigue siendo el chiste del grupo.',
          relatoMal:
            'Alguien mostró la captura del grupo en un programa. Que fueran veinte soles no le importó a nadie: la federación te citó y estuviste dos meses explicando una polla de barrio.',
        },
        resultado: 'Pusiste tu plata como cualquiera del grupo.',
      },
      {
        id: 'explicarles',
        texto: 'Explicarles por qué no puedes y quedarte',
        pista: 'Cuesta una charla incómoda. Se arregla bien.',
        efectos: {
          vida: { reputacion: 10, felicidad: 6 },
          personalidad: { profesionalismo: 7, carisma: 4 },
          etiquetas: ['social:del-barrio'],
          balance: 6,
        },
        resultado:
          'Les explicaste en un audio de tres minutos que a ti eso te podía costar la carrera. Sacaron tu partido de la polla, siguieron jugando el resto y nadie volvió a preguntarte nada.',
      },
      {
        id: 'dato',
        texto: 'Darles un dato del vestuario',
        pista: 'Ellos ganan. Y tú acabas de cruzar una línea.',
        efectos: {
          vida: { felicidad: 8, estres: 14 },
          personalidad: { riesgo: 10, profesionalismo: -8 },
          etiquetas: ['amanio:coqueteo'],
          luego: { eventoId: 'dinero-apuesta-uno', enCapitulos: 1 },
          balance: -5,
        },
        resultado:
          'Les contaste que el arquero titular estaba tocado. Ganaron todos, te agradecieron con un asado, y tres semanas después un desconocido te habló en el estacionamiento sabiendo tu nombre y esa historia.',
      },
    ],
  },
];
