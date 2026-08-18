import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  DURACION,
  MAX_OFERTAS,
  NOMBRE_DE_NIVEL,
  NOMBRE_DE_ROL,
  avanzar,
  calcularVeredicto,
  crearCarrera,
  eventoPendiente,
  tramosDe,
  type Accion,
  type Beat,
  type Carrera,
  type Mundo,
} from '@athena/leyenda';
import {
  borrarPartida,
  codificarLegado,
  guardarEnElSalon,
  guardarPartida,
  leerPartida,
} from '../../lib/leyenda';
import Carta, { type DatosDeCarta } from './Carta';
import Creacion from './Creacion';
import Ofertas from './Ofertas';
import Decision from './Decision';
import Momento from './Momento';
import Legado from './Legado';
import Relato from './Relato';
import Panel from './Panel';

/**
 * Mi Leyenda: la isla que reproduce el juego.
 *
 * No sabe una sola regla del fútbol. Le pide al motor que avance, recibe **un guion de beats** y los
 * pone en pantalla en orden, con el tiempo que cada uno pide: un dato pasa en 320 ms y un título ocupa
 * un segundo. Cuando el guion termina, muestra lo que el jugador tiene que hacer.
 *
 * Esa separación es la que hace que esto se sienta un videojuego y siga siendo mantenible: la película
 * la arma el motor, la pantalla solo la proyecta.
 */

interface Props {
  mundo: Mundo;
  /** El año real, para que la carrera arranque cuando el jugador está jugando. */
  anio: number;
}

interface Estado {
  carrera: Carrera | null;
  /** Los beats que faltan mostrar, y los ya mostrados. */
  pendientes: Beat[];
  mostrados: Beat[];
}

type Mensaje =
  | { tipo: 'nueva'; carrera: Carrera; beats: Beat[] }
  | { tipo: 'retomar'; carrera: Carrera }
  | { tipo: 'avance'; carrera: Carrera; beats: Beat[] }
  | { tipo: 'siguiente-beat' }
  | { tipo: 'mostrar-todo' }
  | { tipo: 'reiniciar' };

function reducir(estado: Estado, mensaje: Mensaje): Estado {
  switch (mensaje.tipo) {
    case 'nueva':
    case 'avance':
      /*
       * Cada avance es su propia película: los beats del paso anterior salen de pantalla. Acumularlos
       * dejaba el capítulo viejo arriba del nuevo y el jugador leía dos escenas mezcladas; la historia
       * completa vive en la pestaña Historia, que es donde alguien la va a buscar.
       */
      return { carrera: mensaje.carrera, pendientes: mensaje.beats, mostrados: [] };
    case 'retomar':
      return { carrera: mensaje.carrera, pendientes: [], mostrados: [] };
    case 'siguiente-beat': {
      const [primero, ...resto] = estado.pendientes;
      if (!primero) return estado;
      return { ...estado, pendientes: resto, mostrados: [...estado.mostrados, primero] };
    }
    case 'mostrar-todo':
      return { ...estado, pendientes: [], mostrados: [...estado.mostrados, ...estado.pendientes] };
    case 'reiniciar':
      return { carrera: null, pendientes: [], mostrados: [] };
  }
}

