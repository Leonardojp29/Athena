import {
  DURACION_MS,
  PANICO_MS,
  TENSION_MS,
  URGENCIA_MS,
  multiplicadorActual,
  preguntaActual,
  restante,
  type Partida as PartidaDelMotor,
} from '@athena/sesenta-segundos';
import { NOMBRE_DE_DIFICULTAD, relojDe } from '../../lib/sesenta';
import { Escena } from './Escena';
import { Opciones, type EstadoDeOpcion } from './Opciones';

interface Props {
  partida: PartidaDelMotor;
  ahora: number;
  onElegir: (texto: string) => void;
}

const TONO_DE_DIFICULTAD: Record<string, string> = {
  facil: 'border-win/50 text-win-ink',
  normal: 'border-card-yellow/60 text-card-yellow-ink',
  dificil: 'border-card-red/50 text-card-red-ink',
};

export function Partida({ partida, ahora, onElegir }: Props) {
  const pregunta = preguntaActual(partida);
  if (!pregunta) return null;

  const queda = restante(partida, ahora);
  const fraccion = Math.max(0, Math.min(1, queda / DURACION_MS));
  const multiplicador = multiplicadorActual(partida);
  const resuelta = partida.elegida !== null;

  /* Tres escalones, y el número siempre al lado: el color no puede ser el único canal. */
  const urge = queda <= URGENCIA_MS;
  const aprieta = queda <= TENSION_MS;
  const panico = queda <= PANICO_MS;

  const estadoDe = (texto: string): EstadoDeOpcion => {
    if (!resuelta) return 'abierta';
    const esCorrecta = pregunta.opciones.find((o) => o.texto === texto)?.esCorrecta ?? false;
    if (texto === partida.elegida) return esCorrecta ? 'acertada' : 'errada';
    return esCorrecta ? 'revelada' : 'apagada';
  };

  return (
    <div data-pregunta={pregunta.clave} className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6">
      <header className="flex items-center justify-between gap-4 pt-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-2xs font-medium uppercase tracking-label ${TONO_DE_DIFICULTAD[pregunta.dificultad] ?? 'border-border text-ink-muted'}`}
        >
          {NOMBRE_DE_DIFICULTAD[pregunta.dificultad] ?? pregunta.dificultad}
        </span>

        <div className="flex items-baseline gap-4">
          {partida.racha > 0 && (
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xs font-medium uppercase tracking-label text-ink-muted">Racha</span>
              <span
                key={partida.racha}
                data-racha={partida.racha}
                className="animate-sesenta-sube font-display text-lg font-semibold tabular leading-none"
              >
                {partida.racha}
              </span>
            </p>
          )}
          {multiplicador > 1 && (
            <span
              key={multiplicador}
              data-multiplicador={multiplicador}
              className="animate-sesenta-sube rounded-md bg-primary px-2 py-0.5 font-display text-sm font-semibold tabular text-primary-contrast"
            >
              x{multiplicador}
            </span>
          )}
          <p className="flex items-baseline gap-1.5">
            <span
              key={partida.puntos}
              data-puntos={partida.puntos}
              className="animate-sesenta-sube font-display text-xl font-semibold tabular leading-none"
            >
              {partida.puntos.toLocaleString('es-PE')}
            </span>
            <span className="text-2xs font-medium uppercase tracking-label text-ink-muted">pts</span>
          </p>
        </div>
      </header>

      {/*
        El reloj: barra y décimas juntas, y más grande que el puntaje. Es lo único que se mira sin
        querer durante toda la partida, así que si algo tiene que ganar la jerarquía es esto.
      */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas-subtle">
          <div
            data-reloj-barra
            style={{ transform: `scaleX(${fraccion})` }}
            className={`h-full rounded-full ${panico ? 'animate-sesenta-apremio bg-card-red' : urge ? 'bg-card-red' : aprieta ? 'bg-card-yellow' : 'bg-primary'}`}
          />
        </div>
        <span
          data-reloj={relojDe(queda)}
          aria-live="off"
          className={`w-16 text-right font-display text-3xl font-semibold tabular leading-none ${urge ? 'text-card-red' : aprieta ? 'text-card-yellow-ink' : 'text-ink'}`}
        >
          {relojDe(queda)}
        </span>
      </div>

      {/*
        Una sola envoltura con `key`, y ninguna adentro.
        
        Con la clave repartida entre hermanos —el enunciado y las opciones— y uno de ellos
        apareciendo y desapareciendo según el tipo de pregunta, React insertaba el enunciado nuevo
        sin borrar el viejo: a la séptima pregunta había siete enunciados apilados en pantalla.
        Cambiando la envoltura entera se rehace el bloque de una pieza y las animaciones arrancan
        solas, que era lo que las claves de adentro buscaban.
      */}
      <div
        key={pregunta.clave}
        className="flex flex-1 flex-col items-center justify-center gap-5 py-5"
      >
        <Escena pregunta={pregunta} />

        <h1 className="animate-sesenta-entra max-w-xl text-balance text-center font-display text-xl font-semibold leading-snug sm:text-2xl">
          {pregunta.enunciado}
        </h1>

        {/* Alto fijo: el aviso de puntos no puede empujar las opciones justo al elegir. */}
        <div className="flex h-7 items-center">
          {resuelta && partida.ultimoPuntaje > 0 && (
            <p className="animate-sesenta-suma flex items-baseline gap-2 font-display text-lg font-semibold tabular text-win-ink">
              +{partida.ultimoPuntaje}
              {partida.ultimaRapida && (
                <span className="text-2xs uppercase tracking-label text-card-yellow-ink">Rápida</span>
              )}
            </p>
          )}
          {resuelta && partida.ultimoPuntaje === 0 && (
            <p className="animate-sesenta-entra text-sm font-medium text-card-red-ink">Uy, esa dolió</p>
          )}
        </div>

        <Opciones
          opciones={pregunta.opciones}
          aLoAncho={pregunta.tipo === 'verdadero-falso'}
          estadoDe={estadoDe}
          onElegir={onElegir}
        />
      </div>
    </div>
  );
}
