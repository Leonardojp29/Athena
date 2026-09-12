import { useMemo, useState } from 'react';
import type { DatosDeLaCalculadora, Partido } from '@athena/calculadora';

/*
 * La columna donde se carga el escenario.
 *
 * Lo que ya se jugó va bloqueado y con su marcador: un resultado no se discute, y dejarlo editable
 * invitaría a inventar una temporada que no pasó. Lo que falta trae dos celdas y tres atajos —L, E,
 * V—, que en el teléfono resuelven casi todo sin abrir el teclado numérico.
 */

interface Props {
  datos: DatosDeLaCalculadora;
  pronosticos: ReadonlyMap<string, readonly [number, number]>;
  onPronosticar: (id: string, marcador: readonly [number, number] | null) => void;
}

const JUGADO = new Set(['finished', 'in_play', 'paused']);
const EN_CURSO = new Set(['in_play', 'paused']);

const ATAJOS: Array<{ letra: string; titulo: string; marcador: readonly [number, number] }> = [
  { letra: 'L', titulo: 'Gana el local', marcador: [1, 0] },
  { letra: 'E', titulo: 'Empate', marcador: [0, 0] },
  { letra: 'V', titulo: 'Gana la visita', marcador: [0, 1] },
];

/** "Clausura - 9" → "Clausura, fecha 9". Sin `Intl`: el servidor y el navegador tienen que coincidir. */
function tituloDeRonda(ronda: string): string {
  const corte = ronda.lastIndexOf(' - ');
  if (corte === -1) return ronda;
  const cola = ronda.slice(corte + 3);
  return /^\d+$/.test(cola) ? `${ronda.slice(0, corte)}, fecha ${cola}` : ronda;
}

function numeroDeRonda(ronda: string): number {
  const cola = ronda.slice(ronda.lastIndexOf(' - ') + 3);
  return /^\d+$/.test(cola) ? Number(cola) : 0;
}

