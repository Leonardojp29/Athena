import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

export interface PendingDomainEvent {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
}

/**
 * Outbox: los casos de uso solo escriben domain_events; convertir esos eventos en
 * trabajo derivado es responsabilidad de este poller. Así el sync no conoce a la IA
 * y un crash a mitad de camino no pierde derivaciones.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async pending(limit = 50): Promise<PendingDomainEvent[]> {
    return this.prisma.domainEvent.findMany({
      where: { processedAt: null },
      orderBy: { occurredAt: 'asc' },
      take: limit,
      select: { id: true, kind: true, subjectType: true, subjectId: true },
    });
  }

  async markProcessed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.domainEvent.updateMany({
      where: { id: { in: ids } },
      data: { processedAt: new Date() },
    });
    this.logger.log(`${ids.length} eventos de dominio procesados`);
  }
}
