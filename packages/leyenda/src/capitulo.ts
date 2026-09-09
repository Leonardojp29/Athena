/**
 * El bucle del juego: doce capítulos y se acabó.
 *
 * Un capítulo son **dos temporadas** y siempre hace lo mismo: simula el fútbol de esos dos años,
 * escribe una fila en la línea de la carrera y pide **una** decisión. Doce filas —16, 18, 20… 38—
 * cuentan una carrera entera en tres minutos.
 *
 * La versión anterior tenía una máquina de diez etapas (pretemporada → tramo → cierre → mercado) que
 * exigía entre cien y trescientos clics para llegar al retiro. El motor no estaba mal escrito;
 * estaba mal dosificado. Acá el estado solo dice **qué clase de decisión** está esperando, y todo lo
 * demás pasa entre dos decisiones sin que el jugador tenga que apretar "continuar".
 */
import { chance, crearAzar, elegir, entre, limitar, type Azar } from './azar.js';
import { crecimiento } from './crear.js';
import {
  ANIOS_POR_CAPITULO,
  CAPITULOS,
  MAX_OFERTAS,
  edadDelCapitulo,
  type Carrera,
  type ClaseDeMomento,
  type ContextoDeMomento,
  type Liga,
  type Mundo,
  type Nivel,
  type Club,
  type Oferta,
  type PasoDelCapitulo,
  type Recuerdo,
  type Retiro,
  type Temporada,
  type TonoDeTitular,
  type Trofeo,
  type Vinculo,
} from './estado.js';
import {
  CATALOGO,
  elegirEvento,
  redactar,
  type Categoria,
  type Efectos,
  type Evento,
  type MotivoDeFinal,
} from './eventos/index.js';
import { armarOfertas, ofertasDeDebut, quiereRenovar, rivalDe } from './mercado.js';
import { momentoParaPuesto, resolverMomento, type Intencion, type Jugada } from './momentos.js';
import { calcularOvr, indiceDeNivel, nivelAlcanzado, valorDeMercado } from './ovr.js';
import { elencoDe } from './personajes/index.js';
import {
  NOMBRE_DE_RONDA,
  convocado,
  fuerzaDeSeleccion,
  numerosDeSeleccion,
  rondaAlcanzada,
  torneosDelBienio,
  trofeoDeSeleccion,
} from './seleccion.js';
import {
  aporteDelJugador,
  posicionEnLaTabla,
  premiosDeLaTemporada,
  rolSiguiente,
  simularBienio,
  titulosDeLaTemporada,
} from './temporada.js';

/**
 * Cuántas cosas le pasan al jugador en cada bienio.
 *
 * Una sola dejaba doce decisiones en toda una vida y el juego se sentía un trámite; tres lo estiran
 * hasta donde empieza a cansar. Dos, de tipos distintos, es donde un capítulo tiene textura sin
 * dejar de terminarse en dos minutos.
 */
export const DECISIONES_POR_CAPITULO = 2;

/** Lo que el jugador puede hacer. */
export type Eleccion =
  | { tipo: 'firmar'; ofertaId: string }
  | { tipo: 'renovar' }
  | { tipo: 'decidir'; opcionId: string }
  | { tipo: 'jugar-momento'; intencion: Intencion }
  | { tipo: 'retirarse' };

/**
 * Lo que pasó en un capítulo, para que la interfaz lo cuente.
 *
 * No es un guion de veinte beats como antes: son las cuatro cosas que el jugador quiere saber
 * —cómo le fue, qué dijo la prensa, si subió de nivel, qué ganó— y la decisión que viene.
 */
export interface Capitulo {
  /** La fila nueva de la línea de la carrera. Nula en el capítulo del debut. */
  fila: Temporada | null;
  /** Una línea de prensa que resume el bienio, con el diario que la publica. */
  titular: { texto: string; tono: TonoDeTitular } | null;
  /** Si la carta cambió de material, para la celebración. */
  ascenso: { de: Nivel; a: Nivel } | null;
  /** Cuánto se movió la media en el bienio. */
  saltoDeOvr: { de: number; a: number } | null;
  trofeos: Trofeo[];
  /** El texto del resultado de la decisión anterior, si la hubo. */
  consecuencia: string | null;
  /**
   * Lo que dejó la decisión, para que la pantalla lo cuente como cuenta un título.
   *
   * "Siento que no pasa nada" era literal: el jugador elegía, leía dos líneas de texto y venía la
   * pregunta siguiente. Los números se movían de verdad —confianza, forma, dinero, media— y no se
   * veían en ninguna parte.
   */
  resultado: Resultado | null;
  /**
   * El veredicto de la jugada, para que la cancha lo anime.
   *
   * La pantalla no resuelve nada: recibe el desenlace ya decidido y apunta la pelota a donde
   * corresponde. Antes el canvas tiraba sus propios dados y podía cantar una atajada sobre un gol.
   */
  jugada: Jugada | null;
}

export interface Cambio {
  rotulo: string;
  delta: number;
  /** Cómo se escribe: un entero, un valor con signo o millones. */
  formato: 'entero' | 'millones';
}

export interface Resultado {
  texto: string;
  /** `true` salió bien, `false` salió mal, `null` no había nada que jugarse. */
  salioBien: boolean | null;
  cambios: Cambio[];
}

export interface Avance {
  carrera: Carrera;
  capitulo: Capitulo;
}

const vacio = (): Capitulo => ({
  fila: null,
  titular: null,
  ascenso: null,
  saltoDeOvr: null,
  trofeos: [],
  consecuencia: null,
  resultado: null,
  jugada: null,
});

/* --------------------------------------------------------------------- contexto */

const ligaDe = (mundo: Mundo, slug: string | undefined): Liga | null =>
  mundo.ligas.find((l) => l.slug === slug) ?? null;

/**
 * Los nombres que los textos necesitan. El elenco se sortea con una semilla derivada del club, así
 * el técnico no cambia de nombre entre dos pantallas sin tener que guardarlo en el estado.
 */
function datosDeTexto(carrera: Carrera, mundo: Mundo) {
  const club = carrera.clubActual;
  const liga = ligaDe(mundo, club?.ligaSlug);
  const semillaElenco = ((carrera.semilla ^ ((club?.slug.length ?? 3) * 2654435761)) >>> 0) as number;
  const elenco = elencoDe(crearAzar(semillaElenco), club?.paisCodigo ?? null, club?.continente ?? 'sudamerica');
  const rival = liga && club ? rivalDe(crearAzar(carrera.semilla + 7), liga, club) : null;
  return {
    nombre: carrera.futbolista.nombre,
    club: club?.nombre ?? 'su club',
    rival: rival?.nombre ?? 'el clásico rival',
    rivalSlug: rival?.slug ?? '',
    dt: elenco.dt,
    /*
     * La figura del espectáculo y el periodista del país donde juegas.
     *
     * El repertorio estaba escrito —Kiara del Solar, la orquesta Fuego de Chosica, el Chato Requena—
     * y no llegaba a ninguna pantalla: se sorteaba el elenco entero y solo salía el técnico. Por eso
     * los eventos terminaban con nombres puestos a mano y un peruano se cruzaba con la misma modelo
     * en todas las partidas.
     */
    figura: elenco.figura,
    periodista: elenco.periodista,
    companero: elenco.companeros[0] ?? 'un compañero',
    liga: liga?.nombre ?? 'la liga',
    pais: carrera.futbolista.pais,
    /* Su nacionalidad y el país donde juega son cosas distintas: un peruano en Alemania leía "Perú". */
    paisDelClub: club?.pais ?? carrera.futbolista.pais,
    dorsal: String(carrera.futbolista.dorsal),
  };
}

/* ------------------------------------------------------------------- el capítulo */

/**
 * Avanza el juego. Recibe lo que el jugador eligió y devuelve la carrera nueva más lo que pasó.
 *
 * El orden importa: primero se resuelve la elección (firmar, decidir, patear), después se juegan los
 * dos años, y recién entonces se prepara la decisión siguiente. Así el jugador ve siempre la
 * consecuencia de lo que acaba de elegir antes de que le pidan otra cosa.
 */
export function avanzarCapitulo(carrera: Carrera, eleccion: Eleccion, mundo: Mundo): Avance {
  const azar = crearAzar(carrera.azar);
  const capitulo = vacio();
  let siguiente: Carrera = { ...carrera };

  switch (eleccion.tipo) {
    case 'firmar':
      siguiente = firmar(siguiente, eleccion.ofertaId, azar, capitulo, mundo);
      break;
    case 'renovar':
      siguiente = renovar(siguiente, azar, capitulo);
      break;
    case 'decidir':
      siguiente = decidir(siguiente, eleccion.opcionId, azar, capitulo, mundo);
      break;
    case 'jugar-momento':
      siguiente = jugarMomento(siguiente, eleccion.intencion, azar, capitulo);
      break;
    case 'retirarse':
      siguiente = colgarLosBotines(siguiente, capitulo);
      break;
  }

  /* Una decisión puede acabar la carrera. Si pasó, no hay bienio que jugar. */
  if (siguiente.etapa === 'legado') {
    siguiente.azar = azar.estado();
    return { carrera: siguiente, capitulo };
  }

  /*
   * Un capítulo son **dos** decisiones, no una. Mientras quede algo en la cola se materializa y se
   * devuelve sin simular nada: el jugador ve la consecuencia de lo que acaba de elegir y enseguida
   * lo siguiente que le pasa en esos mismos dos años.
   */
  if (siguiente.cola.length > 0) {
    const [paso, ...resto] = siguiente.cola;
    siguiente = materializar({ ...siguiente, cola: resto }, paso as PasoDelCapitulo, azar, mundo);
    siguiente.azar = azar.estado();
    return { carrera: siguiente, capitulo };
  }

  /*
   * Con la cola vacía se juegan los dos años. Todo capítulo juega, el del debut incluido: se firma
   * con el club y se juegan los dos años ahí mismo, así la primera fila de la carrera —los 16— se
   * llena de una.
   */
  siguiente = jugarBienio(siguiente, azar, capitulo, mundo);
  siguiente = prepararCapitulo(siguiente, azar, mundo);
  siguiente.azar = azar.estado();
  return { carrera: siguiente, capitulo };
}

