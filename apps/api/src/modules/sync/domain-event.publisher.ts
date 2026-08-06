import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@athena/database';
import { PrismaService } from '../../shared/prisma.service.js';

@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(
    kind: string,
    subjectType: string,
    subjectId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.domainEvent.create({
      data: { kind, subjectType, subjectId, occurredAt: new Date(), payload },
    });
    this.logger.log(`${kind} → ${subjectType}:${subjectId}`);
  }
}
