/**
 * El motor: la única puerta por la que la interfaz mueve una carrera.
 *
 * Un solo verbo, `avanzar(carrera, accion, mundo)`, y siempre devuelve lo mismo: la carrera nueva y el
 * **guion** de lo que pasó. La interfaz no sabe una sola regla del juego; reproduce beats. Eso permite
 * que el motor se pruebe entero sin navegador y que la pantalla se rediseñe sin tocar una regla.
 *
 * El estado nunca se muta: cada avance clona lo que cambia. Con carreras de veinte temporadas el costo
 * es irrelevante y a cambio la interfaz puede comparar estados —la carta que sube, el OVR que baja— sin
 * llevar copias a mano.
 */
import { chance, crearAzar, elegir, entre, limitar, type Azar } from './azar.js';
import { Guion, type Avance, type Beat } from './beats.js';
import { crecimiento, tramosDe } from './crear.js';
import {
  MAX_OFERTAS,
  NOMBRE_DE_ROL,
  type Carrera,
  type Club,
  type ClaseDeMomento,
  type ContextoDeMomento,
  type Liga,
  type Mundo,
  type Oferta,
  type Recuerdo,
  type Rol,
  type Temporada,
  type Trofeo,
  type Vinculo,
} from './estado.js';
import { CATALOGO, elegirEvento, redactar, type Categoria, type Efectos, type Evento } from './eventos/index.js';
import { calcularVeredicto } from './legado.js';
import { armarOfertas, ofertasDeDebut, quiereRenovar, rivalDe } from './mercado.js';
import { momentoParaPuesto, resolverMomento, type Intencion } from './momentos.js';
import { calcularOvr, nivelDe, valorDeMercado } from './ovr.js';
import { elencoDe } from './personajes/index.js';
import {
  acumularEnTemporada,
  aporteDelJugador,
  narrarTramo,
  posicionEnLaTabla,
  premiosDeLaTemporada,
  rolSiguiente,
  rotuloDeTramo,
  simularTramo,
  titulosDeLaTemporada,
} from './temporada.js';

export type Accion =
  | { tipo: 'elegir-oferta'; ofertaId: string }
  | { tipo: 'seguir' }
  | { tipo: 'decidir'; opcionId: string }
  | { tipo: 'jugar-momento'; intencion: Intencion }
  | { tipo: 'renovar' }
  | { tipo: 'retirarse' };

/** El calendario de una temporada, repartido entre los tramos del ritmo elegido. */
const FECHAS_POR_TEMPORADA = 34;

export function avanzar(carrera: Carrera, accion: Accion, mundo: Mundo): Avance<Carrera> {
  const azar = crearAzar(carrera.azar);
  const guion = new Guion();
  let siguiente: Carrera = { ...carrera };

  switch (accion.tipo) {
    case 'elegir-oferta':
      siguiente = firmar(siguiente, accion.ofertaId, azar, guion, mundo);
      break;
    case 'decidir':
      siguiente = decidir(siguiente, accion.opcionId, azar, guion, mundo);
      break;
    case 'jugar-momento':
      siguiente = jugarMomento(siguiente, accion.intencion, azar, guion);
      break;
    case 'renovar':
      siguiente = renovar(siguiente, azar, guion);
      break;
    case 'retirarse':
      siguiente = retirarse(siguiente, guion, 'decision');
      break;
    case 'seguir':
      siguiente = seguir(siguiente, azar, guion, mundo);
      break;
  }

  siguiente.azar = azar.estado();
  return { carrera: siguiente, beats: guion.beats };
}

/* ------------------------------------------------------------------ contexto */

const ligaDe = (mundo: Mundo, slug: string | undefined): Liga | null =>
  mundo.ligas.find((l) => l.slug === slug) ?? null;

/**
 * Los nombres que el texto de un evento necesita. El elenco se sortea con una semilla derivada del club
 * y del año, así el técnico y los compañeros son estables mientras estés ahí —no cambian de nombre entre
 * dos pantallas— sin tener que guardarlos en el estado.
 */
function elencoActual(carrera: Carrera) {
  const club = carrera.clubActual;
  const semilla = (carrera.semilla ^ (club?.slug.length ?? 3) * 2654435761) >>> 0;
  return elencoDe(crearAzar(semilla), club?.paisCodigo ?? null, club?.continente ?? 'sudamerica');
}