/** El arranque: los clubes que quieren a un pibe de 16. */
export function abrirCarrera(carrera: Carrera, mundo: Mundo): Avance {
  const azar = crearAzar(carrera.azar);
  const liga = ligaDe(mundo, carrera.ligaDeOrigen) ?? mundo.ligas[0];
  const capitulo = vacio();
  if (!liga) return { carrera, capitulo };

  const siguiente: Carrera = {
    ...carrera,
    ofertas: ofertasDeDebut(azar, carrera, liga),
    etapa: 'mercado',
    azar: azar.estado(),
  };
  return { carrera: siguiente, capitulo };
}

/* ------------------------------------------------------------------ los dos años */

function jugarBienio(carrera: Carrera, azar: Azar, capitulo: Capitulo, mundo: Mundo): Carrera {
  const club = carrera.clubActual;
  if (!club) return carrera;
  const liga = ligaDe(mundo, club.ligaSlug);
  const edad = carrera.futbolista.edad;

  const rendimiento = simularBienio(azar, carrera);
  /* Lo que la jugada dejó a cuenta: el gol de la final y el título que se definió en la cancha. */
  const bono = carrera.bono;

  const fila: Temporada = {
    anio: carrera.anio,
    edad,
    clubSlug: club.slug,
    clubNombre: club.nombre,
    clubEscudo: club.escudo,
    clubColor: club.primario,
    ligaSlug: club.ligaSlug,
    ligaNombre: club.ligaNombre,
    rol: carrera.rol,
    partidos: rendimiento.partidos,
    goles: rendimiento.goles + (bono?.goles ?? 0),
    asistencias: rendimiento.asistencias,
    notaMedia: rendimiento.nota,
    minutos: rendimiento.minutos,
    amarillas: rendimiento.amarillas,
    rojas: rendimiento.rojas,
    ovrInicio: carrera.ovr,
    ovrFin: carrera.ovr,
    nivel: carrera.nivel,
    valor: carrera.valor,
    posicionEnLaTabla: null,
    campeonDeLiga: false,
    trofeos: [],
    seleccion: { convocatorias: 0, goles: 0 },
    lesiones: rendimiento.lesion ? 1 : 0,
  };

  let siguiente: Carrera = { ...carrera };

  /*
   * El bienio del debut no reparte títulos.
   *
   * A los dieciséis, con trece partidos de reserva y la primera oportunidad recién asomando, el
   * campeón fue el club y no vos. Salir campeón en el mismo capítulo en que elegiste tu primer
   * equipo vaciaba de sentido a todos los títulos que venían después.
   */
  const esDebut = carrera.capitulo === 0;

  /* La tabla, una vez por año del bienio: dos chances de salir campeón, como en la vida. */
  const trofeos: Trofeo[] = [...(bono?.trofeos ?? [])];
  let mejorPosicion: number | null = null;
  for (let anio = 0; anio < ANIOS_POR_CAPITULO; anio++) {
    if (!liga || esDebut) break;
    const { posicion } = posicionEnLaTabla(azar, liga, club, aporteDelJugador({ ...carrera, enCurso: fila }));
    mejorPosicion = mejorPosicion === null ? posicion : Math.min(mejorPosicion, posicion);

    const copa = mundo.copas
      .filter((c) => c.continente === club.continente)
      .sort((a, b) => a.jerarquia - b.jerarquia)[0];
    /* Se juega la copa si el club es de los de arriba: con fuerza alta, siempre clasifica. */
    const jugoContinental = club.fuerza >= 68 || posicion <= (copa?.plazas ?? 4);

    for (const titulo of titulosDeLaTemporada(azar, {
      liga,
      club,
      posicion,
      total: liga.clubes.length,
      jugoContinental,
      copaContinental: copa?.nombre ?? null,
      /* La copa se definió en la cancha en este mismo bienio: no se sortea otra vez. */
      sinCopa: bono?.copaResuelta ?? false,
      copaNacional: copaNacionalDe(mundo, club)?.nombre ?? null,
    })) {
      trofeos.push({
        id: `${titulo.clase}-${carrera.anio + anio}-${club.slug}`,
        nombre: titulo.nombre,
        clase: titulo.clase,
        temporada: carrera.anio + anio,
        clubSlug: club.slug,
        clubNombre: club.nombre,
        escudo: escudoDeTrofeo(mundo, liga, copa, titulo.clase, club),
        competicionSlug: slugDeTrofeo(mundo, liga, copa, titulo.clase, club),
        aporte: {
          partidos: Math.round(fila.partidos / 2),
          goles: Math.round(fila.goles / 2),
          asistencias: Math.round(fila.asistencias / 2),
        },
      });
    }
  }

  fila.posicionEnLaTabla = mejorPosicion;
  fila.campeonDeLiga = trofeos.some((t) => t.clase === 'liga');
  fila.trofeos = trofeos.map((t) => t.nombre);

  /*
   * La selección, jugada de verdad.
   *
   * Antes era un contador decorativo: un umbral de media encendía unas convocatorias que no llevaban
   * a ninguna parte, y la clase de trofeo `'seleccion'` estaba declarada sin que nadie la produjera.
   * Ahora el calendario es el real —Mundial cada cuatro años desde 2026, la continental en el medio—
   * y llegar lejos con tu país es lo único que pesa más que una Champions.
   */
  if (convocado(carrera)) {
    const torneos = torneosDelBienio(carrera.anio, club.continente, mundo).filter(
      (t) => !(carrera.bono?.seleccionResuelta ?? []).includes(t.nombre),
    );
    fila.seleccion = numerosDeSeleccion(azar, carrera, torneos.length);

    const fuerza = fuerzaDeSeleccion(escuelaDelPais(carrera.futbolista.paisCodigo));
    for (const torneo of torneos) {
      const ronda = rondaAlcanzada(azar, carrera, fuerza, torneo.mundial);
      if (ronda >= 4) {
        trofeos.push(
          trofeoDeSeleccion(carrera, torneo, `Campeones. Jugaste el torneo entero con la ${carrera.futbolista.pais}.`),
        );
      } else if (ronda >= 2) {
        siguiente = recordar(siguiente, {
          tipo: 'seleccion',
          texto: `${carrera.futbolista.pais} cayó en ${NOMBRE_DE_RONDA[ronda]} del ${torneo.nombre} de ${torneo.anio}.`,
          etiquetas: ['seleccion:torneo', `seleccion:ronda-${ronda}`],
          balance: ronda >= 3 ? 2 : 0,
        });
      }
    }
  }

  /* Premios individuales, una tirada por año del bienio. */
  const premios: string[] = [];
  for (let anio = 0; anio < ANIOS_POR_CAPITULO; anio++) {
    for (const premio of premiosDeLaTemporada(azar, { ...carrera, enCurso: fila }, fila.campeonDeLiga)) {
      if (premios.includes(premio)) continue;
      premios.push(premio);
      trofeos.push({
        id: `individual-${carrera.anio + anio}-${premio}`,
        nombre: premio,
        clase: 'individual',
        temporada: carrera.anio + anio,
        clubSlug: club.slug,
        clubNombre: club.nombre,
      });
    }
  }

  /* El crecimiento del bienio y su reparto entre atributos. */
  const crecido = crecimiento(azar, {
    edad,
    ovr: carrera.ovr,
    potencial: carrera.futbolista.potencial,
    minutos: rendimiento.minutos,
    profesionalismo: carrera.futbolista.personalidad.profesionalismo,
    lesiones: fila.lesiones,
    nota: fila.notaMedia,
    goles: fila.goles,
    partidos: fila.partidos,
    titulos: trofeos.length,
    pesoDeLaLiga: liga?.peso ?? 45,
  });
  const atributos = repartirCrecimiento(azar, carrera, crecido.delta);
  const ovrNuevo = calcularOvr(atributos, carrera.futbolista.puesto);
  const todos = [...carrera.trofeos, ...trofeos];
  const nivelNuevo = nivelAlcanzado(
    ovrNuevo,
    {
      trofeos: todos.filter((t) => t.clase !== 'individual').length,
      premios: todos.filter((t) => t.clase === 'individual').length,
    },
    edad + ANIOS_POR_CAPITULO,
    carrera.nivel,
  );

  fila.ovrFin = ovrNuevo;
  fila.nivel = nivelNuevo;
  fila.valor = valorDeMercado(ovrNuevo, edad, crecido.potencial);

  capitulo.fila = fila;
  capitulo.trofeos = trofeos;
  if (ovrNuevo !== carrera.ovr) capitulo.saltoDeOvr = { de: carrera.ovr, a: ovrNuevo };
  /*
   * Solo se festeja una subida. Con `!==` cualquier cambio disparaba la pantalla completa y el cartel
   * "TU CARTA CAMBIÓ", y medido sobre trescientas carreras el 51% de esas celebraciones anunciaba un
   * **descenso** con luces de fiesta. Ahora el material tampoco baja, así que esto no puede volver.
   */
  if (indiceDeNivel(nivelNuevo) > indiceDeNivel(carrera.nivel)) {
    capitulo.ascenso = { de: carrera.nivel, a: nivelNuevo };
  }
  capitulo.titular = titularDelBienio(azar, carrera, fila, trofeos, mundo);

  const rolNuevo = rolSiguiente(azar, { ...carrera, enCurso: fila });

  siguiente = {
    ...siguiente,
    futbolista: {
      ...carrera.futbolista,
      atributos,
      /* El techo que el bienio corrió: un chico que explota en Europa se gana un potencial más alto. */
      potencial: crecido.potencial,
      edad: edad + ANIOS_POR_CAPITULO,
    },
    ovr: ovrNuevo,
    nivel: nivelNuevo,
    valor: fila.valor,
    rol: rolNuevo,
    trofeos: todos,
    temporadas: [...carrera.temporadas, fila],
    anio: carrera.anio + ANIOS_POR_CAPITULO,
    capitulo: carrera.capitulo + 1,
    bono: null,
    vida: {
      ...carrera.vida,
      dinero: carrera.vida.dinero + (carrera.contrato?.salario ?? 0.1) * ANIOS_POR_CAPITULO,
      fama: limitar(carrera.vida.fama + trofeos.length * 5 + fila.goles * 0.4, 0, 100),
      reputacion: limitar(carrera.vida.reputacion + trofeos.length * 4, 0, 100),
      forma: limitar(carrera.vida.forma + (fila.notaMedia - 6.6) * 10, 25, 98),
      condicion: limitar(carrera.vida.condicion - 6 - (fila.lesiones ? 12 : 0), 25, 100),
      carinoDeLaHinchada: limitar(carrera.vida.carinoDeLaHinchada + (fila.campeonDeLiga ? 12 : 2), 0, 100),
    },
  };

  for (const trofeo of trofeos) {
    siguiente = recordar(siguiente, {
      tipo: trofeo.clase === 'individual' ? 'premio' : 'titulo',
      texto: `${trofeo.nombre} con ${club.nombre}.`,
      etiquetas: [`titulo:${trofeo.clase}`],
      balance: 4,
    });
  }
  if (rendimiento.lesion) {
    siguiente = recordar(siguiente, {
      tipo: 'lesion',
      texto: `${rendimiento.lesion.motivo}: ${rendimiento.lesion.semanas} semanas afuera.`,
      etiquetas: ['lesion'],
    });
  }
  return siguiente;
}

