/**
 * El salseo fuerte: la vida de un futbolista con plata, con cámara encima y con veintitantos años.
 *
 * Es el bloque que Leonardo pidió con nombre y apellido —"famoso alocado, mujeres, trago, fiestas,
 * apuestas, peleas a golpes con los compañeros, deudas, infidelidades, me botan del club, fugas de
 * concentraciones"— y el que le faltaba al catálogo: había un solo evento de fiesta, uno de pelea y
 * ninguno que te pudiera dejar sin club.
 *
 * Las reglas de tono no se negocian y son las de siempre: las figuras públicas son invento y salen de
 * `personajes/`, las drogas no existen, y **nada explícito**. La infidelidad se cuenta por la portada,
 * por lo que dice la otra persona en televisión y por lo que pasa en tu casa al día siguiente: el
 * escándalo está en las consecuencias, que es donde de verdad está.
 *
 * Ninguno declara `ambito` a propósito: un futbolista se manda una macana igual en Lima que en
 * Mönchengladbach. Los que sí tienen color local viven en `peru.ts` y en `mundo.ts`.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_SALSEO_FUERTE: Evento[] = [
  {
    id: 'salseo-famoso-alocado',
    categoria: 'social',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Tu nuevo mejor amigo',
    texto:
      '{figura} te adoptó. Te escribe todos los días, te invita a todo y te presentó a medio ambiente en tres meses. También se pelea con alguien cada dos semanas y últimamente aparece tu nombre al lado del suyo.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 30, temporadasMin: 1 },
    cooldown: 5,
    peso: 1.6,
    opciones: [
      {
        id: 'seguirle',
        texto: 'Seguirle el ritmo',
        pista: 'Te abre todas las puertas. Y te mete en todos los quilombos.',
        efectos: { vida: { fama: 14, exposicion: 20, felicidad: 10 }, personalidad: { vidaSocial: 8, riesgo: 6 } },
        riesgo: {
          prob: 0.42,
          bien: {
            vida: { fama: 12, reputacion: 6 },
            relaciones: { prensa: { confianza: 10 } },
            etiquetas: ['social:noctambulo'],
            balance: 3,
          },
          mal: {
            vida: { reputacion: -18, estres: 18, forma: -10 },
            relaciones: { club: { rencor: 16 }, dt: { rencor: 12 } },
            etiquetas: ['social:noctambulo', 'club:desconfia'],
            titular: { texto: '{APELLIDO} Y {FIGURA}, OTRA VEZ EN LA MISMA MESA A LAS CUATRO', tono: 'polemica' },
            balance: -7,
          },
          relatoBien:
            'Fuiste a todo durante un año. Conociste a gente que te sirvió después y nunca salió una sola foto mala: él cuidaba eso mejor que tú.',
          relatoMal:
            'A la cuarta salida hubo una discusión en la puerta de un local y las cámaras estaban ahí. Él salió del tema en dos días, porque vive de eso. Tú tenías que entrenar el lunes.',
        },
        resultado: 'Le contestabas todos los mensajes y saliste con él cada vez que te llamó.',
      },
      {
        id: 'medida',
        texto: 'Verlo, pero solo los lunes',
        pista: 'La amistad se mantiene. La agenda es tuya.',
        efectos: {
          vida: { fama: 6, felicidad: 8, exposicion: 6 },
          personalidad: { disciplina: 6, carisma: 4 },
          balance: 3,
        },
        resultado:
          'Le dijiste que los lunes sí y el resto no, y lo respetó más de lo que esperabas. Siguen siendo amigos, apareces en la mitad de sus historias y nunca en las que importan.',
      },
      {
        id: 'usarlo',
        texto: 'Usar el contacto para tus negocios y nada más',
        pista: 'Rinde. Y él se va a dar cuenta.',
        efectos: {
          vida: { dinero: 0.35, exposicion: 10, reputacion: -6 },
          personalidad: { ambicion: 7, lealtad: -6 },
          balance: 1,
        },
        resultado:
          'Le pediste tres contactos y cerraste dos acuerdos. A la cuarta vez que le pediste algo sin invitarlo a nada, dejó de contestar. En una entrevista lo dijo sin nombrarte y todo el mundo entendió.',
      },
      {
        id: 'cortarlo',
        texto: 'Cortarlo antes de que se complique',
        pista: 'Lo profesional. Y él tiene micrófono.',
        efectos: { vida: { estres: 8 }, personalidad: { profesionalismo: 8 } },
        riesgo: {
          prob: 0.55,
          bien: { vida: { reputacion: 10, forma: 6 }, balance: 4 },
          mal: {
            vida: { exposicion: 22, reputacion: -8 },
            relaciones: { prensa: { rencor: 12 } },
            titular: { texto: '{FIGURA}: "SE LE SUBIÓ, YO LO CONOCÍ CUANDO NO ERA NADIE"', tono: 'polemica' },
            balance: -4,
          },
          relatoBien:
            'Dejaste de contestar de a poco y se dio cuenta solo. No hubo escena, no hubo nota, y ese año jugaste treinta y cuatro partidos.',
          relatoMal:
            'Se lo tomó personal y lo contó en un programa: que te habías agrandado, que él te había presentado a todos. La frase duró un mes y en la tribuna la usaron dos veces.',
        },
        resultado: 'Dejaste de contestarle los mensajes.',
      },
    ],
  },
  {
    id: 'salseo-infidelidad',
    categoria: 'prensa',
    rareza: 'comun',
    picante: 3,
    titulo: 'La portada del jueves',
    texto:
      'El programa anuncia que el jueves saca "el ampay del año" y sabes perfectamente cuál es: no estabas solo y no era tu pareja. Tienes cuarenta y ocho horas y ella todavía no lo sabe.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { famaMin: 35, temporadasMin: 2, conEtiquetas: ['vida:pareja-estable'] },
    cooldown: 8,
    peso: 1.4,
    opciones: [
      {
        id: 'contarselo',
        texto: 'Contárselo tú antes de que salga',
        pista: 'Lo peor que vas a hacer en tu vida. Y lo único que puede salvar algo.',
        efectos: { vida: { estres: 24, felicidad: -20 }, personalidad: { profesionalismo: 4 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { reputacion: 6 },
            relaciones: { pareja: { rencor: 20, respeto: 14 } },
            titular: { texto: '"LO HABLAMOS ANTES DE QUE SALIERA": LA PAREJA DE {APELLIDO} DIO LA CARA', tono: 'neutro' },
            balance: -2,
          },
          mal: {
            vida: { felicidad: -26, estres: 22, exposicion: 26 },
            relaciones: { pareja: { rencor: 40 } },
            etiquetas: ['vida:separado'],
            titular: { texto: 'SE FUE DE LA CASA ANTES DEL AMPAY: LA DECISIÓN DE LA PAREJA DE {APELLIDO}', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'Se lo dijiste el martes en la cocina y no gritó. El jueves salió el ampay y ella ya lo sabía: eso cambió todo, porque salió a decir que era un problema de ellos dos y no de la televisión. Siguen juntos y no es lo mismo.',
          relatoMal:
            'Se lo dijiste el martes y el miércoles ya no estaba en la casa. El jueves salió el ampay y el viernes salió ella en el mismo programa, sin llorar y sin gritar, contando fechas. Fue mucho peor que el ampay.',
        },
        resultado: 'Se lo contaste el martes por la noche, en tu casa, antes de que lo viera en la tele.',
      },
      {
        id: 'comprarlo',
        texto: 'Pagar para que no salga',
        pista: 'A veces funciona. Y si no, sale eso y esto también.',
        efectos: { vida: { dinero: -0.6, estres: 20 }, personalidad: { riesgo: 8, profesionalismo: -8 } },
        riesgo: {
          prob: 0.35,
          bien: {
            vida: { exposicion: -6 },
            relaciones: { prensa: { rencor: 8 } },
            balance: -1,
          },
          mal: {
            vida: { reputacion: -26, exposicion: 34, dinero: -0.4 },
            relaciones: { prensa: { rencor: 30 }, pareja: { rencor: 34 } },
            etiquetas: ['prensa:enemigo', 'vida:separado'],
            titular: { texto: '{APELLIDO} OFRECIÓ PLATA PARA QUE NO SALIERA. TENEMOS EL AUDIO', tono: 'polemica' },
            balance: -10,
          },
          relatoBien:
            'Alguien habló con alguien y el jueves el programa abrió con otra cosa. Nunca supiste cuánto costó de verdad ni a quién le llegó, y durante dos años esperaste que reapareciera.',
          relatoMal:
            'Grabaron la llamada. El jueves no salió el ampay: salió el audio tuyo ofreciendo plata, y encima el ampay al final del bloque. Esa noche perdiste dos cosas.',
        },
        resultado: 'Hiciste dos llamadas el miércoles y ofreciste una cifra.',
      },
      {
        id: 'aguantar',
        texto: 'No hacer nada y aguantar el jueves',
        pista: 'Sale igual. Al menos no agregas nada.',
        efectos: {
          vida: { exposicion: 28, reputacion: -14, estres: 20, felicidad: -16 },
          relaciones: { pareja: { rencor: 30 }, prensa: { confianza: 4 } },
          titular: { texto: 'EL AMPAY DE {APELLIDO}: OCHO MINUTOS Y SIN CORTES', tono: 'polemica' },
          balance: -7,
        },
        resultado:
          'Salió el jueves, duró ocho minutos y lo repitieron todo el fin de semana. Tú no dijiste nada en tres semanas, ella tampoco, y la que más perdió con ese silencio fue ella. En tu casa se arregló mucho después y nunca del todo.',
      },
      {
        id: 'blanquear-todo',
        texto: 'Adelantarte y contarlo tú, en televisión',
        pista: 'Te quedas con el relato. Y con todo lo demás encima.',
        efectos: {
          vida: { exposicion: 32, fama: 16, reputacion: -8, estres: 22 },
          relaciones: { pareja: { rencor: 26 }, prensa: { confianza: 16 } },
          personalidad: { carisma: 6, sensibilidadMediatica: 8 },
          titular: { texto: '{APELLIDO} SE SENTÓ Y LO CONTÓ TODO ANTES DEL AMPAY', tono: 'polemica' },
          etiquetas: ['prensa:televisivo'],
          balance: -3,
        },
        resultado:
          'Fuiste el miércoles, lo contaste sin adornos y pediste que la dejaran a ella afuera. No la dejaron. El programa hizo su récord del año contigo sentado ahí, y en el club el técnico te preguntó, en serio, si tenías cabeza para jugar el domingo.',
      },
    ],
  },
  {
    id: 'salseo-fiesta-descontrolada',
    categoria: 'social',
    rareza: 'comun',
    picante: 2,
    titulo: 'Ochenta personas en tu casa',
    texto:
      'Invitaste a doce. A las dos de la mañana hay ochenta personas, alguien está filmando todo y no reconoces a la mitad. El sábado se juega y el técnico duerme a doce cuadras.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 4,
    peso: 1.3,
    opciones: [
      {
        id: 'cortarla',
        texto: 'Cortar la música y sacar a todo el mundo',
        pista: 'Se termina la fiesta. Y ochenta personas cuentan por qué.',
        efectos: { vida: { felicidad: -8, condicion: 6 }, personalidad: { disciplina: 8 } },
        riesgo: {
          prob: 0.7,
          bien: { vida: { forma: 8, reputacion: 8 }, relaciones: { dt: { confianza: 8 } }, balance: 4 },
          mal: {
            vida: { exposicion: 16, reputacion: -6 },
            personalidad: { carisma: -4 },
            balance: -3,
          },
          relatoBien:
            'A las dos y media estaba vacía. Dormiste seis horas, el sábado jugaste bien y nadie subió nada porque no había nada que subir.',
          relatoMal:
            'Los sacaste mal y a dos les molestó. Subieron un video de la casa vacía con una frase encima que no era amable, y esa frase circuló más de lo que hubiera circulado la fiesta.',
        },
        resultado: 'Cortaste la música a las dos y media y los fuiste sacando de a uno.',
      },
      {
        id: 'seguir',
        texto: 'Dejarla seguir y esconderte en tu cuarto',
        pista: 'No echas a nadie. Y todo pasa en tu casa igual.',
        efectos: { vida: { estres: 12, condicion: -8 }, personalidad: { disciplina: -6 } },
        riesgo: {
          prob: 0.3,
          bien: { vida: { felicidad: 6 }, balance: 0 },
          mal: {
            vida: { exposicion: 28, reputacion: -16, forma: -12, dinero: -0.15 },
            relaciones: { club: { rencor: 18 }, dt: { rencor: 14 } },
            etiquetas: ['social:noctambulo'],
            titular: { texto: 'LA FIESTA EN LA CASA DE {APELLIDO} TERMINÓ A LAS SIETE DE LA MAÑANA', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Te fuiste a dormir a las tres y se fueron solos a las cinco. Rompieron dos cosas, nadie filmó nada que sirviera y el sábado entraste a los sesenta.',
          relatoMal:
            'A las siete quedaban veinte personas y el video estaba en todos lados antes del mediodía. El club te multó dos sueldos, el técnico te dejó afuera del sábado, y el video se pasó otra vez en diciembre cuando hicieron el resumen del año.',
        },
        resultado: 'Te encerraste en tu cuarto y dejaste que siguiera.',
      },
      {
        id: 'seguridad',
        texto: 'Llamar a tu gente para que la controlen',
        pista: 'Cuesta plata. Y nadie sube nada.',
        efectos: {
          vida: { dinero: -0.06, exposicion: 8, felicidad: 8 },
          personalidad: { profesionalismo: 5 },
          balance: 2,
        },
        resultado:
          'Llamaste a dos y estuvieron ahí en veinte minutos. Guardaron celulares en la puerta, la fiesta siguió hasta las cuatro y no salió una sola imagen. En el vestuario se contó como leyenda por meses.',
      },
      {
        id: 'irse',
        texto: 'Irte tú de tu propia casa',
        pista: 'Sales del problema y dejas el problema adentro.',
        efectos: {
          vida: { estres: 14, dinero: -0.03 },
          personalidad: { riesgo: -4 },
          balance: -2,
        },
        resultado:
          'Te fuiste a un hotel a las tres y dormiste bien. Cuando volviste el domingo faltaban un televisor y un reloj, y en el video que circuló no apareces ni una vez, que era exactamente lo que querías.',
      },
    ],
  },
  {
    id: 'salseo-indisciplina',
    categoria: 'profesional',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'La tercera amonestación',
    texto:
      'Es la tercera falta de disciplina del año y esta vez está por escrito. El gerente deportivo te lee el documento: una más y el club puede rescindir el contrato sin pagarte nada.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 2, sinEtiquetas: ['club:rescindido'] },
    cooldown: 6,
    peso: 1.5,
    opciones: [
      {
        id: 'firmar-y-cambiar',
        texto: 'Firmarlo y cambiar de verdad',
        pista: 'Se termina el problema. Si aguantas.',
        efectos: { personalidad: { disciplina: 10, profesionalismo: 8 }, vida: { estres: 8 } },
        riesgo: {
          prob: 0.62,
          bien: {
            vida: { reputacion: 12, forma: 8 },
            relaciones: { club: { confianza: 16, respeto: 10 }, dt: { confianza: 12 } },
            balance: 5,
          },
          mal: {
            vida: { reputacion: -12, estres: 16 },
            relaciones: { club: { rencor: 20 } },
            etiquetas: ['club:al-limite'],
            luego: { eventoId: 'salseo-rescision', enCapitulos: 1 },
            balance: -6,
          },
          relatoBien:
            'Firmaste, llegaste temprano seis meses seguidos y el gerente rompió el papel delante tuyo en diciembre. Fue el año que más jugaste.',
          relatoMal:
            'Firmaste con la mejor intención y aguantaste cuatro meses. La quinta vez fue por llegar tarde a un vuelo, que es la más tonta de todas, y el papel seguía en el cajón.',
        },
        resultado: 'Firmaste el documento en la oficina, sin abogado y sin discutir.',
      },
      {
        id: 'discutirlo',
        texto: 'Negarte a firmar y mandar abogado',
        pista: 'Tienes razón en algo. Y el club tiene tres papeles.',
        efectos: {
          vida: { estres: 16, dinero: -0.1 },
          relaciones: { club: { rencor: 22 } },
          personalidad: { temperamento: 7 },
          etiquetas: ['club:al-limite'],
          balance: -4,
        },
        resultado:
          'Tu abogado discutió dos de las tres faltas y consiguió que sacaran una. El club te dejó de convocar a los partidos de copa y el gerente no te volvió a hablar en persona: todo por escrito, hasta el último día.',
      },
      {
        id: 'hablar-con-el-plantel',
        texto: 'Contárselo al plantel y pedir que te sostengan',
        pista: 'Si te bancan, el club retrocede. Si no, quedaste solo y expuesto.',
        efectos: { vida: { estres: 12 }, personalidad: { carisma: 5 } },
        riesgo: {
          prob: 0.5,
          bien: {
            relaciones: { companeros: { confianza: 20, respeto: 16 }, club: { rencor: 12 } },
            vida: { reputacion: 8 },
            etiquetas: ['vestuario:referente'],
            balance: 4,
          },
          mal: {
            relaciones: { companeros: { rencor: 18 } },
            vida: { reputacion: -14, estres: 14 },
            etiquetas: ['vestuario:aparte', 'club:al-limite'],
            balance: -7,
          },
          relatoBien:
            'Lo contaste en el vestuario y el capitán fue a la oficina con dos más. El club aflojó el tono y las siguientes faltas se resolvieron con una multa y nada de papeles.',
          relatoMal:
            'Lo contaste y hubo silencio. El capitán te dijo después, en privado, que las tres faltas eran verdad y que el plantel no iba a poner la cara por eso. Tenía razón y no te gustó.',
        },
        resultado: 'Lo llevaste al vestuario y pediste que el plantel diera la cara por ti.',
      },
      {
        id: 'pedir-salida',
        texto: 'Pedir que te dejen salir libre',
        pista: 'Te vas ahora y por tu cuenta, antes de que te echen.',
        efectos: {
          vida: { dinero: -0.3, reputacion: 4, estres: 10 },
          relaciones: { club: { rencor: 10 } },
          personalidad: { ambicion: 5 },
          etiquetas: ['club:salida-propia'],
          balance: 0,
        },
        resultado:
          'Negociaron una semana y saliste libre resignando la prima. Firmaste en otro club en veinte días y el gerente del anterior contó la versión que le convenía. Nadie te preguntó la tuya.',
      },
    ],
  },
  {
    id: 'salseo-rescision',
    categoria: 'profesional',
    rareza: 'raro',
    picante: 3,
    titulo: 'Te rescinden el contrato',
    texto:
      'Es la cuarta y usaron el papel. El club rescinde por indisciplina, sin pagar lo que faltaba, en la mitad de la temporada. Te enteraste por un comunicado de tres líneas antes de que te llamaran.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { conEtiquetas: ['club:al-limite'] },
    peso: 1,
    opciones: [
      {
        id: 'demandar',
        texto: 'Demandarlos y pelear lo que te deben',
        pista: 'Puede que ganes. Vas a estar seis meses sin jugar igual.',
        efectos: { vida: { estres: 22, dinero: -0.15 }, relaciones: { club: { rencor: 30 } } },
        riesgo: {
          prob: 0.48,
          bien: {
            vida: { dinero: 1.2, reputacion: 8 },
            titular: { texto: 'LE DIERON LA RAZÓN A {APELLIDO} Y EL CLUB TUVO QUE PAGAR', tono: 'neutro' },
            balance: 3,
          },
          mal: {
            vida: { dinero: -0.4, reputacion: -14, exposicion: 20 },
            etiquetas: ['club:rescindido', 'mercado:frio'],
            titular: { texto: 'EL EXPEDIENTE DE {APELLIDO}: TODO LO QUE EL CLUB TENÍA GUARDADO', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Ganaste en segunda instancia catorce meses después y te pagaron todo. Para entonces jugabas en otro país y ya no te importaba tanto la plata como que quedara escrito quién tenía razón.',
          relatoMal:
            'En el juicio el club presentó las cuatro faltas con fechas, testigos y un video. Perdiste, pagaste costas, y todo lo que habían guardado en dos años salió en los diarios el mismo día.',
        },
        resultado: 'Tu abogado presentó la demanda el lunes siguiente.',
      },
      {
        id: 'aceptar-y-callar',
        texto: 'Aceptarlo y no decir una palabra',
        pista: 'Pierdes la plata. Conservas el nombre.',
        efectos: {
          vida: { dinero: -0.5, reputacion: 6, estres: 14 },
          personalidad: { ego: -6, profesionalismo: 6 },
          etiquetas: ['club:rescindido'],
          balance: -2,
        },
        resultado:
          'Firmaste la rescisión sin pelear y no diste una nota. El club esperaba un escándalo y no lo tuvo, así que la historia murió en cuatro días. Dos meses después te llamó un club que te dijo, textual, que valoraban cómo lo habías manejado.',
      },
      {
        id: 'contar-todo',
        texto: 'Contar por qué te echaron, con todo lo que sabes del club',
        pista: 'Vas a hacer mucho ruido. Y todos los clubes lo van a escuchar.',
        efectos: {
          vida: { exposicion: 34, fama: 14, reputacion: -10 },
          relaciones: { club: { rencor: 40 }, prensa: { confianza: 18 } },
          personalidad: { temperamento: 9 },
          etiquetas: ['club:rescindido', 'mercado:frio'],
          titular: { texto: '{APELLIDO} ABRIÓ LA BOCA Y EN {CLUB} NO DUERME NADIE', tono: 'polemica' },
          balance: -5,
        },
        resultado:
          'Diste una entrevista de una hora y contaste los sueldos atrasados, los sobres y las dos veces que te pidieron mentir. Se armó un escándalo de tres semanas y renunció un dirigente. Y ningún club de esa liga te llamó nunca más.',
      },
      {
        id: 'irse-del-pais',
        texto: 'Buscar equipo lejos y empezar de nuevo',
        pista: 'Nadie te conoce allá. Eso juega para los dos lados.',
        efectos: {
          vida: { estres: 12, felicidad: -8, forma: -6 },
          personalidad: { ambicion: 7 },
          etiquetas: ['club:rescindido'],
          balance: 1,
        },
        resultado:
          'Firmaste en el primer club que llamó, en una liga que no habías visto nunca, por un tercio de lo que ganabas. Los primeros cuatro meses fueron los peores de tu carrera. El quinto metiste dos en un clásico que no era tuyo y la tribuna aprendió tu nombre.',
      },
    ],
  },
  {
    id: 'salseo-pelea-capitan',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'A los golpes en el vuelo',
    texto:
      'Perdieron y en el vuelo de vuelta el capitán dijo tu nombre en voz alta, delante de todos. Terminaron de pie en el pasillo del avión y los separaron dos utileros. Hay veinticuatro testigos y tres tienen celular.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 2 },
    cooldown: 6,
    peso: 1.5,
    opciones: [
      {
        id: 'arreglarlo',
        texto: 'Buscarlo al día siguiente y arreglarlo entre los dos',
        pista: 'La única salida que no deja rastro.',
        efectos: { personalidad: { carisma: 6, ego: -4 }, vida: { estres: -6 } },
        riesgo: {
          prob: 0.68,
          bien: {
            relaciones: { companeros: { confianza: 18, respeto: 20 } },
            vida: { forma: 6 },
            etiquetas: ['vestuario:referente'],
            balance: 5,
          },
          mal: {
            relaciones: { companeros: { rencor: 16 } },
            vida: { estres: 12 },
            balance: -4,
          },
          relatoBien:
            'Lo esperaste en el estacionamiento y hablaron cuarenta minutos en su carro. El domingo salieron juntos del túnel y no hizo falta decirle nada a nadie. Los tres videos nunca se publicaron.',
          relatoMal:
            'Lo buscaste y te dijo que no había nada que hablar. Convivieron ocho meses saludándose con la cabeza, y el plantel se acomodó alrededor de eso como se acomoda alrededor de un mueble.',
        },
        resultado: 'Lo esperaste en el estacionamiento del complejo al día siguiente.',
      },
      {
        id: 'al-tecnico',
        texto: 'Llevarlo al técnico y que él decida',
        pista: 'Se institucionaliza. Y queda escrito.',
        efectos: {
          relaciones: { dt: { confianza: 10 }, companeros: { rencor: 12 } },
          vida: { estres: 10 },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['club:al-limite'],
          balance: -1,
        },
        resultado:
          'El técnico los sentó a los dos, los multó a los dos y los puso a los dos de titulares el domingo. Funcionó en la cancha y no en el vestuario: el capitán no volvió a pedirte la pelota en una jugada difícil.',
      },
      {
        id: 'filtrarlo',
        texto: 'Filtrar tu versión antes de que salga la de él',
        pista: 'Ganas el relato. Y el vestuario sabe quién habló.',
        efectos: {
          vida: { exposicion: 26, reputacion: -12 },
          relaciones: { companeros: { rencor: 26 }, prensa: { confianza: 14 } },
          personalidad: { lealtad: -10 },
          etiquetas: ['vestuario:traidor'],
          titular: { texto: 'LO QUE PASÓ EN EL VUELO: LA VERSIÓN DE {APELLIDO}', tono: 'polemica' },
          balance: -7,
        },
        resultado:
          'Tu versión salió el martes y quedaste como el que se defendió. Los tres videos aparecieron el jueves y contaban otra cosa. Ese vestuario ya no fue tuyo, y en los dos clubes siguientes alguien siempre sabía la historia.',
      },
      {
        id: 'no-hacer-nada',
        texto: 'No hacer nada y esperar que se apague',
        pista: 'Tres celulares.',
        efectos: { vida: { estres: 14 }, relaciones: { companeros: { rencor: 6 } } },
        riesgo: {
          prob: 0.45,
          bien: { vida: { reputacion: 4 }, balance: 1 },
          mal: {
            vida: { exposicion: 30, reputacion: -16 },
            relaciones: { club: { rencor: 16 } },
            titular: { texto: 'EL VIDEO DEL AVIÓN: {APELLIDO} Y EL CAPITÁN, SIN SONIDO PERO SIN DUDAS', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'No salió nunca. En el plantel se contó durante años y afuera no lo supo nadie, que es como se resuelven la mayoría de estas cosas.',
          relatoMal:
            'Salió a los once días, sin audio y con la imagen movida, y alcanzó igual. El club emitió un comunicado hablando de "un intercambio de opiniones" y nadie en el país creyó esa frase.',
        },
        resultado: 'No hablaste con nadie y esperaste.',
      },
    ],
  },
  {
    id: 'salseo-trago-concentracion',
    categoria: 'caos',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Las botellas en la concentración',
    texto:
      'El utilero encontró botellas vacías en una habitación del hotel de concentración. El técnico juntó al plantel y preguntó de quién eran. No eran solo tuyas, pero estabas ahí.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 1 },
    cooldown: 6,
    peso: 1.6,
    opciones: [
      {
        id: 'asumirlo-solo',
        texto: 'Decir que eran tuyas y bancarte todo',
        pista: 'Pagas por cuatro. Y cuatro te lo van a deber.',
        efectos: {
          vida: { dinero: -0.1, reputacion: -8, estres: 12 },
          relaciones: { companeros: { confianza: 26, respeto: 24 }, dt: { rencor: 12 } },
          personalidad: { lealtad: 10 },
          etiquetas: ['vestuario:referente'],
          balance: 3,
        },
        resultado:
          'Dijiste que eran tuyas, comiste dos fechas de suspensión interna y una multa. Los otros cuatro no dijeron nada delante del técnico y te lo agradecieron de a uno, en privado. Ese crédito te duró toda tu etapa en el club y lo usaste dos veces.',
      },
      {
        id: 'nombrarlos',
        texto: 'Decir la verdad completa, con nombres',
        pista: 'Es cierto todo. Y nadie te lo va a perdonar.',
        efectos: {
          relaciones: { dt: { confianza: 16 }, companeros: { rencor: 32 } },
          vida: { reputacion: 4, estres: 16 },
          personalidad: { profesionalismo: 8, lealtad: -12 },
          etiquetas: ['vestuario:traidor'],
          balance: -5,
        },
        resultado:
          'Dijiste los cuatro nombres. El técnico multó a los cinco y te agradeció con la mirada. En el almuerzo te sentaste solo, y te sentaste solo hasta que te fuiste del club.',
      },
      {
        id: 'callar',
        texto: 'Que nadie diga nada y aguantar juntos',
        pista: 'El técnico va a castigar al plantel entero.',
        efectos: { vida: { estres: 10 }, relaciones: { companeros: { confianza: 16 } } },
        riesgo: {
          prob: 0.55,
          bien: {
            relaciones: { companeros: { respeto: 14 } },
            vida: { forma: 6 },
            balance: 3,
          },
          mal: {
            vida: { dinero: -0.08, forma: -10, estres: 14 },
            relaciones: { dt: { rencor: 20 } },
            titular: { texto: 'DOBLE TURNO PARA TODOS EN {CLUB}: EL CASTIGO DEL TÉCNICO', tono: 'duda' },
            balance: -4,
          },
          relatoBien:
            'Nadie habló. El técnico los hizo correr una hora más el lunes, se terminó ahí, y el vestuario salió de esa semana más unido que en todo el año.',
          relatoMal:
            'Nadie habló y el técnico castigó a los veinticuatro: dos semanas de doble turno y sin francos. La mitad del plantel te miró a ti, porque la habitación era tuya, y esa mitad tenía algo de razón.',
        },
        resultado: 'Se miraron y ninguno de los cinco dijo una palabra.',
      },
      {
        id: 'echarle-la-culpa',
        texto: 'Decir que no sabes de quién son',
        pista: 'El utilero sabe en qué habitación estaban.',
        efectos: {
          relaciones: { dt: { rencor: 18 }, club: { rencor: 12 } },
          vida: { reputacion: -14, estres: 14 },
          personalidad: { profesionalismo: -8 },
          etiquetas: ['club:al-limite'],
          balance: -6,
        },
        resultado:
          'Dijiste que no sabías y el técnico te escuchó sin creerte nada. No hubo multa ni comunicado: hubo tres meses en el banco sin ninguna explicación, que es la forma en que un técnico te dice que sabe.',
      },
    ],
  },
  {
    id: 'salseo-deuda-companero',
    categoria: 'dinero',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Te debe y juega al lado tuyo',
    texto:
      '{companero} te pidió prestado hace ocho meses para una operación de su mamá y le pasaste todo sin papeles. La operación se hizo. La plata no volvió, y él se compró un carro en marzo.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 2, dineroMin: 0.5 },
    cooldown: 8,
    peso: 1.3,
    opciones: [
      {
        id: 'encararlo',
        texto: 'Encararlo en el vestuario',
        pista: 'Lo vas a resolver o lo vas a romper. Delante de todos.',
        efectos: { vida: { estres: 12 }, personalidad: { temperamento: 6 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { dinero: 0.4, reputacion: 6 },
            relaciones: { companeros: { respeto: 12 } },
            balance: 4,
          },
          mal: {
            relaciones: { companeros: { rencor: 24 } },
            vida: { estres: 18, forma: -8 },
            etiquetas: ['vestuario:aparte'],
            balance: -6,
          },
          relatoBien:
            'Se lo dijiste con el vestuario a medio llenar y no lo negó: te pidió disculpas ahí mismo y te pagó en tres partes. Cuando terminó de pagar volvieron a hablarse, y ahora hay algo raro y también hay respeto.',
          relatoMal:
            'Se lo dijiste y contestó que se lo habías ofrecido vos. Se armó una discusión que oyeron veinte personas, el capitán tuvo que meterse, y el plantel se dividió entre los que sabían y los que creyeron su versión.',
        },
        resultado: 'Se lo dijiste en el vestuario, con gente adelante.',
      },
      {
        id: 'perdonarla',
        texto: 'Dársela por perdida y no hablar del tema',
        pista: 'Se va la plata. Se queda el vestuario.',
        efectos: {
          vida: { dinero: -0.4, felicidad: -6, reputacion: 4 },
          relaciones: { companeros: { confianza: 10 } },
          personalidad: { ego: -4, lealtad: 6 },
          balance: 1,
        },
        resultado:
          'No la reclamaste nunca y él nunca la mencionó. Jugaron juntos dos años más y se pasaron la pelota como si nada, y cada vez que lo veías subir a ese carro te acordabas. Cuando te fuiste del club no fue a la despedida.',
      },
      {
        id: 'papeles',
        texto: 'Mandarle una carta notarial',
        pista: 'Es lo correcto. En un vestuario, es una declaración de guerra.',
        efectos: {
          vida: { dinero: -0.03, estres: 14 },
          relaciones: { companeros: { rencor: 28 } },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['vestuario:aparte'],
          balance: -3,
        },
        resultado:
          'Le llegó la carta un martes al complejo y se enteró medio plantel antes que él. Te pagó todo en dos semanas, hasta el último sol, y no te volvió a hablar. Dos años después contó la historia en un programa y la contó bastante mal.',
      },
      {
        id: 'canjearla',
        texto: 'Decirle que te la pague con un favor',
        pista: 'Cobras en otra moneda. Y ahora te debe algo peor que plata.',
        efectos: {
          relaciones: { companeros: { confianza: 12, rencor: 8 } },
          personalidad: { ambicion: 6, riesgo: 5 },
          etiquetas: ['vestuario:favores'],
          balance: 0,
        },
        resultado:
          'Le dijiste que se olvidara de la plata y que algún día ibas a necesitar algo. Se lo dijiste en broma y los dos entendieron que no era broma. Cuando llegó el día lo cumplió, y lo que le pediste te sirvió más de lo que valía el préstamo.',
      },
    ],
  },
  {
    id: 'salseo-despedida-soltero',
    categoria: 'social',
    rareza: 'comun',
    picante: 2,
    titulo: 'La despedida del compañero',
    texto:
      '{companero} se casa y la despedida es el fin de semana antes del clásico. Van dieciocho del plantel, es fuera de la ciudad y el que organiza dijo que "no se sube nada", que es exactamente lo que se dice antes de que se suba todo.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 5,
    peso: 1.2,
    opciones: [
      {
        id: 'ir-a-todo',
        texto: 'Ir y quedarte las dos noches',
        pista: 'Dieciocho compañeros y ochenta celulares.',
        efectos: { vida: { felicidad: 16, condicion: -10, exposicion: 12 }, personalidad: { vidaSocial: 7 } },
        riesgo: {
          prob: 0.38,
          bien: {
            relaciones: { companeros: { confianza: 22 } },
            vida: { forma: 4 },
            balance: 3,
          },
          mal: {
            vida: { exposicion: 26, reputacion: -14, forma: -14, dinero: -0.12 },
            relaciones: { club: { rencor: 18 }, hinchada: { rencor: 14 } },
            etiquetas: ['social:noctambulo'],
            titular: { texto: 'MEDIO PLANTEL DE {CLUB} DE FIESTA A CUATRO DÍAS DEL CLÁSICO', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Volvieron el domingo, entrenaron el lunes y ganaron el clásico. Se subieron cuarenta fotos y ninguna era un problema, y el técnico dijo en la conferencia que "un grupo que se junta, gana".',
          relatoMal:
            'Alguien subió un video a las cinco de la mañana con nueve jugadores identificables. Perdieron el clásico 3-0 y ese video se pasó en todos los programas al lado del resumen del partido. Multa para los dieciocho.',
        },
        resultado: 'Fuiste y volviste el domingo a mediodía.',
      },
      {
        id: 'ir-un-rato',
        texto: 'Ir a la cena y volverte a dormir',
        pista: 'Cumples con el amigo y con el domingo.',
        efectos: {
          vida: { felicidad: 8, exposicion: 4 },
          relaciones: { companeros: { confianza: 10 } },
          personalidad: { profesionalismo: 7 },
          balance: 3,
        },
        resultado:
          'Estuviste en la cena, brindaste, te sacaste las fotos y a las doce estabas en un taxi. Te cargaron un mes con eso y el domingo fuiste el mejor de la cancha, así que dejaron de cargarte.',
      },
      {
        id: 'organizarla',
        texto: 'Ofrecerte a organizarla tú, en tu casa y sin celulares',
        pista: 'Se hace igual y no sale nada. Si te hacen caso.',
        efectos: {
          vida: { dinero: -0.1, felicidad: 12 },
          relaciones: { companeros: { confianza: 20, respeto: 16 } },
          personalidad: { carisma: 8 },
          etiquetas: ['vestuario:referente'],
          balance: 5,
        },
        resultado:
          'La hiciste en tu casa el viernes, con una caja para los celulares en la puerta y todo el mundo afuera a las dos. No salió una sola imagen, ganaron el clásico y desde entonces cada cosa del plantel se organiza en tu casa.',
      },
      {
        id: 'no-ir',
        texto: 'No ir y decir la verdad: es el clásico',
        pista: 'Lo profesional. Y dieciocho tipos que sí van.',
        efectos: {
          vida: { condicion: 6, felicidad: -6 },
          relaciones: { companeros: { rencor: 12 }, dt: { confianza: 10 } },
          personalidad: { profesionalismo: 9, vidaSocial: -5 },
          balance: 1,
        },
        resultado:
          'Dijiste que no y lo entendieron a medias. Fue el único del plantel que faltó y en la boda, dos meses después, el novio lo mencionó en su discurso delante de doscientas personas. Lo dijo con cariño y lo dijo igual.',
      },
    ],
  },
  {
    id: 'salseo-modelo-premiacion',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    picante: 3,
    titulo: 'Quiere que la lleves a la premiación',
    texto:
      '{figura} quiere ir contigo a la gala de los premios del año. Hay alfombra, hay cien cámaras y hay transmisión en vivo. Se conocen desde hace seis semanas y en tu casa nadie sabe nada.',
    tipoDeRecuerdo: 'romance',
    condiciones: { famaMin: 45, temporadasMin: 3, sinEtiquetas: ['vida:pareja-estable'] },
    cooldown: 8,
    peso: 1.2,
    opciones: [
      {
        id: 'llevarla',
        texto: 'Llevarla y entrar por la alfombra',
        pista: 'Vas a ser la foto de la noche. Toda la noche.',
        efectos: { vida: { fama: 20, exposicion: 30, felicidad: 10 }, personalidad: { ego: 7, vidaSocial: 6 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { reputacion: 4, dinero: 0.25 },
            relaciones: { prensa: { confianza: 12 } },
            etiquetas: ['vida:pareja-estable'],
            titular: { texto: '{APELLIDO} Y {FIGURA} ENTRARON JUNTOS Y SE LLEVARON LA NOCHE', tono: 'neutro' },
            balance: 3,
          },
          mal: {
            vida: { exposicion: 34, reputacion: -10, estres: 18, forma: -8 },
            titular: { texto: 'NADIE HABLÓ DEL PREMIO: TODOS HABLARON DE QUIÉN FUE CON {APELLIDO}', tono: 'polemica' },
            balance: -6,
          },
          relatoBien:
            'Entraron juntos, la foto fue portada de todo y a ella le salieron dos contratos. Ganaste el premio esa noche y en la nota del día siguiente el premio estaba en el tercer párrafo, pero estaba.',
          relatoMal:
            'La foto se comió el premio. Durante tres semanas te preguntaron por ella en cada nota y ni una vez por el gol que te dio el premio. Terminaron en un mes y la pregunta siguió otros dos.',
        },
        resultado: 'Pasaron a buscarla a las siete y entraron juntos por la alfombra.',
      },
      {
        id: 'que-vaya-aparte',
        texto: 'Que vaya, pero que entren por separado',
        pista: 'Están los dos y no hay foto. Nadie queda contento.',
        efectos: {
          vida: { exposicion: 14, felicidad: 4 },
          relaciones: { pareja: { rencor: 14 } },
          personalidad: { profesionalismo: 5 },
          balance: 0,
        },
        resultado:
          'Entraron con quince minutos de diferencia y se sentaron en mesas distintas. Un fotógrafo los sacó saliendo juntos a la una y la nota fue peor que si hubieran entrado de la mano: parecía que se escondían de algo.',
      },
      {
        id: 'ir-solo',
        texto: 'Ir solo y decirle la verdad',
        pista: 'La noche es del premio. Y a ella no le va a gustar.',
        efectos: {
          vida: { reputacion: 10, exposicion: -4 },
          relaciones: { pareja: { rencor: 18 } },
          personalidad: { profesionalismo: 8 },
          balance: 2,
        },
        resultado:
          'Le dijiste que esa noche querías que se hablara del premio. Lo entendió por teléfono y no lo entendió en la práctica: dos semanas después estaba en la alfombra de otro evento con otro. La nota del premio, esa sí, salió completa.',
      },
      {
        id: 'no-ir',
        texto: 'No ir a la gala',
        pista: 'Se resuelven los dos problemas y se pierde el premio.',
        efectos: {
          vida: { fama: -8, exposicion: -6, felicidad: 6 },
          relaciones: { prensa: { rencor: 14 } },
          personalidad: { ego: -6 },
          balance: -2,
        },
        resultado:
          'No fuiste y el premio lo recibió el utilero, que lloró en el escenario y fue el mejor momento de la noche. La prensa lo tomó como un desprecio y durante un año te lo cobraron en cada nota. En el club te lo agradecieron en privado.',
      },
    ],
  },
  {
    id: 'salseo-audio-presidente',
    categoria: 'prensa',
    rareza: 'raro',
    picante: 3,
    titulo: 'El audio del grupo',
    texto:
      'En el grupo del plantel dijiste, con nombre y apellido, lo que pensabas del presidente del club. Alguien lo grabó de pantalla y hoy está en manos de {periodista}, que te llama antes de publicarlo por respeto y no por otra cosa.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { temporadasMin: 2, famaMin: 30 },
    cooldown: 8,
    peso: 1.3,
    opciones: [
      {
        id: 'sostenerlo',
        texto: 'Pedirle que lo publique y sostener cada palabra',
        pista: 'Es verdad todo. El que firma tu contrato también lo sabe.',
        efectos: {
          vida: { exposicion: 30, reputacion: 8 },
          relaciones: { club: { rencor: 34 }, hinchada: { respeto: 20 }, prensa: { confianza: 18 } },
          personalidad: { temperamento: 9 },
          titular: { texto: '{APELLIDO} NO SE DESDIJO DE NADA. Y HAY AUDIO', tono: 'polemica' },
          etiquetas: ['club:al-limite'],
          balance: 2,
        },
        resultado:
          'Salió el domingo y no negaste una coma. La tribuna te cantó el nombre veinte minutos y el presidente no te saludó nunca más. A fin de año no te renovaron y en la conferencia de despedida la gente aplaudió de pie.',
      },
      {
        id: 'pedir-que-no',
        texto: 'Pedirle que no lo publique',
        pista: 'Depende de un periodista. Y de lo que valga esa nota.',
        efectos: { vida: { estres: 18 }, relaciones: { prensa: { confianza: 6 } } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { exposicion: 6 },
            relaciones: { prensa: { confianza: 14 } },
            balance: 1,
          },
          mal: {
            vida: { exposicion: 28, reputacion: -14 },
            relaciones: { club: { rencor: 26 } },
            etiquetas: ['club:al-limite'],
            titular: { texto: 'EL AUDIO DE {APELLIDO} Y LA LLAMADA PARA QUE NO SALIERA', tono: 'polemica' },
            balance: -7,
          },
          relatoBien:
            'Te escuchó, no lo publicó y te lo cobró de otra manera: durante dos años fuiste su fuente cada vez que necesitaba algo del vestuario. Nunca supiste si eso fue peor o mejor.',
          relatoMal:
            'Lo publicó igual, y publicó además que le habías pedido que no lo hiciera. La segunda parte fue la que dolió: quedaste como el que dice las cosas y después se esconde.',
        },
        resultado: 'Lo llamaste y le pediste que no lo sacara.',
      },
      {
        id: 'adelantarse',
        texto: 'Hablar con el presidente antes de que salga',
        pista: 'Se lo dices a la cara. Va a salir igual.',
        efectos: {
          vida: { estres: 16, reputacion: 8 },
          relaciones: { club: { rencor: 14, respeto: 16 } },
          personalidad: { profesionalismo: 8 },
          balance: 3,
        },
        resultado:
          'Pediste una reunión el jueves y le dijiste en la cara lo mismo que habías escrito. Te escuchó una hora sin interrumpir. Cuando el audio salió el domingo, el club emitió un comunicado defendiéndote, y todavía no sabes bien por qué.',
      },
      {
        id: 'buscar-al-que-grabo',
        texto: 'Averiguar quién lo grabó',
        pista: 'Vas a encontrarlo. Y después qué.',
        efectos: {
          vida: { estres: 20, exposicion: 18 },
          relaciones: { companeros: { rencor: 22 } },
          personalidad: { temperamento: 8 },
          etiquetas: ['vestuario:aparte'],
          balance: -5,
        },
        resultado:
          'Lo encontraste en cuatro días: un juvenil que ni jugaba, que lo había pasado por veinte soles. No le hiciste nada, pero preguntaste a doce personas antes de encontrarlo y esas doce se enteraron de que desconfiabas de ellas. El audio salió igual.',
      },
    ],
  },
];
