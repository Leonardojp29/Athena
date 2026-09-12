import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DatosDeLaCalculadora, Partido } from '@athena/calculadora';

/*
 * El calendario, una fecha a la vez.
 *
 * Una lista con las diecisiete fechas desplegadas obliga a buscar; con flechas, la fecha es un
 * lugar y no un scroll. Arranca en la primera que tiene algo por jugar, que es a la que vino el
 * lector.
 *
 * Lo jugado va con su marcador y sin controles: un resultado no se discute, y dejarlo editable
 * invitaría a inventar una temporada que no pasó.
 */

interface Props {
  datos: DatosDeLaCalculadora;
  fases: string[];
  titulo: string;
  pronosticos: ReadonlyMap<string, readonly [number, number]>;
  onPronosticar: (id: string, marcador: readonly [number, number] | null) => void;
  reiniciar: ReactNode;
}

const JUGADO = new Set(['finished', 'in_play', 'paused']);
const EN_CURSO = new Set(['in_play', 'paused']);
const GOLES_MAXIMOS = 9;

function numeroDeRonda(ronda: string): number {
  const cola = ronda.slice(ronda.lastIndexOf(' - ') + 3);
  return /^\d+$/.test(cola) ? Number(cola) : 0;
}

/** "Clausura - 9" → "Fecha 9". Sin `Intl`: el servidor y el navegador tienen que coincidir. */
function tituloDeRonda(ronda: string): string {
  const numero = numeroDeRonda(ronda);
  return numero > 0 ? `Fecha ${numero}` : ronda;
}

export default function Partidos({
  datos,
  fases,
  titulo,
  pronosticos,
  onPronosticar,
  reiniciar,
}: Props) {
  const porId = useMemo(() => new Map(datos.equipos.map((e) => [e.id, e])), [datos.equipos]);

  const rondas = useMemo(() => {
    const mapa = new Map<string, Partido[]>();
    for (const partido of datos.partidos) {
      if (!fases.includes(partido.fase)) continue;
      const lista = mapa.get(partido.ronda) ?? [];
      lista.push(partido);
      mapa.set(partido.ronda, lista);
    }
    return [...mapa.entries()]
      .map(([ronda, partidos]) => ({
        ronda,
        partidos,
        jugados: partidos.filter((p) => JUGADO.has(p.estado)).length,
        pendientes: partidos.filter((p) => !JUGADO.has(p.estado)).length,
      }))
      .sort((a, b) => numeroDeRonda(a.ronda) - numeroDeRonda(b.ronda));
  }, [datos.partidos, fases]);

  const primeraAbierta = useMemo(() => {
    const indice = rondas.findIndex((r) => r.pendientes > 0);
    return indice === -1 ? Math.max(0, rondas.length - 1) : indice;
  }, [rondas]);

  const [indice, setIndice] = useState(primeraAbierta);
  /* Al cambiar de torneo, el calendario vuelve a su primera fecha con algo por jugar. */
  useEffect(() => setIndice(primeraAbierta), [primeraAbierta]);

  const ronda = rondas[Math.min(indice, rondas.length - 1)];
  if (!ronda) return null;

  const flecha =
    'grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-label text-ink-muted">
          Calendario · {titulo}
        </h2>
        <span className="ml-auto">{reiniciar}</span>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          aria-label="Fecha anterior"
          className={flecha}
        >
          <Chevron hacia="izquierda" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-lg font-semibold uppercase leading-none">
            {tituloDeRonda(ronda.ronda)}
          </p>
          <p className="mt-1 text-2xs text-ink-muted">
            {ronda.jugados} {ronda.jugados === 1 ? 'jugado' : 'jugados'} · {ronda.pendientes}{' '}
            {ronda.pendientes === 1 ? 'pendiente' : 'pendientes'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIndice((i) => Math.min(rondas.length - 1, i + 1))}
          disabled={indice >= rondas.length - 1}
          aria-label="Fecha siguiente"
          className={flecha}
        >
          <Chevron hacia="derecha" />
        </button>
      </div>

      <ul>
        {ronda.partidos.map((partido) => (
          <FilaDePartido
            key={partido.id}
            partido={partido}
            local={porId.get(partido.local)?.nombre ?? ''}
            visita={porId.get(partido.visita)?.nombre ?? ''}
            logoLocal={porId.get(partido.local)?.logo ?? null}
            logoVisita={porId.get(partido.visita)?.logo ?? null}
            pronostico={pronosticos.get(partido.id) ?? null}
            onPronosticar={onPronosticar}
          />
        ))}
      </ul>
    </section>
  );
}