/**
 * La escuela del país: el mismo número que decide cuánto arranca por delante un juvenil sirve como
 * el mejor proxy que hay del nivel de su selección. Un brasileño llega lejos más seguido que un
 * boliviano, que es exactamente lo que pasa.
 */
const ESCUELA_DE_SELECCION: Record<string, number> = {
  BR: 12, AR: 12, FR: 12, ES: 11, DE: 11, 'GB-ENG': 11, GB: 11, IT: 10, PT: 10, NL: 10,
  BE: 9, HR: 8, UY: 8, CO: 7, MX: 7, US: 6, CL: 6, JP: 6, KR: 6, MA: 6, SN: 6, EG: 5,
  EC: 5, PE: 4, PY: 4, CA: 4, SA: 3, BO: 2, VE: 3,
};

const escuelaDelPais = (codigo: string | null): number => ESCUELA_DE_SELECCION[codigo ?? ''] ?? 4;

/**
 * El escudo del trofeo: el logo real de la competencia que ganaste.
 *
 * Es la diferencia entre "ganaste un título" y ver la Champions. Los tres logos vienen de la misma
 * tabla del proveedor, que los tiene todos; el premio individual no tiene competencia detrás y se
 * dibuja con el trofeo de la casa.
 */
function escudoDeTrofeo(
  mundo: Mundo,
  liga: Liga | null,
  copa: { escudo?: string | null } | undefined,
  clase: Trofeo['clase'],
  club: Club,
): string | null {
  if (clase === 'liga') return liga?.escudo ?? null;
  if (clase === 'continental') return copa?.escudo ?? null;
  if (clase === 'copa') return copaNacionalDe(mundo, club)?.escudo ?? null;
  return null;
}

function slugDeTrofeo(
  mundo: Mundo,
  liga: Liga | null,
  copa: { slug?: string } | undefined,
  clase: Trofeo['clase'],
  club: Club,
): string | null {
  if (clase === 'liga') return liga?.slug ?? null;
  if (clase === 'continental') return copa?.slug ?? null;
  if (clase === 'copa') return copaNacionalDe(mundo, club)?.slug ?? null;
  return null;
}

/** El titular que resume el bienio. Da narrativa sin costar un clic. */
function titularDelBienio(
  azar: Azar,
  carrera: Carrera,
  fila: Temporada,
  trofeos: Trofeo[],
  mundo: Mundo,
): { texto: string; tono: TonoDeTitular } {
  const datos = datosDeTexto(carrera, mundo);
  const apellido = (datos.nombre.split(' ').at(-1) ?? datos.nombre).toUpperCase();
  const club = fila.clubNombre.toUpperCase();
  const pais = datos.pais.toUpperCase();

  if (trofeos.some((t) => t.clase === 'seleccion')) {
    return { texto: `${apellido} LEVANTÓ LA COPA CON ${pais}`, tono: 'elogio' };
  }
  if (trofeos.some((t) => t.clase === 'continental')) {
    return { texto: `${apellido} TOCA EL CIELO: ${club} CAMPEÓN DE AMÉRICA`, tono: 'elogio' };
  }
  if (trofeos.some((t) => t.nombre.includes('Balón de Oro'))) {
    return { texto: `EL MUNDO SE RINDE ANTE ${apellido}`, tono: 'elogio' };
  }
  if (fila.campeonDeLiga) {
    return { texto: `${club} CAMPEÓN, CON ${apellido} DE PROTAGONISTA`, tono: 'elogio' };
  }
  if (fila.goles >= 40) {
    return { texto: `${fila.goles} GOLES EN DOS AÑOS: ${apellido} NO PARA`, tono: 'elogio' };
  }
  if (fila.lesiones > 0) {
    return { texto: `DOS AÑOS DE PELEA CON EL CUERPO PARA ${apellido}`, tono: 'duda' };
  }
  if (fila.notaMedia >= 7.4) return { texto: `${apellido}, LO MEJOR DE ${club}`, tono: 'elogio' };
  if (fila.partidos < 20) {
    return { texto: `POCOS MINUTOS PARA ${apellido} EN ${club}`, tono: 'duda' };
  }
  if (fila.notaMedia < 6.2) {
    return { texto: `DOS TEMPORADAS PARA OLVIDAR DE ${apellido}`, tono: 'duda' };
  }
  return {
    texto: elegir(azar, [
      `${apellido} SUMA RODAJE EN ${club}`,
      `TEMPORADAS DE OFICIO PARA ${apellido}`,
      `${club} SE APOYA EN ${apellido}`,
    ]),
    tono: 'neutro',
  };
}

/**
 * Reparte el crecimiento entre los atributos.
 *
 * `delta` viene en puntos de media, y la media es un promedio ponderado de seis casilleros: mover el
 * promedio un punto cuesta bastante más que un punto repartido. Con medio punto por paso, son
 * `delta * 12` pasos; sin esa cuenta un juvenil crecía la sexta parte de lo que debía.
 */
