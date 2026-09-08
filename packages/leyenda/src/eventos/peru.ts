/**
 * El fútbol peruano por dentro.
 *
 * Los eventos que solo le pasan a alguien que juega acá, escritos con lo que de verdad ocurre y no con
 * lo que suena a fútbol genérico. El jugador lo dijo con una pregunta que no tenía respuesta: "¿cómo
 * que sales de la pollería a la una de la mañana?". Salir a comer pollo después de un partido de noche
 * es lo que hace un plantel entero; no es un escándalo, es la cena. El escándalo es escaparse de la
 * concentración, es que el club te deba cuatro meses, es la barra entrando al complejo cuando termina
 * la práctica, es el mundialito con premio en plena temporada, es cobrar sin planilla.
 *
 * Las reglas de tono son las del resto del catálogo y no se negocian: las figuras públicas son
 * invento —salen de `personajes/`, con `{figura}` y `{periodista}`—, nada sexual, nada de drogas, y el
 * resultado cuenta **qué pasó después**, no qué hiciste.
 *
 * El `picante` los ordena por edad. A los dieciocho se juega el fulbito del barrio y la cábala del
 * vestuario; a los veintidós la huelga y la televisión; después de los veintiocho, la plata sin
 * planilla, el político en campaña y el periodista que quiere que hables mal de tu técnico.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DEL_PERU: Evento[] = [
  {
    id: 'peru-pichanga',
    categoria: 'futbol',
    rareza: 'comun',
    picante: 1,
    titulo: 'La pichanga del domingo',
    texto:
      'Tus patas del colegio juegan el campeonato del barrio y te piden que vayas a la final. Grass sintético, botines de la cancha y cero seguro. El contrato dice, con esas palabras, que no puedes jugar fútbol fuera del club.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMax: 26, temporadasMin: 1 },
    cooldown: 5,
    peso: 1.8,
    opciones: [
      {
        id: 'jugar',
        texto: 'Jugar los noventa con tu nombre en la espalda',
        pista: 'Nadie corre con más ganas que un pata contra un profesional.',
        efectos: { vida: { felicidad: 14 }, personalidad: { lealtad: 6, riesgo: 5 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { carinoDeLaHinchada: 12, felicidad: 10, forma: 4 },
            etiquetas: ['social:del-barrio'],
            balance: 4,
          },
          mal: {
            vida: { condicion: -16, forma: -12, estres: 16, dinero: -0.2 },
            relaciones: { club: { rencor: 18 }, dt: { rencor: 12 } },
            titular: { texto: '{APELLIDO} SE LESIONÓ EN UNA CANCHA DE BARRIO', tono: 'polemica' },
            etiquetas: ['club:desconfia'],
            balance: -8,
          },
          relatoBien:
            'Metiste dos, ganaron por penales y te subieron en hombros en una cancha de treinta por veinte. El video lo vieron cuarenta mil personas y en el club nadie dijo nada porque el lunes entrenaste normal.',
          relatoMal:
            'A los veinte minutos un pata que trabaja de albañil te barrió sin maldad y te dejó el tobillo hinchado tres semanas. El club se enteró por el video, te multó dos sueldos y el técnico dejó de contar contigo hasta septiembre.',
        },
        resultado: 'Fuiste con los botines de siempre y jugaste como si te pagaran.',
      },
      {
        id: 'ir-de-civil',
        texto: 'Ir a mirar y quedarte en la banca con ellos',
        pista: 'Cumples sin arriesgar la pierna. Ellos querían otra cosa.',
        efectos: {
          vida: { felicidad: 8, carinoDeLaHinchada: 4 },
          personalidad: { profesionalismo: 5 },
          balance: 2,
        },
        resultado:
          'Fuiste con casaca del club y te quedaste al borde de la cancha dando indicaciones. Perdieron 2-1 y uno de tus patas te dijo, medio en broma, que contigo jugando ganaban. Se rieron todos y esa frase te quedó dando vueltas.',
      },
      {
        id: 'pagar-la-cancha',
        texto: 'No ir, pero pagar el alquiler de la cancha todo el año',
        pista: 'Resuelves lo de fondo. No lo del domingo.',
        efectos: {
          vida: { dinero: -0.08, carinoDeLaHinchada: 8, reputacion: 6 },
          personalidad: { lealtad: 4, ego: -3 },
          balance: 3,
        },
        resultado:
          'Pagaste el año entero por adelantado y no fuiste a la final. Ganaron sin ti. En la foto del campeonato pusieron una camiseta tuya colgada en el alambrado, y eso a ellos les pareció suficiente.',
      },
      {
        id: 'no-ir',
        texto: 'Decir que no y explicar por qué',
        pista: 'Lo profesional. Y lo que suena a que ya no eres del barrio.',
        efectos: {
          vida: { carinoDeLaHinchada: -10, felicidad: -6 },
          relaciones: { club: { confianza: 10 } },
          personalidad: { profesionalismo: 8, lealtad: -4 },
          balance: 0,
        },
        resultado:
          'Les explicaste la cláusula por teléfono y entendieron a medias. Jugaron sin ti, salieron campeones, y en la celebración nadie te mencionó. El grupo de mensajes se movió menos desde entonces.',
      },
    ],
  },
  {
    id: 'peru-mundialito',
    categoria: 'dinero',
    rareza: 'infrecuente',
    picante: 1,
    titulo: 'El mundialito con premio',
    texto:
      'Un mundialito de barrio te ofrece dos mil soles por jugar un solo partido, en efectivo, un miércoles. Es en pleno campeonato y hay apuestas alrededor de la cancha.',
    tipoDeRecuerdo: 'decision',
    condiciones: { edadMax: 28, temporadasMin: 1 },
    cooldown: 6,
    peso: 1.3,
    opciones: [
      {
        id: 'jugar-por-plata',
        texto: 'Jugar y cobrar los dos mil',
        pista: 'Plata fácil. Y gente apostando a un partido donde tú juegas.',
        efectos: { vida: { dinero: 0.002 }, personalidad: { riesgo: 7, profesionalismo: -6 } },
        riesgo: {
          prob: 0.42,
          bien: { vida: { felicidad: 8 }, balance: 1 },
          mal: {
            vida: { reputacion: -16, exposicion: 20, estres: 18 },
            relaciones: { club: { rencor: 20 } },
            etiquetas: ['amanio:coqueteo'],
            titular: { texto: '{APELLIDO} JUGÓ UN MUNDIALITO CON APUESTAS', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'Jugaste con otro nombre en la planilla, metiste uno y cobraste en la puerta. No salió en ningún lado y el jueves entrenaste como si nada.',
          relatoMal:
            'Alguien filmó el gol y lo subió con tu nombre. Al día siguiente el club te abrió expediente y en el video se escuchaba clarísimo a un tipo gritando cuánto había puesto. Esa gente ahora sabe que respondes por plata.',
        },
        resultado: 'Fuiste el miércoles a las nueve de la noche, sin avisarle a nadie.',
      },
      {
        id: 'jugar-gratis',
        texto: 'Ir a jugar pero no aceptar la plata',
        pista: 'Quita el negocio de encima. No las apuestas.',
        efectos: {
          vida: { carinoDeLaHinchada: 10, felicidad: 8 },
          personalidad: { lealtad: 5 },
          balance: 2,
        },
        resultado:
          'Jugaste media hora y devolviste el sobre delante de todos. El organizador lo contó veinte veces y eso te compró un respeto raro en ese circuito. Igual, dos personas te preguntaron después si "podías avisar" antes de algún partido tuyo.',
      },
      {
        id: 'mandar-camiseta',
        texto: 'No ir y mandar camisetas firmadas para el sorteo',
        pista: 'Sales del problema sin quedar como el que se cree.',
        efectos: {
          vida: { carinoDeLaHinchada: 6, reputacion: 4 },
          personalidad: { carisma: 4 },
          balance: 2,
        },
        resultado:
          'Mandaste seis camisetas con tu firma y las rifaron en la final. Recaudaron más que con tu presencia y el organizador te llamó para agradecerte. No volvió a insistir.',
      },
      {
        id: 'avisar-al-club',
        texto: 'Contarle al club que hay apuestas de por medio',
        pista: 'Te cubres del todo. Y alguien va a saber que hablaste.',
        efectos: {
          vida: { reputacion: 10, estres: 10 },
          relaciones: { club: { confianza: 16, respeto: 10 } },
          personalidad: { profesionalismo: 9 },
          etiquetas: ['club:confia'],
          balance: 4,
        },
        resultado:
          'Lo contaste en la oficina el lunes. El club avisó a la federación, el mundialito se jugó igual sin ningún profesional y el organizador supo por quién. Cuando pasas por esa cancha ya nadie te saluda.',
      },
    ],
  },
  {
    id: 'peru-altura',
    categoria: 'futbol',
    rareza: 'comun',
    picante: 1,
    titulo: 'Domingo en la altura',
    texto:
      'Se juega en Cusco, a tres mil cuatrocientos metros. Llegaron el sábado a mediodía —lo justo para que la altura pegue en el peor momento— y el técnico te pregunta, mirándote a los ojos, si aguantas los noventa.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 4,
    peso: 1.7,
    opciones: [
      {
        id: 'decir-que-si',
        texto: 'Decirle que sí',
        pista: 'Nadie que dijo que no volvió a ser titular fácil.',
        efectos: { personalidad: { ambicion: 5, ego: 4 } },
        riesgo: {
          prob: 0.45,
          bien: {
            vida: { confianza: 14, carinoDeLaHinchada: 12, forma: 6 },
            relaciones: { dt: { confianza: 16, respeto: 14 } },
            titular: { texto: '{APELLIDO} AGUANTÓ LOS NOVENTA EN LA ALTURA', tono: 'elogio' },
            balance: 6,
          },
          mal: {
            vida: { condicion: -14, forma: -10, confianza: -12, estres: 12 },
            relaciones: { dt: { confianza: -10 } },
            titular: { texto: '{APELLIDO} PIDIÓ EL CAMBIO A LOS 55 Y SE PERDIÓ EL PARTIDO', tono: 'duda' },
            balance: -5,
          },
          relatoBien:
            'Corriste noventa y dos minutos con la boca abierta y el pecho quemando. Sacaste un punto de local ajeno y el técnico te nombró primero en la conferencia. Bajaste a Lima sin voz.',
          relatoMal:
            'A los cincuenta y cinco levantaste la mano solo. Entró un chico de veinte, metió el pase del empate y el lunes el técnico le dijo a la prensa que "hay que estar preparado para todo". Esa frase era para ti.',
        },
        resultado: 'Le dijiste que sí sin pensarlo, delante de otros tres compañeros.',
      },
      {
        id: 'ser-honesto',
        texto: 'Decirle la verdad: sesenta minutos y no más',
        pista: 'El técnico te va a creer. Y te va a anotar.',
        efectos: {
          vida: { estres: -6 },
          relaciones: { dt: { confianza: 12, respeto: 6 } },
          personalidad: { profesionalismo: 8, ego: -3 },
          balance: 3,
        },
        resultado:
          'Se lo dijiste en el desayuno y armó el partido con eso: jugaste sesenta buenos minutos y salió bien. Pero el miércoles siguiente, en un partido en Lima, también te sacó a los sesenta.',
      },
      {
        id: 'pedir-no-jugar',
        texto: 'Pedir no viajar y quedarte entrenando en Lima',
        pista: 'Te cuidas. El plantel viaja igual.',
        efectos: {
          vida: { condicion: 8, carinoDeLaHinchada: -12 },
          relaciones: { companeros: { rencor: 14 }, dt: { rencor: 10 } },
          personalidad: { lealtad: -6 },
          balance: -4,
        },
        resultado:
          'Te quedaste. Perdieron 4-0 y en el vuelo de vuelta nadie te escribió. Cuando volviste al grupo, el capitán te dijo que la próxima vez subas aunque sea a mirar desde el banco.',
      },
      {
        id: 'subir-antes',
        texto: 'Pagarte el vuelo y subir tres días antes por tu cuenta',
        pista: 'Lo que hace un profesional. Y algo que el club tendría que haber hecho.',
        efectos: {
          vida: { dinero: -0.05, condicion: 6, reputacion: 8 },
          relaciones: { dt: { respeto: 14 }, club: { confianza: 8 } },
          personalidad: { profesionalismo: 10 },
          etiquetas: ['profesional:ejemplo'],
          balance: 5,
        },
        resultado:
          'Subiste el jueves, dormiste tres noches en altura y el domingo fuiste el único que no caminaba en el segundo tiempo. El preparador físico lo contó en una entrevista y desde entonces el club sube dos días antes a todos.',
      },
    ],
  },
  {
    id: 'peru-cabala',
    categoria: 'relaciones',
    rareza: 'comun',
    picante: 1,
    titulo: 'La cábala del vestuario',
    texto:
      'El plantel tiene una cábala desde la racha: nadie se baña antes del partido y todos salen tocando la misma pared. {companero} la maneja como si fuera religión. A ti te parece una payasada y ya lo dijiste en voz alta.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 1 },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'seguirla',
        texto: 'Seguirla sin decir nada',
        pista: 'Un vestuario no se gana teniendo razón.',
        efectos: {
          relaciones: { companeros: { confianza: 14, respeto: 8 } },
          personalidad: { ego: -4, carisma: 4 },
          balance: 3,
        },
        resultado:
          'Tocaste la pared como todos, once domingos seguidos. La racha se cortó en el doce y nadie te miró a ti. Ese vestuario te empezó a tratar como si llevaras cinco años ahí.',
      },
      {
        id: 'burlarse',
        texto: 'Burlarte de la cábala delante de todos',
        pista: 'Tienes razón. Eso no siempre alcanza.',
        efectos: { personalidad: { ego: 6, temperamento: 5 } },
        riesgo: {
          prob: 0.35,
          bien: {
            relaciones: { companeros: { respeto: 10 } },
            vida: { confianza: 8 },
            personalidad: { carisma: 5 },
            balance: 3,
          },
          mal: {
            relaciones: { companeros: { rencor: 20 } },
            vida: { estres: 14, forma: -6 },
            etiquetas: ['vestuario:aparte'],
            balance: -6,
          },
          relatoBien:
            'Te bañaste, saliste sin tocar la pared y metiste dos. Al final del partido {companero} se rió el primero y la cábala se terminó ese día. Quedó claro quién tenía razón sin que hicieras falta insistir.',
          relatoMal:
            'Te bañaste, no tocaste nada y perdieron 3-0. Nadie te acusó de nada y no hizo falta: durante dos meses los pases fueron un poco más lentos cuando pedías la pelota.',
        },
        resultado: 'Te bañaste antes del partido y saliste último, sin tocar la pared.',
      },
      {
        id: 'inventar-la-tuya',
        texto: 'Inventarte una cábala propia y contársela a la prensa',
        pista: 'Sales del grupo por arriba. Y te vuelves un personaje.',
        efectos: {
          vida: { exposicion: 14, fama: 8 },
          relaciones: { prensa: { confianza: 10 } },
          personalidad: { carisma: 7, ego: 5 },
          titular: { texto: 'LA CÁBALA DE {APELLIDO}: LA MEDIA DERECHA PRIMERO', tono: 'neutro' },
          balance: 1,
        },
        resultado:
          'Contaste que te pones la media derecha primero desde los nueve años. Se hizo nota, se hizo meme y un programa lo repitió tres semanas. En el vestuario te dijeron "figuretti" con cariño, pero te lo dijeron.',
      },
      {
        id: 'hablar-aparte',
        texto: 'Hablarlo aparte con {companero}',
        pista: 'La conversación que nadie tiene.',
        efectos: {
          relaciones: { companeros: { confianza: 10, respeto: 12 } },
          personalidad: { carisma: 6, profesionalismo: 5 },
          balance: 4,
        },
        resultado:
          'Lo llevaste a un costado y le dijiste que la cábala te ponía nervioso a ti. Te escuchó, la mantuvo para él y te liberó a ti sin avisarle a nadie. Desde entonces cuando hay que decirle algo al grupo, te lo pide a ti.',
      },
    ],
  },
  {
    id: 'peru-huelga',
    categoria: 'profesional',
    rareza: 'raro',
    picante: 2,
    titulo: 'El club debe cuatro meses',
    texto:
      'El club le debe cuatro meses al plantel. Se vota huelga y no viajar el domingo. Tú estás al día: tu representante negoció tu sueldo aparte, por fuera del acuerdo del plantel, y nadie lo sabe.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 2, clubFuerzaMax: 80 },
    cooldown: 6,
    peso: 1.6,
    opciones: [
      {
        id: 'votar-huelga',
        texto: 'Votar la huelga y callarte lo tuyo',
        pista: 'Con el plantel. Y con un secreto adentro.',
        efectos: { relaciones: { companeros: { confianza: 16 } }, personalidad: { lealtad: 6 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { reputacion: 10, carinoDeLaHinchada: 8 },
            relaciones: { companeros: { respeto: 14 }, club: { rencor: 12 } },
            balance: 5,
          },
          mal: {
            vida: { reputacion: -18, exposicion: 20 },
            relaciones: { companeros: { rencor: 24 } },
            etiquetas: ['vestuario:aparte'],
            titular: { texto: '{APELLIDO} COBRABA APARTE MIENTRAS EL PLANTEL PARABA', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'No viajaron, el club pagó dos meses en cuarenta y ocho horas y nadie preguntó por tu planilla. El capitán te agradeció delante de todos por no romper la unidad.',
          relatoMal:
            'A la semana un administrativo filtró las planillas a Líbero. Salió tu nombre solo, al día, arriba de una lista de veinticuatro que no cobraban. El capitán no te habló hasta que te fuiste del club.',
        },
        resultado: 'Levantaste la mano con el resto en la reunión del jueves.',
      },
      {
        id: 'blanquear',
        texto: 'Contarle al plantel que tú sí cobraste',
        pista: 'Lo van a saber igual. La diferencia es de quién lo escuchan.',
        efectos: {
          vida: { reputacion: 14, estres: 12 },
          relaciones: { companeros: { respeto: 18, rencor: 8 }, representante: { rencor: 14 } },
          personalidad: { profesionalismo: 8 },
          etiquetas: ['vestuario:derecho'],
          balance: 5,
        },
        resultado:
          'Lo dijiste tú, en la reunión, antes que nadie. Hubo un silencio de cinco segundos y después el capitán dijo "mejor que lo diga él". Pusiste tu sueldo del mes en la bolsa común y la huelga la votaron igual. Tu representante te gritó por teléfono cuarenta minutos.',
      },
      {
        id: 'poner-plata',
        texto: 'Adelantarle plata tuya a los que están peor',
        pista: 'Cinco compañeros con hijos y sin sueldo desde mayo.',
        efectos: {
          vida: { dinero: -0.5, reputacion: 12 },
          relaciones: { companeros: { confianza: 22, respeto: 20 } },
          personalidad: { lealtad: 9, ego: -3 },
          etiquetas: ['vestuario:referente'],
          balance: 6,
        },
        resultado:
          'Le pasaste plata a cinco sin decirle a nadie. Uno lo contó dos años después, en una entrevista, cuando ya no jugabas ahí. Ese día tu nombre volvió a los diarios por algo que habías hecho en silencio.',
      },
      {
        id: 'viajar',
        texto: 'Romper la huelga y viajar',
        pista: 'El club te lo va a agradecer. El vestuario no.',
        efectos: {
          vida: { reputacion: -16, carinoDeLaHinchada: -14 },
          relaciones: { club: { confianza: 24 }, companeros: { rencor: 26 }, hinchada: { rencor: 12 } },
          personalidad: { lealtad: -10 },
          etiquetas: ['vestuario:traidor'],
          titular: { texto: '{APELLIDO} VIAJÓ SOLO Y EL PLANTEL SE QUEDÓ', tono: 'polemica' },
          balance: -7,
        },
        resultado:
          'Viajaste con los juveniles y jugaste con una camiseta sin número. Perdieron 5-0, el club te puso de ejemplo en un comunicado y el plantel te dejó de saludar. La palabra que te pusieron esa semana te siguió de club en club.',
      },
    ],
  },
  {
    id: 'peru-presentacion',
    categoria: 'social',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'La noche que te presentan',
    texto:
      'La presentación de verano: cuarenta mil personas, fuegos artificiales y el micrófono en la mano. Te toca hablar veinte segundos y todo el país está mirando.',
    tipoDeRecuerdo: 'declaracion',
    condiciones: { temporadasMin: 1, clubFuerzaMin: 68 },
    cooldown: 8,
    peso: 1.5,
    opciones: [
      {
        id: 'prometer',
        texto: 'Prometer el título en el micrófono',
        pista: 'Cuarenta mil personas gritando. Y una frase que queda grabada.',
        efectos: { vida: { exposicion: 22, fama: 12 }, personalidad: { ego: 7, ambicion: 6 } },
        riesgo: {
          prob: 0.4,
          bien: {
            vida: { carinoDeLaHinchada: 24, confianza: 16 },
            relaciones: { hinchada: { confianza: 22 } },
            titular: { texto: '"ESTE AÑO DAMOS LA VUELTA": LA PROMESA DE {APELLIDO}', tono: 'elogio' },
            balance: 6,
          },
          mal: {
            vida: { carinoDeLaHinchada: -20, exposicion: 26, confianza: -10 },
            relaciones: { hinchada: { rencor: 18 }, prensa: { rencor: 10 } },
            titular: { texto: 'LA FRASE DE VERANO DE {APELLIDO}, EN DICIEMBRE', tono: 'polemica' },
            etiquetas: ['promesa:publica'],
            balance: -8,
          },
          relatoBien:
            'Lo dijiste mirando a la tribuna y el estadio se vino abajo. Salieron campeones en noviembre y el video de esa noche lo pasaron en el festejo, en la pantalla grande, con la gente cantándolo.',
          relatoMal:
            'Lo dijiste y quedó. Terminaron séptimos, y desde octubre cada programa abría con ese clip antes de hablar del equipo. En la última fecha, en tu propio estadio, te lo cantaron con la melodía cambiada.',
        },
        resultado: 'Agarraste el micrófono y prometiste el título delante de cuarenta mil personas.',
      },
      {
        id: 'agradecer',
        texto: 'Agradecer y bajarte rápido',
        pista: 'No se puede fallar. Tampoco se gana nada.',
        efectos: {
          vida: { carinoDeLaHinchada: 6, exposicion: 8 },
          personalidad: { profesionalismo: 6 },
          balance: 1,
        },
        resultado:
          'Dijiste gracias, dijiste que ibas a dejar todo y bajaste en catorce segundos. Nadie se acordó de tu presentación al día siguiente, y eso también sirvió: la temporada empezó sin nada encima.',
      },
      {
        id: 'hablar-de-la-gente',
        texto: 'Hablar de la tribuna, no de ti',
        pista: 'La forma más barata de comprar cuatro años de crédito.',
        efectos: {
          vida: { carinoDeLaHinchada: 18, reputacion: 8 },
          relaciones: { hinchada: { confianza: 20, respeto: 12 } },
          personalidad: { carisma: 8, ego: -3 },
          titular: { texto: '{APELLIDO} LE HABLÓ A LA TRIBUNA Y LA TRIBUNA LE CONTESTÓ', tono: 'elogio' },
          balance: 5,
        },
        resultado:
          'Contaste que tu papá te trajo a ese estadio a los seis años, en la popular, y que hoy estabas del otro lado. La tribuna cantó tu nombre antes de que jugaras un partido. Ese crédito te duró incluso cuando no te salía nada.',
      },
      {
        id: 'nombrar-al-rival',
        texto: 'Mandarle un saludo con doble sentido a {rival}',
        pista: 'La tribuna te va a amar. Los otros se van a acordar todo el año.',
        efectos: {
          vida: { carinoDeLaHinchada: 20, exposicion: 24 },
          relaciones: { hinchada: { confianza: 18 }, prensa: { confianza: 8 } },
          personalidad: { temperamento: 7, carisma: 5 },
          titular: { texto: '{APELLIDO} SE ACORDÓ DE {RIVAL} EN SU PRESENTACIÓN', tono: 'polemica' },
          etiquetas: ['clasico:marcado'],
          balance: 2,
        },
        resultado:
          'Lo dijiste con una sonrisa y el estadio lo entendió al instante. Los dos clásicos de ese año los jugaste con la tribuna visitante cantándote desde el calentamiento, y en el segundo te expulsaron a los sesenta por una que no era.',
      },
    ],
  },
  {
    id: 'peru-reality',
    categoria: 'relaciones',
    rareza: 'infrecuente',
    picante: 2,
    titulo: 'Quiere blanquearlo en televisión',
    texto:
      '{figura} quiere anunciar la relación en el programa del sábado, con entrada en vivo y todo. Estás peleando el puesto y el técnico ya te dijo, sin decirlo, que te ve demasiado en la tele.',
    tipoDeRecuerdo: 'romance',
    condiciones: { famaMin: 25, edadMin: 22, sinEtiquetas: ['vida:pareja-estable'] },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'ir-juntos',
        texto: 'Ir los dos y contarlo',
        pista: 'Se termina el misterio. Empieza otra cosa.',
        efectos: { vida: { exposicion: 24, fama: 16 }, personalidad: { vidaSocial: 7 } },
        riesgo: {
          prob: 0.48,
          bien: {
            vida: { felicidad: 16, carinoDeLaHinchada: 6 },
            etiquetas: ['vida:pareja-estable'],
            titular: { texto: '{APELLIDO} Y {FIGURA} LO CONFIRMARON EN VIVO', tono: 'neutro' },
            balance: 4,
          },
          mal: {
            vida: { estres: 18, forma: -8, exposicion: 30 },
            relaciones: { dt: { rencor: 14 } },
            titular: { texto: 'EL TÉCNICO NO HABLÓ DE FÚTBOL: HABLÓ DE {APELLIDO}', tono: 'duda' },
            balance: -6,
          },
          relatoBien:
            'Fueron, lo contaron en tres minutos y se terminó el tema. Al no haber misterio dejaron de perseguirlos, y en marzo ya nadie preguntaba. Jugaste treinta y un partidos ese año.',
          relatoMal:
            'Fueron el sábado y el domingo el técnico armó el equipo sin ti. En la conferencia le preguntaron cuatro veces por el programa y dos por el partido. Volviste a ser titular en agosto.',
        },
        resultado: 'Entraron juntos al programa del sábado, en vivo, a las nueve de la noche.',
      },
      {
        id: 'que-vaya-sola',
        texto: 'Que vaya sola y hable por los dos',
        pista: 'Te sacas la cámara de encima. Y le dejas el problema a otra persona.',
        efectos: {
          vida: { exposicion: 14 },
          relaciones: { pareja: { rencor: 16 } },
          personalidad: { profesionalismo: 5, lealtad: -5 },
          balance: -2,
        },
        resultado:
          'Fue sola y le preguntaron once veces por qué no habías ido. Contestó bien las diez primeras y en la once dijo "pregúntenle a él". Ese clip lo pasaron toda la semana y la conversación en tu casa duró más que el programa.',
      },
      {
        id: 'pedir-esperar',
        texto: 'Pedirle que esperen hasta que termine el torneo',
        pista: 'Lo razonable. Y ocho meses de esconderse.',
        efectos: {
          vida: { estres: 10 },
          relaciones: { pareja: { rencor: 10, confianza: 6 }, dt: { confianza: 10 } },
          personalidad: { profesionalismo: 8 },
          balance: 1,
        },
        resultado:
          'Aceptó de mala gana y aguantaron hasta noviembre. Los fotografiaron en agosto igual, en un restaurante de Miraflores, y salió peor: parecía que lo escondían por algo. En diciembre lo contaron ustedes y ya no le importó a nadie.',
      },
      {
        id: 'negarlo',
        texto: 'Negar que exista la relación',
        pista: 'Nadie sostiene una mentira con dos millones de personas buscando la prueba.',
        efectos: {
          vida: { reputacion: -8, exposicion: 18 },
          relaciones: { pareja: { rencor: 24 }, prensa: { rencor: 12 } },
          personalidad: { carisma: -4 },
          etiquetas: ['prensa:mentira'],
          titular: { texto: '{APELLIDO} DIJO QUE NO. HAY DOCE FOTOS QUE DICEN QUE SÍ', tono: 'polemica' },
          balance: -7,
        },
        resultado:
          'Lo negaste el lunes y el jueves salieron las fotos del aeropuerto. No fue el noviazgo lo que te costó: fue haber dicho que no. Desde entonces, cada vez que dijiste algo, alguien recordó esa vez.',
      },
    ],
  },
  {
    id: 'peru-flash',
    categoria: 'prensa',
    rareza: 'comun',
    picante: 2,
    titulo: 'La entrevista al salir de la cancha',
    texto:
      'Perdieron en casa y {periodista} te pone el micrófono en la boca del túnel, con la camiseta pegada al cuerpo y la tribuna silbando arriba. La primera pregunta es sobre el técnico.',
    tipoDeRecuerdo: 'declaracion',
    condiciones: { temporadasMin: 1, notaMax: 7.1 },
    cooldown: 3,
    peso: 2,
    opciones: [
      {
        id: 'bancar-al-dt',
        texto: 'Ponerte delante del técnico',
        pista: 'Él se va a enterar. La tribuna también.',
        efectos: {
          relaciones: { dt: { confianza: 20, respeto: 14 }, hinchada: { rencor: 8 } },
          personalidad: { lealtad: 7 },
          titular: { texto: '{APELLIDO}: "SI ALGUIEN TIENE CULPA, SOMOS LOS QUE JUGAMOS"', tono: 'elogio' },
          balance: 4,
        },
        resultado:
          'Dijiste que el técnico no juega y que los que corren son once. El técnico lo vio en el vestuario, no dijo nada, y el miércoles te puso capitán en la Copa. La tribuna te lo perdonó cuando ganaron el clásico.',
      },
      {
        id: 'culpar-al-plantel',
        texto: 'Decir que el problema está adentro del vestuario',
        pista: 'Es verdad. Y hay veinticuatro personas escuchando.',
        efectos: { vida: { exposicion: 22 }, personalidad: { temperamento: 8 } },
        riesgo: {
          prob: 0.38,
          bien: {
            vida: { reputacion: 12, carinoDeLaHinchada: 14 },
            relaciones: { hinchada: { respeto: 16 } },
            titular: { texto: 'LA FRASE DE {APELLIDO} SACUDIÓ EL VESTUARIO Y GANARON TRES SEGUIDOS', tono: 'elogio' },
            balance: 5,
          },
          mal: {
            relaciones: { companeros: { rencor: 26 } },
            vida: { estres: 18, forma: -8 },
            etiquetas: ['vestuario:aparte'],
            titular: { texto: 'GUERRA INTERNA EN {CLUB} DESPUÉS DE LO QUE DIJO {APELLIDO}', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'Lo dijiste sin dar nombres y adentro cayó como un baldazo. Se hablaron cosas que hacía meses no se hablaban, ganaron tres al hilo y el capitán terminó agradeciéndotelo en privado.',
          relatoMal:
            'No diste nombres y todos supieron de quiénes hablabas. A la semana se filtró un audio del grupo con tu nombre repetido diez veces. El vestuario se partió en dos hasta fin de temporada.',
        },
        resultado: 'Dijiste, en vivo y en caliente, que el problema no era el técnico.',
      },
      {
        id: 'irse',
        texto: 'Pedir permiso y seguir caminando',
        pista: 'No hay frase mala. Pero hay imagen.',
        efectos: {
          vida: { exposicion: 8 },
          relaciones: { prensa: { rencor: 12 } },
          personalidad: { profesionalismo: 4 },
          balance: -1,
        },
        resultado:
          'Dijiste "ahora no" y te metiste al túnel. La cámara te siguió doce segundos de espaldas y ese plano lo usaron toda la semana como "el silencio de {apellido}". Nadie sabe qué pensabas y todos creen saberlo.',
      },
      {
        id: 'asumir',
        texto: 'Asumirlo tú solo, sin adornos',
        pista: 'Lo más caro para ti. Lo más barato para todos los demás.',
        efectos: {
          vida: { carinoDeLaHinchada: 12, confianza: -8, reputacion: 12 },
          relaciones: { hinchada: { respeto: 18 }, companeros: { confianza: 14 } },
          personalidad: { profesionalismo: 9, ego: -5 },
          titular: { texto: '{APELLIDO}: "EL GOL LO REGALÉ YO, NO BUSQUEN OTRA COSA"', tono: 'elogio' },
          balance: 3,
        },
        resultado:
          'Dijiste que la perdiste tú y que no había nada más que buscar. Se terminó el tema en dos días. Adentro creció algo que no se ve en ninguna estadística, y en el vestuario a partir de esa noche te empezaron a buscar cuando había que hablar.',
      },
    ],
  },
  {
    id: 'peru-seleccion-o-club',
    categoria: 'profesional',
    rareza: 'raro',
    picante: 2,
    titulo: 'El club te pide que no vayas',
    texto:
      'Te llamaron de la selección para dos amistosos en Asia y el club se juega la clasificación en esas mismas fechas. El médico te ofrece un parte con una molestia que no tienes.',
    tipoDeRecuerdo: 'seleccion',
    condiciones: { temporadasMin: 2, ovrMin: 70 },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'ir-igual',
        texto: 'Ir a la selección',
        pista: 'La camiseta del país. Y un club que te lo va a cobrar.',
        efectos: {
          vida: { fama: 12, reputacion: 8 },
          relaciones: { club: { rencor: 16 } },
          personalidad: { ambicion: 7 },
          etiquetas: ['seleccion:prioridad'],
          balance: 3,
        },
        resultado:
          'Viajaste treinta horas, jugaste veinte minutos en el segundo amistoso y volviste el viernes a mediodía. El domingo entraste a los setenta, con las piernas muertas, y perdieron. El presidente lo comentó en una radio sin nombrarte.',
      },
      {
        id: 'aceptar-el-parte',
        texto: 'Aceptar el parte médico',
        pista: 'Nadie va a poder probar nada. Y tú lo vas a saber igual.',
        efectos: { relaciones: { club: { confianza: 20 } }, personalidad: { profesionalismo: -8, lealtad: -5 } },
        riesgo: {
          prob: 0.55,
          bien: {
            vida: { forma: 8, confianza: 8 },
            relaciones: { club: { respeto: 12 } },
            balance: 2,
          },
          mal: {
            vida: { reputacion: -20, exposicion: 22 },
            relaciones: { prensa: { rencor: 14 } },
            etiquetas: ['seleccion:quemado'],
            titular: { texto: 'LA "MOLESTIA" DE {APELLIDO} DURÓ EXACTAMENTE DOS AMISTOSOS', tono: 'polemica' },
            balance: -8,
          },
          relatoBien:
            'No viajaste, jugaste los dos partidos del club y metiste el gol de la clasificación. La federación se quejó por escrito y no pasó de ahí.',
          relatoMal:
            'No viajaste y el domingo jugaste noventa minutos a todo trapo. El video del sprint del minuto ochenta y ocho lo pasaron al lado del parte médico. El técnico de la selección no te volvió a llamar en dos años.',
        },
        resultado: 'Firmaste el parte el martes por la mañana, en el consultorio del club.',
      },
      {
        id: 'blanquearlo',
        texto: 'Decirle a la federación la verdad y que ellos decidan',
        pista: 'Te sacas la mentira de encima y la pones sobre la mesa de otro.',
        efectos: {
          vida: { reputacion: 14, estres: 14 },
          relaciones: { club: { rencor: 22 }, prensa: { confianza: 10 } },
          personalidad: { profesionalismo: 10 },
          etiquetas: ['club:desconfia'],
          balance: 3,
        },
        resultado:
          'Contaste por teléfono lo que te habían ofrecido. La federación te liberó de los amistosos ella misma, por escrito, para no exponerte. El club se enteró de que habías hablado y a fin de año no te renovaron.',
      },
      {
        id: 'negociar',
        texto: 'Ir a uno de los dos amistosos y volver a tiempo',
        pista: 'Nadie queda contento. Nadie queda enemigo.',
        efectos: {
          vida: { condicion: -8, estres: 10, fama: 6 },
          relaciones: { club: { rencor: 6 }, dt: { respeto: 6 } },
          personalidad: { carisma: 6 },
          balance: 2,
        },
        resultado:
          'Lo arreglaste en tres llamadas: jugaste el primero, tomaste un vuelo de veintiocho horas y llegaste el sábado en la noche. Jugaste el domingo con cuatro horas de sueño y aguantaste. Los dos lados dijeron que "se podía hacer mejor" y ninguno se enojó.',
      },
    ],
  },
  {
    id: 'peru-sin-planilla',
    categoria: 'dinero',
    rareza: 'raro',
    picante: 3,
    titulo: 'Te lo pagan por fuera',
    texto:
      'El dirigente te propone subirte el sueldo un cuarenta por ciento, pero por fuera de la planilla: sin contrato, sin aportes y sin papel. Dice que es lo que hacen todos y que "en este país nadie declara todo".',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 3 },
    cooldown: 6,
    peso: 1.5,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar el arreglo',
        pista: 'Cobras más ya. Y no existe ningún papel que lo diga.',
        efectos: { vida: { dinero: 0.4 }, personalidad: { riesgo: 6, profesionalismo: -5 } },
        riesgo: {
          prob: 0.5,
          bien: { vida: { felicidad: 8 }, balance: 2 },
          mal: {
            vida: { dinero: -0.9, estres: 22, reputacion: -10 },
            relaciones: { club: { rencor: 20 } },
            etiquetas: ['dinero:sin-papeles'],
            titular: { texto: 'LOS SOBRES DE {CLUB}: {APELLIDO} EN LA LISTA', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'Cobraste el sobre todos los meses durante dos años y nunca hubo problema. Cuando te fuiste, el dirigente te dio la mano y te dijo que eras "de los fáciles".',
          relatoMal:
            'Cambió la dirigencia y la nueva auditó todo. Tus seis meses de sobres desaparecieron —no había papel que los probara— y el club te reconoció el sueldo de planilla nada más. Perdiste más de lo que habías ganado y no podías reclamar nada.',
        },
        resultado: 'Le diste la mano en la oficina y desde ese mes cobraste dos veces.',
      },
      {
        id: 'exigir-contrato',
        texto: 'Pedir lo mismo, pero todo en el contrato',
        pista: 'Al club le cuesta más. A ti te cubre.',
        efectos: {
          vida: { dinero: 0.2, reputacion: 8 },
          relaciones: { club: { rencor: 10, respeto: 14 } },
          personalidad: { profesionalismo: 9 },
          balance: 3,
        },
        resultado:
          'Dijiste que sí al monto y no al método. Negociaron tres semanas, te pusieron el treinta por ciento en el contrato en lugar del cuarenta por fuera, y firmaste. Cuando el club entró en crisis, fuiste uno de los tres que pudo reclamar con un papel en la mano.',
      },
      {
        id: 'contarlo',
        texto: 'Contarle al plantel lo que te ofrecieron',
        pista: 'Si te lo ofrecieron a ti, se lo ofrecieron a más.',
        efectos: {
          relaciones: { companeros: { confianza: 20, respeto: 16 }, club: { rencor: 24 } },
          vida: { reputacion: 12, estres: 16 },
          personalidad: { lealtad: 8 },
          etiquetas: ['vestuario:referente', 'club:desconfia'],
          balance: 4,
        },
        resultado:
          'Lo contaste en el vestuario y aparecieron cuatro más con la misma propuesta. Fueron juntos a la oficina y el club retrocedió con todos. Al dirigente le quedó tu nombre anotado y en el siguiente mercado apareció un rumor sobre ti que no venía de ningún periodista.',
      },
      {
        id: 'rechazar-callado',
        texto: 'Decir que no y no contárselo a nadie',
        pista: 'Lo más limpio. Y lo que no cambia nada para nadie más.',
        efectos: {
          vida: { reputacion: 6 },
          personalidad: { profesionalismo: 7 },
          balance: 2,
        },
        resultado:
          'Dijiste que no y seguiste cobrando lo mismo. Dos años después estalló el caso de los sobres y tu nombre no estaba en ninguna lista. Nadie te felicitó, porque nadie supo nunca que te lo habían ofrecido.',
      },
    ],
  },
  {
    id: 'peru-portada',
    categoria: 'prensa',
    rareza: 'raro',
    picante: 3,
    titulo: 'La portada tiene precio',
    texto:
      '{periodista} te ofrece la portada de Líbero el domingo, con foto y entrevista de cuatro páginas, a cambio de una sola cosa: que digas en la nota que el técnico ya no te enseña nada.',
    tipoDeRecuerdo: 'polemica',
    condiciones: { famaMin: 40, temporadasMin: 3 },
    cooldown: 6,
    peso: 1.3,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Decirlo y quedarte con la portada',
        pista: 'Cuatro páginas para ti. Un titular contra él.',
        efectos: { vida: { exposicion: 26, fama: 14 }, personalidad: { ego: 8, lealtad: -8 } },
        riesgo: {
          prob: 0.42,
          bien: {
            vida: { fama: 12, reputacion: 6 },
            relaciones: { prensa: { confianza: 18 }, dt: { rencor: 22 } },
            titular: { texto: '{APELLIDO} HABLÓ COMO NADIE HABLA EN ESTE FÚTBOL', tono: 'polemica' },
            balance: 1,
          },
          mal: {
            vida: { reputacion: -20, estres: 20, forma: -8 },
            relaciones: { dt: { rencor: 30 }, companeros: { rencor: 16 } },
            etiquetas: ['conflicto:dt'],
            titular: { texto: 'EL TÉCNICO LEYÓ LA NOTA DE {APELLIDO} Y ARMÓ EL EQUIPO SIN ÉL', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'Salió el domingo y fue la nota más leída del mes. El técnico renunció en abril por otras razones y a ti te quedó fama de decir lo que otros callan. Te sirvió en dos negociaciones.',
          relatoMal:
            'Salió el domingo y el lunes entrenaste con los suplentes. El técnico duró dos años más que tu titularidad y en la conferencia de tu partido de despedida no lo nombraste ni una vez.',
        },
        resultado: 'Dijiste la frase, palabra por palabra, con la grabadora encendida.',
      },
      {
        id: 'contrapropuesta',
        texto: 'Dar la nota, pero hablando de otra cosa',
        pista: 'A ver si la portada aguanta sin el titular que él quería.',
        efectos: {
          vida: { exposicion: 12 },
          relaciones: { prensa: { respeto: 10, rencor: 8 } },
          personalidad: { carisma: 7, profesionalismo: 6 },
          balance: 2,
        },
        resultado:
          'Hablaste una hora del club donde empezaste, de tu mamá y del sueldo que no le pagan a los juveniles. La nota salió en páginas cuatro y cinco, sin portada, y fue la mejor entrevista que dio nadie ese año. {periodista} no te llamó por seis meses y después te llamó más que antes.',
      },
      {
        id: 'avisarle-al-dt',
        texto: 'Contarle al técnico lo que te ofrecieron',
        pista: 'Ganas un aliado y pierdes a un periodista.',
        efectos: {
          relaciones: { dt: { confianza: 26, respeto: 18 }, prensa: { rencor: 22 } },
          vida: { reputacion: 10 },
          personalidad: { lealtad: 9 },
          etiquetas: ['dt:aliado', 'prensa:enemigo'],
          balance: 4,
        },
        resultado:
          'Se lo dijiste en su oficina, con la puerta cerrada. No agradeció con palabras: te puso capitán al mes siguiente y te defendió en público dos veces cuando no lo merecías. Ese periodista nunca volvió a escribir tu nombre sin una duda al lado.',
      },
      {
        id: 'publicarlo',
        texto: 'Publicar tú mismo lo que te ofrecieron',
        pista: 'Lo hace nadie. Por algo.',
        efectos: {
          vida: { exposicion: 32, reputacion: 14 },
          relaciones: { prensa: { rencor: 30 }, dt: { confianza: 18 }, hinchada: { respeto: 14 } },
          personalidad: { temperamento: 8, profesionalismo: 6 },
          etiquetas: ['prensa:enemigo'],
          titular: { texto: '{APELLIDO} CONTÓ LO QUE LE PIDIERON PARA DARLE LA PORTADA', tono: 'polemica' },
          balance: 2,
        },
        resultado:
          'Publicaste la captura del mensaje un martes a las siete de la mañana. El diario dijo que era "una conversación descontextualizada", el periodista siguió trabajando y a ti te aplaudieron dos semanas. Después, cada nota sobre ti en ese medio vino con un párrafo de más.',
      },
    ],
  },
  {
    id: 'peru-representante-doble',
    categoria: 'profesional',
    rareza: 'raro',
    picante: 3,
    titulo: 'Cobra de los dos lados',
    texto:
      'Descubriste, por un mensaje que te llegó por error, que tu representante también cobra comisión del club que te compró. Le pagan los dos y hace once años que te maneja la carrera.',
    tipoDeRecuerdo: 'conflicto',
    condiciones: { temporadasMin: 4, clubesMin: 2 },
    cooldown: 8,
    peso: 1.3,
    opciones: [
      {
        id: 'encararlo',
        texto: 'Encararlo y pedirle que elija un lado',
        pista: 'Once años. Y una conversación que no se puede deshacer.',
        efectos: { vida: { estres: 16 }, personalidad: { temperamento: 6 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { dinero: 0.3, reputacion: 8 },
            relaciones: { representante: { respeto: 16, confianza: 10 } },
            balance: 4,
          },
          mal: {
            vida: { estres: 20, dinero: -0.2 },
            relaciones: { representante: { rencor: 26 } },
            etiquetas: ['representante:roto'],
            balance: -6,
          },
          relatoBien:
            'Se lo dijiste por teléfono y no lo negó: te ofreció bajarse su comisión a la mitad los tres años siguientes y te mostró todo por escrito. Ganaste más plata que antes y una relación más incómoda pero más clara.',
          relatoMal:
            'Se lo dijiste y te contestó que sin él no habrías salido nunca del Perú. Tenía algo de razón y eso fue lo peor. Terminaron por mensajes, tu siguiente pase lo negociaste solo y te fue peor de lo que valías.',
        },
        resultado: 'Lo llamaste esa misma noche y se lo dijiste sin rodeos.',
      },
      {
        id: 'usarlo',
        texto: 'No decir nada y usarlo a tu favor',
        pista: 'Ahora sabes algo que él no sabe que sabes.',
        efectos: {
          vida: { dinero: 0.25, estres: 10 },
          personalidad: { riesgo: 6, ego: 5, lealtad: -4 },
          etiquetas: ['representante:apalancado'],
          balance: 3,
        },
        resultado:
          'Te guardaste el mensaje y lo saliste a usar en la negociación siguiente: pediste el doble de prima de fichaje y él no discutió ni un minuto. Cobraste más que nunca, y desde entonces cada llamada suya te suena distinta.',
      },
      {
        id: 'cambiarlo',
        texto: 'Cortarlo y buscarte otro',
        pista: 'Lo limpio. Y once años de contactos que se quedan con él.',
        efectos: {
          vida: { estres: 18, dinero: -0.3 },
          relaciones: { representante: { rencor: 22 } },
          personalidad: { profesionalismo: 7 },
          etiquetas: ['representante:nuevo'],
          balance: 0,
        },
        resultado:
          'Lo cortaste por carta notarial y firmaste con una agencia grande. Los primeros ocho meses no sonó el teléfono para nada: los clubes llamaban al número de siempre, que ya no era el tuyo. En el segundo año se acomodó.',
      },
      {
        id: 'blanquear-al-club',
        texto: 'Llevarle el mensaje al club',
        pista: 'Al club le interesa. A ti te deja sin nadie de tu lado.',
        efectos: {
          relaciones: { club: { confianza: 16 }, representante: { rencor: 30 } },
          vida: { reputacion: 6, estres: 20 },
          etiquetas: ['representante:roto'],
          balance: -2,
        },
        resultado:
          'Se lo mostraste al gerente deportivo. El club le cortó la comisión y siguió trabajando con él igual, porque le traía jugadores. Tú te quedaste sin representante y con la sensación de que el único que había perdido algo eras tú.',
      },
    ],
  },
  {
    id: 'peru-politico',
    categoria: 'social',
    rareza: 'raro',
    picante: 3,
    titulo: 'La foto en campaña',
    texto:
      'Faltan seis semanas para las elecciones y un candidato al municipio de tu distrito te ofrece cuarenta mil soles por una foto con la camiseta de su lista. Creció a cuatro cuadras de tu casa y tu tío trabaja con él.',
    tipoDeRecuerdo: 'decision',
    condiciones: { famaMin: 35, temporadasMin: 3 },
    cooldown: 8,
    peso: 1.2,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Sacarte la foto y cobrar',
        pista: 'Cuarenta mil por diez minutos. Y tu cara en cada poste del distrito.',
        efectos: { vida: { dinero: 0.04, exposicion: 22 }, personalidad: { riesgo: 5 } },
        riesgo: {
          prob: 0.35,
          bien: {
            vida: { carinoDeLaHinchada: 6 },
            balance: 0,
          },
          mal: {
            vida: { reputacion: -22, exposicion: 28, carinoDeLaHinchada: -16 },
            relaciones: { hinchada: { rencor: 18 }, prensa: { rencor: 12 } },
            etiquetas: ['politica:marcado'],
            titular: { texto: 'LA CARA DE {APELLIDO} EN LA CAMPAÑA QUE TERMINÓ EN LA FISCALÍA', tono: 'polemica' },
            balance: -9,
          },
          relatoBien:
            'Ganó, gobernó cuatro años sin escándalos y arregló la cancha del barrio. Nadie volvió a mencionar la foto.',
          relatoMal:
            'Ganó, y a los catorce meses la fiscalía le abrió carpeta por obras que no existían. Tu cara estaba en el afiche que salió en todos los noticieros, y en cada nota sobre el caso apareció tu nombre sin que hicieras nada.',
        },
        resultado: 'Fuiste al local de campaña un jueves y te sacaste la foto con la camiseta de la lista.',
      },
      {
        id: 'apoyar-gratis',
        texto: 'Apoyarlo gratis, sin cobrar un sol',
        pista: 'Se te cae el negocio. No la responsabilidad.',
        efectos: {
          vida: { exposicion: 18, reputacion: -6 },
          personalidad: { lealtad: 6 },
          etiquetas: ['politica:marcado'],
          balance: -2,
        },
        resultado:
          'Dijiste que no querías plata y él lo contó en todos los mítines. Salió más creíble que si hubieras cobrado y por eso pesó más. Cuando el mandato salió mal, la gente te reclamó igual: haberlo hecho gratis no te sacó del afiche.',
      },
      {
        id: 'condicionar',
        texto: 'Pedir que la plata vaya a la escuela de menores del club',
        pista: 'Te sacas la plata de encima. La foto se queda.',
        efectos: {
          vida: { reputacion: 12, exposicion: 16 },
          relaciones: { hinchada: { confianza: 12 } },
          personalidad: { carisma: 6, ego: -3 },
          balance: 2,
        },
        resultado:
          'Los cuarenta mil se convirtieron en arcos, mallas y treinta pares de botines para los de menores. La foto la usaron igual y a ti te preguntaron por ella durante toda la campaña, pero tenías con qué contestar.',
      },
      {
        id: 'rechazar',
        texto: 'Decir que no te metes en política',
        pista: 'Aburrido. Y lo único que no se te puede reprochar en cuatro años.',
        efectos: {
          vida: { reputacion: 8 },
          relaciones: { hinchada: { respeto: 8 } },
          personalidad: { profesionalismo: 7 },
          balance: 2,
        },
        resultado:
          'Dijiste que no y tu tío dejó de hablarte cuatro meses. Ganó otro, y cuando al año siguiente medio distrito estaba peleado por ese municipio, tú eras el único con cara conocida que no tenía nada que explicar.',
      },
    ],
  },
  {
    id: 'peru-medico',
    categoria: 'futbol',
    rareza: 'raro',
    picante: 3,
    titulo: 'El médico dice que estás bien',
    texto:
      'Sientes el aductor desde el jueves y el médico del club te dice que "es carga, nada más". Se juega la final de vuelta el domingo. Tú ya tuviste esto y sabes exactamente qué es.',
    tipoDeRecuerdo: 'lesion',
    condiciones: { temporadasMin: 3, edadMin: 28 },
    cooldown: 6,
    peso: 1.4,
    opciones: [
      {
        id: 'jugar',
        texto: 'Jugar la final',
        pista: 'Una final. Y un aductor que ya avisó.',
        efectos: { vida: { estres: 14 }, personalidad: { riesgo: 7, ambicion: 6 } },
        riesgo: {
          prob: 0.4,
          bien: {
            vida: { carinoDeLaHinchada: 22, confianza: 16, reputacion: 10 },
            titular: { texto: '{APELLIDO} JUGÓ LA FINAL ROTO Y NO SE LO CONTÓ A NADIE', tono: 'elogio' },
            balance: 7,
          },
          mal: {
            vida: { condicion: -22, forma: -16, estres: 20 },
            atributos: { ritmo: -2 },
            etiquetas: ['cuerpo:aductor'],
            titular: { texto: 'LO DE {APELLIDO} NO ERA CARGA: SON CUATRO MESES', tono: 'duda' },
            balance: -9,
          },
          relatoBien:
            'Jugaste ochenta minutos con una infiltración y dieron la vuelta. Te operaste en enero, sin apuro, y volviste entero en marzo. Esa foto con la copa la tienes en tu casa.',
          relatoMal:
            'A los veintitrés minutos escuchaste el sonido y ya sabías. Cuatro meses afuera, un aductor que te quedó dos por ciento más lento para siempre y una final que perdieron sin ti en el campo.',
        },
        resultado: 'Te infiltraste el sábado y saliste a jugar la final.',
      },
      {
        id: 'pedir-otra-opinion',
        texto: 'Pagarte una resonancia por fuera del club',
        pista: 'Vas a saber la verdad. El club va a saber que desconfías.',
        efectos: {
          vida: { dinero: -0.03, reputacion: 8 },
          relaciones: { club: { rencor: 12 } },
          personalidad: { profesionalismo: 10 },
          etiquetas: ['cuerpo:cuidado'],
          balance: 3,
        },
        resultado:
          'Fuiste a una clínica el viernes y pagaste de tu bolsillo. Había una lesión de grado uno: jugabas y se rompía. Le llevaste el informe al club, se armó una discusión de dos horas y no jugaste. El médico del club dejó de saludarte y su informe nunca apareció en ningún lado.',
      },
      {
        id: 'decirle-al-dt',
        texto: 'Hablarlo directo con el técnico',
        pista: 'Él decide igual. Pero decide sabiendo.',
        efectos: {
          relaciones: { dt: { confianza: 16, respeto: 12 } },
          vida: { estres: -6 },
          personalidad: { profesionalismo: 8 },
          balance: 3,
        },
        resultado:
          'Se lo dijiste el sábado en el hotel y te contestó que prefería tenerte veinte minutos entero que noventa a medias. Entraste a los setenta con el partido 1-1 y diste el pase del segundo. Nunca se supo que estabas tocado.',
      },
      {
        id: 'callarse',
        texto: 'No decir nada y avisar recién si se rompe',
        pista: 'La opción que eligen casi todos.',
        efectos: {
          vida: { estres: 18 },
          personalidad: { riesgo: 8, profesionalismo: -6 },
        },
        riesgo: {
          prob: 0.45,
          bien: { vida: { confianza: 10, forma: 6 }, balance: 3 },
          mal: {
            vida: { condicion: -18, forma: -14 },
            relaciones: { club: { rencor: 14 }, dt: { rencor: 10 } },
            etiquetas: ['cuerpo:aductor'],
            balance: -7,
          },
          relatoBien:
            'Aguantaste la final y dos partidos más antes de que se notara. Cuando pediste parar, ya estaba el título en la vitrina y nadie preguntó desde cuándo lo tenías.',
          relatoMal:
            'Se rompió a los treinta y cinco minutos y el técnico se enteró en la camilla de que lo sentías desde el jueves. Lo tomó como una mentira, no como un sacrificio, y esa diferencia te costó el resto del año.',
        },
        resultado: 'No dijiste nada y calentaste con el resto como si no pasara nada.',
      },
    ],
  },
  {
    id: 'peru-velorio',
    categoria: 'social',
    rareza: 'raro',
    picante: 3,
    titulo: 'El velorio del hincha',
    texto:
      'Murió un hincha de catorce años que te escribía todas las semanas. La familia pide una sola cosa: que vayas al velorio en Comas, el sábado a las siete. El domingo se juega el clásico y la concentración empieza el sábado a las seis.',
    tipoDeRecuerdo: 'legado',
    condiciones: { famaMin: 45, temporadasMin: 4 },
    cooldown: 0,
    peso: 1.2,
    opciones: [
      {
        id: 'ir',
        texto: 'Ir al velorio y llegar tarde a la concentración',
        pista: 'La familia no va a olvidarlo. El técnico tampoco.',
        efectos: {
          vida: { carinoDeLaHinchada: 26, reputacion: 16, felicidad: -10 },
          relaciones: { hinchada: { confianza: 26, respeto: 22 }, dt: { rencor: 12 } },
          personalidad: { lealtad: 9, ego: -5 },
          etiquetas: ['leyenda:hinchada'],
          titular: { texto: '{APELLIDO} LLEGÓ A COMAS ANTES QUE A LA CONCENTRACIÓN', tono: 'elogio' },
          balance: 8,
        },
        resultado:
          'Fuiste con la camiseta que él te había pedido firmar y la dejaste sobre el cajón. Llegaste al hotel a las once y el técnico te multó sin decir una palabra. El domingo la tribuna cantó el nombre del chico durante catorce minutos, uno por cada año, y tú no pudiste mirar arriba.',
      },
      {
        id: 'pedir-permiso',
        texto: 'Pedirle permiso al club y avisar por delante',
        pista: 'Lo institucional. Puede salir sí, puede salir no.',
        efectos: { vida: { estres: 8 } },
        riesgo: {
          prob: 0.6,
          bien: {
            vida: { carinoDeLaHinchada: 20, reputacion: 12 },
            relaciones: { club: { respeto: 14 }, hinchada: { confianza: 20 } },
            etiquetas: ['leyenda:hinchada'],
            balance: 6,
          },
          mal: {
            vida: { carinoDeLaHinchada: -8, felicidad: -14, estres: 14 },
            relaciones: { club: { rencor: 14 } },
            balance: -3,
          },
          relatoBien:
            'El club dijo que sí y mandó una corona con el escudo. Fuiste con dos compañeros y el presidente apareció al final, sin cámaras. Esa familia habla de ese sábado hasta hoy.',
          relatoMal:
            'El club dijo que no por el clásico y te pidió que mandaras un video. Lo mandaste. La familia lo agradeció por educación y en la nota del diario del lunes la mamá dijo "entendemos que tiene su trabajo". Esa frase te dio vueltas años.',
        },
        resultado: 'Pediste permiso el viernes por la mañana, por escrito.',
      },
      {
        id: 'ir-despues',
        texto: 'No ir al velorio y visitar a la familia el lunes',
        pista: 'Menos foto. Y una casa que ya se vació de gente.',
        efectos: {
          vida: { carinoDeLaHinchada: 12, reputacion: 10, felicidad: -6 },
          relaciones: { hinchada: { confianza: 14, respeto: 12 } },
          personalidad: { lealtad: 6 },
          balance: 5,
        },
        resultado:
          'Fuiste el lunes solo, sin avisarle a nadie, y te quedaste tres horas. No hubo una sola foto de esa tarde. En el barrio lo supieron igual, por los vecinos, y el que lo contó dijo que "vino cuando ya no había cámaras".',
      },
      {
        id: 'dedicarle',
        texto: 'No ir y dedicarle el clásico',
        pista: 'Todo el país lo va a ver. La familia estaba en otro lado.',
        efectos: {
          vida: { exposicion: 20, carinoDeLaHinchada: 8 },
          relaciones: { hinchada: { confianza: 6, rencor: 8 } },
          titular: { texto: 'EL GOL DE {APELLIDO} FUE PARA UN CHICO DE CATORCE AÑOS', tono: 'elogio' },
          balance: 1,
        },
        resultado:
          'Metiste el gol del clásico y señalaste al cielo con las dos manos. Se hizo portada y se hizo camiseta. Al mes, en una entrevista de radio, el papá del chico dijo que le habría gustado más que fuera al velorio, y lo dijo sin bronca, que fue peor.',
      },
    ],
  },
  {
    id: 'peru-escuela',
    categoria: 'legado',
    rareza: 'raro',
    picante: 3,
    titulo: 'Tu nombre en la puerta',
    texto:
      'La municipalidad de tu distrito quiere ponerle tu nombre al complejo deportivo donde aprendiste a jugar. Hay que estar en la ceremonia, con banda de música y discurso. La cancha sigue siendo de tierra.',
    tipoDeRecuerdo: 'legado',
    condiciones: { edadMin: 34, temporadasMin: 6, famaMin: 50 },
    cooldown: 0,
    peso: 1.2,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar e ir a la ceremonia',
        pista: 'Tu nombre en una pared. Y la cancha igual que hace veinte años.',
        efectos: {
          vida: { carinoDeLaHinchada: 16, felicidad: 14, reputacion: 10 },
          relaciones: { hinchada: { confianza: 14 } },
          personalidad: { ego: 5 },
          titular: { texto: 'EL COMPLEJO DONDE EMPEZÓ {APELLIDO} YA LLEVA SU NOMBRE', tono: 'elogio' },
          balance: 5,
        },
        resultado:
          'Fuiste con tu mamá, cortaste la cinta y hablaste dos minutos. Salió en los noticieros de la noche. Volviste seis meses después por tu cuenta y la cancha seguía siendo de tierra, con tu nombre en letras de metal en la entrada.',
      },
      {
        id: 'pedir-grass',
        texto: 'Aceptar solo si ponen grass y vestuarios',
        pista: 'Cuesta más que una placa. Y sirve más.',
        efectos: {
          vida: { reputacion: 18, carinoDeLaHinchada: 12 },
          relaciones: { hinchada: { respeto: 20 } },
          personalidad: { profesionalismo: 6, ego: -4 },
          etiquetas: ['legado:obra'],
          balance: 7,
        },
        resultado:
          'Lo pusiste por escrito: sin grass sintético y dos vestuarios, no había ceremonia. Tardaron catorce meses y lo hicieron. Se inauguró sin banda de música y con ciento veinte chicos jugando el mismo día. Tu nombre está en una placa chica, al costado.',
      },
      {
        id: 'pagarlo',
        texto: 'Pagar la obra tú y pedir que le pongan otro nombre',
        pista: 'La obra completa. Y el nombre de alguien que no eres tú.',
        efectos: {
          vida: { dinero: -1.8, reputacion: 22 },
          relaciones: { hinchada: { confianza: 24, respeto: 24 } },
          personalidad: { ego: -10, lealtad: 8 },
          etiquetas: ['legado:obra', 'leyenda:hinchada'],
          titular: { texto: '{APELLIDO} PAGÓ EL COMPLEJO Y PIDIÓ QUE LLEVE EL NOMBRE DE SU PROFESOR', tono: 'elogio' },
          balance: 9,
        },
        resultado:
          'Pusiste la plata entera y pediste que llevara el nombre del profesor que te llevaba a los partidos en su carro. Él estaba en la ceremonia, con ochenta y un años, y no pudo hablar. Ese video lo vieron más personas que cualquiera de tus goles.',
      },
      {
        id: 'rechazar',
        texto: 'Decir que no: todavía estás jugando',
        pista: 'Los nombres en las paredes son para después.',
        efectos: {
          vida: { reputacion: 8 },
          personalidad: { ego: -6, profesionalismo: 6 },
          balance: 2,
        },
        resultado:
          'Dijiste que te lo guardaran para cuando dejaras de jugar. Al alcalde no le sirvió —quería la foto en campaña— y el proyecto se cayó. Cuando te retiraste, cuatro años después, había otro alcalde y nadie se acordaba de la idea.',
      },
    ],
  },
];
