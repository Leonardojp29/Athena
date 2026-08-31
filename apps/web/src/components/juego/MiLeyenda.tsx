import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CAPITULOS,
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
import { borrarPartida, codificarLegado, guardarEnElSalon, guardarPartida, leerPartida } from '../../lib/leyenda';
import Carta, { type DatosDeCarta } from './Carta';
import Creacion from './Creacion';
import Decision from './Decision';
import Ficha from './Ficha';
import Legado from './Legado';
import LineaDeCarrera from './LineaDeCarrera';
import Momento from './Momento';
import Ofertas from './Ofertas';
import ResumenDelCapitulo from './ResumenDelCapitulo';

/**
 * Mi Leyenda: doce decisiones y una carrera.
 *
 * La isla es deliberadamente simple. Un estado —la carrera—, un verbo —avanzar un capítulo— y dos
 * columnas: quién sos y qué pasó. No hay reproductor de beats ni cola de temporizadores: cada clic
 * devuelve el resumen de dos años y la decisión siguiente, y el juego entero se termina en tres
 * minutos. La versión anterior tenía la maquinaria de una película y el ritmo de un trámite.
 */

interface Props {
  mundo: Mundo;
  anio: number;
}

export default function MiLeyenda({ mundo, anio }: Props) {
  const [carrera, setCarrera] = useState<Carrera | null>(null);
  const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
  const [listo, setListo] = useState(false);
  const [ascenso, setAscenso] = useState(false);

  useEffect(() => {
    const guardada = leerPartida();
    if (guardada) setCarrera(guardada);
    setListo(true);
  }, []);

  useEffect(() => {
    if (carrera) guardarPartida(carrera);
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
    },
    [carrera, mundo],
  );

  const empezar = useCallback(
    (datos: Parameters<typeof crearCarrera>[0]) => {
      const inicial = crearCarrera(datos);
      setCarrera(abrirCarrera(inicial, mundo).carrera);
      setCapitulo(null);
    },
    [mundo],
  );

  const empezarDeNuevo = useCallback(() => {
    borrarPartida();
    setCarrera(null);
    setCapitulo(null);
  }, []);

  const datosDeCarta = useMemo<DatosDeCarta | null>(
    () =>
      carrera
        ? {
            nombre: carrera.futbolista.nombre,
            dorsal: carrera.futbolista.dorsal,
            puesto: carrera.futbolista.puesto,
            ovr: carrera.ovr,
            nivel: carrera.nivel,
            atributos: carrera.futbolista.atributos,
            club: carrera.clubActual,
            pais: carrera.futbolista.pais,
            bandera: carrera.futbolista.bandera,
            edad: carrera.futbolista.edad,
          }
        : null,
    [carrera],
  );

  if (!listo) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-ink-muted">Cargando tu carrera…</p>
      </div>
    );
  }

  if (!carrera) return <Creacion mundo={mundo} anio={anio} onEmpezar={empezar} />;

  if (carrera.etapa === 'legado') {
    return (
      <Legado
        carrera={carrera}
        onEmpezarDeNuevo={empezarDeNuevo}
        alGuardar={(veredicto) => {
          const codigo = codificarLegado({
            n: carrera.futbolista.nombre,
            d: carrera.futbolista.dorsal,
            p: carrera.futbolista.puesto,
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
          guardarEnElSalon(carrera, veredicto, codigo);
          return codigo;
        }}
      />
    );
  }

  const momento = carrera.pendiente?.clase === 'momento' ? carrera.pendiente : null;
  const decision = carrera.pendiente?.clase === 'decision' ? eventoPendiente(carrera, mundo) : null;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-3 py-4 lg:grid-cols-[22rem_1fr] lg:gap-5 lg:px-4">
      {/* Izquierda: quién sos y qué hay que decidir. En el teléfono, la decisión va primero. */}
      <div className="order-1 flex flex-col gap-3">
        <div className="order-2 lg:order-1">
          <Ficha carrera={carrera} />
        </div>

        <div className="order-1 flex flex-col gap-3 lg:order-2">
          {capitulo && <ResumenDelCapitulo capitulo={capitulo} />}

          {momento ? (
            <Momento
              momento={momento.momento}
              contexto={momento.contexto}
              puesto={carrera.futbolista.puesto}
              onJugar={(intencion) => avanzar({ tipo: 'jugar-momento', intencion })}
            />
          ) : decision ? (
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
      </div>

      {/* Derecha: la carrera, llenándose. */}
      <div className="order-2 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-label">Tu carrera</h2>
          <p className="text-2xs text-ink-muted">
            capítulo {Math.min(carrera.capitulo + 1, CAPITULOS)} de {CAPITULOS}
          </p>
        </div>
        <LineaDeCarrera carrera={carrera} ultima={carrera.temporadas.length - 1} />
        {datosDeCarta && (
          <div className="hidden justify-center lg:flex">
            <Carta datos={datosDeCarta} asciende={ascenso} class="max-w-[15rem]" />
          </div>
        )}
      </div>
    </div>
  );
}