function repartirCrecimiento(azar: Azar, carrera: Carrera, delta: number) {
  const atributos = { ...carrera.futbolista.atributos };
  const claves = Object.keys(atributos) as Array<keyof typeof atributos>;

  const pesosDeSubida = {
    POR: { ritmo: 2, tiro: 2, pase: 1, regate: 1.5, defensa: 2, fisico: 1.5 },
    DFC: { defensa: 3, fisico: 2.4, pase: 1.2, ritmo: 1, regate: 0.6, tiro: 0.4 },
    LAT: { ritmo: 2.4, defensa: 2.2, pase: 1.8, regate: 1.4, fisico: 1.4, tiro: 0.6 },
    MC: { pase: 3, defensa: 1.8, regate: 1.8, ritmo: 1, fisico: 1.2, tiro: 1 },
    MO: { pase: 2.6, regate: 2.6, tiro: 1.8, ritmo: 1.4, fisico: 0.8, defensa: 0.4 },
    EXT: { regate: 3, ritmo: 2.8, tiro: 1.6, pase: 1.4, fisico: 0.8, defensa: 0.3 },
    DC: { tiro: 3.4, regate: 1.8, ritmo: 1.8, fisico: 1.6, pase: 0.8, defensa: 0.3 },
  }[carrera.futbolista.puesto] as Record<string, number>;

  /* La edad se lleva primero el ritmo y el físico; la técnica se conserva. */
  const pesosDeCaida: Record<string, number> = {
    ritmo: 2.2,
    fisico: 1.8,
    regate: 1.1,
    defensa: 0.7,
    tiro: 0.5,
    pase: 0.3,
  };

  const pesos = delta > 0 ? pesosDeSubida : pesosDeCaida;
  const bolsa = claves.flatMap((c) =>
    Array<keyof typeof atributos>(Math.max(1, Math.round((pesos[c] ?? 1) * 3))).fill(c),
  );

  /*
   * Se reparte **hasta llegar a la media objetivo**, no una cantidad fija de pasos.
   *
   * El reparto está sesgado hacia lo que el puesto usa —un delantero mejora el tiro antes que la
   * marca— y esos son justamente los atributos que más pesan en su media. Con un número fijo de
   * pasos, el sesgo hacía que la media subiera casi el doble de lo pedido: un juvenil pasaba de 70 a
   * 84 en un solo capítulo. Apuntando al objetivo, el crecimiento es exactamente el que la curva de
   * la edad decidió.
   */
  const objetivo = calcularOvr(carrera.futbolista.atributos, carrera.futbolista.puesto) + delta;
  const tope = Math.round(Math.abs(delta) * 24) + 4;
  for (let i = 0; i < tope; i++) {
    const actual = calcularOvr(
      Object.fromEntries(claves.map((c) => [c, Math.round(atributos[c])])) as typeof atributos,
      carrera.futbolista.puesto,
    );
    if (delta > 0 ? actual >= objetivo : actual <= objetivo) break;
    const clave = elegir(azar, bolsa);
    atributos[clave] = limitar(atributos[clave] + (delta > 0 ? 0.5 : -0.5), 20, 99);
  }
  for (const clave of claves) atributos[clave] = Math.round(atributos[clave]);
  return atributos;
}

/* --------------------------------------------------------- la decisión siguiente */

/**
 * Qué le pasa al jugador en este bienio.
 *
 * Dos cosas, siempre, y de tipos distintos: el mercado y un escándalo, un momento en la cancha y una
 * llamada de la selección. Con una sola decisión cada dos años el juego se sentía un trámite —doce
 * clics y una vida— y con dos del mismo tipo se siente repetido, así que la cola se arma cuidando
 * que nunca se repita la categoría.
 *
 * La cola se arma entera acá pero cada paso se materializa cuando le toca (`materializar`): si
 * firmas por otro club en el primer paso, el segundo tiene que hablar de tu club nuevo.
 */
function prepararCapitulo(carrera: Carrera, azar: Azar, mundo: Mundo): Carrera {
  if (carrera.capitulo >= CAPITULOS) return retirarse(carrera, 'edad');

  const pasos: PasoDelCapitulo[] = [];

  /*
   * El mercado abre en todos los capítulos y va primero.
   *
   * Antes se abría con el contrato venciendo o con un quince por ciento de suerte, y salían cinco en
   * una carrera entera: el jugador pasaba diez años sin que nadie le preguntara dónde quería jugar.
   * Ahora la primera pregunta de cada bienio es siempre la misma —¿me quedo o me voy?— y la segunda
   * es un evento o una jugada. Que no se convierta en un carrusel de doce camisetas lo resuelven las
   * reglas que ya están: con contrato vigente solo se ofrece lo que es un paso real hacia arriba, y
   * cuando no te quiere nadie la pregunta sigue siendo una pregunta —renovar o quedarte libre—.
   */
  pasos.push({ tipo: 'mercado' });

  /*
   * Y la segunda pregunta, siempre.
   *
   * Antes el momento jugable se empujaba acá y se comía este slot, porque el tope de la cola era dos
   * y el mercado ya ocupaba uno: medido, entre el 20% y el 35% de los capítulos se quedaba sin
   * ninguna pregunta. Para el jugador una jugada de cancha no es una pregunta, y tenía razón. Ahora
   * el evento va antes y no compite con nada.
   */
  const usadas = new Set<Categoria>();
  const vistos = new Set<string>();
  while (pasos.length < DECISIONES_POR_CAPITULO) {
    const evento = siguienteEvento(carrera, azar, usadas, vistos);
    if (!evento) break;
    usadas.add(evento.categoria);
    vistos.add(evento.id);
    pasos.push({ tipo: 'evento', eventoId: evento.id });
  }

  /*
   * Los momentos jugables son un paso **extra**, no un reemplazo: se sortean, pesan más cuando hay
   * algo que ganar y salen tres o cuatro por carrera. Una jugada de cancha es un regalo encima de
   * las dos decisiones, no una de ellas.
   */
  if (carrera.clubActual && chance(azar, probabilidadDeMomento(carrera))) pasos.push({ tipo: 'momento' });

  const [primero, ...resto] = pasos;
  const conVistos = {
    ...carrera,
    vistos: pasos.reduce(
      (acumulado, paso) =>
        paso.tipo === 'evento' ? { ...acumulado, [paso.eventoId]: carrera.anio } : acumulado,
      carrera.vistos,
    ),
    /* Lo agendado que ya se sirvió sale de la lista de facturas. */
    pendientes: carrera.pendientes.filter(
      (p) => !pasos.some((paso) => paso.tipo === 'evento' && paso.eventoId === p.eventoId),
    ),
    cola: resto,
  };
  return materializar(conVistos, primero as PasoDelCapitulo, azar, mundo);
}

/**
 * El evento siguiente, respetando lo agendado.
 *
 * Una factura pendiente —la investigación de la apuesta que aceptaste hace dos capítulos— entra
 * antes que cualquier sorteo: si dependiera del azar, la mitad de las cadenas no se cobrarían nunca
 * y el juego olvidaría lo que el jugador hizo.
 */
function siguienteEvento(
  carrera: Carrera,
  azar: Azar,
  usadas: Set<Categoria>,
  vistos: Set<string>,
): Evento | null {
  const agendado = carrera.pendientes.find(
    (p) => p.capitulo <= carrera.capitulo && !vistos.has(p.eventoId),
  );
  if (agendado) {
    const evento = CATALOGO.find((e) => e.id === agendado.eventoId);
    if (evento) return evento;
  }
  const categorias = categoriasDelPaso(carrera.capitulo).filter((c) => !usadas.has(c));
  if (categorias.length === 0) return null;

  const evento = elegirEvento(azar, carrera, CATALOGO, { categorias });
  if (evento && !vistos.has(evento.id)) return evento;

  /*
   * La red por si el pozo se agota. Hoy no pasa —medido, quedan unos treinta y ocho eventos
   * disponibles en los últimos capítulos— pero antes de dejar al jugador sin pregunta es mejor
   * repetir uno que vio hace seis años.
   */
  const repetido = elegirEvento(azar, carrera, CATALOGO, { categorias, ignorarCooldown: true });
  return repetido && !vistos.has(repetido.id) ? repetido : null;
}

/** Convierte un paso de la cola en algo que la pantalla sabe mostrar. */
function materializar(carrera: Carrera, paso: PasoDelCapitulo, azar: Azar, mundo: Mundo): Carrera {
  if (paso.tipo === 'momento' && carrera.clubActual) return proponerMomento(carrera, azar, mundo);
  if (paso.tipo === 'evento') {
    return { ...carrera, etapa: 'decision', pendiente: { clase: 'decision', eventoId: paso.eventoId } };
  }
  return abrirMercado(carrera, azar, mundo);
}

function abrirMercado(carrera: Carrera, azar: Azar, mundo: Mundo): Carrera {
  /*
   * El mercado siempre trae cuatro ofertas con sentido —el salto, el puesto, la historia y el
   * comodín— y las trae en ese orden. Antes había acá un filtro por renombre y, cuando el filtro
   * dejaba cero, un segundo sorteo sin ningún filtro que podía ofrecer exactamente lo que el primero
   * acababa de descartar. Las dos cosas viven ahora dentro de `armarOfertas`.
   */
  const ofertas = armarOfertas(azar, carrera, { mundo, actual: carrera.clubActual });
  return {
    ...carrera,
    ofertas: ofertas.slice(0, MAX_OFERTAS),
    etapa: 'mercado',
    pendiente: { clase: 'mercado' },
  };
}

/**
 * Cuántas ganas tiene el juego de darte una jugada.
 *
 * Sube con lo que hay en juego: un titular de un club grande vive finales, un suplente de un club
 * chico no. Da tres o cuatro momentos por carrera, repartidos donde tienen sentido en lugar de en
 * dos capítulos fijos.
 */
function probabilidadDeMomento(carrera: Carrera): number {
  const grande = (carrera.clubActual?.fuerza ?? 60) >= 72 ? 0.12 : 0;
  const juega = carrera.rol === 'titular' || carrera.rol === 'estrella' || carrera.rol === 'capitan' ? 0.1 : 0;
  return limitar(0.14 + grande + juega, 0.14, 0.4);
}

