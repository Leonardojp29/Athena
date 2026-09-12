import type { CaminoAlTitulo as Camino, Equipo } from '@athena/calculadora';

/*
 * Quién juega qué para ser campeón, según el escenario cargado.
 *
 * Debajo va la frase del reglamento que manda ese cruce. En Athena un número siempre viene con lo
 * que lo sostiene, y acá lo que lo sostiene es el texto de las bases, no nuestra interpretación.
 */
interface Props {
  camino: Camino | null;
  equipos: Equipo[];
}

export default function CaminoAlTitulo({ camino, equipos }: Props) {
  if (!camino) return null;
  const nombre = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? id;

  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Camino al título
      </h2>

      {camino.campeon ? (
        <p className="mt-1.5 text-sm">
          <span className="font-semibold">{nombre(camino.campeon)}</span> se consagra campeón sin jugar
          la definición.
        </p>
      ) : (
        <ul className="mt-1.5 grid gap-1">
          {camino.cruces.map((cruce, indice) => (
            <li key={`${cruce.ronda}-${indice}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-2xs uppercase tracking-label text-ink-muted">
                {cruce.ronda === 'final' ? 'Final' : 'Semifinal'}
              </span>
              <span>
                <span className="font-medium">{nombre(cruce.local)}</span>
                <span className="text-ink-muted"> vs </span>
                <span className="font-medium">{nombre(cruce.visita)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 border-t border-border pt-2 text-2xs text-ink-muted">{camino.fundamento}</p>
    </section>
  );
}
