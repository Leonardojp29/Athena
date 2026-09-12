import { useState } from 'react';
import { detalle, frase, type Equipo, type Resumen } from '@athena/calculadora';

/*
 * La tarjeta que se comparte.
 *
 * Está pensada para dos salidas: la captura que alguien manda al grupo, y el texto que va al
 * portapapeles junto al enlace. Sobre la banda oscura, que es donde Athena pone lo que quiere que
 * se lea de lejos.
 *
 * La frase cambia sola según cuánto se pronosticó: con la fase entera cargada dice "campeón", y si
 * faltan partidos dice "puntero" y cuántos quedan. Adornar un dato incompleto para que suene mejor
 * es justo lo que Athena no hace.
 */
interface Props {
  resumen: Resumen | null;
}

export default function Prediccion({ resumen }: Props) {
  const [copiado, setCopiado] = useState(false);
  const titular = frase(resumen);
  if (!resumen?.campeon || !titular || resumen.puestos === 0) return null;

  const bajada = detalle(resumen);

  const compartir = () => {
    const texto = `${titular}${bajada ? `\n${bajada}` : ''}\n${window.location.href}`;
    const nativo = navigator.share?.({ text: texto });
    if (nativo) return void nativo.catch(() => undefined);
    void navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <section
      data-prediccion
      className="overflow-hidden rounded-xl border-b-[3px] border-b-primary bg-banda p-4 text-chalk"
    >
      <p className="text-2xs font-semibold uppercase tracking-label text-chalk-dim">Mi predicción</p>

      <div className="mt-2.5 flex items-center gap-3">
        {resumen.campeon.logo && (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-chalk p-1.5">
            <img
              src={resumen.campeon.logo}
              alt=""
              width="44"
              height="44"
              className="size-full object-contain"
            />
          </span>
        )}
        <p className="min-w-0 font-display text-xl font-semibold uppercase leading-tight sm:text-2xl">
          {resumen.campeon.nombre}
          <span className="block text-sm font-medium normal-case text-chalk-dim sm:text-base">
            {resumen.cerrado ? 'campeón del' : 'puntero del'} {resumen.torneo} con {resumen.puntos}{' '}
            puntos
          </span>
        </p>
      </div>

      <dl className="mt-3 grid gap-2 border-t border-chalk/15 pt-3 sm:grid-cols-2">
        <Cupo titulo="Copa Libertadores" equipos={resumen.libertadores} />
        <Cupo titulo="Descienden" equipos={resumen.descenso} />
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={compartir}
          className="cursor-pointer rounded-lg bg-chalk px-3 py-1.5 text-xs font-semibold text-banda transition-opacity hover:opacity-90"
        >
          {copiado ? 'Copiado' : 'Compartir mi predicción'}
        </button>
        <p className="text-2xs text-chalk-dim">
          {resumen.cerrado
            ? `Con los ${resumen.puestos} partidos que pusiste`
            : `Faltan ${resumen.faltan} partidos por poner`}
        </p>
      </div>
    </section>
  );
}

function Cupo({ titulo, equipos }: { titulo: string; equipos: Equipo[] }) {
  if (equipos.length === 0) return null;
  return (
    <div className="min-w-0">
      <dt className="text-2xs uppercase tracking-label text-chalk-dim">{titulo}</dt>
      <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {equipos.map((equipo) => (
          <span key={equipo.id} className="flex min-w-0 items-center gap-1.5 text-xs">
            {equipo.logo && (
              <img
                src={equipo.logo}
                alt=""
                width="16"
                height="16"
                loading="lazy"
                className="size-4 shrink-0"
              />
            )}
            <span className="truncate">{equipo.nombre}</span>
          </span>
        ))}
      </dd>
    </div>
  );
}