/**
 * De qué habla cada capítulo. Rota el tipo para que la carrera tenga textura: al principio el
 * vestuario y el cuerpo, en el medio la prensa y el dinero, al final el legado.
 *
 * Cada categoría aparece en un tramo lo bastante ancho para que ningún evento quede fuera de su
 * propia edad. Antes `dinero` empezaba a los 22 y su evento del primer contrato pedía `edadMax: 21`,
 * y `profesional` terminaba a los 20 mientras su oferta árabe pedía `edadMin: 27`: dos eventos
 * escritos que era imposible ver. Un test recorre el catálogo para que no vuelva a pasar.
 *
 * `prensa` y `caos` abren desde el primer capítulo, y eso cambia el juego. Empezaban en el tercero, o
 * sea a los veintidós, y ahí vivía la mitad del material que vale —el ampay, el panelista, el audio
 * filtrado, la pelea en el vestuario—: los dieciocho y los veinte, que son la edad más escandalizable
 * que existe, eran el tramo tibio de la carrera. Lo que gradúa el escándalo ahora es el picante del
 * evento, no un portón cerrado por categoría, y el `famaMin` que esos eventos ya traen hace que a
 * nadie lo persiga la prensa antes de que la prensa sepa quién es.
 */
export function categoriasDelPaso(paso: number): Categoria[] {
  if (paso <= 2) return ['futbol', 'profesional', 'social', 'dinero', 'relaciones', 'prensa', 'caos'];
  if (paso <= 5) return ['futbol', 'prensa', 'relaciones', 'dinero', 'social', 'caos', 'profesional'];
  if (paso <= 8) return ['prensa', 'dinero', 'caos', 'futbol', 'relaciones', 'social', 'profesional'];
  return ['legado', 'futbol', 'caos', 'prensa', 'relaciones', 'dinero', 'social', 'profesional'];
}

/**
 * La jugada, y lo que se juega en ella.
 *
 * Cuando la escena es una final, el título **entra en juego de verdad**: se arma el trofeo acá y solo
 * llega a la vitrina si el jugador la mete. Antes el momento no tocaba nada —el gol se descartaba y
 * la copa la sorteaba la simulación por su cuenta— y se podía fallar el penal de la final y salir
 * campeón igual, que es exactamente lo que no puede pasar en un juego de decisiones.
 */
function proponerMomento(carrera: Carrera, azar: Azar, mundo: Mundo): Carrera {
  const datos = datosDeTexto(carrera, mundo);
  const club = carrera.clubActual;
  const momento: ClaseDeMomento = momentoParaPuesto(azar, carrera.futbolista.puesto);

  /* Una final solo la juega quien llegó: club competitivo y un rol que pise el campo. */
  const juegaFinales =
    (club?.fuerza ?? 0) >= 66 && ['titular', 'estrella', 'capitan', 'rotacion'].includes(carrera.rol);
  const esFinal = juegaFinales && chance(azar, 0.45);

  const escenas = esFinal
    ? [`Final de la Copa de ${carrera.clubActual?.pais ?? datos.pais}, y la definición pasa por tus pies`]
    : [
        'Clásico, estadio lleno, últimos minutos',
        'Se juega la clasificación a la copa',
        'Eliminatoria con tu selección',
        'Último partido del año y hay que ganarlo',
      ];

  const enJuego: Trofeo | undefined =
    esFinal && club
      ? {
          id: `copa-${carrera.anio}-${club.slug}`,
          nombre: `Copa de ${club.pais}`,
          clase: 'copa',
          temporada: carrera.anio,
          clubSlug: club.slug,
          clubNombre: club.nombre,
          escudo: copaNacionalDe(mundo, club)?.escudo ?? null,
          competicionSlug: copaNacionalDe(mundo, club)?.slug ?? null,
        }
      : undefined;

  const contexto: ContextoDeMomento = {
    escena: elegir(azar, escenas),
    rival: datos.rival,
    minuto: entre(azar, 78, 92),
    marcador: [entre(azar, 0, 2), entre(azar, 0, 2)],
    presion: limitar(0.5 + azar.siguiente() * 0.45, 0.5, 0.95),
    competencia: enJuego?.nombre ?? carrera.clubActual?.ligaNombre ?? datos.liga,
    ...(enJuego ? { enJuego } : {}),
  };
  return { ...carrera, etapa: 'momento', pendiente: { clase: 'momento', momento, contexto } };
}

/** La copa nacional del país del club, para ponerle su escudo de verdad al trofeo. */
function copaNacionalDe(mundo: Mundo, club: { paisCodigo: string | null }) {
  if (!club.paisCodigo) return null;
  return mundo.copasNacionales?.find((c) => c.paisCodigo === club.paisCodigo) ?? null;
}

/**
 * Lo que la pantalla necesita para mostrar la decisión pendiente, ya redactado con los nombres de
 * esta carrera. La interfaz no conoce el catálogo: solo pinta lo que le llega.
 */
export function eventoPendiente(carrera: Carrera, mundo: Mundo) {
  const pendiente = carrera.pendiente;
  if (pendiente?.clase !== 'decision') return null;
  const evento = CATALOGO.find((e) => e.id === pendiente.eventoId);
  if (!evento) return null;
  const datos = datosDeTexto(carrera, mundo);
  return {
    evento,
    titulo: redactar(evento.titulo, datos),
    texto: redactar(evento.texto, datos).replaceAll('{dorsal}', datos.dorsal),
    opciones: evento.opciones.map((o) => ({
      id: o.id,
      texto: o.texto,
      pista: o.pista,
      /* La pantalla marca las opciones que se juegan a los dados, sin decir cómo salen. */
      arriesgada: o.riesgo !== undefined,
    })),
  };
}

/* ------------------------------------------------------------------- decisiones */

/**
 * El rol con el que realmente llegás, que no siempre es el prometido.
 *
 * Cuanto más grande te queda el club, más chances de que la promesa del proyecto se caiga y termines
 * mirando desde el banco. Es el riesgo que la oferta anunciaba, y es lo que convierte a "aceptar al
 * gigante" en una decisión en lugar de un premio: sin esto, todas las carreras subían y ninguna se
 * torcía, que es justo lo contrario de lo que hace buena a una historia de fútbol.
 */
function rolDeVerdad(azar: Azar, oferta: Oferta, carrera: Carrera): Oferta['rolPrometido'] {
  const brecha = oferta.club.fuerza - carrera.ovr;
  if (brecha <= 2 || oferta.matices.includes('prestamo')) return oferta.rolPrometido;
  if (!chance(azar, limitar(brecha / 22, 0.05, 0.55))) return oferta.rolPrometido;

  const escala: Array<Oferta['rolPrometido']> = [
    'promesa',
    'suplente',
    'rotacion',
    'titular',
    'estrella',
    'capitan',
  ];
  const indice = escala.indexOf(oferta.rolPrometido);
  return escala[Math.max(0, indice - 1)] ?? 'suplente';
}

function firmar(carrera: Carrera, ofertaId: string, azar: Azar, capitulo: Capitulo, mundo: Mundo): Carrera {
  const oferta = carrera.ofertas.find((o) => o.id === ofertaId);
  if (!oferta) return carrera;
  const desde = carrera.clubActual?.nombre ?? null;
  const esDebut = carrera.clubActual === null;

  let siguiente: Carrera = {
    ...carrera,
    clubActual: oferta.club,
    clubDeOrigen: carrera.clubDeOrigen ?? oferta.club,
    contrato: {
      clubSlug: oferta.club.slug,
      hasta: carrera.anio + oferta.temporadas,
      salario: oferta.salario,
      rolPrometido: oferta.rolPrometido,
    },
    /*
     * El rol prometido no siempre se cumple. Si el club te queda grande, hay una posibilidad real de
     * que la promesa del proyecto se caiga y termines mirando: es exactamente el riesgo que la oferta
     * anunciaba, y es lo que hace que aceptar al gigante sea una decisión y no un premio. Sin esto,
     * todas las carreras subían y ninguna se torcía.
     */
    rol: rolDeVerdad(azar, oferta, carrera),
    clubes: carrera.clubes.includes(oferta.club.slug) ? carrera.clubes : [...carrera.clubes, oferta.club.slug],
    ofertas: [],
    pendiente: null,
    vida: {
      ...carrera.vida,
      /*
       * Cambiar de continente cuesta. El primer bienio afuera se juega con el idioma, el clima y la
       * comida en contra, y el juego lo cobra en forma: es la adaptación que en el fútbol real
       * hunde a la mitad de los que cruzan el charco.
       */
      forma:
        oferta.club.continente !== carrera.clubActual?.continente && carrera.clubActual !== null
          ? limitar(carrera.vida.forma - 14, 25, 98)
          : carrera.vida.forma,
    },
  };

  capitulo.consecuencia = cronicaDelFichaje(azar, oferta, carrera, siguiente, desde, esDebut);

  siguiente = recordar(siguiente, {
    tipo: esDebut ? 'debut' : 'fichaje',
    texto: capitulo.consecuencia,
    etiquetas: [`club:${oferta.club.slug}`, ...(esDebut ? ['debut'] : oferta.matices.map((m) => `fichaje:${m}`))],
  });

  /* Firmar donde juraste que jamás irías: la memoria cobra, y es la mejor escena del juego. */
  if (oferta.matices.includes('promesa-rota')) {
    siguiente = aplicarEfectos(
      siguiente,
      {
        vida: { carinoDeLaHinchada: -20, exposicion: 16, reputacion: -6 },
        relaciones: { hinchada: { rencor: 20 } },
        titular: { texto: 'LA FRASE VUELVE: {APELLIDO} FIRMA EN {CLUB}', tono: 'polemica' },
      },
      capitulo,
      mundo,
      azar,
    );
    siguiente = recordar(siguiente, {
      tipo: 'polemica',
      texto: `Firmaste en ${oferta.club.nombre}, el club al que dijiste que jamás irías.`,
      etiquetas: ['promesa:rota'],
      balance: -3,
    });
  }
  if (oferta.matices.includes('regreso')) {
    siguiente = aplicarEfectos(
      siguiente,
      {
        vida: { carinoDeLaHinchada: 18, felicidad: 14 },
        relaciones: { hinchada: { confianza: 18 } },
        titular: { texto: '{APELLIDO} VUELVE A CASA', tono: 'elogio' },
      },
      capitulo,
      mundo,
      azar,
    );
    siguiente = recordar(siguiente, {
      tipo: 'legado',
      texto: `Volviste a ${oferta.club.nombre}, donde empezó todo.`,
      etiquetas: ['regreso:casa'],
      balance: 6,
    });
  }
  if (oferta.matices.includes('rival')) {
    siguiente = aplicarEfectos(
      siguiente,
      { vida: { carinoDeLaHinchada: -14, exposicion: 14 }, relaciones: { hinchada: { rencor: 14 } } },
      capitulo,
      mundo,
      azar,
    );
  }

  /*
   * Firmar también rinde cuentas. Era la única decisión del juego que no contestaba nada: el jugador
   * elegía un club, leía "Fichas por Boca Juniors" y venía la pregunta siguiente. Ahora pasa por la
   * misma pantalla que el resto y muestra lo que movió.
   */
  capitulo.resultado = {
    texto: capitulo.consecuencia ?? '',
    salioBien: null,
    cambios: cambiosEntre(carrera, siguiente),
  };
  return siguiente;
}

