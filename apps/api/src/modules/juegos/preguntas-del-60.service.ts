import { Injectable } from '@nestjs/common';
import { Memoria } from '../../shared/memoria.js';
import { PrismaService } from '../../shared/prisma.service.js';

export interface OpcionDeLaPregunta {
  texto: string;
  esCorrecta: boolean;
}

/**
 * Una pregunta lista para jugar.
 *
 * `esCorrecta` viaja al navegador a propósito. En un juego de sesenta segundos no puede haber un
 * viaje a la red entre pregunta y pregunta, y el récord se guarda en el equipo de quien juega, así
 * que hacer trampa solo se la hace uno mismo. El día que haya tabla de posiciones, la validación se
 * muda al servidor.
 */
export interface PreguntaParaJugar {
  clave: string;
  tipo: string;
  dificultad: string;
  enunciado: string;
  /** Solo se muestra al repasar los errores, nunca durante la partida. */
  explicacion: string;
  emblemas: string[];
  fotoRef: string | null;
  opciones: OpcionDeLaPregunta[];
}

/** La pregunta con su escena. El contexto es cosa del sorteo y no viaja al navegador. */
interface Escena extends PreguntaParaJugar {
  contexto: string;
}

/* El catálogo entero son cincuenta preguntas: cabe en memoria y una partida no toca la base. */
const TTL_CATALOGO_S = 900;
const LLAVE = 'catalogo';

@Injectable()
export class PreguntasDel60Service {
  private readonly catalogo = new Memoria<Escena[]>(1);

  constructor(private readonly prisma: PrismaService) {}

  async cuantas(): Promise<number> {
    return this.prisma.preguntaDe60.count();
  }

  /** El catálogo entero, barajado, con las opciones de cada pregunta también barajadas. */
  async paraJugar(): Promise<PreguntaParaJugar[]> {
    const todas = await this.todas();
    return acomodar(barajar(todas)).map(({ contexto: _escena, ...pregunta }) => ({
      ...pregunta,
      opciones: barajar(pregunta.opciones),
    }));
  }

  private async todas(): Promise<Escena[]> {
    const recordado = this.catalogo.get(LLAVE);
    if (recordado) return recordado;

    const filas = await this.prisma.preguntaDe60.findMany({
      select: {
        clave: true,
        tipo: true,
        dificultad: true,
        enunciado: true,
        explicacion: true,
        contexto: true,
        emblemas: true,
        fotoRef: true,
        opciones: { select: { texto: true, esCorrecta: true } },
      },
    });

    /* Una pregunta sin opciones, o con un número de correctas distinto de uno, no es jugable. */
    const jugables = filas
      .filter((f) => f.opciones.length >= 2 && f.opciones.filter((o) => o.esCorrecta).length === 1)
      .map((f) => ({ ...f, opciones: [...f.opciones] }));

    this.catalogo.set(LLAVE, jugables, TTL_CATALOGO_S);
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
 * Ordena para que dos preguntas parecidas no caigan pegadas.
 *
 * Dieciséis de las cincuenta son «¿quién ganó tal torneo?»: barajando a secas, tres seguidas de esa
 * forma son lo normal y la partida se siente como un formulario. Se arma de forma voraz —elegir la
 * siguiente que no choque con la recién puesta no puede romper lo ya ordenado— y se prefiere la que
 * menos estorbe, porque hacia el final puede no quedar ninguna limpia.
 */
function acomodar(preguntas: readonly Escena[]): Escena[] {
  const pendientes = [...preguntas];
  const puestas: Escena[] = [];

  while (pendientes.length > 0) {
    const anterior = puestas[puestas.length - 1];
    const i = anterior === undefined ? 0 : indiceQueMenosChoca(pendientes, anterior);
    puestas.push(...pendientes.splice(i, 1));
  }
  return puestas;
}

function indiceQueMenosChoca(pendientes: readonly Escena[], anterior: Escena): number {
  const estorbo = (p: Escena): number =>
    (p.contexto === anterior.contexto ? 2 : 0) + (p.tipo === anterior.tipo ? 1 : 0);

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
