import type { CaminoAlTitulo as Camino, Equipo, Participante } from '@athena/calculadora';

/*
 * Quién juega qué para definir el título, según el escenario cargado.
 *
 * Con escudo y no solo con nombre: en una liga donde hay Alianza Lima, Alianza Atlético y Alianza
 * Universidad, el escudo resuelve en un golpe de vista lo que el nombre obliga a leer.
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
  const buscar = (id: string) => equipos.find((e) => e.id === id) ?? null;
  const soloUna = camino.cruces.filter((c) => c.ronda === 'semifinal').length === 1;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-label text-ink-muted">
        Camino al título
      </h2>

      {camino.campeon ? (
        <p className="mt-2.5 flex flex-wrap items-center gap-2 text-base">
          <Club equipo={buscar(camino.campeon)} destacado />
          <span className="text-ink-muted">se consagra campeón sin jugar la definición.</span>
        </p>
      ) : (
        <ul className="mt-2.5 grid gap-2">
          {camino.cruces.map((cruce, indice) => (
            <li
              key={`${cruce.ronda}-${indice}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1"
            >
              <span className="w-16 shrink-0 text-2xs uppercase tracking-label text-ink-muted">
                {cruce.ronda === 'final' ? 'Final' : 'Semifinal'}
              </span>
              <Lado
                quien={cruce.local}
                buscar={buscar}
                destacado={cruce.ronda === 'final'}
                soloUna={soloUna}
              />
              <span className="text-2xs text-ink-muted">vs</span>
              <Lado
                quien={cruce.visita}
                buscar={buscar}
                destacado={cruce.ronda === 'final'}
                soloUna={soloUna}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-border pt-2.5 text-2xs leading-relaxed text-ink-muted">
        {camino.fundamento}
      </p>
    </section>
  );
}

/*
 * Un lado de un cruce puede ser un equipo o "el ganador de la semifinal": poner ahí un nombre
 * sería contar un resultado que todavía no pasó.
 */
function Lado({
  quien,
  buscar,
  destacado,
  soloUna,
}: {
  quien: Participante;
  buscar: (id: string) => Equipo | null;
  destacado: boolean;
  soloUna: boolean;
}) {
  if (quien.tipo === 'equipo') return <Club equipo={buscar(quien.id)} destacado={destacado} />;
  return (
    <span className="text-sm italic text-ink-muted">
      {soloUna ? 'el ganador de la semifinal' : `el ganador de la semifinal ${quien.semifinal + 1}`}
    </span>
  );
}

function Club({ equipo, destacado = false }: { equipo: Equipo | null; destacado?: boolean }) {
  if (!equipo) return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {equipo.logo ? (
        <img
          src={equipo.logo}
          alt=""
          width="20"
          height="20"
          loading="lazy"
          className="size-5 shrink-0"
        />
      ) : (
        <span className="size-5 shrink-0 rounded-full bg-canvas-subtle" aria-hidden="true" />
      )}
      <span className={`truncate ${destacado ? 'font-semibold' : 'font-medium'}`}>
        {equipo.nombre}
      </span>
    </span>
  );
}
