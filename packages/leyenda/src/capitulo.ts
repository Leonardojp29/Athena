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
  type Oferta,
  type Recuerdo,
  type Temporada,
  type Trofeo,
  type Vinculo,
} from './estado.js';
import { CATALOGO, elegirEvento, redactar, type Categoria, type Efectos } from './eventos/index.js';
import { armarOfertas, ofertaDePrestamo, ofertasDeDebut, quiereRenovar, rivalDe } from './mercado.js';
import { momentoParaPuesto, resolverMomento, type Intencion } from './momentos.js';
import { calcularOvr, nivelDe, valorDeMercado } from './ovr.js';
import { elencoDe } from './personajes/index.js';
import {
  aporteDelJugador,
  posicionEnLaTabla,
  premiosDeLaTemporada,
  rolSiguiente,
  simularBienio,
  titulosDeLaTemporada,
} from './temporada.js';

/** Lo que el jugador puede hacer. Una por capítulo, nunca dos. */
export type Eleccion =
  | { tipo: 'firmar'; ofertaId: string }
  | { tipo: 'renovar' }
  | { tipo: 'decidir'; opcionId: string }
  | { tipo: 'jugar-momento'; intencion: Intencion };

/**
 * Lo que pasó en un capítulo, para que la interfaz lo cuente.
 *
 * No es un guion de veinte beats como antes: son las cuatro cosas que el jugador quiere saber
 * —cómo le fue, qué dijo la prensa, si subió de nivel, qué ganó— y la decisión que viene.
 */
