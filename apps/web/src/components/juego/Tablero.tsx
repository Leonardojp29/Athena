import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  abrirCarrera,
  avanzarCapitulo,
  calcularVeredicto,
  crearCarrera,
  eventoPendiente,
  puedeRenovar,
  type Capitulo,
  type Carrera,
  type Eleccion,
  type Mundo,
} from '@athena/leyenda';
import { borrarPartida, codificarLegado, guardarPartida, leerPartida } from '../../lib/leyenda';
import { escenasDe } from './Celebracion';
import Decision from './Decision';
import Ficha from './Ficha';
import LineaDeCarrera from './LineaDeCarrera';

import Ofertas from './Ofertas';
import Estadio from './cancha/Estadio';
import ResumenDelCapitulo from './ResumenDelCapitulo';

/*
 * Dos piezas que no hacen falta para empezar a jugar: el legado, que solo existe cuando la carrera
 * termina, y la celebración, que aparece cuando hay algo que celebrar. Con las dos dentro del primer
 * paquete, la pantalla de creación —que no usa ninguna— arrastraba kilobytes que nadie iba a ver
 * hasta cinco minutos después.
 *
 * El estadio **no** se difiere aunque pese: una jugada aparece de golpe y un cuadro en blanco
 * mientras baja el trozo rompe justo el momento que el juego quiere que se sienta.
 */
const Legado = lazy(() => import('./Legado'));
const Celebracion = lazy(() => import('./Celebracion'));

/**
 * El tablero: la carrera en curso.
 *
 * La isla es deliberadamente simple. Un estado —la carrera—, un verbo —avanzar un capítulo— y dos
 * columnas: quién sos y qué pasó. No hay reproductor de beats ni cola de temporizadores: cada clic
 * devuelve el resumen de dos años y la decisión siguiente, y el juego entero se termina en tres
 * minutos. La versión anterior tenía la maquinaria de una película y el ritmo de un trámite.
 */

/** De dónde arranca el tablero: una partida guardada o un futbolista recién creado. */
export type Arranque =
  | { clase: 'guardada'; carrera: Carrera }
  | { clase: 'nueva'; datos: Parameters<typeof crearCarrera>[0] };

interface Props {
  mundo: Mundo;
  arranque: Arranque;
  /** Vuelve a la pantalla de creación: el tablero no sabe cómo se crea un futbolista. */
  onReiniciar: () => void;
}

/**
 * El código con el que una carrera terminada viaja por un enlace.
 *
 * Se calcula al vuelo y no se guarda: quien quiera conservar su leyenda se lleva la dirección, y el
 * navegador no acumula un archivo de carreras viejas que nadie vuelve a mirar.
 */
function codigoDelLegado(carrera: Carrera): string {
  const veredicto = calcularVeredicto(carrera);
  return codificarLegado({
    n: carrera.futbolista.nombre,
    d: carrera.futbolista.dorsal,
    p: carrera.futbolista.puesto,
    ...(carrera.futbolista.costado ? { pc: carrera.futbolista.costado } : {}),
    o: veredicto.totales.ovrMaximo,
    v: veredicto.nivelMaximo,
    a: [
      carrera.futbolista.atributos.ritmo,
      carrera.futbolista.atributos.tiro,
      carrera.futbolista.atributos.pase,
      carrera.futbolista.atributos.regate,
      carrera.futbolista.atributos.defensa,
      carrera.futbolista.atributos.fisico,
    ],
    c: carrera.retiro?.clubNombre ?? carrera.clubActual?.nombre ?? '',
    cc: carrera.clubActual?.primario ?? null,
    e: carrera.futbolista.pais,
    b: carrera.futbolista.bandera,
    t: veredicto.totales.trofeos,
    pr: veredicto.totales.premios,
    g: veredicto.totales.goles,
    as: veredicto.totales.asistencias,
    te: veredicto.totales.temporadas,
    adn: veredicto.adn.titulo,
  });
}

/**
 * El color del rival para las siluetas de la escena. Sale del club actual invertido —si jugás de
 * rojo, enfrente hay alguien que no es rojo— con una vuelta al azul del vestuario si no hay dato.
 */
function colorDelRival(carrera: Carrera): string {
  const propio = carrera.clubActual?.primario;
  if (!propio || !/^[0-9a-f]{6}$/i.test(propio)) return '#1b2a36';
  const n = parseInt(propio, 16);
  const invertido = (0xffffff ^ n).toString(16).padStart(6, '0');
  return `#${invertido}`;
}