/**
 * Qué pasó después de firmar.
 *
 * No es la crónica de lo que el jugador acaba de hacer —eso ya lo sabe, lo eligió él— sino lo que
 * vino: la presentación, el dorsal que había libre, lo que dijo el técnico y lo que espera la tribuna
 * nueva. Y cuando el rol prometido no se cumplió, se dice acá, que es donde duele.
 */
function cronicaDelFichaje(
  azar: Azar,
  oferta: Oferta,
  antes: Carrera,
  despues: Carrera,
  desde: string | null,
  esDebut: boolean,
): string {
  const club = oferta.club.nombre;
  const dorsal = antes.futbolista.dorsal;

  if (esDebut) {
    const casillero = elegir(azar, [
      'Te dieron un casillero al fondo, al lado del utilero.',
      'El primer día te hicieron cantar en la mitad del vestuario.',
      'El capitán te dio la mano y te dijo el nombre de todos, uno por uno.',
    ]);
    return `Firmaste tu primer contrato en ${club}. ${casillero} La ${dorsal} estaba libre y es tuya.`;
  }

  const promesaCaida = despues.rol !== oferta.rolPrometido;
  const camiseta = chance(azar, 0.55)
    ? `Te dieron la ${dorsal}, como pediste.`
    : `La ${dorsal} estaba ocupada: te tocó otra y no dijiste nada.`;

  if (oferta.matices.includes('regreso')) {
    return `Volviste a ${club}. Había gente esperándote en el aeropuerto a las dos de la mañana, con bombos. ${camiseta}`;
  }
  if (oferta.matices.includes('rival')) {
    /*
     * De quién es rival, que no siempre es del club que dejas. Volviendo a tu país desde Europa, el
     * clásico rival es el de tu club de origen: el texto decía "Universitario, el rival de Manchester
     * United" y no había manera de que eso tuviera sentido.
     */
    const deQuien = oferta.matices.includes('regreso-rival') ? (antes.clubDeOrigen?.nombre ?? null) : desde;
    return `Te presentaron en ${club}${deQuien ? `, el clásico rival de ${deQuien}` : ''}. En la puerta del estadio viejo aparecieron pintadas con tu nombre antes del mediodía.`;
  }

  const presentacion = promesaCaida
    ? `En la conferencia el técnico habló del proyecto y no te nombró. Llegaste a pelear el puesto, no a tenerlo.`
    : elegir(azar, [
        `El técnico dijo en la conferencia que te pidió él.`,
        `La presentación fue en el estadio, con gente en una tribuna. Te sacaste doscientas fotos.`,
        `Te presentaron un martes, sin mucho ruido, y el jueves ya entrenabas con los titulares.`,
      ]);
  return `Firmaste en ${club}${desde ? `, dejando ${desde}` : ''}. ${presentacion} ${camiseta}`;
}

function renovar(carrera: Carrera, azar: Azar, capitulo: Capitulo): Carrera {
  const club = carrera.clubActual;
  if (!club) {
    capitulo.consecuencia = 'Te quedaste sin club y sin ofertas. Entrenas solo y esperas que suene el teléfono.';
    return { ...carrera, ofertas: [], pendiente: null };
  }
  /* Quedarse a mitad de contrato no es renovar: es seguir, y el club no tiene que aprobar nada. */
  const contratoVigente = (carrera.contrato?.hasta ?? 0) > carrera.anio + 1;
  const temporadas = entre(azar, 2, 5);
  capitulo.consecuencia = contratoVigente
    ? `Te quedaste en ${club.nombre}. Escuchaste las ofertas, agradeciste y seguiste entrenando donde estabas.`
    : `Renovaste con ${club.nombre} por ${temporadas} temporadas. El presidente sacó la foto con la camiseta y el contrato.`;
  capitulo.resultado = { texto: capitulo.consecuencia, salioBien: null, cambios: [] };
  return {
    ...carrera,
    contrato: contratoVigente
      ? carrera.contrato
      : {
          clubSlug: club.slug,
          hasta: carrera.anio + temporadas,
          salario: Math.round((carrera.valor / 7) * 100) / 100,
          rolPrometido: carrera.rol,
        },
    ofertas: [],
    pendiente: null,
    relaciones: {
      ...carrera.relaciones,
      club: { ...carrera.relaciones.club, confianza: limitar(carrera.relaciones.club.confianza + 10, 0, 100) },
      hinchada: {
        ...carrera.relaciones.hinchada,
        confianza: limitar(carrera.relaciones.hinchada.confianza + 8, 0, 100),
      },
    },
  };
}

/**
 * Una decisión, y el dado que trae encima.
 *
 * Hasta acá el resultado de un evento estaba escrito antes de que el jugador tocara nada: la opción
 * declaraba sus efectos y se aplicaban, punto. Nada podía salir mal, y por eso ninguna decisión se
 * sentía una decisión. Ahora una opción puede declarar un `riesgo` —una probabilidad y dos futuros—
 * y la pista avisa el tipo de apuesta sin adelantar el resultado.
 */
function decidir(carrera: Carrera, opcionId: string, azar: Azar, capitulo: Capitulo, mundo: Mundo): Carrera {
  const pendiente = carrera.pendiente;
  if (pendiente?.clase !== 'decision') return carrera;
  const evento = CATALOGO.find((e) => e.id === pendiente.eventoId);
  const opcion = evento?.opciones.find((o) => o.id === opcionId);
  if (!evento || !opcion) return carrera;

  const datos = datosDeTexto(carrera, mundo);
  let efectos = opcion.efectos;
  let relato = opcion.resultado;
  let salioBien: boolean | null = null;

  if (opcion.riesgo) {
    salioBien = chance(azar, opcion.riesgo.prob);
    efectos = fusionar(efectos, salioBien ? opcion.riesgo.bien : opcion.riesgo.mal);
    relato = `${opcion.resultado} ${salioBien ? opcion.riesgo.relatoBien : opcion.riesgo.relatoMal}`;
  }

  capitulo.consecuencia = redactar(relato, datos);

  let siguiente = aplicarEfectos(carrera, efectos, capitulo, mundo, azar);

  /* Lo que se movió, para que la pantalla lo muestre en lugar de dejarlo pasar. */
  capitulo.resultado = {
    texto: capitulo.consecuencia,
    salioBien,
    cambios: cambiosEntre(carrera, siguiente),
  };
  siguiente = recordar(siguiente, {
    tipo: evento.tipoDeRecuerdo,
    texto: capitulo.consecuencia,
    etiquetas: (efectos.etiquetas ?? []).map((e) => e.replaceAll('{rivalSlug}', datos.rivalSlug)),
    balance: efectos.balance,
    eventoId: evento.id,
  });

  /* La factura que llega después: se agenda y entra sola cuando le toque. */
  if (efectos.luego) {
    siguiente = {
      ...siguiente,
      pendientes: [
        ...siguiente.pendientes,
        { eventoId: efectos.luego.eventoId, capitulo: siguiente.capitulo + efectos.luego.enCapitulos },
      ],
    };
  }

  /* Y el final del que no vuelve. Nunca sale de la nada: es el último eslabón de una cadena. */
  if (efectos.final) {
    return terminarPorLaMala(
      { ...siguiente, pendiente: null, cola: [] },
      efectos.final.motivo,
      redactar(efectos.final.texto, datos).replaceAll('{edad}', String(carrera.futbolista.edad)),
    );
  }

  return { ...siguiente, pendiente: null };
}