export interface Capitulo {
  /** La fila nueva de la línea de la carrera. Nula en el capítulo del debut. */
  fila: Temporada | null;
  /** Una línea de prensa que resume el bienio. */
  titular: string | null;
  /** Si la carta cambió de material, para la celebración. */
  ascenso: { de: Nivel; a: Nivel } | null;
  /** Cuánto se movió la media en el bienio. */
  saltoDeOvr: { de: number; a: number } | null;
  trofeos: Trofeo[];
  /** El texto del resultado de la decisión anterior, si la hubo. */
  consecuencia: string | null;
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
    liga: liga?.nombre ?? 'la liga',
    pais: carrera.futbolista.pais,
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
  }

  /*
   * Todo capítulo juega, el del debut incluido: se firma con el club y se juegan los dos años ahí
   * mismo, así la primera fila de la carrera —los 16— se llena de una. Cuando el debut era un caso
   * especial que solo firmaba, el capítulo no avanzaba y el mercado podía volver a abrir en el mismo
   * paso: el jugador se iba de su primer club sin haber jugado un partido.
   */
  siguiente = jugarBienio(siguiente, azar, capitulo, mundo);
  siguiente = prepararDecision(siguiente, azar, capitulo, mundo);
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
    goles: rendimiento.goles,
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

  /* La tabla, una vez por año del bienio: dos chances de salir campeón, como en la vida. */
  const trofeos: Trofeo[] = [];
  let mejorPosicion: number | null = null;
  for (let anio = 0; anio < ANIOS_POR_CAPITULO; anio++) {
    if (!liga) break;
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
    })) {
      trofeos.push({
        id: `${titulo.clase}-${carrera.anio + anio}-${club.slug}`,
        nombre: titulo.nombre,
        clase: titulo.clase,
        temporada: carrera.anio + anio,
        clubSlug: club.slug,
        clubNombre: club.nombre,
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

  /* La selección: el umbral baja para los juveniles, que es cuando ilusiona más. */
  const umbral = edad <= 21 ? 66 : 70;
  if (carrera.ovr >= umbral) {
    const convocatorias = entre(azar, 4, carrera.ovr >= 82 ? 20 : 12);
    fila.seleccion = {
      convocatorias,
      goles:
        carrera.futbolista.puesto === 'POR' ? 0 : entre(azar, 0, Math.max(1, Math.round(convocatorias / 3))),
    };
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
  const delta = crecimiento(azar, {
    edad,
    ovr: carrera.ovr,
    potencial: carrera.futbolista.potencial,
    minutos: rendimiento.minutos,
    profesionalismo: carrera.futbolista.personalidad.profesionalismo,
    lesiones: fila.lesiones,
  });
  const atributos = repartirCrecimiento(azar, carrera, delta);
  const ovrNuevo = calcularOvr(atributos, carrera.futbolista.puesto);
  const todos = [...carrera.trofeos, ...trofeos];
  const nivelNuevo = nivelDe(ovrNuevo, {
    trofeos: todos.filter((t) => t.clase !== 'individual').length,
    premios: todos.filter((t) => t.clase === 'individual').length,
  });

  fila.ovrFin = ovrNuevo;
  fila.nivel = nivelNuevo;
  fila.valor = valorDeMercado(ovrNuevo, edad, carrera.futbolista.potencial);

  capitulo.fila = fila;
  capitulo.trofeos = trofeos;
  if (ovrNuevo !== carrera.ovr) capitulo.saltoDeOvr = { de: carrera.ovr, a: ovrNuevo };
  if (nivelNuevo !== carrera.nivel) capitulo.ascenso = { de: carrera.nivel, a: nivelNuevo };
  capitulo.titular = titularDelBienio(azar, carrera, fila, trofeos, mundo);

  const rolNuevo = rolSiguiente(azar, { ...carrera, enCurso: fila });

  siguiente = {
    ...siguiente,
    futbolista: {
      ...carrera.futbolista,
      atributos,
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

/** El titular que resume el bienio. Da narrativa sin costar un clic. */
function titularDelBienio(
  azar: Azar,
  carrera: Carrera,
  fila: Temporada,
  trofeos: Trofeo[],
  mundo: Mundo,
): string {
  const datos = datosDeTexto(carrera, mundo);
  const apellido = (datos.nombre.split(' ').at(-1) ?? datos.nombre).toUpperCase();
  const club = fila.clubNombre.toUpperCase();

  if (trofeos.some((t) => t.clase === 'continental')) {
    return `${apellido} TOCA EL CIELO: ${club} CAMPEÓN DE AMÉRICA`;
  }
  if (trofeos.some((t) => t.nombre.includes('Balón de Oro'))) {
    return `EL MUNDO SE RINDE ANTE ${apellido}`;
  }
  if (fila.campeonDeLiga) return `${club} CAMPEÓN, CON ${apellido} DE PROTAGONISTA`;
  if (fila.goles >= 40) return `${fila.goles} GOLES EN DOS AÑOS: ${apellido} NO PARA`;
  if (fila.lesiones > 0) return `DOS AÑOS DE PELEA CON EL CUERPO PARA ${apellido}`;
  if (fila.notaMedia >= 7.4) return `${apellido}, LO MEJOR DE ${club}`;
  if (fila.partidos < 20) return `POCOS MINUTOS PARA ${apellido} EN ${club}`;
  if (fila.notaMedia < 6.2) return `DOS TEMPORADAS PARA OLVIDAR DE ${apellido}`;
  return elegir(azar, [
    `${apellido} SUMA RODAJE EN ${club}`,
    `TEMPORADAS DE OFICIO PARA ${apellido}`,
    `${club} SE APOYA EN ${apellido}`,
  ]);
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
 * Qué se le pide al jugador en este capítulo.
 *
 * La cadencia está repartida a propósito: mercado, evento y de vez en cuando un momento jugable.
 * Que no se repita el tipo dos capítulos seguidos es lo que evita que doce decisiones se sientan
 * doce veces la misma.
 */
function prepararDecision(carrera: Carrera, azar: Azar, capitulo: Capitulo, mundo: Mundo): Carrera {
  if (carrera.capitulo >= CAPITULOS) {
    return retirarse(carrera);
  }

  const paso = carrera.capitulo;
  const contratoVence = (carrera.contrato?.hasta ?? 0) <= carrera.anio + 1;

  /* Dos momentos jugables por carrera, en la mitad y cerca del pico: cuando más se juega algo. */
  const tocaMomento = paso === 3 || paso === 7;
  if (tocaMomento && carrera.clubActual) {
    return proponerMomento(carrera, azar, mundo);
  }

  /*
   * El mercado abre cuando el contrato lo permite; si no, cada tanto llega algo irrechazable. Y solo
   * se abre si hay algo que valga la pena: una oferta de un club de menos renombre que el actual no
   * es una decisión, es ruido, y era lo que llenaba las carreras de camisetas intercambiables.
   */
  const tocaMercado = contratoVence || chance(azar, 0.15);
  if (tocaMercado) {
    const actual = carrera.clubActual?.renombre ?? 0;
    const ofertas = armarOfertas(azar, carrera, { mundo, actual: carrera.clubActual })
      /*
       * Solo se ofrece lo que es un paso adelante, salvo que traiga historia (volver a casa, el
       * clásico rival) o que ya estés de vuelta de todo. Una oferta para bajar de categoría a los 24
       * no es una decisión difícil: es ruido que ensucia la carrera.
       */
      .filter(
        (o) =>
          carrera.clubActual === null ||
          o.club.renombre >= actual ||
          o.matices.length > 0 ||
          carrera.futbolista.edad >= 32,
      )
      /*
       * El orden cuenta una intención. Mientras la carrera sube, primero la más aspiracional; pasados
       * los 33, primero la vuelta a casa y el clásico rival, que son los dos finales que la gente
       * recuerda y que de otro modo quedaban escondidos abajo de una oferta europea cualquiera.
       */
      .sort((a, b) => {
        if (carrera.futbolista.edad >= 33) {
          const peso = (o: typeof a) => (o.matices.includes('regreso') ? 2 : o.matices.includes('rival') ? 1 : 0);
          const diferencia = peso(b) - peso(a);
          if (diferencia !== 0) return diferencia;
        }
        return b.club.renombre - a.club.renombre;
      });
    /* Y si estás en el banco de un club que te queda grande, la salida clásica: irte a préstamo. */
    const prestamo = ofertaDePrestamo(azar, carrera, mundo);
    const conPrestamo = prestamo ? [prestamo, ...ofertas] : ofertas;

    if (conPrestamo.length > 0) {
      return {
        ...carrera,
        ofertas: conPrestamo.slice(0, MAX_OFERTAS),
        etapa: 'mercado',
        pendiente: { clase: 'mercado' },
      };
    }
  }

  /* Si no hay mercado, un evento; y si el catálogo se agotó, el mercado igual. */
  const categorias = categoriasDelPaso(paso);
  const evento = elegirEvento(azar, carrera, CATALOGO, { categorias });
  if (evento) {
    return {
      ...carrera,
      etapa: 'decision',
      pendiente: { clase: 'decision', eventoId: evento.id },
      vistos: { ...carrera.vistos, [evento.id]: carrera.anio },
    };
  }

  /* Si el catálogo de eventos se agotó, el mercado siempre tiene algo que ofrecer. */
  const ofertas = armarOfertas(azar, carrera, { mundo, actual: carrera.clubActual });
  return { ...carrera, ofertas: ofertas.slice(0, MAX_OFERTAS), etapa: 'mercado', pendiente: { clase: 'mercado' } };
}

/**
 * De qué habla cada capítulo. Rota el tipo para que la carrera tenga textura: al principio el
 * vestuario y el cuerpo, en el medio la prensa y el dinero, al final el legado.
 */
function categoriasDelPaso(paso: number): Categoria[] {
  if (paso <= 2) return ['futbol', 'profesional', 'social'];
  if (paso <= 5) return ['futbol', 'prensa', 'relaciones', 'dinero'];
  if (paso <= 8) return ['prensa', 'dinero', 'caos', 'futbol', 'relaciones'];
  return ['legado', 'futbol', 'caos', 'prensa'];
}

function proponerMomento(carrera: Carrera, azar: Azar, mundo: Mundo): Carrera {
  const datos = datosDeTexto(carrera, mundo);
  const momento: ClaseDeMomento = momentoParaPuesto(azar, carrera.futbolista.puesto);
  const escenas = [
    'Final de copa, y la definición pasa por tus pies',
    'Clásico, estadio lleno, últimos minutos',
    'Se juega la clasificación a la copa',
    'Eliminatoria con tu selección',
  ];
  const contexto: ContextoDeMomento = {
    escena: elegir(azar, escenas),
    rival: datos.rival,
    minuto: entre(azar, 78, 92),
    marcador: [entre(azar, 0, 2), entre(azar, 0, 2)],
    presion: limitar(0.5 + azar.siguiente() * 0.45, 0.5, 0.95),
    competencia: carrera.clubActual?.ligaNombre ?? datos.liga,
  };
  return { ...carrera, etapa: 'momento', pendiente: { clase: 'momento', momento, contexto } };
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

  capitulo.consecuencia = esDebut
    ? `Debutás en ${oferta.club.nombre}.`
    : `Fichás por ${oferta.club.nombre}${desde ? `, dejando ${desde}` : ''}.`;

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
    );
  }
  return siguiente;
}

function renovar(carrera: Carrera, azar: Azar, capitulo: Capitulo): Carrera {
  const club = carrera.clubActual;
  if (!club) return carrera;
  const temporadas = entre(azar, 2, 5);
  capitulo.consecuencia = `Renovás con ${club.nombre} por ${temporadas} temporadas.`;
  return {
    ...carrera,
    contrato: {
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

function decidir(carrera: Carrera, opcionId: string, azar: Azar, capitulo: Capitulo, mundo: Mundo): Carrera {
  const pendiente = carrera.pendiente;
  if (pendiente?.clase !== 'decision') return carrera;
  const evento = CATALOGO.find((e) => e.id === pendiente.eventoId);
  const opcion = evento?.opciones.find((o) => o.id === opcionId);
  if (!evento || !opcion) return carrera;

  const datos = datosDeTexto(carrera, mundo);
  capitulo.consecuencia = redactar(opcion.resultado, datos);

  let siguiente = aplicarEfectos(carrera, opcion.efectos, capitulo, mundo);
  siguiente = recordar(siguiente, {
    tipo: evento.tipoDeRecuerdo,
    texto: capitulo.consecuencia,
    etiquetas: (opcion.efectos.etiquetas ?? []).map((e) => e.replaceAll('{rivalSlug}', datos.rivalSlug)),
    balance: opcion.efectos.balance,
    eventoId: evento.id,
  });
  void azar;
  return { ...siguiente, pendiente: null };
}

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
  capitulo.consecuencia = resultado.relato;

  let siguiente: Carrera = {
    ...carrera,
    pendiente: null,
    vida: {
      ...carrera.vida,
      confianza: limitar(carrera.vida.confianza + resultado.efectos.confianza, 5, 100),
      carinoDeLaHinchada: limitar(
        carrera.vida.carinoDeLaHinchada + resultado.efectos.carinoDeLaHinchada,
        0,
        100,
      ),
      forma: limitar(carrera.vida.forma + resultado.efectos.forma, 20, 98),
      estres: limitar(carrera.vida.estres + resultado.efectos.estres, 0, 100),
      reputacion: limitar(carrera.vida.reputacion + (resultado.efectos.reputacion ?? 0), 0, 100),
    },
  };
  siguiente = recordar(siguiente, {
    tipo: resultado.exito ? 'gol' : 'decision',
    texto: `${pendiente.contexto.escena}: ${resultado.relato}`,
    etiquetas: [`momento:${pendiente.momento}`, resultado.exito ? 'momento:exito' : 'momento:fallo'],
    balance: resultado.exito ? 6 : -4,
  });
  return siguiente;
}

/* ---------------------------------------------------------------------- efectos */

function aplicarEfectos(carrera: Carrera, efectos: Efectos, capitulo: Capitulo, mundo: Mundo): Carrera {
  const vida = { ...carrera.vida };
  for (const [clave, delta] of Object.entries(efectos.vida ?? {})) {
    const k = clave as keyof typeof vida;
    /* El dinero se mide en millones y no tiene techo de 100. */
    vida[k] = k === 'dinero' ? Math.max(0, vida[k] + (delta ?? 0)) : limitar(vida[k] + (delta ?? 0), 0, 100);
  }

  const atributos = { ...carrera.futbolista.atributos };
  for (const [clave, delta] of Object.entries(efectos.atributos ?? {})) {
    const k = clave as keyof typeof atributos;
    atributos[k] = Math.round(limitar(atributos[k] + (delta ?? 0), 20, 99));
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
      .replaceAll('{DORSAL}', datos.dorsal);
    capitulo.titular = texto;
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

function retirarse(carrera: Carrera): Carrera {
  const club = carrera.clubActual;
  const enCasa = club !== null && club.slug === carrera.clubDeOrigen?.slug;
  /*
   * Cuelga los botines al final del último bienio: la edad del estado ya avanzó los dos años enteros
   * y decir "se retiró a los 40" cuando la última fila dice 38 no le suena bien a nadie.
   */
  const edad = (carrera.temporadas.at(-1)?.edad ?? carrera.futbolista.edad) + 1;
  return {
    ...recordar(carrera, {
      tipo: 'legado',
      texto: enCasa
        ? `Te retiraste en ${club?.nombre}, donde habías empezado.`
        : `Te retiraste en ${club?.nombre ?? 'el fútbol'} a los ${edad}.`,
      etiquetas: ['retiro', ...(enCasa ? ['retiro:en-casa'] : [])],
    }),
    etapa: 'legado',
    ofertas: [],
    pendiente: null,
    retiro: {
      anio: carrera.anio,
      edad,
      clubSlug: club?.slug ?? '',
      clubNombre: club?.nombre ?? '',
      enCasa,
      motivo: 'edad',
    },
  };
}

/* ------------------------------------------------------------------- consulta */

/** El evento pendiente con sus textos redactados: lo que la interfaz necesita para pintarlo. */
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
    opciones: evento.opciones.map((o) => ({ id: o.id, texto: o.texto, pista: o.pista })),
  };
}

/** ¿El club quiere renovarte? Decide si la pantalla de mercado ofrece quedarse. */
export const puedeRenovar = (carrera: Carrera): boolean =>
  carrera.clubActual !== null && quiereRenovar(carrera);

export { CAPITULOS, edadDelCapitulo };
