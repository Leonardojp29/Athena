import { forwardRef } from 'react';
import type { Beat } from '@athena/leyenda';
import EventIcon from '../EventIcon';

/**
 * La película: los beats del motor, en pantalla, en orden.
 *
 * Cada clase de beat tiene su forma —un gol no se ve como un titular de prensa— y su tiempo lo pone la
 * intensidad que declaró el motor. El botón de saltar existe porque en la segunda carrera nadie quiere
 * volver a mirar la ceremonia entera, y quitarle el control al jugador es la forma más rápida de que
 * deje de jugar.
 */

interface Props {
  beats: Beat[];
  reproduciendo: boolean;
  titulo: string;
  onSaltar: () => void;
  onSeguir: () => void;
}

const Relato = forwardRef<HTMLDivElement, Props>(function Relato(
  { beats, reproduciendo, titulo, onSaltar, onSeguir },
  ref,
) {
  return (
    <div className="flex min-h-[19rem] flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-label">{titulo}</h2>
        {reproduciendo && (
          <button
            type="button"
            onClick={onSaltar}
            className="ml-auto cursor-pointer rounded-md px-2 py-1 text-2xs font-medium uppercase tracking-label text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink"
          >
            Saltar
          </button>
        )}
      </header>

      <div ref={ref} className="barra-fina flex flex-1 flex-col justify-center overflow-y-auto px-4 py-3" style={{ maxHeight: '32rem' }}>
        {beats.length === 0 && !reproduciendo && (
          <p className="py-8 text-center text-sm text-ink-muted">
            Tocá continuar para seguir tu carrera.
          </p>
        )}
        <ol className="flex flex-col gap-2.5">
          {beats.map((beat, i) => (
            <li key={i} data-beat={beat.clase} style={{ '--beat-duracion': `${beat.intensidad === 'cine' ? 900 : 320}ms` } as React.CSSProperties}>
              <Linea beat={beat} />
            </li>
          ))}
        </ol>
      </div>

      <footer className="border-t border-border p-3">
        <button
          type="button"
          onClick={reproduciendo ? onSaltar : onSeguir}
          className="w-full cursor-pointer rounded-md bg-primary px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-label text-primary-contrast transition-opacity hover:opacity-90"
        >
          {reproduciendo ? 'Ver todo' : 'Continuar'}
        </button>
      </footer>
    </div>
  );
});

export default Relato;