export default function Tablero({ mundo, arranque, onReiniciar }: Props) {
  /*
   * El arranque se resuelve una sola vez, en el primer render: si la partida venía guardada se
   * retoma tal cual, y si el futbolista se acaba de crear se abre el mercado del debut.
   */
  const [carrera, setCarrera] = useState<Carrera | null>(() =>
    arranque.clase === 'guardada'
      ? arranque.carrera
      : abrirCarrera(crearCarrera(arranque.datos), mundo).carrera,
  );
  const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
  const [ascenso, setAscenso] = useState(false);
  /* Lo que hay que celebrar antes de seguir jugando: títulos, cambio de material, salto de media. */
  const [celebrando, setCelebrando] = useState<Capitulo | null>(null);

  /*
   * La partida se guarda mientras se juega y **se borra cuando termina**. No hay historial de
   * leyendas: una carrera que se acabó se cuenta, se comparte si querés y desaparece. Lo que hace
   * que alguien empiece otra es justamente que la anterior ya no esté esperándolo.
   */
  useEffect(() => {
    if (!carrera) return;
    if (carrera.etapa === 'legado') borrarPartida();
    else guardarPartida(carrera);
  }, [carrera]);

  /* La carta gira cuando el capítulo trajo un cambio de material. */
  useEffect(() => {
    if (!capitulo?.ascenso) return;
    setAscenso(true);
    const reloj = window.setTimeout(() => setAscenso(false), 1100);
    return () => window.clearTimeout(reloj);
  }, [capitulo]);

  const avanzar = useCallback(
    (eleccion: Eleccion) => {
      if (!carrera) return;
      const resultado = avanzarCapitulo(carrera, eleccion, mundo);
      setCarrera(resultado.carrera);
      setCapitulo(resultado.capitulo);
      if (escenasDe(resultado.capitulo).length > 0) setCelebrando(resultado.capitulo);
    },
    [carrera, mundo],
  );

  const empezarDeNuevo = useCallback(() => {
    borrarPartida();
    setCapitulo(null);
    setCelebrando(null);
    onReiniciar();
  }, [onReiniciar]);

  if (!carrera) return null;

  if (carrera.etapa === 'legado') {
    return (
      <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-ink-muted">Contando tu carrera…</div>}>
        <Legado carrera={carrera} onEmpezarDeNuevo={empezarDeNuevo} codigo={codigoDelLegado(carrera)} />
      </Suspense>
    );
  }

  const momento = carrera.pendiente?.clase === 'momento' ? carrera.pendiente : null;
  const decision = carrera.pendiente?.clase === 'decision' ? eventoPendiente(carrera, mundo) : null;

  /*
   * El momento se lleva la pantalla entera. Es la única escena del juego que se **juega** en lugar de
   * elegirse, y meterla en la columna de la ficha la dejaba del tamaño de un sello: la cámara detrás
   * del pateador necesita ancho para que el arco se vea como un arco.
   */
  const celebracion = celebrando ? (
    <Suspense fallback={null}>
      <Celebracion capitulo={celebrando} onCerrar={() => setCelebrando(null)} />
    </Suspense>
  ) : null;

  if (momento) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-3 py-3 lg:h-[calc(100dvh-5.5rem)] lg:py-4">
        {celebracion}
        {capitulo && <ResumenDelCapitulo capitulo={capitulo} />}
        <div className="min-h-0 flex-1">
          <Estadio
            momento={momento.momento}
            contexto={momento.contexto}
            colorRival={colorDelRival(carrera)}
            onJugar={(intencion) => avanzar({ tipo: 'jugar-momento', intencion })}
          />
        </div>
      </div>
    );
  }

  /*
   * El tablero: la identidad acostada arriba y debajo dos zonas —lo que hay que hacer y lo que ya
   * hiciste—. En escritorio se ata al alto de la ventana y cada zona hace su propio scroll si le
   * falta lugar, así una partida entera entra en una pantalla de 1080 sin mover la página. En el
   * teléfono la atadura se suelta y todo fluye, con la decisión primero.
   */
  return (
    <div className="mx-auto flex w-full max-w-[104rem] flex-col gap-3 px-3 py-3 lg:h-[calc(100dvh-5.5rem)] lg:gap-4 lg:px-6 lg:py-4">
      {celebracion}
      <Ficha
        carrera={carrera}
        ascenso={ascenso}
        salto={capitulo?.saltoDeOvr ? capitulo.saltoDeOvr.a - capitulo.saltoDeOvr.de : null}
        onEmpezarDeNuevo={empezarDeNuevo}
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-6">
        {/* Lo único que hay que hacer en esta pantalla. */}
        <div className="order-1 flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
          {capitulo && <ResumenDelCapitulo capitulo={capitulo} />}

          {decision ? (
            <Decision
              titulo={decision.titulo}
              texto={decision.texto}
              opciones={decision.opciones}
              onElegir={(opcionId) => avanzar({ tipo: 'decidir', opcionId })}
            />
          ) : (
            <Ofertas
              ofertas={carrera.ofertas}
              esDebut={carrera.temporadas.length === 0}
              clubActual={carrera.clubActual}
              puedeQuedarse={puedeRenovar(carrera)}
              onFirmar={(ofertaId) => avanzar({ tipo: 'firmar', ofertaId })}
              onQuedarse={() => avanzar({ tipo: 'renovar' })}
              onRechazarTodo={() => avanzar({ tipo: 'renovar' })}
            />
          )}
        </div>

        {/* La carrera, llenándose. */}
        <div className="order-2 min-h-0 lg:overflow-y-auto lg:border-l lg:border-border lg:pl-6">
          <LineaDeCarrera carrera={carrera} ultima={carrera.temporadas.length - 1} />
        </div>
      </div>
    </div>
  );
}
