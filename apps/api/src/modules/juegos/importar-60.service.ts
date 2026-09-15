import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';
import { ExternalReferenceService } from '../sync/external-reference.service.js';
import { Auditar60Service, type Veredicto } from './auditar-60.service.js';
import {
  contextoDe,
  emblemaDelEquipo,
  logoDeCompetencia,
  type PreguntaDeclarada,
} from './preguntas-60.config.js';

/**
 * Los estados con los que una pregunta entra al catálogo.
 *
 * `sin-datos` y `sin-partido` entran marcados a mano y no bloqueados: el encargo dice que lo que
 * está fuera de la cobertura del proveedor se valida editorialmente. Lo único que bloquea de verdad
 * es `no-cuadra`, que es cuando el proveedor **contradice** al catálogo, y `sin-foto`.
 */
const ENTRAN = new Set(['ok', 'ok-a-mano', 'sin-datos', 'sin-partido']);
const A_MANO = new Set(['ok-a-mano', 'sin-datos', 'sin-partido']);

export interface ResultadoDeLaImportacion {
  guardadas: number;
  creados: number;
  bloqueadas: Array<{ clave: string; motivo: string }>;
}

@Injectable()
export class Importar60Service {
  private readonly logger = new Logger(Importar60Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditor: Auditar60Service,
    private readonly refs: ExternalReferenceService,
  ) {}

  async importar(claves: string[] = []): Promise<ResultadoDeLaImportacion> {
    const veredictos = await this.auditor.revisarTodas(claves);
    const bloqueadas: Array<{ clave: string; motivo: string }> = [];
    let guardadas = 0;
    let creados = 0;

    for (const v of veredictos) {
      if (!ENTRAN.has(v.estado)) {
        bloqueadas.push({ clave: v.pregunta.clave, motivo: v.nota ?? v.estado });
        this.logger.warn(`${v.pregunta.clave} bloqueada: ${v.nota ?? v.estado}`);
        continue;
      }
      const escrito = await this.guardar(v);
      if (escrito.guardado) {
        guardadas += 1;
        creados += escrito.creados;
      } else {
        bloqueadas.push({ clave: v.pregunta.clave, motivo: escrito.motivo ?? 'no se pudo armar' });
      }
    }

    return { guardadas, creados, bloqueadas };
  }

  private async guardar(
    v: Veredicto,
  ): Promise<{ guardado: boolean; creados: number; motivo?: string }> {
    const pregunta = v.pregunta;
    const correctas = pregunta.opciones.filter((o) => o === pregunta.correcta);
    if (correctas.length !== 1) {
      return { guardado: false, creados: 0, motivo: `${correctas.length} opciones correctas` };
    }

    /*
     * La foto sale del futbolista y no de la pregunta, así que la ficha tiene que existir. La
     * auditoría ya lo comprobó —marca `sin-foto` si no está—, acá solo se ata el id.
     */
    let playerId: string | null = null;
    if (v.fotoRef) {
      const resueltos = await this.refs.resolveMany('api-football', 'player', [v.fotoRef]);
      playerId = resueltos.get(v.fotoRef) ?? null;
      if (!playerId) return { guardado: false, creados: 0, motivo: 'el futbolista de la foto no está en Athena' };
    }
    const creados = 0;

    await this.prisma.$transaction(async (tx) => {
      const fila = {
        tipo: pregunta.tipo,
        dificultad: pregunta.dificultad,
        enunciado: pregunta.enunciado,
        explicacion: pregunta.explicacion,
        contexto: contextoDe(pregunta),
        validadoAMano: A_MANO.has(v.estado),
        playerId,
        fotoRef: v.fotoRef,
        emblemas: emblemasDe(pregunta),
      };
      const guardada = await tx.preguntaDe60.upsert({
        where: { clave: pregunta.clave },
        create: { clave: pregunta.clave, ...fila },
        update: fila,
        select: { id: true },
      });
      await tx.opcionDe60.deleteMany({ where: { preguntaId: guardada.id } });
      await tx.opcionDe60.createMany({
        data: pregunta.opciones.map((texto, i) => ({
          preguntaId: guardada.id,
          texto,
          esCorrecta: texto === pregunta.correcta,
          /* Nulo para las cuatro cuando una sola falla: la auditoría ya lo decidió. */
          imagen: v.imagenes?.[i] ?? null,
        })),
      });
    });

    return { guardado: true, creados };
  }
}

/**
 * Los emblemas que acompañan al enunciado, en el orden en que se leen.
 *
 * De acá sale la variedad visual del juego: con la misma pregunta de cuatro botones, «¿quién ganó
 * la Champions 2019?» muestra el logo del torneo y «Barcelona vs Bayern» los dos escudos.
 */
function emblemasDe(pregunta: PreguntaDeclarada): string[] {
  const equipos = (pregunta.equiposRef ?? []).map(emblemaDelEquipo);
  /* El logo de la competencia solo cuando no hay escudos: dos filas de imágenes son ruido. */
  if (equipos.length > 0) return equipos;
  return pregunta.competenciaRef ? [logoDeCompetencia(pregunta.competenciaRef)] : [];
}