function Linea({ beat }: { beat: Beat }) {
  switch (beat.clase) {
    case 'capitulo':
      return (
        <div className="flex items-baseline gap-2 border-b border-border pb-1.5">
          <h3 className="font-display text-base font-semibold uppercase tracking-label">{beat.texto}</h3>
          {beat.detalle && <span className="truncate text-2xs text-ink-muted">{beat.detalle}</span>}
        </div>
      );

    case 'gol':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-primary/12 px-3 py-2">
          <EventIcon kind="goal" size={16} detail={`minuto ${beat.minuto}`} />
          <span className="font-display text-base font-semibold uppercase tracking-label">Gol</span>
          <span className="tabular text-sm text-ink-muted">{beat.minuto}&apos;</span>
          <span className="ml-auto truncate text-2xs text-ink-muted">a {beat.rival}</span>
        </div>
      );

    case 'asistencia':
      return (
        <p className="flex items-center gap-2 text-sm">
          <EventIcon kind="assist" size={14} detail={`minuto ${beat.minuto}`} />
          Asistencia a los {beat.minuto}&apos; contra {beat.rival}.
        </p>
      );

    case 'tramo':
      return (
        <dl className="grid grid-cols-4 gap-2 rounded-lg bg-canvas-subtle px-3 py-2">
          {[
            ['PJ', beat.resumen.partidos],
            ['Goles', beat.resumen.goles],
            ['Asist.', beat.resumen.asistencias],
            ['Nota', beat.resumen.nota.toFixed(1)],
          ].map(([rotulo, valor]) => (
            <div key={String(rotulo)}>
              <dt className="text-[10px] font-medium uppercase tracking-label text-ink-muted">{rotulo}</dt>
              <dd className="font-display text-base font-semibold leading-none tabular">{valor}</dd>
            </div>
          ))}
        </dl>
      );

    case 'lesion':
      return (
        <div className="flex items-start gap-2 rounded-lg bg-card-red/12 px-3 py-2">
          <EventIcon kind="lesion" size={16} detail={beat.motivo} />
          <p className="text-sm">
            <span className="font-medium">Lesión:</span> {beat.motivo}. {beat.semanas} semanas afuera.
          </p>
        </div>
      );

    case 'tarjeta':
      return (
        <p className="flex items-center gap-2 text-sm">
          <EventIcon kind={beat.color === 'roja' ? 'red_card' : 'yellow_card'} size={14} detail={beat.motivo} />
          Tarjeta {beat.color} por {beat.motivo}.
        </p>
      );

    case 'titular':
      return (
        <blockquote
          className={`rounded-lg border px-3 py-2 ${
            beat.tono === 'polemica'
              ? 'border-card-red/35 bg-card-red/8'
              : beat.tono === 'elogio'
                ? 'border-primary/35 bg-primary/8'
                : 'border-border bg-canvas-subtle'
          }`}
        >
          {/* El titular imita un recorte de diario: volanta chica, título en condensada, nada más. */}
          <p className="text-[10px] uppercase tracking-label text-ink-muted">Prensa</p>
          <p className="font-display text-sm font-semibold uppercase leading-snug tracking-label">
            {beat.texto}
          </p>
        </blockquote>
      );

    case 'trofeo':
      return (
        <div className="flex items-center gap-3 rounded-lg bg-card-yellow/16 px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card-yellow text-board">
            <TrofeoIcono />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold uppercase tracking-label">
              {beat.trofeo.nombre}
            </p>
            <p className="truncate text-2xs text-ink-muted">
              {beat.trofeo.clubNombre} · {beat.trofeo.temporada}
            </p>
          </div>
        </div>
      );

    case 'premio':
      return (
        <div className="flex items-center gap-3 rounded-lg bg-data/14 px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-data text-board">
            <EstrellaIcono />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold uppercase tracking-label">{beat.nombre}</p>
            <p className="text-2xs text-ink-muted">Premio individual · {beat.temporada}</p>
          </div>
        </div>
      );

    case 'carta':
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-center">
          <p className="text-2xs font-medium uppercase tracking-label text-ink-muted">Tu carta cambió</p>
          <p className="font-display text-lg font-semibold uppercase tracking-label">
            {nombreDeNivel(beat.a)}
          </p>
          <p className="text-2xs text-ink-muted">
            desde {nombreDeNivel(beat.de)} · {beat.ovr} de media
          </p>
        </div>
      );

    case 'ovr':
      return (
        <p className="flex items-center gap-2 text-sm">
          <span className="font-medium">Media</span>
          <span className="tabular text-ink-muted">{beat.de}</span>
          <span aria-hidden="true" className="text-ink-muted">
            →
          </span>
          <span className={`font-display text-base font-semibold tabular ${beat.a > beat.de ? 'text-primary-ink' : 'text-card-red-ink'}`}>
            {beat.a}
          </span>
          <span className="sr-only">{beat.a > beat.de ? 'subió' : 'bajó'}</span>
        </p>
      );

    case 'rol':
      return (
        <p className="text-sm">
          Tu rol en el equipo pasa a <span className="font-medium">{rol(beat.a)}</span>.
        </p>
      );

    case 'seleccion':
      return (
        <p className="flex items-start gap-2 rounded-lg bg-canvas-subtle px-3 py-2 text-sm">
          <EventIcon kind="capitan" size={14} detail="selección" />
          {beat.texto}
        </p>
      );

    case 'fichaje':
      return (
        <div className="rounded-lg border border-border bg-canvas-subtle px-3 py-2.5">
          <p className="font-display text-base font-semibold uppercase tracking-label">{beat.club}</p>
          <p className="text-2xs text-ink-muted">
            {beat.desde ? `Dejás ${beat.desde}` : 'Tu primer club'}
            {beat.matices.includes('rival') && ' · al clásico rival'}
            {beat.matices.includes('regreso') && ' · de vuelta a casa'}
            {beat.matices.includes('promesa-rota') && ' · rompiendo tu palabra'}
          </p>
        </div>
      );

    case 'debut':
      return (
        <div className="rounded-lg bg-board px-4 py-4 text-center">
          <p className="text-2xs font-medium uppercase tracking-label text-chalk-dim">Debut profesional</p>
          <p className="font-display text-xl font-semibold uppercase tracking-label text-chalk">{beat.club}</p>
          <p className="text-2xs text-chalk-dim">{beat.edad} años</p>
        </div>
      );

    case 'retiro':
      return (
        <div className="rounded-lg bg-board px-4 py-5 text-center">
          <p className="text-2xs font-medium uppercase tracking-label text-chalk-dim">
            {beat.enCasa ? 'Se retira en casa' : 'Se retira'}
          </p>
          <p className="font-display text-xl font-semibold uppercase tracking-label text-chalk">{beat.club}</p>
          <p className="text-2xs text-chalk-dim">{beat.edad} años</p>
        </div>
      );

    case 'temporada':
      return (
        <dl className="grid grid-cols-4 gap-2 rounded-lg border border-border px-3 py-2">
          {[
            ['PJ', beat.temporada.partidos],
            ['Goles', beat.temporada.goles],
            ['Asist.', beat.temporada.asistencias],
            ['Nota', beat.temporada.notaMedia.toFixed(1)],
          ].map(([rotulo, valor]) => (
            <div key={String(rotulo)}>
              <dt className="text-[10px] font-medium uppercase tracking-label text-ink-muted">{rotulo}</dt>
              <dd className="font-display text-base font-semibold leading-none tabular">{valor}</dd>
            </div>
          ))}
          {beat.temporada.posicionEnLaTabla && (
            <div className="col-span-4 text-2xs text-ink-muted">
              {beat.temporada.campeonDeLiga
                ? `Campeón de ${beat.temporada.ligaNombre}`
                : `${beat.temporada.posicionEnLaTabla}º en ${beat.temporada.ligaNombre}`}
            </div>
          )}
        </dl>
      );

    case 'mercado':
      return (
        <p className="text-sm text-ink-muted">
          {beat.cuantas === 0
            ? 'Ningún club preguntó por ti.'
            : `${beat.cuantas} club${beat.cuantas === 1 ? '' : 'es'} quiere${beat.cuantas === 1 ? '' : 'n'} ficharte.`}
        </p>
      );

    case 'recuerdo':
      return (
        <p className="rounded-lg border border-data/30 bg-data/8 px-3 py-2 text-sm">
          <span className="text-2xs uppercase tracking-label text-ink-muted">{beat.anio} · </span>
          {beat.texto}
        </p>
      );

    case 'decision':
      return <p className="text-sm font-medium">Tenés que decidir algo.</p>;

    case 'momento':
      return (
        <p className="rounded-lg bg-primary/12 px-3 py-2 text-sm font-medium">
          {beat.contexto.escena} · minuto {beat.contexto.minuto}
        </p>
      );

    case 'texto':
      return <p className="text-sm leading-relaxed">{beat.texto}</p>;
  }
}

const nombreDeNivel = (nivel: string): string =>
  ({
    cantera: 'Cantera',
    promesa: 'Promesa',
    profesional: 'Profesional',
    elite: 'Élite',
    'clase-mundial': 'Clase mundial',
    icono: 'Ícono',
    inmortal: 'Inmortal',
  })[nivel] ?? nivel;

const rol = (valor: string): string =>
  ({
    promesa: 'promesa',
    suplente: 'suplente',
    rotacion: 'rotación',
    titular: 'titular',
    estrella: 'estrella del equipo',
    capitan: 'capitán',
  })[valor] ?? valor;

/* Los dos iconos que el relato necesita y no están en el registro de eventos. */
function TrofeoIcono() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.2v1.8A3.2 3.2 0 0 0 8.4 10.5M16 5.5h2.8v1.8a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.7v3.3M8.5 19.5h7" />
      <path d="M10 16h4l.8 3.5h-5.6z" />
    </svg>
  );
}

function EstrellaIcono() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8z" />
    </svg>
  );
}
