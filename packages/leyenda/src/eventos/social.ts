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
    id: 'social-auto',
    categoria: 'caos',
    rareza: 'raro',
    picante: 2,
    titulo: 'Las cuatro de la mañana',
    texto:
      'Saliste de una fiesta a la que no tendrías que haber ido y hay cuarenta minutos por la Panamericana hasta tu casa.',
    tipoDeRecuerdo: 'caos',
    condiciones: { conEtiquetas: ['social:noctambulo'], edadMin: 22 },
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
        pista: 'Son las cuatro, estás cansado y la Panamericana a esa hora está vacía. Puede terminar muy mal.',
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
        resultado:
          'Subiste al carro y manejaste los cuarenta minutos con la ventana abierta para no dormirte. Llegaste. Al día siguiente no te acordabas de los últimos diez kilómetros y no se lo contaste a nadie.',
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
];