export default function MiLeyenda({ mundo, anio }: Props) {
  const [estado, enviar] = useReducer(reducir, { carrera: null, pendientes: [], mostrados: [] });
  const [listo, setListo] = useState(false);
  const [ascenso, setAscenso] = useState(false);
  const relato = useRef<HTMLDivElement>(null);

  /* Al abrir: si hay partida guardada, se retoma; si no, la creación. */
  useEffect(() => {
    const guardada = leerPartida();
    if (guardada) enviar({ tipo: 'retomar', carrera: guardada });
    setListo(true);
  }, []);

  /* Cada cambio de carrera se guarda: cerrar la pestaña en mitad de una temporada no pierde nada. */
  useEffect(() => {
    if (estado.carrera) guardarPartida(estado.carrera);
  }, [estado.carrera]);

  /*
   * El reproductor: saca un beat de la cola cada tanto, según su intensidad. Un solo temporizador vivo,
   * y se limpia al desmontar o al cambiar de beat, así nunca se solapan dos películas.
   */
  useEffect(() => {
    const siguiente = estado.pendientes[0];
    if (!siguiente) return;
    const espera = DURACION[siguiente.intensidad];
    const reloj = window.setTimeout(() => enviar({ tipo: 'siguiente-beat' }), espera);
    return () => window.clearTimeout(reloj);
  }, [estado.pendientes]);

  /* La carta gira cuando el guion trae un ascenso de material. */
  useEffect(() => {
    const ultimo = estado.mostrados.at(-1);
    if (ultimo?.clase !== 'carta') return;
    setAscenso(true);
    const reloj = window.setTimeout(() => setAscenso(false), 1100);
    return () => window.clearTimeout(reloj);
  }, [estado.mostrados]);

  /* El relato sigue al último beat sin arrastrar la página entera. */
  useEffect(() => {
    const nodo = relato.current;
    if (nodo) nodo.scrollTop = nodo.scrollHeight;
  }, [estado.mostrados]);

  const carrera = estado.carrera;
  const reproduciendo = estado.pendientes.length > 0;

  const mover = useCallback(
    (accion: Accion) => {
      if (!carrera) return;
      const { carrera: nueva, beats } = avanzar(carrera, accion, mundo);
      enviar({ tipo: 'avance', carrera: nueva, beats });
    },
    [carrera, mundo],
  );

  const empezar = useCallback(
    (datos: Parameters<typeof crearCarrera>[0]) => {
      const inicial = crearCarrera(datos);
      /* El primer avance arma las ofertas del debut: nadie elige club de una lista. */
      const { carrera: conOfertas, beats } = avanzar(inicial, { tipo: 'seguir' }, mundo);
      enviar({ tipo: 'nueva', carrera: conOfertas, beats });
    },
    [mundo],
  );

  const empezarDeNuevo = useCallback(() => {
    borrarPartida();
    enviar({ tipo: 'reiniciar' });
  }, []);

  const datosDeCarta = useMemo<DatosDeCarta | null>(() => {
    if (!carrera) return null;
    return {
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
    };
  }, [carrera]);

  if (!listo) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-ink-muted">Cargando tu carrera…</p>
      </div>
    );
  }

  if (!carrera) {
    return <Creacion mundo={mundo} anio={anio} onEmpezar={empezar} />;
  }

  /* El retiro cierra la carrera y la manda al salón una sola vez. */
  if (carrera.etapa === 'legado' || (carrera.etapa === 'retiro' && !reproduciendo)) {
    return (
      <Legado
        carrera={carrera}
        onSeguir={() => mover({ tipo: 'seguir' })}
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
            fr: veredicto.frase,
          });
          guardarEnElSalon(carrera, veredicto, codigo);
          return codigo;
        }}
      />
    );
  }

  const momento = carrera.pendiente?.clase === 'momento' && !reproduciendo ? carrera.pendiente : null;
  const decision = carrera.pendiente?.clase === 'decision' && !reproduciendo ? eventoPendiente(carrera, mundo) : null;
  const eligiendoClub = (carrera.etapa === 'debut' || carrera.etapa === 'mercado') && !reproduciendo;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[19rem_1fr] lg:gap-6 lg:py-6">
      {/* La columna de la izquierda es la identidad: la carta y el estado de la vida. */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        {datosDeCarta && <Carta datos={datosDeCarta} asciende={ascenso} />}
        <Panel carrera={carrera} />
      </aside>

      {/* La derecha es la película y la decisión. */}
      <section className="min-w-0">
        {momento ? (
          <Momento
            momento={momento.momento}
            contexto={momento.contexto}
            puesto={carrera.futbolista.puesto}
            onJugar={(intencion) => mover({ tipo: 'jugar-momento', intencion })}
          />
        ) : decision ? (
          <Decision
            titulo={decision.titulo}
            texto={decision.texto}
            opciones={decision.opciones}
            onElegir={(opcionId) => mover({ tipo: 'decidir', opcionId })}
          />
        ) : eligiendoClub ? (
          <Ofertas
            ofertas={carrera.ofertas}
            esDebut={carrera.etapa === 'debut'}
            clubActual={carrera.clubActual}
            puedeQuedarse={carrera.etapa === 'mercado'}
            onFirmar={(ofertaId) => mover({ tipo: 'elegir-oferta', ofertaId })}
            onQuedarse={() => mover({ tipo: 'renovar' })}
            onRechazarTodo={() => mover({ tipo: 'seguir' })}
          />
        ) : (
          <Relato
            ref={relato}
            beats={estado.mostrados}
            reproduciendo={reproduciendo}
            titulo={tituloDeEtapa(carrera)}
            onSaltar={() => enviar({ tipo: 'mostrar-todo' })}
            onSeguir={() => mover({ tipo: 'seguir' })}
          />
        )}
      </section>
    </div>
  );
}

function tituloDeEtapa(carrera: Carrera): string {
  const total = tramosDe(carrera.ritmo);
  switch (carrera.etapa) {
    case 'pretemporada':
      return `Pretemporada ${carrera.anio}`;
    case 'tramo':
      return `Temporada ${carrera.anio} · tramo ${Math.min(carrera.tramo + 1, total)} de ${total}`;
    case 'cierre':
      return `Fin de la temporada ${carrera.anio - 1}`;
    case 'mercado':
      return `Mercado ${carrera.anio}`;
    case 'retiro':
      return 'El final del camino';
    default:
      return `${NOMBRE_DE_ROL[carrera.rol]} · ${NOMBRE_DE_NIVEL[carrera.nivel]}`;
  }
}

export { MAX_OFERTAS };
