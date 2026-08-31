import Carta from './Carta';
import type { LegadoCompartible } from '../../lib/leyenda';
import type { Costado, Nivel, Puesto } from '@athena/leyenda';

/**
 * La carta de un legado que llegó por enlace.
 *
 * Reconstruye lo mínimo desde el código de la URL y usa el mismo componente que el juego: si la carta
 * cambia, cambia en los dos lados. Recibirla por enlace tiene que sentirse igual que haberla ganado.
 */
export default function CartaCompartida({ legado }: { legado: LegadoCompartible }) {
  const [ritmo, tiro, pase, regate, defensa, fisico] = legado.a;
  return (
    <Carta
      entra
      datos={{
        nombre: legado.n,
        dorsal: legado.d,
        puesto: legado.p as Puesto,
        costado: legado.pc as Costado | undefined,
        ovr: legado.o,
        nivel: legado.v as Nivel,
        atributos: { ritmo, tiro, pase, regate, defensa, fisico },
        club: legado.c
          ? { nombre: legado.c, corto: legado.c.slice(0, 3).toUpperCase(), escudo: null, primario: legado.cc, secundario: null }
          : null,
        pais: legado.e,
        bandera: legado.b,
      }}
    />
  );
}
