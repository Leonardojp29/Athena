/**
 * La prensa: lo que se dice de ti y lo que dices tú.
 *
 * Misma regla que el resto del catálogo: **el resultado cuenta el desenlace**. Una declaración no
 * termina cuando la das, termina cuando el país reacciona, y eso casi nunca es seguro: por eso la
 * mayoría de estas opciones se juegan a los dados y cuentan dos finales concretos.
 *
 * La memoria vive acá. `promesa:nunca:{rivalSlug}` es lo que permite que a los diecinueve jures que
 * jamás jugarías ahí y a los veintiocho la prensa te cite la frase con el año si firmas.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_PRENSA: Evento[] = [
  {
    id: 'prensa-jamas-jugaria',
    categoria: 'prensa',
    rareza: 'comun',
    titulo: 'La pregunta trampa',
    texto:
      'En una nota de radio te preguntan, medio en broma, si algún día jugarías en {rival}. El periodista sonríe esperando el título.',
    tipoDeRecuerdo: 'promesa',
    condiciones: { temporadasMin: 1, edadMax: 27, sinEtiquetas: ['promesa:rota'] },
    cooldown: 6,
    peso: 2.2,
    opciones: [
      {
        id: 'jamas',
        texto: '"Jamás. Nunca. Ni por todo el dinero del mundo."',
        pista: 'La tribuna te va a adorar hoy. El juego se va a acordar siempre.',
        efectos: {
          vida: { carinoDeLaHinchada: 22, exposicion: 14, fama: 8 },
          relaciones: { hinchada: { confianza: 20, respeto: 14 } },
          personalidad: { lealtad: 8, ego: 4 },
          etiquetas: ['promesa:nunca:{rivalSlug}'],
          titular: { texto: '"JAMÁS": LA FRASE DE {APELLIDO} QUE INCENDIÓ LA CIUDAD', tono: 'elogio' },
          balance: 5,
        },
        resultado:
          'Lo dijiste sin pensarlo dos veces y el audio se cortó y se compartió cincuenta mil veces esa misma noche. En la tribuna apareció un trapo con tu frase el domingo siguiente.',
      },
      {
        id: 'diplomatico',
        texto: '"Nadie sabe lo que pasa en el fútbol"',
        pista: 'La respuesta correcta. También la que nadie aplaude.',
        efectos: {
          relaciones: { prensa: { respeto: 10 } },
          vida: { carinoDeLaHinchada: -8 },
          personalidad: { profesionalismo: 6 },
          balance: 2,
        },
        resultado:
          'Contestaste como un manual y el periodista pasó a otro tema. En la tribuna alguien colgó un trapo preguntando de qué lado estabas.',
      },
      {
        id: 'chiste',
        texto: 'Contestar con una broma',
        pista: 'O te sacas el tema de encima, o el titular lo escriben ellos.',
        efectos: { personalidad: { carisma: 6 }, vida: { exposicion: 10 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { fama: 10, carinoDeLaHinchada: 8 },
            relaciones: { prensa: { confianza: 12 } },
            balance: 4,
          },
          mal: {
            vida: { carinoDeLaHinchada: -16, reputacion: -8 },
            relaciones: { hinchada: { rencor: 14 } },
            titular: { texto: 'EL "CHISTE" DE {APELLIDO} SOBRE {RIVAL} QUE NADIE FESTEJÓ', tono: 'polemica' },
            balance: -6,
          },
          relatoBien:
            'Dijiste algo tan absurdo que se rieron todos y el tema murió ahí. Al día siguiente el clip era un meme y no una polémica.',
          relatoMal:
            'Lo cortaron sin la parte donde te reías. Salió como una declaración seria y estuviste tres días explicando un chiste.',
        },
        resultado: 'Contestaste con una broma y una carcajada.',
      },
      {
        id: 'elogiar',
        texto: 'Elogiar al rival y descolocar a todos',
        pista: 'Nadie lo espera. Tu propia tribuna tampoco.',
        efectos: {
          vida: { carinoDeLaHinchada: -12, reputacion: 12 },
          relaciones: { prensa: { respeto: 14 } },
          personalidad: { carisma: 6, lealtad: -4 },
          titular: { texto: '{APELLIDO} ELOGIA AL {RIVAL} Y ENCIENDE A SU PROPIA HINCHADA', tono: 'duda' },
          balance: 1,
        },
        resultado:
          'Dijiste que era un club enorme con una historia enorme. Los del rival te aplaudieron, los tuyos te silbaron el domingo, y desde entonces te llaman "el diplomático".',
      },
    ],
  },
  {
    id: 'prensa-cumple-promesa',
    categoria: 'prensa',
    rareza: 'raro',
    titulo: 'Te citan tu propia frase',
    texto:
      'Un periodista saca en vivo tu declaración de hace años, con el año en pantalla y tu cara de niño. Debajo, tu camiseta nueva.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { conEtiquetas: ['promesa:rota'] },
    cooldown: 0,
    peso: 6,
    opciones: [
      {
        id: 'asumir',
        texto: 'Asumirlo: "cambié de opinión y me hago cargo"',
        pista: 'Sincero. La gente no siempre premia la sinceridad.',
        efectos: { personalidad: { profesionalismo: 6 } },
        riesgo: {
          prob: 0.58,
          bien: {
            vida: { reputacion: 16, carinoDeLaHinchada: 10 },
            relaciones: { prensa: { respeto: 16 }, hinchada: { confianza: 10 } },
            balance: 6,
          },
          mal: {
            vida: { carinoDeLaHinchada: -18, reputacion: -6 },
            relaciones: { hinchada: { rencor: 18 } },
            balance: -6,
          },
          relatoBien:
            'Dijiste que tenías veinte años y que la vida cambia. El conductor te dio la mano en vivo y el tema se cerró esa noche.',
          relatoMal:
            'Dijiste que la vida cambia y en la tribuna del club viejo te esperaron con una pancarta enorme con tu frase y la fecha. Duró tres años esa pancarta.',
        },
        resultado: 'Miraste la pantalla, asentiste y hablaste.',
      },
      {
        id: 'atacar',
        texto: 'Atacar al que sacó el video',
        pista: 'Te sacas el tema de encima y te ganas un enemigo con cámara.',
        efectos: {
          vida: { exposicion: 20, reputacion: -10 },
          relaciones: { prensa: { rencor: 22 } },
          personalidad: { temperamento: 8 },
          titular: { texto: '{APELLIDO} CONTRA LA PRENSA: "VIVEN DE ESTO"', tono: 'polemica' },
          etiquetas: ['prensa:enemigo'],
          balance: -4,
        },
        resultado:
          'Dijiste que los que hablan no pagan tus cuentas. El clip se viralizó, ese periodista te dedicó su programa durante dos años y desde ahí cada error tuyo fue un editorial.',
      },
      {
        id: 'callar',
        texto: 'No contestar',
        pista: 'Tres días de ruido y se apaga.',
        efectos: {
          vida: { exposicion: 8, estres: 8 },
          personalidad: { profesionalismo: 5 },
          relaciones: { prensa: { rencor: 6 } },
          balance: 2,
        },
        resultado:
          'No dijiste una palabra en dos semanas y se les acabó el tema. En la tribuna siguió apareciendo tu frase, pero cada vez más chica.',
      },
      {
        id: 'reirse',
        texto: 'Reírte y seguir caminando',
        pista: 'Ni confirmar ni desmentir. Solo pasar.',
        efectos: {
          vida: { exposicion: 6, carinoDeLaHinchada: 4 },
          personalidad: { carisma: 6, sensibilidadMediatica: -4 },
          balance: 3,
        },
        resultado:
          'Te reíste, dijiste "qué sé yo" y seguiste. Esa risa se convirtió en sticker y le sacó el peso a todo el asunto en una semana.',
      },
    ],
  },
  {
    id: 'prensa-critica-dura',
    categoria: 'prensa',
    rareza: 'comun',
    titulo: 'El panelista',
    texto:
      'Un panelista dijo que eres "el jugador más sobrevalorado de {liga}" y el clip tiene cuatro millones de vistas.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { temporadasMin: 2, famaMin: 20 },
    cooldown: 4,
    opciones: [
      {
        id: 'cancha',
        texto: 'Contestar en la cancha',
        pista: 'La mejor respuesta que existe. Si sale.',
        efectos: { personalidad: { ambicion: 6 }, vida: { estres: 8 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { confianza: 18, carinoDeLaHinchada: 16, fama: 10, forma: 8 },
            atributos: { tiro: 1 },
            titular: { texto: 'DOS GOLES Y UN GESTO: {APELLIDO} LE CONTESTÓ AL PANEL', tono: 'elogio' },
            balance: 8,
          },
          mal: {
            vida: { confianza: -14, exposicion: 14, carinoDeLaHinchada: -10 },
            titular: { texto: 'OTRO PARTIDO GRIS Y EL PANEL SE FROTA LAS MANOS', tono: 'duda' },
            balance: -7,
          },
          relatoBien:
            'Metiste dos el domingo siguiente y en el segundo te llevaste el dedo a la oreja mirando a la cámara. Ese panelista no volvió a nombrarte.',
          relatoMal:
            'Jugaste los peores noventa minutos del año y te cambiaron al rato. El lunes le dedicaron media hora de programa con tu cara de fondo.',
        },
        resultado: 'No contestaste nada y te guardaste todo para el domingo.',
      },
      {
        id: 'redes',
        texto: 'Responderle en redes',
        pista: 'Le das lo que buscaba. Y a la gente también.',
        efectos: { vida: { exposicion: 20, fama: 8 }, personalidad: { temperamento: 6 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { carinoDeLaHinchada: 14, reputacion: 4 },
            relaciones: { prensa: { rencor: 8 } },
            balance: 3,
          },
          mal: {
            vida: { reputacion: -14, carinoDeLaHinchada: -8 },
            relaciones: { prensa: { rencor: 20 }, club: { rencor: 10 } },
            titular: { texto: 'EL CLUB LE PIDIÓ A {APELLIDO} QUE BORRARA LA PUBLICACIÓN', tono: 'polemica' },
            etiquetas: ['prensa:enemigo'],
            balance: -7,
          },
          relatoBien:
            'Le contestaste con una sola línea y una captura de tus números. La respuesta tuvo más alcance que su programa y él tuvo que salir a aclarar.',
          relatoMal:
            'Escribiste tres párrafos a las dos de la mañana. El club te hizo borrarlos y para entonces había cuatrocientas capturas dando vueltas.',
        },
        resultado: 'Le contestaste públicamente.',
      },
      {
        id: 'ignorar',
        texto: 'No enterarte de nada',
        pista: 'Lo más aburrido. Lo más efectivo.',
        efectos: {
          vida: { estres: -6, reputacion: 4 },
          personalidad: { sensibilidadMediatica: -6, profesionalismo: 4 },
          balance: 3,
        },
        resultado:
          'Le pediste a tu hermano que te administrara las redes un mes y no viste ni un clip. Cuando volviste, hablaban de otro.',
      },
      {
        id: 'invitarlo',
        texto: 'Invitarlo a entrenar contigo un día',
        pista: 'O se termina el tema, o se hace tres veces más grande.',
        efectos: { vida: { exposicion: 14 }, personalidad: { carisma: 6 } },
        riesgo: {
          prob: 0.6,
          bien: {
            relaciones: { prensa: { respeto: 20, confianza: 14 } },
            vida: { reputacion: 14, fama: 8 },
            titular: { texto: 'EL PANELISTA QUE FUE A ENTRENAR CON {APELLIDO} Y SE RETRACTÓ', tono: 'elogio' },
            balance: 7,
          },
          mal: {
            relaciones: { prensa: { rencor: 16 } },
            vida: { exposicion: 12, reputacion: -8 },
            balance: -5,
          },
          relatoBien:
            'Fue, corrió veinte minutos, terminó tirado en el césped y lo contó en vivo. Cerró el programa diciendo que se había equivocado con vos.',
          relatoMal:
            'Fue con un camarógrafo, no entrenó nada y escribió una nota sobre lo poco que se exige en tu club. Te ganaste el enojo del vestuario entero.',
        },
        resultado: 'Lo invitaste al predio en vivo, delante de todos.',
      },
    ],
  },
  {
    id: 'prensa-documental',
    categoria: 'prensa',
    rareza: 'raro',
    titulo: 'Quieren filmar tu vida',
    texto:
      'Una plataforma propone un documental de tres capítulos sobre ti. Quieren entrar a tu casa y hablar con tu familia.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 55, temporadasMin: 5 },
    cooldown: 0,
    opciones: [
      {
        id: 'todo',
        texto: 'Abrirles todo',
        pista: 'Va a ser honesto. Eso puede ser bueno o puede doler.',
        efectos: { vida: { dinero: 1.2, exposicion: 24 }, personalidad: { carisma: 4 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { fama: 24, reputacion: 16, carinoDeLaHinchada: 14 },
            titular: { texto: 'EL DOCUMENTAL DE {APELLIDO} ES LO MÁS VISTO DEL AÑO', tono: 'elogio' },
            balance: 8,
          },
          mal: {
            vida: { reputacion: -18, felicidad: -14 },
            relaciones: { pareja: { rencor: 16 }, companeros: { rencor: 10 } },
            titular: { texto: 'LO QUE EL DOCUMENTAL DE {APELLIDO} DEJÓ AL DESCUBIERTO', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Salió tan honesto que la gente lloró con el capítulo dos. Duplicó tus seguidores y hasta el rival te aplaudió en la siguiente cancha.',
          relatoMal:
            'Dejaron una discusión con tu pareja y una frase tuya sobre un compañero. Las dos cosas se convirtieron en clips y en tu casa no se habló de otra cosa por meses.',
        },
        resultado: 'Les diste las llaves de tu casa durante ocho meses.',
      },
      {
        id: 'controlar',
        texto: 'Aceptar solo con derecho a revisar el corte final',
        pista: 'Sale lo que tú quieras. Y se nota.',
        efectos: {
          vida: { fama: 10, exposicion: 10, dinero: 0.5 },
          personalidad: { sensibilidadMediatica: 6 },
          relaciones: { prensa: { rencor: 6 } },
          balance: 2,
        },
        resultado:
          'Cortaste cuatro escenas, entre ellas la única que importaba. Salió correcto, lo vio poca gente y un crítico escribió que "parecía un video institucional".',
      },
      {
        id: 'familia-no',
        texto: 'Aceptar, pero sin tu familia en cámara',
        pista: 'Tu vida sí. La de ellos no.',
        efectos: {
          vida: { fama: 14, exposicion: 12, dinero: 0.7, felicidad: 10 },
          personalidad: { lealtad: 6 },
          relaciones: { pareja: { confianza: 14 } },
          etiquetas: ['social:reservado'],
          balance: 6,
        },
        resultado:
          'Pusiste una sola condición y la respetaron. Tu casa no salió ni un segundo y en tu casa te lo agradecieron el resto de tu vida.',
      },
      {
        id: 'no',
        texto: 'Decir que no',
        pista: 'Nada cambia. Nada se filtra tampoco.',
        efectos: {
          vida: { exposicion: -10, estres: -6 },
          personalidad: { profesionalismo: 4 },
          balance: 2,
        },
        resultado:
          'Dijiste que no y lo hicieron sobre otro jugador de tu liga. Le fue muy bien y a veces te preguntas cómo habría sido.',
      },
    ],
  },
  {
    id: 'prensa-programa-de-chismes',
    categoria: 'prensa',
    rareza: 'comun',
    titulo: 'Te sentaron en el panel',
    texto:
      'Un programa de espectáculos dedicó veinte minutos a tu vida privada. Dos panelistas hablan de ti y uno dice conocerte.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { famaMin: 30, temporadasMin: 2 },
    cooldown: 4,
    opciones: [
      {
        id: 'ignorar',
        texto: 'No mirarlo siquiera',
        pista: 'Se apaga en cuatro días.',
        efectos: {
          vida: { exposicion: 6, estres: 4 },
          personalidad: { sensibilidadMediatica: -5 },
          balance: 2,
        },
        resultado:
          'No lo viste ni te lo contaron. A la semana hablaban de otro y de todo eso no quedó ni un recorte.',
      },
      {
        id: 'llamar-en-vivo',
        texto: 'Llamar al programa en vivo',
        pista: 'Puede quedar enorme. O puede quedar peor que el chisme.',
        efectos: { vida: { exposicion: 22, fama: 8 }, personalidad: { carisma: 5 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { reputacion: 16, carinoDeLaHinchada: 12 },
            relaciones: { prensa: { respeto: 12 } },
            titular: { texto: 'EL LLAMADO DE {APELLIDO} QUE DEJÓ MUDO AL PANEL', tono: 'elogio' },
            balance: 7,
          },
          mal: {
            vida: { reputacion: -18, exposicion: 14 },
            relaciones: { prensa: { rencor: 18 } },
            titular: { texto: '{APELLIDO} PERDIÓ LOS PAPELES EN VIVO', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Los desarmaste en dos minutos sin levantar la voz. El conductor pidió disculpas al aire y el clip de tu llamado tuvo más vistas que el programa entero.',
          relatoMal:
            'Te calentaste, dijiste tres cosas de más y una fue sobre la madre de un panelista. Ese audio se pasa hasta hoy cada vez que hablan de ti.',
        },
        resultado: 'Marcaste el número que salía en pantalla.',
      },
      {
        id: 'abogado',
        texto: 'Mandarles una carta documento',
        pista: 'Se callan hoy. Se acuerdan siempre.',
        efectos: {
          vida: { dinero: -0.1, exposicion: -8 },
          relaciones: { prensa: { rencor: 14 } },
          personalidad: { profesionalismo: 4 },
          balance: 1,
        },
        resultado:
          'La recibieron en el corte y cambiaron de tema en el aire. No volvieron a nombrarte en un año, y cuando lo hicieron fue para hablar de una lesión con una sonrisa de más.',
      },
      {
        id: 'invitar',
        texto: 'Ir tú al programa',
        pista: 'Terreno ajeno. Y toda la audiencia.',
        efectos: { vida: { fama: 12, exposicion: 18, dinero: 0.15 }, personalidad: { carisma: 5 } },
        riesgo: {
          prob: 0.62,
          bien: {
            vida: { reputacion: 12, carinoDeLaHinchada: 10, fama: 10 },
            relaciones: { prensa: { confianza: 16 } },
            etiquetas: ['prensa:televisivo'],
            balance: 6,
          },
          mal: {
            vida: { reputacion: -12, estres: 14 },
            titular: { texto: 'LA ENTREVISTA INCÓMODA DE {APELLIDO}', tono: 'duda' },
            balance: -5,
          },
          relatoBien:
            'Fuiste, te reíste de todo y contestaste lo que nadie esperaba. Ganaste a la mitad del panel y te invitaron dos veces más.',
          relatoMal:
            'Te hicieron una pregunta que no esperabas y se te notó en la cara diez segundos. Ese silencio es el clip que se usa cada vez que te nombran.',
        },
        resultado: 'Fuiste al programa un jueves a la noche.',
      },
    ],
  },
  {
    id: 'prensa-publicacion-nocturna',
    categoria: 'prensa',
    rareza: 'infrecuente',
    titulo: 'Lo publicaste a las tres de la mañana',
    texto:
      'Perdieron de local y escribiste algo sobre el arbitraje. Cuando te despertaste tenía cuarenta mil compartidas.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { temporadasMin: 2 },
    cooldown: 5,
    opciones: [
      {
        id: 'sostener',
        texto: 'Sostenerlo',
        pista: 'La tribuna te va a defender. La federación no.',
        efectos: {
          vida: { carinoDeLaHinchada: 18, exposicion: 16, dinero: -0.15 },
          personalidad: { temperamento: 6 },
          relaciones: { hinchada: { confianza: 16 } },
          titular: { texto: '{APELLIDO} NO SE RETRACTA: "LO VUELVO A DECIR"', tono: 'polemica' },
          etiquetas: ['prensa:provocador'],
          balance: 2,
        },
        resultado:
          'Lo dejaste publicado y encima lo fijaste. Te suspendieron dos fechas y te multaron, y en el partido siguiente el estadio entero cantó tu publicación.',
      },
      {
        id: 'borrar',
        texto: 'Borrarlo y no explicar nada',
        pista: 'Ya lo vio todo el mundo. Igual conviene.',
        efectos: {
          vida: { exposicion: 8, reputacion: 2 },
          personalidad: { sensibilidadMediatica: 5 },
          balance: 2,
        },
        resultado:
          'Lo borraste a las nueve de la mañana. Para entonces había cuatro capturas circulando, pero como no dijiste nada más se apagó en dos días.',
      },
      {
        id: 'disculpa',
        texto: 'Pedir disculpas públicas',
        pista: 'Queda bien arriba y mal abajo.',
        efectos: {
          vida: { reputacion: 14, carinoDeLaHinchada: -14 },
          relaciones: { club: { confianza: 14 }, hinchada: { rencor: 12 } },
          personalidad: { profesionalismo: 6, ego: -4 },
          balance: 1,
        },
        resultado:
          'Publicaste un comunicado en tono institucional. La federación archivó el expediente y el domingo la tribuna te cantó "no te retractes nunca más".',
      },
      {
        id: 'culpar-al-community',
        texto: 'Decir que te manejan las redes',
        pista: 'Nadie se lo cree. Casi nadie.',
        efectos: {
          vida: { reputacion: -12, exposicion: 12 },
          relaciones: { prensa: { rencor: 10 } },
          titular: { texto: '"NO LO ESCRIBÍ YO": LA EXPLICACIÓN DE {APELLIDO}', tono: 'duda' },
          balance: -5,
        },
        resultado:
          'Dijiste que te las maneja una agencia. Al día siguiente esa agencia salió a decir que no trabajaba contigo desde hacía un año.',
      },
    ],
  },
  {
    id: 'prensa-excompanero',
    categoria: 'prensa',
    rareza: 'infrecuente',
    titulo: 'Un ex compañero habló de más',
    texto:
      'Salió a contar cómo era el vestuario cuando estabas tú. No dio nombres, pero dio detalles suficientes.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { clubesMin: 2, temporadasMin: 4 },
    cooldown: 6,
    opciones: [
      {
        id: 'llamarlo',
        texto: 'Llamarlo por teléfono',
        pista: 'Lo más directo. Y lo que menos ruido hace.',
        efectos: {
          vida: { estres: 4 },
          relaciones: { companeros: { confianza: 10 } },
          personalidad: { carisma: 4 },
          balance: 5,
        },
        resultado:
          'Lo llamaste esa noche y te pidió perdón antes de que dijeras nada. Al día siguiente aclaró en el mismo programa que no hablaba de ti, y ahí murió.',
      },
      {
        id: 'contestar',
        texto: 'Contestarle en público',
        pista: 'Se hace más grande, seguro.',
        efectos: {
          vida: { exposicion: 20, estres: 12 },
          relaciones: { companeros: { rencor: 14 }, prensa: { confianza: 8 } },
          personalidad: { temperamento: 6 },
          titular: { texto: 'CRUCE ENTRE {APELLIDO} Y SU EX COMPAÑERO', tono: 'polemica' },
          balance: -3,
        },
        resultado:
          'Le contestaste en zona mixta y él contestó en un programa y tú otra vez en redes. Duró nueve días, lo cubrió todo el país y no ganó nadie.',
      },
      {
        id: 'contar-mas',
        texto: 'Contar tú algo peor de él',
        pista: 'Ganas la pelea. Pierdes el vestuario, este y los que vengan.',
        efectos: {
          vida: { exposicion: 24, reputacion: -16 },
          relaciones: { companeros: { rencor: 28 } },
          personalidad: { temperamento: 10, lealtad: -8 },
          etiquetas: ['conflicto:bocon'],
          balance: -8,
        },
        resultado:
          'Contaste algo que sabían cuatro personas. Ganaste el cruce y perdiste el vestuario: desde ese día nadie te contó nada, ni en ese club ni en los siguientes.',
      },
      {
        id: 'nada',
        texto: 'No decir absolutamente nada',
        pista: 'Lo más aburrido. Lo más efectivo.',
        efectos: {
          vida: { reputacion: 8 },
          personalidad: { profesionalismo: 6 },
          relaciones: { companeros: { respeto: 10 } },
          balance: 4,
        },
        resultado:
          'No dijiste nada en ningún lado. A los diez días nadie se acordaba, y dos compañeros te agradecieron en privado no haber entrado.',
      },
    ],
  },
  {
    id: 'prensa-carpeta',
    categoria: 'prensa',
    rareza: 'raro',
    titulo: 'El periodista con la carpeta',
    texto:
      'Un periodista te muestra una carpeta con movimientos de tus empresas y te dice que la publica el domingo. Salvo que hablen.',
    tipoDeRecuerdo: 'caos',
    condiciones: { famaMin: 50, temporadasMin: 5 },
    cooldown: 10,
    opciones: [
      {
        id: 'hablar',
        texto: 'Sentarte a hablar con él',
        pista: 'Vas a tener que contar cosas. Se publica menos.',
        efectos: {
          vida: { estres: 14, exposicion: 8, reputacion: 4 },
          relaciones: { prensa: { confianza: 14 } },
          personalidad: { sensibilidadMediatica: 5 },
          balance: 4,
        },
        resultado:
          'Hablaron cuatro horas en un bar vacío. Publicó la mitad, con tu versión al lado, y el escándalo que iba a durar un mes duró dos días.',
      },
      {
        id: 'pagar',
        texto: 'Ofrecerle dinero',
        pista: 'Esto sale mal más veces de las que sale bien.',
        efectos: { vida: { dinero: -0.8 }, personalidad: { riesgo: 8 } },
        riesgo: {
          prob: 0.32,
          bien: { vida: { exposicion: -6 }, etiquetas: ['prensa:comprada'], balance: -1 },
          mal: {
            vida: { reputacion: -26, exposicion: 30 },
            relaciones: { prensa: { rencor: 26 }, club: { rencor: 14 } },
            atributos: { pase: -1 },
            titular: { texto: '"{APELLIDO} ME OFRECIÓ DINERO PARA NO PUBLICAR"', tono: 'polemica' },
            etiquetas: ['prensa:enemigo'],
            balance: -13,
          },
          relatoBien: 'Aceptó, la carpeta no se publicó nunca y no volviste a verlo. Todavía duermes mal.',
          relatoMal:
            'Grabó la conversación entera. El domingo se publicó la carpeta **y** tu oferta, y ese audio abrió todos los noticieros del país.',
        },
        resultado: 'Le pusiste una cifra sobre la mesa.',
      },
      {
        id: 'adelantarse',
        texto: 'Contarlo tú antes del domingo',
        pista: 'Le sacas la nota. La portada la pones tú.',
        efectos: {
          vida: { exposicion: 22, reputacion: 10, estres: 16 },
          relaciones: { prensa: { respeto: 14 } },
          personalidad: { carisma: 6 },
          titular: { texto: '{APELLIDO} LO CUENTA TODO ANTES DE QUE LO CUENTEN', tono: 'neutro' },
          etiquetas: ['prensa:sincero'],
          balance: 6,
        },
        resultado:
          'Diste una entrevista el viernes y explicaste hasta el último papel. El domingo su nota ya era vieja y él terminó escribiendo sobre otro.',
      },
      {
        id: 'que-publique',
        texto: 'Decirle que publique lo que quiera',
        pista: 'Si no hay nada, no hay nada.',
        efectos: { vida: { estres: 12 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { reputacion: 14, fama: 6 },
            relaciones: { prensa: { respeto: 16 } },
            balance: 6,
          },
          mal: {
            vida: { reputacion: -18, exposicion: 26, dinero: -1.2 },
            titular: { texto: 'LO QUE LA CARPETA DE {APELLIDO} ESCONDÍA', tono: 'polemica' },
            balance: -10,
          },
          relatoBien:
            'Publicó, y no había nada: tres cuentas en regla y una empresa de tu hermano. Quedó él en ridículo y a ti te llamaron para hablar de transparencia.',
          relatoMal:
            'Publicó, y sí había. Estuviste seis meses declarando, pagaste una multa enorme y esa carpeta te siguió el resto de la carrera.',
        },
        resultado: 'Le dijiste que hiciera su trabajo y te fuiste.',
      },
    ],
  },
];