function datosDeTexto(carrera: Carrera, mundo: Mundo) {
  const club = carrera.clubActual;
  const liga = ligaDe(mundo, club?.ligaSlug);
  const elenco = elencoActual(carrera);
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

/* -------------------------------------------------------------------- firmar */

function nuevoContrato(carrera: Carrera, oferta: Oferta): Carrera {
  return {
    ...carrera,
    clubActual: oferta.club,
    clubDeOrigen: carrera.clubDeOrigen ?? oferta.club,
    contrato: {
      clubSlug: oferta.club.slug,
      hasta: carrera.anio + oferta.temporadas,
      salario: oferta.salario,
      rolPrometido: oferta.rolPrometido,
    },
    rol: oferta.rolPrometido,
    clubes: carrera.clubes.includes(oferta.club.slug) ? carrera.clubes : [...carrera.clubes, oferta.club.slug],
    ofertas: [],
  };
}

function firmar(carrera: Carrera, ofertaId: string, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  const oferta = carrera.ofertas.find((o) => o.id === ofertaId);
  if (!oferta) return carrera;

  const desde = carrera.clubActual?.nombre ?? null;
  const esDebut = carrera.temporadas.length === 0 && carrera.clubActual === null;
  let siguiente = nuevoContrato(carrera, oferta);

  guion.agregar({
    clase: 'fichaje',
    club: oferta.club.nombre,
    desde,
    matices: oferta.matices,
    intensidad: 'cine',
  });

  if (esDebut) {
    guion.agregar({
      clase: 'debut',
      club: oferta.club.nombre,
      edad: carrera.futbolista.edad,
      intensidad: 'cine',
    });
    siguiente = recordar(siguiente, {
      tipo: 'debut',
      texto: `Debutaste en ${oferta.club.nombre}, a los ${carrera.futbolista.edad} años.`,
      etiquetas: [`club:${oferta.club.slug}`, 'debut'],
    });
  } else {
    siguiente = recordar(siguiente, {
      tipo: 'fichaje',
      texto: `Firmaste en ${oferta.club.nombre}${desde ? `, dejando ${desde}` : ''}.`,
      etiquetas: [`club:${oferta.club.slug}`, ...oferta.matices.map((m) => `fichaje:${m}`)],
      balance: 0,
    });

    /* Firmar en el club al que juraste no ir es la escena que el juego promete: la memoria cobra. */
    if (oferta.matices.includes('promesa-rota')) {
      siguiente = recordar(siguiente, {
        tipo: 'polemica',
        texto: `Firmaste en ${oferta.club.nombre}, el club al que dijiste que jamás irías.`,
        etiquetas: ['promesa:rota'],
        balance: -3,
      });
      siguiente = aplicarEfectos(
        siguiente,
        {
          vida: { carinoDeLaHinchada: -20, exposicion: 16, reputacion: -6 },
          relaciones: { hinchada: { rencor: 20 } },
          titular: { texto: 'LA FRASE VUELVE: {APELLIDO} FIRMA EN {CLUB}', tono: 'polemica' },
        },
        azar,
        guion,
        mundo,
      );
    }
    if (oferta.matices.includes('rival')) {
      siguiente = aplicarEfectos(
        siguiente,
        {
          vida: { carinoDeLaHinchada: -14, exposicion: 14 },
          relaciones: { hinchada: { rencor: 14 } },
        },
        azar,
        guion,
        mundo,
      );
    }
    if (oferta.matices.includes('regreso')) {
      siguiente = aplicarEfectos(
        siguiente,
        {
          vida: { carinoDeLaHinchada: 18, felicidad: 14 },
          relaciones: { hinchada: { confianza: 18 } },
          titular: { texto: '{APELLIDO} VUELVE A CASA', tono: 'elogio' },
        },
        azar,
        guion,
        mundo,
      );
      siguiente = recordar(siguiente, {
        tipo: 'legado',
        texto: `Volviste a ${oferta.club.nombre}, donde empezó todo.`,
        etiquetas: ['regreso:casa'],
        balance: 6,
      });
    }
  }

  siguiente.etapa = 'pretemporada';
  return siguiente;
}

/* --------------------------------------------------------------------- seguir */

/** El paso genérico: según la etapa, hace lo que toca y deja la carrera en la etapa siguiente. */
function seguir(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  switch (carrera.etapa) {
    case 'debut':
      return prepararDebut(carrera, azar, guion, mundo);
    case 'pretemporada':
      return abrirTemporada(carrera, azar, guion, mundo);
    case 'tramo':
      return jugarTramo(carrera, azar, guion, mundo);
    case 'cierre':
      return abrirMercado(carrera, azar, guion, mundo);
    case 'mercado':
      /* Quedarse sin firmar nada: sigue con el contrato vigente. */
      return { ...carrera, etapa: 'pretemporada', ofertas: [] };
    case 'retiro':
      return { ...carrera, etapa: 'legado' };
    default:
      return carrera;
  }
}

function prepararDebut(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  /* La liga que eligió el jugador. Si ya no existiera en el mundo, la primera sirve de red. */
  const liga = ligaDe(mundo, carrera.ligaDeOrigen) ?? mundo.ligas[0];
  if (!liga) return carrera;
  const ofertas = ofertasDeDebut(azar, carrera, liga);
  guion.capitulo('Los clubes que te quieren', `${ofertas.length} de ${liga.nombre}`);
  guion.agregar({ clase: 'mercado', cuantas: ofertas.length, intensidad: 'ui' });
  return { ...carrera, ofertas, etapa: 'debut' };
}

/** El arranque de temporada: rol, objetivo y una decisión de pretemporada. */
function abrirTemporada(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  const club = carrera.clubActual;
  if (!club) return carrera;
  const liga = ligaDe(mundo, club.ligaSlug);

  const temporada: Temporada = {
    anio: carrera.anio,
    edad: carrera.futbolista.edad,
    clubSlug: club.slug,
    clubNombre: club.nombre,
    ligaSlug: club.ligaSlug,
    ligaNombre: club.ligaNombre,
    rol: carrera.rol,
    partidos: 0,
    goles: 0,
    asistencias: 0,
    notaMedia: 0,
    minutos: 0,
    amarillas: 0,
    rojas: 0,
    ovrInicio: carrera.ovr,
    ovrFin: carrera.ovr,
    nivel: carrera.nivel,
    valor: carrera.valor,
    posicionEnLaTabla: null,
    campeonDeLiga: false,
    trofeos: [],
    seleccion: { convocatorias: 0, goles: 0 },
    lesiones: 0,
  };

  guion.capitulo(
    `Temporada ${carrera.anio}`,
    `${club.nombre} · ${NOMBRE_DE_ROL[carrera.rol]} · ${liga?.nombre ?? club.ligaNombre}`,
  );

  const conCuerpo: Carrera = {
    ...carrera,
    enCurso: temporada,
    tramo: 0,
    etapa: 'tramo',
    /* La forma se resetea parcialmente cada pretemporada: nadie arranca en su pico. */
    vida: { ...carrera.vida, forma: limitar(carrera.vida.forma * 0.8 + 12, 30, 90), condicion: limitar(carrera.vida.condicion + 12, 40, 100) },
  };

  return quizasEvento(conCuerpo, azar, guion, mundo, ['profesional', 'futbol'], 0.75);
}

function jugarTramo(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  if (!carrera.enCurso || !carrera.clubActual) return carrera;
  const total = tramosDe(carrera.ritmo);
  const fechas = Math.round(FECHAS_POR_TEMPORADA / total);
  const rotulo = rotuloDeTramo(carrera.tramo, total);
  const datos = datosDeTexto(carrera, mundo);

  const tramo = simularTramo(azar, carrera, fechas, rotulo);
  const enCurso = { ...carrera.enCurso };
  acumularEnTemporada(enCurso, tramo);

  guion.capitulo(rotulo, `${carrera.clubActual.nombre} · ${carrera.anio}`);
  narrarTramo(guion, azar, tramo, datos.rival, carrera.clubActual.ligaNombre);
  guion.agregar({
    clase: 'tramo',
    resumen: {
      rotulo,
      partidos: tramo.partidos,
      goles: tramo.goles,
      asistencias: tramo.asistencias,
      nota: tramo.nota,
      posicion: null,
    },
    intensidad: 'ui',
  });

  let siguiente: Carrera = {
    ...carrera,
    enCurso,
    tramo: carrera.tramo + 1,
    vida: {
      ...carrera.vida,
      /* La forma sigue al rendimiento del tramo; la condición se gasta con los minutos. */
      forma: limitar(carrera.vida.forma + (tramo.nota - 6.6) * 9, 20, 98),
      condicion: limitar(carrera.vida.condicion - tramo.minutos / 260 - (tramo.lesion ? 18 : 0), 25, 100),
      estres: limitar(carrera.vida.estres + (tramo.partidos > 0 ? 3 : 6), 0, 100),
      fama: limitar(carrera.vida.fama + tramo.goles * 0.8 + (tramo.nota > 7.2 ? 2 : 0), 0, 100),
    },
  };

  if (tramo.lesion) {
    siguiente = recordar(siguiente, {
      tipo: 'lesion',
      texto: `${tramo.lesion.motivo}: ${tramo.lesion.semanas} semanas afuera.`,
      etiquetas: ['lesion'],
    });
  }

  /* Un momento jugable cada tanto, y con más chance si el tramo fue caliente. */
  const chanceMomento = 0.28 + (tramo.goles > 2 ? 0.12 : 0) + (carrera.rol === 'titular' || carrera.rol === 'estrella' ? 0.1 : 0);
  if (siguiente.tramo < total && chance(azar, chanceMomento)) {
    return proponerMomento(siguiente, azar, guion, mundo);
  }

  if (siguiente.tramo >= total) {
    return cerrarTemporada(siguiente, azar, guion, mundo);
  }

  return quizasEvento(siguiente, azar, guion, mundo, undefined, 0.62);
}

/* ------------------------------------------------------------------- momentos */

function proponerMomento(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  const datos = datosDeTexto(carrera, mundo);
  const momento: ClaseDeMomento = momentoParaPuesto(azar, carrera.futbolista.puesto);
  const local = entre(azar, 0, 2);
  const visita = entre(azar, 0, 2);
  const escenas = [
    'Un partido que puede cambiar la temporada',
    'Clásico, estadio lleno',
    'Se juega la clasificación',
    'Final de copa',
  ];
  const contexto: ContextoDeMomento = {
    escena: elegir(azar, escenas),
    rival: datos.rival,
    minuto: entre(azar, 62, 92),
    marcador: [local, visita],
    presion: limitar(0.35 + azar.siguiente() * 0.5, 0.3, 0.95),
    competencia: carrera.clubActual?.ligaNombre ?? datos.liga,
  };
  guion.agregar({ clase: 'momento', momento, contexto, intensidad: 'cine' });
  return { ...carrera, etapa: 'momento', pendiente: { clase: 'momento', momento, contexto } };
}

function jugarMomento(carrera: Carrera, intencion: Intencion, azar: Azar, guion: Guion): Carrera {
  const pendiente = carrera.pendiente;
  if (!pendiente || pendiente.clase !== 'momento') return carrera;

  const resultado = resolverMomento(
    azar,
    pendiente.momento,
    intencion,
    carrera.futbolista.atributos,
    pendiente.contexto,
    carrera.vida.confianza,
  );

  guion.texto(resultado.relato, resultado.exito ? 'cine' : 'drama');

  const enCurso = carrera.enCurso ? { ...carrera.enCurso } : null;
  if (enCurso && resultado.suma) {
    enCurso.goles += resultado.suma.goles ?? 0;
    enCurso.asistencias += resultado.suma.asistencias ?? 0;
  }

  let siguiente: Carrera = {
    ...carrera,
    enCurso,
    pendiente: null,
    etapa: 'tramo',
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
    balance: resultado.exito ? 5 : -3,
  });

  /* Si el momento cerraba la temporada, sigue el cierre; si no, vuelve al tramo. */
  if (siguiente.tramo >= tramosDe(siguiente.ritmo) && siguiente.enCurso) {
    return { ...siguiente, etapa: 'tramo' };
  }
  return siguiente;
}

