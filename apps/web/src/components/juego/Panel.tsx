import { useState } from 'react';
import { NOMBRE_DE_ROL, type Carrera } from '@athena/leyenda';

/**
 * El estado de la vida, debajo de la carta.
 *
 * Cinco medidas, no diez: forma, confianza, fama, cariño de la hinchada y dinero. El resto del sistema
 * existe y empuja los eventos, pero mostrarlo entero convertiría la pantalla en un tablero de control.
 * Lo que se muestra es lo que el jugador puede usar para decidir.
 *
 * La historia vive detrás de un `<details>`: está a un clic cuando alguien quiere repasar su carrera y
 * no ocupa la pantalla mientras juega.
 */

const MEDIDAS = [
  { clave: 'forma', rotulo: 'Forma' },
  { clave: 'confianza', rotulo: 'Confianza' },
  { clave: 'fama', rotulo: 'Fama' },
  { clave: 'carinoDeLaHinchada', rotulo: 'Hinchada' },
] as const;

export default function Panel({ carrera }: { carrera: Carrera }) {
  const [pestana, setPestana] = useState<'estado' | 'historia' | 'vitrina'>('estado');

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex border-b border-border" role="tablist" aria-label="Tu carrera">
        {(
          [
            ['estado', 'Estado'],
            ['historia', 'Historia'],
            ['vitrina', 'Vitrina'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className="flex-1 cursor-pointer border-b-2 border-transparent px-2 py-2 text-2xs font-medium uppercase tracking-label text-ink-muted transition-colors hover:text-ink aria-selected:border-primary-ink aria-selected:text-ink"
          >
            {rotulo}
          </button>
        ))}
      </div>

      {pestana === 'estado' && (
        <div className="p-3">
          <dl className="flex flex-col gap-2">
            {MEDIDAS.map((medida) => {
              const valor = Math.round(carrera.vida[medida.clave]);
              return (
                <div key={medida.clave} className="flex items-center gap-2">
                  <dt className="w-20 shrink-0 text-2xs uppercase tracking-label text-ink-muted">
                    {medida.rotulo}
                  </dt>
                  <dd className="flex flex-1 items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-subtle">
                      <span
                        className={`block h-full origin-left rounded-full ${
                          valor >= 70 ? 'bg-primary' : valor >= 40 ? 'bg-data' : 'bg-card-red'
                        }`}
                        style={{ transform: `scaleX(${valor / 100})` }}
                      />
                    </span>
                    <span className="w-7 text-right text-2xs font-medium tabular">{valor}</span>
                  </dd>
                </div>
              );
            })}
          </dl>

          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
            {[
              ['Rol', NOMBRE_DE_ROL[carrera.rol]],
              ['Valor', `${carrera.valor.toFixed(1)} M`],
              ['Ganado', `${carrera.vida.dinero.toFixed(1)} M`],
              ['Contrato', carrera.contrato ? `hasta ${carrera.contrato.hasta}` : 'libre'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-[10px] uppercase tracking-label text-ink-muted">{rotulo}</dt>
                <dd className="truncate text-sm font-medium tabular">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {pestana === 'historia' && (
        <div className="barra-fina max-h-[22rem] overflow-y-auto p-3">
          {carrera.temporadas.length === 0 && carrera.recuerdos.length === 0 ? (
            <p className="py-4 text-center text-2xs text-ink-muted">Todavía no hay historia. Jugá.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {[...carrera.recuerdos].reverse().slice(0, 40).map((recuerdo) => (
                <li key={recuerdo.id} className="border-l border-border pl-2.5">
                  <p className="text-[10px] uppercase tracking-label text-ink-muted">
                    {recuerdo.temporada} · {recuerdo.edad} años
                  </p>
                  <p className="text-xs leading-snug">{recuerdo.texto}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {pestana === 'vitrina' && (
        <div className="barra-fina max-h-[22rem] overflow-y-auto p-3">
          {carrera.trofeos.length === 0 ? (
            <p className="py-4 text-center text-2xs text-ink-muted">
              La vitrina está vacía. Todavía.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {[...carrera.trofeos].reverse().map((trofeo) => (
                <li
                  key={`${trofeo.id}-${trofeo.temporada}`}
                  className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 ${
                    trofeo.clase === 'individual' ? 'bg-data/12' : 'bg-card-yellow/14'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{trofeo.nombre}</span>
                  <span className="text-[10px] tabular text-ink-muted">{trofeo.temporada}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