/**
 * Qué se movió con la decisión, en el idioma del jugador.
 *
 * Solo lo que cambió y solo lo que se entiende sin explicación: la media, el dinero y los cinco
 * diales que la gente reconoce. Un cambio de dos décimas en el profesionalismo no es una noticia; que
 * la media suba tres puntos, sí.
 */
const DIALES_VISIBLES: Array<{ clave: keyof Carrera['vida']; rotulo: string; formato: Cambio['formato'] }> = [
  { clave: 'dinero', rotulo: 'Dinero', formato: 'millones' },
  { clave: 'confianza', rotulo: 'Confianza', formato: 'entero' },
  { clave: 'forma', rotulo: 'Forma', formato: 'entero' },
  { clave: 'condicion', rotulo: 'Físico', formato: 'entero' },
  { clave: 'fama', rotulo: 'Fama', formato: 'entero' },
  { clave: 'carinoDeLaHinchada', rotulo: 'Hinchada', formato: 'entero' },
  { clave: 'reputacion', rotulo: 'Reputación', formato: 'entero' },
  { clave: 'estres', rotulo: 'Estrés', formato: 'entero' },
];

function cambiosEntre(antes: Carrera, despues: Carrera): Cambio[] {
  const cambios: Cambio[] = [];

  /* La media va primero siempre: es el número que el jugador mira. */
  if (despues.ovr !== antes.ovr) {
    cambios.push({ rotulo: 'Media', delta: despues.ovr - antes.ovr, formato: 'entero' });
  }

  for (const dial of DIALES_VISIBLES) {
    const delta = despues.vida[dial.clave] - antes.vida[dial.clave];
    if (Math.abs(delta) < (dial.formato === 'millones' ? 0.05 : 1)) continue;
    cambios.push({ rotulo: dial.rotulo, delta: Math.round(delta * 100) / 100, formato: dial.formato });
  }

  /* Cinco chips es lo que se lee de un vistazo; los más grandes primero. */
  return cambios
    .sort((a, b) => (a.rotulo === 'Media' ? -1 : b.rotulo === 'Media' ? 1 : Math.abs(b.delta) - Math.abs(a.delta)))
    .slice(0, 5);
}

/** Junta dos paquetes de efectos: los números se suman, las listas se concatenan. */
function fusionar(base: Efectos, extra: Efectos): Efectos {
  const sumar = <T extends Record<string, number | undefined>>(a?: T, b?: T): T | undefined => {
    if (!a) return b;
    if (!b) return a;
    const salida = { ...a } as Record<string, number>;
    for (const [clave, valor] of Object.entries(b)) salida[clave] = (salida[clave] ?? 0) + (valor ?? 0);
    return salida as T;
  };

  const relaciones = { ...(base.relaciones ?? {}) };
  for (const [vinculo, cambios] of Object.entries(extra.relaciones ?? {})) {
    const v = vinculo as Vinculo;
    relaciones[v] = {
      confianza: (relaciones[v]?.confianza ?? 0) + (cambios?.confianza ?? 0),
      respeto: (relaciones[v]?.respeto ?? 0) + (cambios?.respeto ?? 0),
      rencor: (relaciones[v]?.rencor ?? 0) + (cambios?.rencor ?? 0),
    };
  }

  return {
    vida: sumar(base.vida, extra.vida),
    atributos: sumar(base.atributos, extra.atributos),
    personalidad: sumar(base.personalidad, extra.personalidad),
    relaciones: Object.keys(relaciones).length > 0 ? relaciones : undefined,
    etiquetas: [...(base.etiquetas ?? []), ...(extra.etiquetas ?? [])],
    titular: extra.titular ?? base.titular,
    balance: (base.balance ?? 0) + (extra.balance ?? 0),
    luego: extra.luego ?? base.luego,
    final: extra.final ?? base.final,
  };
}

/**
 * La jugada, y lo que deja.
 *
 * El gol no se pierde: espera en `bono` hasta que el bienio se simule y se suma a la fila. Y si había
 * un título en juego, este es el único lugar donde se decide: metiéndola entra en la vitrina, y
 * fallándola no la gana nadie. El resto de la carrera lo escuchará —el cariño de la hinchada, la
 * confianza, la prensa— porque un penal en una final no se olvida en dos semanas.
 */
function jugarMomento(carrera: Carrera, intencion: Intencion, azar: Azar, capitulo: Capitulo): Carrera {
  const pendiente = carrera.pendiente;
  if (pendiente?.clase !== 'momento') return carrera;

  const resultado = resolverMomento(
    azar,
    pendiente.momento,
    intencion,
    carrera.futbolista.atributos,
    pendiente.contexto,
    carrera.vida.confianza,
  );
  capitulo.jugada = {
    clase: pendiente.momento,
    zona: intencion.zona,
    remate: intencion.remate,
    desenlace: resultado.desenlace,
    arquero: resultado.arquero,
  };

  const enJuego = pendiente.contexto.enJuego ?? null;
  capitulo.consecuencia = enJuego
    ? `${resultado.relato} ${resultado.exito ? `${enJuego.nombre} para ${enJuego.clubNombre}.` : `La copa se fue con ${pendiente.contexto.rival}.`}`
    : resultado.relato;

  const ganado = resultado.exito && enJuego;
  const trofeo: Trofeo | null = ganado
    ? {
        ...enJuego,
        detalle: `${pendiente.contexto.escena}. La definiste tú, en el ${pendiente.contexto.minuto}'.`,
      }
    : null;

  /* Lo que se juega en una final pesa el doble: ganarla o perderla marca los dos años siguientes. */
  const peso = enJuego ? 1.6 : 1;

  let siguiente: Carrera = {
    ...carrera,
    pendiente: null,
    bono: {
      goles: (carrera.bono?.goles ?? 0) + (resultado.suma?.goles ?? 0),
      trofeos: [...(carrera.bono?.trofeos ?? []), ...(trofeo ? [trofeo] : [])],
      /* Si la copa se definía acá, el bienio no la vuelve a sortear: ya se jugó. */
      copaResuelta: (carrera.bono?.copaResuelta ?? false) || enJuego !== null,
    },
    vida: {
      ...carrera.vida,
      confianza: limitar(carrera.vida.confianza + resultado.efectos.confianza * peso, 5, 100),
      carinoDeLaHinchada: limitar(
        carrera.vida.carinoDeLaHinchada + resultado.efectos.carinoDeLaHinchada * peso,
        0,
        100,
      ),
      forma: limitar(carrera.vida.forma + resultado.efectos.forma, 20, 98),
      estres: limitar(carrera.vida.estres + resultado.efectos.estres, 0, 100),
      reputacion: limitar(carrera.vida.reputacion + (resultado.efectos.reputacion ?? 0) * peso, 0, 100),
    },
  };
  /* La jugada también rinde cuentas: lo que movió se ve, igual que en una decisión. */
  capitulo.resultado = {
    texto: capitulo.consecuencia ?? resultado.relato,
    salioBien: resultado.exito,
    cambios: cambiosEntre(carrera, siguiente),
  };

  siguiente = recordar(siguiente, {
    tipo: resultado.exito ? 'gol' : 'decision',
    texto: `${pendiente.contexto.escena}: ${capitulo.consecuencia}`,
    /*
     * La etiqueta la lee el catálogo: haber sido el héroe de una final abre eventos de ídolo, y
     * haberla fallado abre a la prensa encima. La memoria del juego sirve para algo o no sirve.
     */
    etiquetas: [
      `momento:${pendiente.momento}`,
      resultado.exito ? 'momento:exito' : 'momento:fallo',
      ...(enJuego ? [resultado.exito ? 'momento:heroe' : 'momento:villano'] : []),
    ],
    balance: (resultado.exito ? 6 : -4) * peso,
  });
  return siguiente;
}

/* ---------------------------------------------------------------------- efectos */