/* --------------------------------------------------------------------- cierre */

function cerrarTemporada(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  const club = carrera.clubActual;
  const enCurso = carrera.enCurso;
  if (!club || !enCurso) return carrera;
  const liga = ligaDe(mundo, club.ligaSlug);

  const { posicion } = liga
    ? posicionEnLaTabla(azar, liga, club, aporteDelJugador(carrera))
    : { posicion: 8 };
  enCurso.posicionEnLaTabla = posicion;
  enCurso.campeonDeLiga = posicion === 1;

  /* La copa continental de su continente, si el club clasificó el año anterior. */
  const copa = mundo.copas
    .filter((c) => c.continente === club.continente)
    .sort((a, b) => a.jerarquia - b.jerarquia)[0];
  const jugoContinental = (carrera.temporadas.at(-1)?.posicionEnLaTabla ?? 99) <= (copa?.plazas ?? 4);

  const titulos = liga
    ? titulosDeLaTemporada(azar, {
        liga,
        club,
        posicion,
        total: liga.clubes.length,
        jugoContinental,
        copaContinental: copa?.nombre ?? null,
      })
    : [];

  let siguiente: Carrera = { ...carrera };
  const trofeos: Trofeo[] = [];
  for (const titulo of titulos) {
    const trofeo: Trofeo = {
      id: `${titulo.clase}-${carrera.anio}-${club.slug}`,
      nombre: titulo.nombre,
      clase: titulo.clase,
      temporada: carrera.anio,
      clubSlug: club.slug,
      clubNombre: club.nombre,
      aporte: { partidos: enCurso.partidos, goles: enCurso.goles, asistencias: enCurso.asistencias },
    };
    trofeos.push(trofeo);
    enCurso.trofeos.push(trofeo.nombre);
    guion.agregar({ clase: 'trofeo', trofeo, intensidad: 'cine' });
  }

  /* La selección: convocatorias según nivel, con la puerta un poco más abierta para los juveniles. */
  const umbralSeleccion = carrera.futbolista.edad <= 21 ? 66 : 70;
  if (carrera.ovr >= umbralSeleccion) {
    const convocatorias = entre(azar, 2, carrera.ovr >= 82 ? 10 : 6);
    enCurso.seleccion = {
      convocatorias,
      goles: carrera.futbolista.puesto === 'POR' ? 0 : entre(azar, 0, Math.max(1, Math.floor(convocatorias / 3))),
    };
    if (convocatorias > 0) {
      guion.agregar({
        clase: 'seleccion',
        texto: `${convocatorias} partidos con ${carrera.futbolista.pais} esta temporada.`,
        intensidad: 'drama',
      });
    }
  }

  const premios = premiosDeLaTemporada(azar, carrera, enCurso.campeonDeLiga);
  for (const premio of premios) {
    trofeos.push({
      id: `individual-${carrera.anio}-${premio}`,
      nombre: premio,
      clase: 'individual',
      temporada: carrera.anio,
      clubSlug: club.slug,
      clubNombre: club.nombre,
    });
    guion.agregar({ clase: 'premio', nombre: premio, temporada: carrera.anio, intensidad: 'cine' });
  }

  /* Crecimiento: el OVR nuevo y, si cambia de material, la cinemática de la carta. */
  const delta = crecimiento(azar, {
    edad: carrera.futbolista.edad,
    ovr: carrera.ovr,
    potencial: carrera.futbolista.potencial,
    minutos: enCurso.minutos,
    profesionalismo: carrera.futbolista.personalidad.profesionalismo,
    lesiones: enCurso.lesiones,
  });

  const atributos = repartirCrecimiento(azar, carrera, delta);
  const ovrNuevo = calcularOvr(atributos, carrera.futbolista.puesto);
  const todosLosTrofeos = [...carrera.trofeos, ...trofeos];
  const nivelNuevo = nivelDe(ovrNuevo, {
    trofeos: todosLosTrofeos.filter((t) => t.clase !== 'individual').length,
    premios: todosLosTrofeos.filter((t) => t.clase === 'individual').length,
  });

  if (ovrNuevo !== carrera.ovr) {
    guion.agregar({ clase: 'ovr', de: carrera.ovr, a: ovrNuevo, intensidad: 'drama' });
  }
  if (nivelNuevo !== carrera.nivel) {
    guion.agregar({ clase: 'carta', de: carrera.nivel, a: nivelNuevo, ovr: ovrNuevo, intensidad: 'cine' });
  }

  enCurso.ovrFin = ovrNuevo;
  enCurso.nivel = nivelNuevo;
  enCurso.valor = valorDeMercado(ovrNuevo, carrera.futbolista.edad, carrera.futbolista.potencial);
  guion.agregar({ clase: 'temporada', temporada: { ...enCurso }, intensidad: 'drama' });

  const rolNuevo = rolSiguiente(azar, { ...carrera, enCurso });
  if (rolNuevo !== carrera.rol) {
    guion.agregar({ clase: 'rol', de: carrera.rol, a: rolNuevo, intensidad: 'drama' });
  }

  siguiente = {
    ...siguiente,
    futbolista: { ...carrera.futbolista, atributos, edad: carrera.futbolista.edad + 1 },
    ovr: ovrNuevo,
    nivel: nivelNuevo,
    valor: enCurso.valor,
    trofeos: todosLosTrofeos,
    temporadas: [...carrera.temporadas, { ...enCurso }],
    enCurso: null,
    tramo: 0,
    anio: carrera.anio + 1,
    rol: rolNuevo,
    etapa: 'cierre',
    vida: {
      ...carrera.vida,
      dinero: carrera.vida.dinero + (carrera.contrato?.salario ?? 0.1),
      reputacion: limitar(carrera.vida.reputacion + trofeos.length * 4 + premios.length * 6, 0, 100),
      fama: limitar(carrera.vida.fama + trofeos.length * 5 + premios.length * 8, 0, 100),
      estres: limitar(carrera.vida.estres - 12, 0, 100),
      carinoDeLaHinchada: limitar(carrera.vida.carinoDeLaHinchada + (enCurso.campeonDeLiga ? 10 : 0), 0, 100),
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

  /* Fin de la carrera: por edad, o antes si el cuerpo o la falta de minutos lo empujan. */
  if (debeRetirarse(siguiente, azar)) {
    return retirarse(siguiente, guion, siguiente.futbolista.edad >= 36 ? 'edad' : 'lesion');
  }
  return siguiente;
}

/**
 * Reparte el crecimiento entre los atributos.
 *
 * `delta` viene en puntos de **OVR**, y el OVR es un promedio ponderado de seis atributos: para que la
 * media suba un punto hay que repartir bastante más que un punto entre los casilleros. Con medio punto
 * por paso, mover la media en `delta` cuesta `delta * 12` pasos, y sin esa cuenta un juvenil crecía la
 * sexta parte de lo que debía y jamás llegaba a ser bueno.
 *
 * Al subir, el reparto se sesga a lo que el puesto usa: un delantero mejora su tiro antes que su
 * marca. Al bajar, la edad se lleva primero el ritmo y el físico, y la técnica se conserva, que es
 * como envejecen los futbolistas de verdad.
 */
function repartirCrecimiento(azar: Azar, carrera: Carrera, delta: number) {
  const atributos = { ...carrera.futbolista.atributos };
  const claves = Object.keys(atributos) as Array<keyof typeof atributos>;

  const pesosDeSubida: Record<string, number> = {
    POR: { ritmo: 2, tiro: 2, pase: 1, regate: 1.5, defensa: 2, fisico: 1.5 },
    DFC: { defensa: 3, fisico: 2.4, pase: 1.2, ritmo: 1, regate: 0.6, tiro: 0.4 },
    LAT: { ritmo: 2.4, defensa: 2.2, pase: 1.8, regate: 1.4, fisico: 1.4, tiro: 0.6 },
    MC: { pase: 3, defensa: 1.8, regate: 1.8, ritmo: 1, fisico: 1.2, tiro: 1 },
    MO: { pase: 2.6, regate: 2.6, tiro: 1.8, ritmo: 1.4, fisico: 0.8, defensa: 0.4 },
    EXT: { regate: 3, ritmo: 2.8, tiro: 1.6, pase: 1.4, fisico: 0.8, defensa: 0.3 },
    DC: { tiro: 3.4, regate: 1.8, ritmo: 1.8, fisico: 1.6, pase: 0.8, defensa: 0.3 },
  }[carrera.futbolista.puesto] as Record<string, number>;

  const pesosDeCaida: Record<string, number> = {
    ritmo: 2.2,
    fisico: 1.8,
    regate: 1.1,
    defensa: 0.7,
    tiro: 0.5,
    pase: 0.3,
  };

  const pesos = delta > 0 ? pesosDeSubida : pesosDeCaida;
  /* La bolsa de la que se sortea: cada atributo aparece tantas veces como su peso. */
  const bolsa = claves.flatMap((c) =>
    Array<keyof typeof atributos>(Math.max(1, Math.round((pesos[c] ?? 1) * 3))).fill(c),
  );

  const pasos = Math.round(Math.abs(delta) * 12);
  for (let i = 0; i < pasos; i++) {
    const clave = elegir(azar, bolsa);
    atributos[clave] = limitar(atributos[clave] + (delta > 0 ? 0.5 : -0.5), 20, 99);
  }
  /* Los atributos son enteros en la carta: se redondean recién al final del reparto. */
  for (const clave of claves) atributos[clave] = Math.round(atributos[clave]);
  return atributos;
}

function debeRetirarse(carrera: Carrera, azar: Azar): boolean {
  const edad = carrera.futbolista.edad;
  if (edad >= 38) return true;
  if (edad >= 34 && carrera.ovr < 62) return true;
  if (edad >= 35 && chance(azar, 0.35)) return true;
  if (edad >= 33 && carrera.vida.condicion < 45 && chance(azar, 0.3)) return true;
  return false;
}

function retirarse(carrera: Carrera, guion: Guion, motivo: 'edad' | 'lesion' | 'decision'): Carrera {
  const club = carrera.clubActual;
  const enCasa = club !== null && club.slug === carrera.clubDeOrigen?.slug;
  guion.agregar({
    clase: 'retiro',
    club: club?.nombre ?? 'su club',
    edad: carrera.futbolista.edad,
    enCasa,
    intensidad: 'cine',
  });
  const conRecuerdo = recordar(carrera, {
    tipo: 'legado',
    texto: enCasa
      ? `Te retiraste en ${club?.nombre}, donde habías empezado.`
      : `Te retiraste en ${club?.nombre ?? 'el fútbol'} a los ${carrera.futbolista.edad}.`,
    etiquetas: ['retiro', ...(enCasa ? ['retiro:en-casa'] : [])],
  });
  return {
    ...conRecuerdo,
    etapa: 'retiro',
    ofertas: [],
    retiro: {
      anio: carrera.anio,
      edad: carrera.futbolista.edad,
      clubSlug: club?.slug ?? '',
      clubNombre: club?.nombre ?? '',
      enCasa,
      motivo,
    },
  };
}

/* -------------------------------------------------------------------- mercado */

function abrirMercado(carrera: Carrera, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  const contratoVence = (carrera.contrato?.hasta ?? 0) <= carrera.anio + 1;
  /*
   * Con contrato largo firmado, el mercado casi no existe: solo una de cada cinco veces aparece una
   * oferta que el club no puede rechazar. Sin este freno, cada temporada traía cuatro propuestas y una
   * carrera terminaba con catorce camisetas: el fichaje dejaba de ser una decisión y pasaba a ser
   * trámite anual.
   */
  const hayMercado = contratoVence || chance(azar, 0.2);
  const ofertas = hayMercado ? armarOfertas(azar, carrera, { mundo, actual: carrera.clubActual }) : [];
  const renovable = quiereRenovar(carrera);

  guion.capitulo('Mercado de pases', `${ofertas.length} club${ofertas.length === 1 ? '' : 'es'} te quiere${ofertas.length === 1 ? '' : 'n'}`);
  guion.agregar({ clase: 'mercado', cuantas: Math.min(ofertas.length, MAX_OFERTAS), intensidad: 'ui' });

  /* Sin contrato y sin ofertas: el fútbol también es eso. Se queda libre y baja el ritmo. */
  if (contratoVence && ofertas.length === 0 && !renovable) {
    guion.texto('Nadie llamó. Te quedaste sin club y tuviste que esperar.', 'drama');
  }

  return { ...carrera, ofertas, etapa: 'mercado', pendiente: { clase: 'mercado' } };
}

function renovar(carrera: Carrera, azar: Azar, guion: Guion): Carrera {
  const club = carrera.clubActual;
  if (!club) return carrera;
  const temporadas = entre(azar, 2, 4);
  const salario = Math.round((carrera.valor / 7) * (0.9 + azar.siguiente() * 0.4) * 100) / 100;
  guion.texto(`Renovaste con ${club.nombre} por ${temporadas} temporadas.`, 'drama');
  return {
    ...carrera,
    contrato: { clubSlug: club.slug, hasta: carrera.anio + temporadas, salario, rolPrometido: carrera.rol },
    etapa: 'pretemporada',
    ofertas: [],
    pendiente: null,
    relaciones: {
      ...carrera.relaciones,
      club: {
        ...carrera.relaciones.club,
        confianza: limitar(carrera.relaciones.club.confianza + 10, 0, 100),
      },
      hinchada: {
        ...carrera.relaciones.hinchada,
        confianza: limitar(carrera.relaciones.hinchada.confianza + 8, 0, 100),
      },
    },
  };
}

/* -------------------------------------------------------------------- eventos */

function quizasEvento(
  carrera: Carrera,
  azar: Azar,
  guion: Guion,
  mundo: Mundo,
  categorias: Categoria[] | undefined,
  probabilidad: number,
): Carrera {
  if (!chance(azar, probabilidad)) return carrera;
  const evento = elegirEvento(azar, carrera, CATALOGO, { categorias });
  if (!evento) return carrera;
  guion.agregar({ clase: 'decision', eventoId: evento.id, intensidad: 'drama' });
  return {
    ...carrera,
    etapa: 'decision',
    pendiente: { clase: 'decision', eventoId: evento.id },
    vistos: { ...carrera.vistos, [evento.id]: carrera.anio },
  };
}

function decidir(carrera: Carrera, opcionId: string, azar: Azar, guion: Guion, mundo: Mundo): Carrera {
  const pendiente = carrera.pendiente;
  if (!pendiente || pendiente.clase !== 'decision') return carrera;
  const evento = CATALOGO.find((e) => e.id === pendiente.eventoId);
  const opcion = evento?.opciones.find((o) => o.id === opcionId);
  if (!evento || !opcion) return carrera;

  const datos = datosDeTexto(carrera, mundo);
  guion.texto(redactar(opcion.resultado, datos), 'drama');

  let siguiente = aplicarEfectos(carrera, opcion.efectos, azar, guion, mundo);
  siguiente = recordar(siguiente, {
    tipo: evento.tipoDeRecuerdo,
    texto: redactar(opcion.resultado, datos),
    etiquetas: (opcion.efectos.etiquetas ?? []).map((e) => e.replaceAll('{rivalSlug}', datos.rivalSlug)),
    balance: opcion.efectos.balance,
    eventoId: evento.id,
  });

  /* Un momento pedido por una decisión: "agarrar la pelota" del penal decisivo. */
  const luego = opcion.efectos.luego;
  if (luego?.startsWith('MOMENTO:')) {
    const momento = luego.slice('MOMENTO:'.length) as ClaseDeMomento;
    const contexto: ContextoDeMomento = {
      escena: evento.titulo,
      rival: datos.rival,
      minuto: 89,
      marcador: [1, 1],
      presion: 0.9,
      competencia: carrera.clubActual?.ligaNombre ?? datos.liga,
    };
    guion.agregar({ clase: 'momento', momento, contexto, intensidad: 'cine' });
    return { ...siguiente, etapa: 'momento', pendiente: { clase: 'momento', momento, contexto } };
  }

  /* Si la temporada ya terminó sus tramos, el cierre; si no, vuelve al tramo. */
  const total = tramosDe(siguiente.ritmo);
  if (siguiente.enCurso && siguiente.tramo >= total) {
    return cerrarTemporada({ ...siguiente, pendiente: null, etapa: 'tramo' }, azar, guion, mundo);
  }
  return { ...siguiente, pendiente: null, etapa: siguiente.enCurso ? 'tramo' : 'pretemporada' };
}

function aplicarEfectos(
  carrera: Carrera,
  efectos: Efectos,
  azar: Azar,
  guion: Guion,
  mundo: Mundo,
): Carrera {
  const vida = { ...carrera.vida };
  for (const [clave, delta] of Object.entries(efectos.vida ?? {})) {
    const k = clave as keyof typeof vida;
    /* El dinero no tiene techo de 100: se mide en millones. */
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
    guion.agregar({ clase: 'titular', texto, tono: efectos.titular.tono, intensidad: 'ui' });
    siguiente = {
      ...siguiente,
      titulares: [...siguiente.titulares, { temporada: carrera.anio, texto, tono: efectos.titular.tono }],
    };
  }
  return siguiente;
}

/* -------------------------------------------------------------------- memoria */

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

/* ------------------------------------------------------------------- consulta */

/** El evento pendiente, con sus textos ya redactados: lo que la interfaz necesita para pintarlo. */
export function eventoPendiente(
  carrera: Carrera,
  mundo: Mundo,
): { evento: Evento; titulo: string; texto: string; opciones: Array<{ id: string; texto: string; pista?: string }> } | null {
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

export const veredictoDe = calcularVeredicto;
export type { Beat, Rol, Oferta, Club, Liga, Mundo, Carrera };
