/**
 * Dinero: apuestas, negocios y la gente que aparece cuando empiezas a ganar.
 *
 * Acá vive la cadena más larga del juego, y es a propósito. Aceptar una apuesta arreglada no se paga
 * el día que la aceptas: se paga dos capítulos después, cuando la investigación toca la puerta, y lo
 * que pase ahí depende de cuántas veces hayas vuelto a decir que sí. Es la forma más limpia que
 * encontré de que una decisión de los veinticuatro se sienta a los veintiocho.
 *
 * Todas las opciones de riesgo avisan en la pista. Nunca hay un final que salga de la nada.
 */
import type { Evento } from './motor.js';

export const EVENTOS_DE_DINERO: Evento[] = [
  {
    id: 'dinero-apuesta-uno',
    categoria: 'dinero',
    rareza: 'infrecuente',
    titulo: 'El hombre del maletín',
    texto:
      'Un tipo que dice trabajar para una casa de apuestas te para en el estacionamiento. Quiere una amarilla en el primer tiempo del domingo. Ofrece más de lo que ganas en un año.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 2, edadMin: 19, sinEtiquetas: ['amanio:investigado'] },
    cooldown: 6,
    peso: 1.3,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar',
        pista: 'Es muchísimo dinero. Y es la puerta por la que se sale de una carrera.',
        efectos: {
          vida: { dinero: 1.8, estres: 20 },
          personalidad: { riesgo: 10, profesionalismo: -8 },
          etiquetas: ['amanio:1'],
          luego: { eventoId: 'dinero-apuesta-investigacion', enCapitulos: 2 },
          balance: -4,
        },
        resultado:
          'La sacaste a los treinta y ocho minutos, en una falta que nadie discutió. El dinero llegó el martes.',
      },
      {
        id: 'denunciar',
        texto: 'Denunciarlo al club',
        pista: 'Se acaba ahí. Y alguien se entera de que no eres de los que dicen que sí.',
        efectos: {
          vida: { reputacion: 16, estres: 8 },
          relaciones: { club: { confianza: 18, respeto: 14 } },
          personalidad: { profesionalismo: 8 },
          titular: { texto: '{APELLIDO} DENUNCIÓ UN INTENTO DE ARREGLO', tono: 'elogio' },
          etiquetas: ['amanio:denunciado'],
          balance: 8,
        },
        resultado: 'Fuiste directo a la oficina del presidente. A la semana el tipo tenía una causa abierta.',
      },
      {
        id: 'ignorar',
        texto: 'Decirle que no y no contarlo',
        pista: 'Lo más fácil. También lo que hace que vuelva.',
        efectos: { vida: { estres: 6 }, etiquetas: ['amanio:rechazado'], balance: 2 },
        resultado: 'Le dijiste que no y te fuiste. Lo viste dos veces más en el estacionamiento.',
      },
      {
        id: 'pedir-mas',
        texto: 'Pedirle el doble para pensarlo',
        pista: 'Ya entraste en la conversación. Eso también cuenta.',
        efectos: {
          vida: { estres: 14 },
          personalidad: { ambicion: 6, riesgo: 8 },
          etiquetas: ['amanio:coqueteo'],
          luego: { eventoId: 'dinero-apuesta-vuelve', enCapitulos: 1 },
          balance: -2,
        },
        resultado: 'Le pediste el doble para ver qué cara ponía. No puso ninguna: dijo que lo consultaba.',
      },
    ],
  },
  {
    id: 'dinero-apuesta-vuelve',
    categoria: 'dinero',
    rareza: 'raro',
    titulo: 'Volvió con el doble',
    texto: 'El mismo tipo, el mismo estacionamiento, el doble encima de la mesa. Esta vez quiere un penal.',
    tipoDeRecuerdo: 'decision',
    condiciones: { conEtiquetas: ['amanio:coqueteo'] },
    cooldown: 0,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar',
        pista: 'El doble de dinero y el doble de riesgo. Esto se investiga.',
        efectos: {
          vida: { dinero: 3.5, estres: 26 },
          personalidad: { riesgo: 12, profesionalismo: -10 },
          etiquetas: ['amanio:1', 'amanio:2'],
          luego: { eventoId: 'dinero-apuesta-investigacion', enCapitulos: 2 },
          balance: -8,
        },
        resultado: 'Fue una mano en el área que nadie entendió, ni tú. Cobraron el penal, perdieron el partido y el dinero apareció el martes en una cuenta que no era tuya.',
      },
      {
        id: 'cortar',
        texto: 'Cortar del todo y cambiar de teléfono',
        pista: 'Se termina. Con lo que ya hablaste, encima.',
        efectos: {
          vida: { estres: 10 },
          personalidad: { profesionalismo: 6 },
          etiquetas: ['amanio:rechazado'],
          balance: 4,
        },
        resultado: 'Cambiaste el número y no volviste a estacionar ahí. No lo viste nunca más.',
      },
      {
        id: 'denunciar',
        texto: 'Denunciarlo ahora, con lo que sabes',
        pista: 'Tienes dos conversaciones para contar. Una es tuya.',
        efectos: {
          vida: { reputacion: 10, estres: 18, exposicion: 12 },
          relaciones: { club: { confianza: 12 } },
          titular: { texto: '{APELLIDO} DECLARA: "ME OFRECIERON DOS VECES"', tono: 'neutro' },
          etiquetas: ['amanio:denunciado'],
          balance: 6,
        },
        resultado: 'Contaste todo, incluida la vez que dijiste "déjame pensarlo". Te creyeron igual.',
      },
      {
        id: 'grabarlo',
        texto: 'Grabarlo y guardarte la grabación',
        pista: 'Un seguro. O una bomba, según quién la encuentre.',
        efectos: {
          vida: { estres: 14 },
          personalidad: { riesgo: 6 },
          etiquetas: ['amanio:grabacion'],
          balance: 1,
        },
        resultado: 'Le grabaste doce minutos con el teléfono en el bolsillo. No se lo dijiste a nadie.',
      },
    ],
  },
  {
    id: 'dinero-apuesta-investigacion',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'La investigación',
    texto:
      'Dos personas de la federación te esperan en el club con un listado de partidos donde está tu nombre. Afuera hay un móvil de La República.',
    tipoDeRecuerdo: 'caos',
    condiciones: { conEtiquetas: ['amanio:1'] },
    cooldown: 0,
    opciones: [
      {
        id: 'confesar',
        texto: 'Confesar y colaborar',
        pista: 'Te van a suspender. Pero vas a seguir jugando.',
        efectos: {
          vida: { reputacion: -22, exposicion: 28, estres: 30, forma: -14 },
          relaciones: { club: { confianza: -20 }, hinchada: { rencor: 24 } },
          titular: { texto: '{APELLIDO} CONFESÓ Y ENTREGÓ A LA RED', tono: 'polemica' },
          etiquetas: ['amanio:investigado', 'amanio:confeso'],
          balance: -10,
        },
        resultado:
          'Contaste todo. Seis meses de suspensión, una multa que dolió y una carrera que siguió existiendo.',
      },
      {
        id: 'negar',
        texto: 'Negarlo todo',
        pista: 'Si tienen pruebas, esto se acaba acá. Para siempre.',
        efectos: { vida: { estres: 28 }, personalidad: { riesgo: 8 } },
        riesgo: {
          prob: 0.4,
          bien: {
            vida: { reputacion: -6, exposicion: 14 },
            etiquetas: ['amanio:investigado', 'amanio:zafo'],
            titular: { texto: 'ARCHIVAN LA CAUSA CONTRA {APELLIDO}', tono: 'duda' },
            balance: -2,
          },
          mal: {
            final: {
              motivo: 'sancion',
              texto:
                'Tenían los mensajes, los movimientos y el video del penal. Inhabilitación de por vida: no volviste a pisar una cancha.',
            },
            balance: -20,
          },
          relatoBien: 'No pudieron probar nada y la causa se archivó a los ocho meses.',
          relatoMal: 'Tenían todo.',
        },
        resultado: 'Dijiste que no sabías de qué te hablaban.',
      },
      {
        id: 'abogado',
        texto: 'No decir una palabra sin abogado',
        pista: 'Lo correcto. Y lo caro.',
        efectos: {
          vida: { dinero: -1.2, estres: 20, exposicion: 16 },
          etiquetas: ['amanio:investigado'],
          balance: -4,
        },
        riesgo: {
          prob: 0.62,
          bien: { vida: { reputacion: -8 }, balance: 2 },
          mal: {
            vida: { reputacion: -18, forma: -10 },
            relaciones: { club: { rencor: 18 } },
            titular: { texto: 'DOS AÑOS DE SANCIÓN PARA {APELLIDO}', tono: 'polemica' },
            balance: -12,
          },
          relatoBien: 'El abogado desarmó el expediente. Quedó una multa y un mal recuerdo.',
          relatoMal: 'Ni el mejor abogado del país pudo con eso: dos años sin jugar.',
        },
        resultado: 'Te levantaste y llamaste a un abogado antes de contestar nada.',
      },
      {
        id: 'entregar',
        texto: 'Entregar la grabación que guardaste',
        pista: 'Solo si la tienes. Te salva a ti y hunde a otros.',
        efectos: {
          vida: { reputacion: 6, exposicion: 22, estres: 24 },
          relaciones: { club: { confianza: 8 } },
          titular: { texto: 'LA GRABACIÓN DE {APELLIDO} DESTAPA LA RED DE APUESTAS', tono: 'neutro' },
          etiquetas: ['amanio:investigado', 'amanio:testigo'],
          balance: 3,
        },
        resultado:
          'Pusiste el teléfono sobre la mesa. Doce minutos de grabación y cuatro personas presas; a ti te dieron por colaborador.',
      },
    ],
  },
  {
    id: 'dinero-inversion',
    categoria: 'dinero',
    rareza: 'comun',
    titulo: 'El negocio del primo',
    texto:
      'Un primo tuyo tiene un proyecto y necesita capital. Dice que en dos años lo triplicas. Lo dice muy convencido.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 2, vida: { dinero: [1, 999] } },
    cooldown: 6,
    opciones: [
      {
        id: 'todo',
        texto: 'Poner una parte grande',
        pista: 'Si sale, no trabajas nunca más. Si no sale, tampoco.',
        efectos: { vida: { dinero: -1.5 }, personalidad: { riesgo: 6 }, etiquetas: ['dinero:negocio'] },
        riesgo: {
          prob: 0.42,
          bien: { vida: { dinero: 5.5, felicidad: 12 }, balance: 8 },
          mal: {
            vida: { dinero: -0.5, estres: 22, felicidad: -14 },
            relaciones: { representante: { rencor: 10 } },
            etiquetas: ['dinero:quebrado'],
            balance: -9,
          },
          relatoBien: 'Salió mejor de lo que nadie esperaba: en dos años valía cuatro veces lo que pusiste y dejaste de depender del fútbol para vivir.',
          relatoMal: 'Se fundió en catorce meses y tu primo dejó de contestar el teléfono.',
        },
        resultado: 'Firmaste el cheque sin leer del todo el contrato.',
      },
      {
        id: 'poco',
        texto: 'Poner lo justo para ayudarlo',
        pista: 'Ni te salva ni te hunde.',
        efectos: {
          vida: { dinero: -0.3, felicidad: 6 },
          personalidad: { lealtad: 4 },
          balance: 3,
        },
        resultado: 'Le diste una mano y le dijiste que era eso y nada más. Lo entendió.',
      },
      {
        id: 'asesor',
        texto: 'Pasárselo a tu asesor financiero',
        pista: 'La respuesta va a ser que no, y va a tener razón.',
        efectos: {
          vida: { dinero: -0.05, estres: -4 },
          personalidad: { profesionalismo: 5 },
          relaciones: { representante: { confianza: 6 } },
          balance: 4,
        },
        resultado: 'Tu asesor lo miró diez minutos y dijo que ni en broma. Tu primo no te habló en un año.',
      },
      {
        id: 'no',
        texto: 'Decirle que no',
        pista: 'Se termina ahí, y no del todo bien.',
        efectos: {
          vida: { felicidad: -6 },
          personalidad: { lealtad: -4 },
          etiquetas: ['vida:familia-rota'],
          balance: 1,
        },
        resultado: 'Le dijiste que no. En la próxima Navidad no fue nadie de esa parte de la familia.',
      },
    ],
  },
  {
    id: 'dinero-representante',
    categoria: 'dinero',
    rareza: 'infrecuente',
    titulo: 'Tu representante quiere más',
    texto:
      'Te llevó desde los quince y ahora pide subir su comisión al veinte por ciento. Dice que es lo que cobran todos.',
    tipoDeRecuerdo: 'decision',
    condiciones: { temporadasMin: 3, famaMin: 25 },
    cooldown: 8,
    opciones: [
      {
        id: 'aceptar',
        texto: 'Aceptar sin discutir',
        pista: 'Sale caro. Y trabaja el doble para ti.',
        efectos: {
          vida: { dinero: -0.4 },
          relaciones: { representante: { confianza: 16, respeto: 10 } },
          etiquetas: ['dinero:representante-fiel'],
          balance: 3,
        },
        resultado: 'Le dijiste que sí en dos minutos. Desde entonces atiende tu teléfono a cualquier hora.',
      },
      {
        id: 'negociar',
        texto: 'Negociar hasta la mitad',
        pista: 'Vas a quedar bien parado. O no.',
        efectos: { personalidad: { ambicion: 4 } },
        riesgo: {
          prob: 0.65,
          bien: { relaciones: { representante: { respeto: 12 } }, balance: 4 },
          mal: { relaciones: { representante: { rencor: 16 } }, etiquetas: ['dinero:representante-frio'], balance: -3 },
          relatoBien: 'Cerraron en quince por ciento y con la mano estrechada. Trabajó el doble por ti ese año y te consiguió el traspaso de tu vida.',
          relatoMal: 'Aceptó, pero desde ese día te empezó a ofrecer clubes que no eran para ti.',
        },
        resultado: 'Le pusiste un número sobre la mesa.',
      },
      {
        id: 'cambiar',
        texto: 'Cambiar de representante',
        pista: 'Empiezas de cero con alguien que no te debe nada.',
        efectos: {
          vida: { estres: 12 },
          relaciones: { representante: { confianza: -30, rencor: 20 } },
          etiquetas: ['dinero:cambio-agente'],
          balance: -2,
        },
        resultado: 'Firmaste con una agencia grande. El que te llevó desde los quince se enteró por la prensa.',
      },
      {
        id: 'familia',
        texto: 'Poner a alguien de tu familia a manejarlo',
        pista: 'Nadie te va a robar. Nadie va a saber tampoco.',
        efectos: {
          vida: { dinero: 0.3, estres: 8 },
          personalidad: { lealtad: 8 },
          relaciones: { representante: { rencor: 24 } },
          etiquetas: ['dinero:agente-familia'],
          balance: 0,
        },
        resultado: 'Tu hermano dejó su trabajo para manejarte. Nunca había negociado nada en su vida.',
      },
    ],
  },
  {
    id: 'dinero-hacienda',
    categoria: 'dinero',
    rareza: 'raro',
    titulo: 'La carta que nadie quiere abrir',
    texto:
      'Llega una notificación de la agencia tributaria y La República ya está preguntando: hay tres años de derechos de imagen que tu estructura declaró en otro país.',
    tipoDeRecuerdo: 'caos',
    condiciones: { famaMin: 45, temporadasMin: 4 },
    cooldown: 10,
    opciones: [
      {
        id: 'pagar',
        texto: 'Pagar todo y cerrarlo',
        pista: 'Se va mucho dinero. Y se va el problema.',
        efectos: {
          vida: { dinero: -2.6, estres: -6, reputacion: 4 },
          personalidad: { profesionalismo: 5 },
          balance: 3,
        },
        resultado: 'Pagaste hasta el último peso antes de que saliera en los diarios. No salió nunca.',
      },
      {
        id: 'pelear',
        texto: 'Pelearlo en tribunales',
        pista: 'Años de titulares. Puede salir muy bien o terminar en algo peor.',
        efectos: { vida: { estres: 24, exposicion: 18 } },
        riesgo: {
          prob: 0.5,
          bien: {
            vida: { dinero: -0.4, reputacion: 6 },
            titular: { texto: 'LA JUSTICIA LE DA LA RAZÓN A {APELLIDO}', tono: 'elogio' },
            balance: 5,
          },
          mal: {
            vida: { dinero: -4.5, reputacion: -18 },
            titular: { texto: 'CONDENAN A {APELLIDO} POR TRES AÑOS DE DECLARACIONES', tono: 'polemica' },
            etiquetas: ['caos:condena'],
            balance: -10,
          },
          relatoBien: 'Cuatro años de audiencias después ganaste en todas las instancias y hasta te devolvieron parte con intereses. Salió en dos líneas donde antes había ocupado portadas.',
          relatoMal: 'Perdiste en las tres instancias. Pagaste el triple y saliste en la portada de todos.',
        },
        resultado: 'Contrataste al mejor estudio del país.',
      },
      {
        id: 'culpar',
        texto: 'Decir que fue tu asesor',
        pista: 'Es verdad. También es lo que dicen todos.',
        efectos: {
          vida: { reputacion: -10, exposicion: 14, dinero: -1.4 },
          relaciones: { representante: { rencor: 20 } },
          titular: { texto: '"YO FIRMO LO QUE ME PONEN", DIJO {APELLIDO}', tono: 'duda' },
          balance: -4,
        },
        resultado: 'Lo dijiste en rueda de prensa y sonó exactamente como sonaba en tu cabeza: a excusa.',
      },
      {
        id: 'callar',
        texto: 'No decir nada y esperar',
        pista: 'A veces se olvida. Casi nunca.',
        efectos: { vida: { estres: 18 }, etiquetas: ['dinero:pendiente'] },
        riesgo: {
          prob: 0.35,
          bien: { vida: { estres: -10 }, balance: 1 },
          mal: {
            vida: { dinero: -3.8, reputacion: -20, exposicion: 24 },
            titular: { texto: 'EMBARGAN LAS CUENTAS DE {APELLIDO}', tono: 'polemica' },
            balance: -11,
          },
          relatoBien: 'Prescribió sin que nadie te llamara nunca más y jamás supiste bien por qué. Guardaste esa carta en el cajón otros diez años.',
          relatoMal: 'Un año después te embargaron las cuentas en pleno mercado de pases.',
        },
        resultado: 'Guardaste la carta en un cajón.',
      },
    ],
  },
  {
    id: 'dinero-casino',
    categoria: 'caos',
    rareza: 'raro',
    titulo: 'La noche del casino',
    texto:
      'Un compañero te lleva a un casino privado. En dos horas perdiste lo que ganas en un mes y te ofrecen seguir a crédito.',
    tipoDeRecuerdo: 'caos',
    condiciones: { edadMin: 21, personalidad: { riesgo: [45, 100] } },
    cooldown: 6,
    opciones: [
      {
        id: 'irse',
        texto: 'Levantarte y salir',
        pista: 'Perdiste un mes. Es todo lo que vas a perder.',
        efectos: {
          vida: { dinero: -0.25, estres: 6 },
          personalidad: { profesionalismo: 6, riesgo: -6 },
          balance: 3,
        },
        resultado: 'Pagaste, te levantaste y saliste. Tu compañero se quedó hasta las siete.',
      },
      {
        id: 'seguir',
        texto: 'Seguir a crédito',
        pista: 'La casa siempre gana. Y cobra.',
        efectos: { vida: { estres: 20 }, personalidad: { riesgo: 10 }, etiquetas: ['caos:deuda'] },
        riesgo: {
          prob: 0.3,
          bien: { vida: { dinero: 1.6, felicidad: 10 }, balance: 1 },
          mal: {
            vida: { dinero: -2.2, estres: 26, reputacion: -12 },
            etiquetas: ['caos:deuda-grande'],
            luego: { eventoId: 'caos-cobrar-la-deuda', enCapitulos: 1 },
            balance: -9,
          },
          relatoBien: 'Recuperaste todo y te fuiste con ganancia. Te fuiste, que es lo raro.',
          relatoMal: 'A las cuatro de la mañana debías tres veces lo que habías perdido al principio.',
        },
        resultado: 'Pediste fichas a cuenta.',
      },
      {
        id: 'club',
        texto: 'Contárselo al club antes de que se entere',
        pista: 'Vergüenza ahora, tranquilidad después.',
        efectos: {
          vida: { estres: -8, reputacion: 4 },
          relaciones: { club: { confianza: 14 } },
          personalidad: { profesionalismo: 8 },
          balance: 5,
        },
        resultado: 'Lo hablaste con el psicólogo del club el lunes. Nadie más lo supo.',
      },
      {
        id: 'compañero',
        texto: 'Sacar a tu compañero de ahí',
        pista: 'El problema no era tuyo.',
        efectos: {
          vida: { dinero: -0.4 },
          relaciones: { companeros: { confianza: 20, respeto: 16 } },
          personalidad: { lealtad: 8 },
          etiquetas: ['social:lider'],
          balance: 6,
        },
        resultado:
          'Le pagaste la deuda y lo sacaste de una oreja. Nunca te lo agradeció en voz alta y siempre estuvo ahí después.',
      },
    ],
  },
];