function aplicarEfectos(
  carrera: Carrera,
  efectos: Efectos,
  capitulo: Capitulo,
  mundo: Mundo,
  azar: Azar,
): Carrera {
  const vida = { ...carrera.vida };
  for (const [clave, delta] of Object.entries(efectos.vida ?? {})) {
    const k = clave as keyof typeof vida;
    /* El dinero se mide en millones y no tiene techo de 100. */
    vida[k] = k === 'dinero' ? Math.max(0, vida[k] + (delta ?? 0)) : limitar(vida[k] + (delta ?? 0), 0, 100);
  }

  let atributos = { ...carrera.futbolista.atributos };
  for (const [clave, delta] of Object.entries(efectos.atributos ?? {})) {
    const k = clave as keyof typeof atributos;
    atributos[k] = Math.round(limitar(atributos[k] + (delta ?? 0), 20, 99));
  }

  /*
   * Y una decisión que sale muy mal se paga en la carta.
   *
   * Solo veinte de las trescientas opciones del catálogo tocaban atributos a mano, así que casi
   * ningún escándalo movía la media y el jugador lo notó: si una pregunta tiene consecuencias, tiene
   * que tenerlas también en el número grande. En lugar de escribir el costo trescientas veces, se
   * traduce el `balance` que cada opción ya declara —que existe justamente para decir cuánto te
   * ayudó o cuánto te costó—. Se reparte con los pesos del puesto, así que le pega donde de verdad
   * mueve la media.
   */
  const balance = efectos.balance ?? 0;
  if (Math.abs(balance) >= 5) {
    const puntos = Math.sign(balance) * (Math.abs(balance) >= 8 ? 2 : 1);
    atributos = repartirCrecimiento(azar, { ...carrera, futbolista: { ...carrera.futbolista, atributos } }, puntos);
  }

  const personalidad = { ...carrera.futbolista.personalidad };
  for (const [clave, delta] of Object.entries(efectos.personalidad ?? {})) {
    const k = clave as keyof typeof personalidad;
    personalidad[k] = Math.round(limitar(personalidad[k] + (delta ?? 0), 0, 100));
  }

  const relaciones = { ...carrera.relaciones };
  for (const [vinculo, cambios] of Object.entries(efectos.relaciones ?? {})) {
    const v = vinculo as Vinculo;
    relaciones[v] = {
      confianza: limitar(relaciones[v].confianza + (cambios?.confianza ?? 0), 0, 100),
      respeto: limitar(relaciones[v].respeto + (cambios?.respeto ?? 0), 0, 100),
      rencor: limitar(relaciones[v].rencor + (cambios?.rencor ?? 0), 0, 100),
    };
  }

  const ovr = calcularOvr(atributos, carrera.futbolista.puesto);
  let siguiente: Carrera = {
    ...carrera,
    vida,
    futbolista: { ...carrera.futbolista, atributos, personalidad },
    relaciones,
    ovr,
    valor: valorDeMercado(ovr, carrera.futbolista.edad, carrera.futbolista.potencial),
  };

  if (efectos.titular) {
    const datos = datosDeTexto(carrera, mundo);
    const texto = redactar(efectos.titular.texto, datos)
      .replaceAll('{APELLIDO}', (datos.nombre.split(' ').at(-1) ?? datos.nombre).toUpperCase())
      .replaceAll('{RIVAL}', datos.rival.toUpperCase())
      .replaceAll('{CLUB}', datos.club.toUpperCase())
      .replaceAll('{FIGURA}', datos.figura.toUpperCase())
      .replaceAll('{PERIODISTA}', datos.periodista.toUpperCase())
      .replaceAll('{DORSAL}', datos.dorsal);
    capitulo.titular = { texto, tono: efectos.titular.tono };
    siguiente = {
      ...siguiente,
      titulares: [...siguiente.titulares, { temporada: carrera.anio, texto, tono: efectos.titular.tono }],
    };
  }
  return siguiente;
}

function recordar(
  carrera: Carrera,
  datos: { tipo: Recuerdo['tipo']; texto: string; etiquetas: string[]; balance?: number; eventoId?: string },
): Carrera {
  const recuerdo: Recuerdo = {
    id: `${carrera.anio}-${carrera.recuerdos.length}`,
    temporada: carrera.anio,
    edad: carrera.futbolista.edad,
    tipo: datos.tipo,
    texto: datos.texto,
    etiquetas: datos.etiquetas,
    balance: datos.balance,
    eventoId: datos.eventoId,
  };
  return { ...carrera, recuerdos: [...carrera.recuerdos, recuerdo] };
}

/**
 * Colgar los botines.
 *
 * El final por edad es el que todos esperan; los otros son el precio de haber jugado con fuego y
 * llegan por `terminarPorLaMala`. La pantalla del legado cambia de tono según el motivo, porque
 * retirarse a los 38 en tu club y acabar sancionado a los 26 no son la misma historia.
 */
/**
 * El retiro elegido: el jugador cierra la carrera en su club en lugar de firmar en cualquier parte.
 *
 * Se ofrece solo cuando el club no quiere renovar y ya pasó los 32, que es exactamente el momento en
 * que la carrera se termina en la vida real y el juego obligaba a seguir estirándola.
 */
function colgarLosBotines(carrera: Carrera, capitulo: Capitulo): Carrera {
  const club = carrera.clubActual;
  const enCasa = club !== null && club.slug === carrera.clubDeOrigen?.slug;
  const relato = club
    ? enCasa
      ? `Anunciaste el retiro en ${club.nombre}, donde habías empezado. La despedida fue en el estadio y no cabía un alma.`
      : `Anunciaste el retiro en ${club.nombre} a los ${carrera.futbolista.edad}. Nadie te renovó y decidiste que así estaba bien.`
    : 'Anunciaste el retiro sin club, en una conferencia que organizaste tú.';
  capitulo.consecuencia = relato;
  capitulo.resultado = { texto: relato, salioBien: null, cambios: [] };
  return retirarse(carrera, 'decision', relato);
}

function retirarse(carrera: Carrera, motivo: Retiro['motivo'], relato?: string): Carrera {
  const club = carrera.clubActual;
  const enCasa = club !== null && club.slug === carrera.clubDeOrigen?.slug;
  /*
   * Cuelga los botines al final del último bienio: la edad del estado ya avanzó los dos años enteros
   * y decir "se retiró a los 40" cuando la última fila dice 38 no le suena bien a nadie.
   */
  const edad =
    motivo === 'edad' ? (carrera.temporadas.at(-1)?.edad ?? carrera.futbolista.edad) + 1 : carrera.futbolista.edad;
  const texto =
    relato ??
    (enCasa
      ? `Te retiraste en ${club?.nombre}, donde habías empezado.`
      : `Te retiraste en ${club?.nombre ?? 'el fútbol'} a los ${edad}.`);

  return {
    ...recordar(carrera, {
      tipo: 'legado',
      texto,
      etiquetas: ['retiro', `retiro:${motivo}`, ...(enCasa ? ['retiro:en-casa'] : [])],
    }),
    etapa: 'legado',
    ofertas: [],
    pendiente: null,
    cola: [],
    retiro: {
      anio: carrera.anio,
      edad,
      clubSlug: club?.slug ?? '',
      clubNombre: club?.nombre ?? '',
      enCasa,
      motivo,
      ...(relato ? { relato } : {}),
    },
  };
}

/**
 * El final del que no vuelve.
 *
 * Una sanción de por vida, una rodilla que no aguantó, un auto a las cuatro de la mañana. Nunca sale
 * de la nada: siempre es el último eslabón de una cadena que el jugador fue alimentando, y la opción
 * que lo abre lo avisa antes. Es lo que hace que arriesgarse dé miedo de verdad.
 */
function terminarPorLaMala(carrera: Carrera, motivo: MotivoDeFinal, relato: string): Carrera {
  return retirarse(carrera, motivo, relato);
}

/** ¿El club te quiere seguir? Es lo que decide si "quedarme" aparece como opción en el mercado. */
/**
 * ¿Puede quedarse?
 *
 * Con el contrato vigente, siempre: el contrato es un contrato y una mala temporada no te echa a la
 * calle. La aprobación del club hace falta solo cuando hay que firmar de nuevo. Con el mercado
 * abriéndose en todos los capítulos esto dejó de ser un detalle: sin la distinción, un año flojo a
 * mitad de contrato te obligaba a cambiar de club.
 */
/**
 * En qué situación está el jugador cuando abre el mercado.
 *
 * Son tres y el jugador tiene que ver las tres, porque hoy el botón de quedarse simplemente
 * desaparecía y no había forma de saber si el club no te quería o si el juego se había roto:
 *
 * - `renovar`: el club te quiere. Te quedas y sigues.
 * - `bloqueado`: el club no te quiere. Hay que buscar equipo, y el botón se muestra apagado con el
 *   aviso en lugar de desaparecer: que no se pueda no significa que no haya que explicarlo.
 */
export type EstadoDelMercado = 'renovar' | 'bloqueado';

/** A partir de esta edad, colgar los botines es una decisión disponible. */
export const EDAD_DE_RETIRO_VOLUNTARIO = 32;

export function estadoDelMercado(carrera: Carrera): EstadoDelMercado {
  return puedeRenovar(carrera) ? 'renovar' : 'bloqueado';
}

/**
 * ¿Puede colgar los botines ahora mismo?
 *
 * Pasados los 32, siempre. No hace falta que el club te eche: si quieres terminar tu carrera acá,
 * terminala. Es la decisión que el juego no ofrecía y que en la vida real toma el jugador.
 */
export const puedeRetirarse = (carrera: Carrera): boolean =>
  carrera.clubActual !== null && carrera.futbolista.edad > EDAD_DE_RETIRO_VOLUNTARIO;

export const puedeRenovar = (carrera: Carrera): boolean => {
  if (carrera.clubActual === null) return false;
  const contratoVigente = (carrera.contrato?.hasta ?? 0) > carrera.anio + 1;
  return contratoVigente || quiereRenovar(carrera);
};

export { CAPITULOS, edadDelCapitulo };