function Chevron({ hacia }: { hacia: 'izquierda' | 'derecha' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={hacia === 'izquierda' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

interface FilaProps {
  partido: Partido;
  local: string;
  visita: string;
  logoLocal: string | null;
  logoVisita: string | null;
  pronostico: readonly [number, number] | null;
  onPronosticar: (id: string, marcador: readonly [number, number] | null) => void;
}

function FilaDePartido({
  partido,
  local,
  visita,
  logoLocal,
  logoVisita,
  pronostico,
  onPronosticar,
}: FilaProps) {
  const jugado = JUGADO.has(partido.estado);
  const enCurso = EN_CURSO.has(partido.estado);
  const editable = partido.estado === 'scheduled' || partido.estado === 'postponed';

  const mover = (lado: 0 | 1, paso: number) => {
    const actual: [number, number] = [pronostico?.[0] ?? 0, pronostico?.[1] ?? 0];
    actual[lado] = Math.min(GOLES_MAXIMOS, Math.max(0, actual[lado] + paso));
    onPronosticar(partido.id, actual);
  };

  const escribir = (lado: 0 | 1, texto: string) => {
    const valor = texto.replace(/\D/g, '').slice(-1);
    const actual: [number, number] = [pronostico?.[0] ?? 0, pronostico?.[1] ?? 0];
    if (valor === '') {
      if (pronostico === null) return;
      actual[lado] = 0;
      return onPronosticar(partido.id, actual);
    }
    actual[lado] = Number(valor);
    onPronosticar(partido.id, actual);
  };

  /*
   * Cada equipo viaja junto a su control, en una sola pieza. En el teléfono esa pieza ocupa una
   * línea entera —en una sola fila los dos steppers dejaban los nombres en "Clu…" y saber quién
   * juega es lo mínimo— y de `sm` en adelante las dos se ponen lado a lado, con los escudos hacia
   * adentro, que es como se lee un partido.
   */
  const par = (
    nombre: string,
    logo: string | null,
    control: ReactNode,
    esLocal: boolean,
  ) => (
    <span
      className={`flex items-center justify-between gap-2 sm:flex-1 ${esLocal ? '' : 'sm:flex-row-reverse'}`}
    >
      <span
        className={`flex min-w-0 items-center gap-2 sm:flex-1 ${esLocal ? 'sm:flex-row-reverse sm:text-right' : ''}`}
      >
        <Escudo logo={logo} />
        <span className="truncate text-sm sm:text-base">{nombre}</span>
      </span>
      {control}
    </span>
  );

  const control = (lado: 0 | 1, etiqueta: string, goles: number | null) =>
    jugado ? (
      <Marcador valor={goles} />
    ) : (
      <Stepper
        valor={pronostico?.[lado] ?? null}
        etiqueta={etiqueta}
        onPaso={(paso) => mover(lado, paso)}
        onEscribir={(texto) => escribir(lado, texto)}
      />
    );

  return (
    <li
      className="grid gap-1.5 border-b border-border/50 px-2 py-2.5 last:border-0 data-[editable]:hover:bg-canvas-subtle sm:flex sm:items-center sm:gap-3 sm:px-3"
      data-editable={editable ? '' : undefined}
      data-partido-calculadora={partido.id}
    >
      {par(local, logoLocal, control(0, local, partido.golesLocal), true)}

      {jugado && (
        <span
          className={`text-center text-2xs font-semibold uppercase tracking-label sm:shrink-0 ${enCurso ? 'text-live-ink' : 'text-ink-muted'}`}
        >
          {enCurso ? 'En juego' : 'Final'}
        </span>
      )}

      {par(visita, logoVisita, control(1, visita, partido.golesVisita), false)}
    </li>
  );
}

function Marcador({ valor }: { valor: number | null }) {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-canvas-subtle font-display text-base font-semibold tabular">
      {valor ?? '·'}
    </span>
  );
}

function Escudo({ logo }: { logo: string | null }) {
  return logo ? (
    <img src={logo} alt="" width="28" height="28" loading="lazy" className="size-7 shrink-0" />
  ) : (
    <span className="size-7 shrink-0 rounded-full bg-canvas-subtle" aria-hidden="true" />
  );
}

/*
 * Menos, el número, más. El campo sigue aceptando que se escriba un dígito —es lo más rápido con
 * teclado— y los botones resuelven el teléfono sin abrir el teclado numérico encima de la tabla.
 */
function Stepper({
  valor,
  etiqueta,
  onPaso,
  onEscribir,
}: {
  valor: number | null;
  etiqueta: string;
  onPaso: (paso: number) => void;
  onEscribir: (texto: string) => void;
}) {
  const boton =
    'grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-ink-muted transition-colors hover:bg-primary hover:text-primary-contrast disabled:cursor-not-allowed disabled:opacity-30';
  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onPaso(-1)}
        disabled={(valor ?? 0) === 0}
        aria-label={`Un gol menos para ${etiqueta}`}
        className={boton}
      >
        <Signo menos />
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`Goles de ${etiqueta}`}
        value={valor === null ? '' : String(valor)}
        placeholder="0"
        onChange={(evento) => onEscribir(evento.currentTarget.value)}
        className="size-8 rounded-lg border border-border bg-canvas text-center font-display text-base font-semibold tabular outline-none transition-colors placeholder:text-ink-muted/50 focus:border-primary-ink"
      />
      <button
        type="button"
        onClick={() => onPaso(1)}
        disabled={(valor ?? 0) >= GOLES_MAXIMOS}
        aria-label={`Un gol más para ${etiqueta}`}
        className={boton}
      >
        <Signo />
      </button>
    </span>
  );
}

function Signo({ menos = false }: { menos?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      {!menos && <path d="M12 5v14" />}
    </svg>
  );
}
