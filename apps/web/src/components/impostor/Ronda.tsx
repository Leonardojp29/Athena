import { DURACION_MS, type DesenlaceDeRonda, type Ronda as RondaDelMotor } from '@athena/el-impostor';
import { CartaDeJugador, type EstadoDeCarta } from './CartaDeJugador';

interface Props {
  ronda: RondaDelMotor;
  numero: number;
  racha: number;
  restanteMs: number;
  apremia: boolean;
  elegido: string | null;
  desenlace: DesenlaceDeRonda | null;
  onElegir: (ref: string) => void;
  onRendirse: () => void;
}

const NOMBRE_DE_DIFICULTAD: Record<string, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};

export function Ronda({
  ronda,
  numero,
  racha,
  restanteMs,
  apremia,
  elegido,
  desenlace,
  onElegir,
  onRendirse,
}: Props) {
  const segundos = Math.ceil(restanteMs / 1000);
  const fraccion = Math.max(0, Math.min(1, restanteMs / DURACION_MS));

  return (
    <div data-ronda={ronda.clave} className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-4 sm:py-6">
      <header className="flex items-center justify-between gap-4">
        <p className="text-2xs font-medium uppercase tracking-label text-ink-muted">
          Ronda {numero} · {NOMBRE_DE_DIFICULTAD[ronda.dificultad] ?? ronda.dificultad}
        </p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-label text-ink-muted">Racha</span>
          <span
            key={racha}
            data-racha={racha}
            className="animate-impostor-sube font-display text-2xl font-semibold tabular leading-none text-primary-ink"
          >
            {racha}
          </span>
        </p>
      </header>

      {/*
        El reloj: barra y número juntos. El color no puede ser el único
        canal —quien no distingue el lima del rojo tiene que poder leer que le quedan dos—.
      */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas-subtle">
          <div
            data-reloj-barra
            style={{ transform: `scaleX(${fraccion})` }}
            className={`h-full rounded-full ${apremia ? 'animate-impostor-apremio bg-card-red' : 'bg-primary'}`}
          />
        </div>
        <span
          data-reloj={segundos}
          aria-live="off"
          className={`w-6 text-right font-display text-lg font-semibold tabular leading-none ${apremia ? 'text-card-red' : 'text-ink'}`}
        >
          {segundos}
        </span>
      </div>

      <h1 className="mt-6 text-balance text-center font-display text-xl font-semibold leading-snug sm:text-2xl">
        {ronda.enunciado}
      </h1>
      <p className="mt-1 text-center text-2xs uppercase tracking-label text-ink-muted">
        Hay uno que se coló
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        {ronda.opciones.map((opcion, i) => (
          <CartaDeJugador
            key={opcion.ref}
            opcion={opcion}
            turno={i}
            estado={estadoDe(opcion.ref, opcion.esImpostor, elegido, desenlace)}
            onElegir={() => onElegir(opcion.ref)}
          />
        ))}
      </div>

      {/* Alto fijo: el aviso no puede empujar las cartas justo cuando se está por elegir. */}
      <div className="mt-4 flex min-h-12 items-start justify-center">
        {desenlace === null ? (
          <button
            type="button"
            onClick={onRendirse}
            className="rounded-md px-3 py-1.5 text-2xs font-medium uppercase tracking-label text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink"
          >
            Dejar acá
          </button>
        ) : (
          <p
            data-aviso={desenlace}
            className="animate-impostor-entra max-w-lg text-balance text-center text-sm"
          >
            <span
              className={`font-display font-semibold uppercase tracking-label ${desenlace === 'acertada' ? 'text-win-ink' : 'text-card-red-ink'}`}
            >
              {TITULO[desenlace]}
            </span>
            <span className="mt-0.5 block text-ink-muted">{ronda.reveal}</span>
          </p>
        )}
      </div>
    </div>
  );
}

const TITULO: Record<DesenlaceDeRonda, string> = {
  acertada: 'Te pillamos',
  fallada: 'Ese sí pertenecía al grupo',
  'sin-tiempo': 'El impostor escapó',
};

function estadoDe(
  ref: string,
  esImpostor: boolean,
  elegido: string | null,
  desenlace: DesenlaceDeRonda | null,
): EstadoDeCarta {
  if (desenlace === null) return 'jugando';
  if (ref === elegido) return desenlace === 'acertada' ? 'acertada' : 'errada';
  return esImpostor ? 'revelada' : 'apagada';
}