export default function Partidos({ datos, pronosticos, onPronosticar }: Props) {
  const porId = useMemo(
    () => new Map(datos.equipos.map((e) => [e.id, e])),
    [datos.equipos],
  );

  const rondas = useMemo(() => {
    const mapa = new Map<string, Partido[]>();
    for (const partido of datos.partidos) {
      const lista = mapa.get(partido.ronda) ?? [];
      lista.push(partido);
      mapa.set(partido.ronda, lista);
    }
    return [...mapa.entries()]
      .map(([ronda, partidos]) => ({
        ronda,
        partidos,
        numero: numeroDeRonda(ronda),
        abierta: partidos.some((p) => !JUGADO.has(p.estado)),
      }))
      .sort((a, b) => a.numero - b.numero);
  }, [datos.partidos]);

  /* Solo las fechas con algo por jugar arrancan abiertas: lo demás es historia y ocupa lugar. */
  const [desplegadas, setDesplegadas] = useState<Set<string>>(
    () => new Set(rondas.filter((r) => r.abierta).map((r) => r.ronda)),
  );

  const alternar = (ronda: string) =>
    setDesplegadas((previas) => {
      const siguientes = new Set(previas);
      if (siguientes.has(ronda)) siguientes.delete(ronda);
      else siguientes.add(ronda);
      return siguientes;
    });

  const porFase = useMemo(() => {
    const mapa = new Map<string, typeof rondas>();
    for (const ronda of rondas) {
      const fase = ronda.partidos[0]?.fase ?? '';
      const lista = mapa.get(fase) ?? [];
      lista.push(ronda);
      mapa.set(fase, lista);
    }
    /* La fase con partidos por jugar primero: es a la que vino el lector. */
    return [...mapa.entries()].sort(
      (a, b) =>
        Number(b[1].some((r) => r.abierta)) - Number(a[1].some((r) => r.abierta)),
    );
  }, [rondas]);

  return (
    <div className="grid gap-4">
      {porFase.map(([fase, susRondas]) => (
        <section key={fase} className="rounded-xl border border-border bg-surface p-1.5">
          <h2 className="px-2 pb-1 pt-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {fase}
          </h2>
          {susRondas.map((ronda) => {
            const abierta = desplegadas.has(ronda.ronda);
            return (
              <div key={ronda.ronda}>
                <button
                  type="button"
                  onClick={() => alternar(ronda.ronda)}
                  aria-expanded={abierta}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-canvas-subtle"
                >
                  <span className="flex-1 text-xs font-medium">{tituloDeRonda(ronda.ronda)}</span>
                  {!ronda.abierta && (
                    <span className="text-2xs text-ink-muted">jugada</span>
                  )}
                  <span className="text-2xs text-ink-muted" aria-hidden="true">
                    {abierta ? '−' : '+'}
                  </span>
                </button>
                {abierta && (
                  <ul className="grid gap-0.5 pb-1">
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
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
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

  const golesLocal = jugado ? partido.golesLocal : (pronostico?.[0] ?? null);
  const golesVisita = jugado ? partido.golesVisita : (pronostico?.[1] ?? null);

  const cambiar = (lado: 0 | 1, texto: string) => {
    const valor = texto.replace(/\D/g, '').slice(-1);
    const actual: [number, number] = [pronostico?.[0] ?? 0, pronostico?.[1] ?? 0];
    if (valor === '') {
      const otro = actual[lado === 0 ? 1 : 0];
      if (pronostico === null || otro === 0) return onPronosticar(partido.id, null);
      actual[lado] = 0;
      return onPronosticar(partido.id, actual);
    }
    actual[lado] = Number(valor);
    onPronosticar(partido.id, actual);
  };

  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 data-[editable]:hover:bg-canvas-subtle"
      data-editable={editable ? '' : undefined}
      data-partido-calculadora={partido.id}
    >
      <div className="grid min-w-0 gap-0.5">
        <Lado nombre={local} logo={logoLocal} />
        <Lado nombre={visita} logo={logoVisita} />
      </div>

      <div className="flex items-center gap-2">
        {editable && (
          <div className="hidden gap-0.5 sm:flex" role="group" aria-label="Resultado rápido">
            {ATAJOS.map(({ letra, titulo, marcador }) => {
              const puesto =
                pronostico?.[0] === marcador[0] && pronostico?.[1] === marcador[1];
              return (
                <button
                  key={letra}
                  type="button"
                  title={titulo}
                  aria-label={titulo}
                  aria-pressed={puesto}
                  onClick={() => onPronosticar(partido.id, puesto ? null : marcador)}
                  className="size-5 cursor-pointer rounded text-2xs font-semibold text-ink-muted transition-colors hover:bg-canvas-subtle hover:text-ink aria-pressed:bg-primary aria-pressed:text-primary-contrast"
                >
                  {letra}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-0.5">
          <Celda
            valor={golesLocal}
            bloqueada={!editable}
            etiqueta={`Goles de ${local}`}
            onCambiar={(texto) => cambiar(0, texto)}
          />
          <Celda
            valor={golesVisita}
            bloqueada={!editable}
            etiqueta={`Goles de ${visita}`}
            onCambiar={(texto) => cambiar(1, texto)}
          />
        </div>

        {enCurso && (
          <span
            role="img"
            className="size-1.5 shrink-0 rounded-full bg-live animate-live-pulse"
            title="En juego"
            aria-label="En juego"
          />
        )}
      </div>
    </li>
  );
}

function Lado({ nombre, logo }: { nombre: string; logo: string | null }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {logo ? (
        <img src={logo} alt="" width="16" height="16" loading="lazy" className="size-4 shrink-0" />
      ) : (
        <span className="size-4 shrink-0 rounded-full bg-canvas-subtle" aria-hidden="true" />
      )}
      <span className="truncate text-xs">{nombre}</span>
    </span>
  );
}

function Celda({
  valor,
  bloqueada,
  etiqueta,
  onCambiar,
}: {
  valor: number | null;
  bloqueada: boolean;
  etiqueta: string;
  onCambiar: (texto: string) => void;
}) {
  if (bloqueada) {
    return (
      <span className="grid size-6 place-items-center rounded bg-canvas-subtle text-xs font-semibold tabular text-ink-muted">
        {valor ?? '·'}
      </span>
    );
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={etiqueta}
      value={valor === null ? '' : String(valor)}
      onChange={(evento) => onCambiar(evento.currentTarget.value)}
      className="size-6 rounded border border-border bg-canvas text-center text-xs font-semibold tabular outline-none transition-colors focus:border-primary-ink"
    />
  );
}
