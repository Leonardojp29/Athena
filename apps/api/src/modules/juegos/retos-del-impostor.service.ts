import { Injectable } from '@nestjs/common';
import { Memoria } from '../../shared/memoria.js';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * Una carta. **Rostro y nombre, nada más**: club, puesto o país serían pistas regaladas.
 *
 * `esImpostor` viaja al navegador a propósito. La racha se guarda en el equipo de quien juega, así
 * que hacer trampa solo se la hace uno mismo; a cambio, fallar se revela en el acto y no con un
 * viaje a la red justo en el momento de perder. El día que haya tabla de posiciones, esto se muda
 * al servidor.
 */
export interface OpcionDeRonda {
  ref: string;
  nombre: string;
  esImpostor: boolean;
}

export interface RondaDelImpostor {
  clave: string;
  dificultad: string;
  categoria: string;
  enunciado: string;
  reveal: string;
  opciones: OpcionDeRonda[];
}

/** La ronda con su escena. El contexto es cosa del sorteo y no viaja al navegador. */
interface Escena extends RondaDelImpostor {
  contexto: string;
}

/** Rondas por tanda: suficientes para una racha larga sin bajar el catálogo entero de una. */
export const POR_TANDA = 10;

/* El catálogo entero son 48 retos de seis cartas: cabe en memoria y el sorteo no toca la base. */
const TTL_CATALOGO_S = 900;
const LLAVE_CATALOGO = 'catalogo';

/* Dos retos de la misma generación repiten media alineación: seguidos, el segundo se regala. */
const CARTAS_COMPARTIDAS_QUE_MOLESTAN = 2;

@Injectable()
export class RetosDelImpostorService {
  private readonly catalogo = new Memoria<Escena[]>(1);

  constructor(private readonly prisma: PrismaService) {}

  async cuantos(): Promise<number> {
    return this.prisma.retoDelImpostor.count();
  }

  /**
   * Diez rondas barajadas, con sus seis cartas también barajadas, fuera de las ya jugadas.
   *
   * Si lo excluido no deja suficientes, se completa con el resto del catálogo: agotar cuarenta y
   * ocho retos en una racha es posible y quedarse sin juego ahí sería el peor final.
   */
  async tanda(excluir: string[]): Promise<RondaDelImpostor[]> {
    const todos = await this.todos();
    if (todos.length === 0) return [];

    const fuera = new Set(excluir);
    const frescos = barajar(todos.filter((r) => !fuera.has(r.clave)));
    const repetibles = barajar(todos.filter((r) => fuera.has(r.clave)));
    const elegidos = [...frescos, ...repetibles].slice(0, POR_TANDA);

    return acomodar(elegidos).map(({ contexto: _escena, ...ronda }) => ({
      ...ronda,
      opciones: barajar(ronda.opciones),
    }));
  }

  private async todos(): Promise<Escena[]> {
    const recordado = this.catalogo.get(LLAVE_CATALOGO);
    if (recordado) return recordado;

    const retos = await this.prisma.retoDelImpostor.findMany({
      select: {
        clave: true,
        dificultad: true,
        categoria: true,
        enunciado: true,
        reveal: true,
        contexto: true,
        opciones: {
          select: { providerRef: true, esImpostor: true, player: { select: { name: true } } },
        },
      },
    });

    /* Un reto al que le falta una carta o que no tiene exactamente un impostor no es jugable. */
    const jugables = retos
      .filter(
        (r) => r.opciones.length === 6 && r.opciones.filter((o) => o.esImpostor).length === 1,
      )
      .map((r) => ({
        clave: r.clave,
        dificultad: r.dificultad,
        categoria: r.categoria,
        enunciado: r.enunciado,
        reveal: r.reveal,
        contexto: r.contexto,
        opciones: r.opciones.map((o) => ({
          ref: o.providerRef,
          nombre: o.player.name,
          esImpostor: o.esImpostor,
        })),
      }));

    this.catalogo.set(LLAVE_CATALOGO, jugables, TTL_CATALOGO_S);
    return jugables;
  }
}

function barajar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

/**
 * Ordena la tanda de modo que dos rondas parecidas no caigan pegadas.
 *
 * Dos retos se parecen cuando comparten cartas —Perú 2018 y Perú 2019 tienen cuatro nombres en
 * común— o cuando son la misma escena vista desde cada lado: IMP-024 pregunta por el XI de Brasil y
 * IMP-030 por el de Bélgica del mismo cruce, sin repetir una sola carta.
 *
 * Se arma de forma voraz en lugar de intercambiar posiciones: elegir la siguiente que no choque con
 * la recién puesta no puede romper lo ya ordenado, que es justamente lo que hacía un intercambio.
 */
function acomodar(rondas: readonly Escena[]): Escena[] {
  const pendientes = [...rondas];
  const puestas: Escena[] = [];

  while (pendientes.length > 0) {
    const anterior = puestas[puestas.length - 1];
    const i = anterior === undefined ? 0 : indiceQueNoChoca(pendientes, anterior);
    puestas.push(...pendientes.splice(i, 1));
  }
  return puestas;
}

/*
 * La que menos choque, no la primera que sirva.
 *
 * Hacia el final de la tanda puede que todas las que quedan choquen con la recién puesta; elegir la
 * primera ahí dejaba pasar un par repetido cada doscientas rondas. Como lo pendiente ya viene
 * barajado, quedarse con el primer mínimo no le quita azar a nada.
 */
function indiceQueNoChoca(pendientes: readonly Escena[], anterior: Escena): number {
  const caras = new Set(anterior.opciones.map((o) => o.ref));
  const estorbo = (r: Escena): number =>
    r.opciones.filter((o) => caras.has(o.ref)).length +
    (r.contexto === anterior.contexto ? CARTAS_COMPARTIDAS_QUE_MOLESTAN : 0);

  let elegida = 0;
  let menor = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pendientes.length; i += 1) {
    const cuanto = estorbo(pendientes[i] as Escena);
    if (cuanto === 0) return i;
    if (cuanto < menor) {
      menor = cuanto;
      elegida = i;
    }
  }
  return elegida;
}
