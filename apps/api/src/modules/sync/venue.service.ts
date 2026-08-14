import { Inject, Injectable } from '@nestjs/common';
import type { FootballDataProvider, ProviderRef, ProviderVenue } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

/**
 * Los estadios ya venían dentro de /teams y /fixtures y se tiraban a la basura. Resolverlos
 * no cuesta un solo request: solo hacía falta guardarlos.
 */
@Injectable()
export class VenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async resolveMany(
    venues: Array<ProviderRef<ProviderVenue> | null>,
  ): Promise<Map<string, string>> {
    const unicos = [
      ...new Map(
        venues.filter((v): v is ProviderRef<ProviderVenue> => v !== null).map((v) => [v.providerRef, v]),
      ).values(),
    ];
    if (unicos.length === 0) return new Map();

    const ids = await this.refs.resolveMany(
      this.provider.name,
      'venue',
      unicos.map((v) => v.providerRef),
    );

    // el poller en vivo pasa por acá cada minuto: solo se escribe lo que de verdad cambió
    const actuales = new Map(
      (
        await this.prisma.venue.findMany({
          where: { id: { in: [...ids.values()] } },
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            capacity: true,
            imageUrl: true,
            surface: true,
            address: true,
          },
        })
      ).map((v) => [v.id, v]),
    );

    for (const venue of unicos) {
      const id = ids.get(venue.providerRef);
      if (id) {
        const actual = actuales.get(id);
        /*
         * Nada se escribe con un nulo encima de un dato bueno. El feed de partidos manda el estadio
         * pelado —id, nombre y ciudad— y el de equipos manda todo; sin esta guarda, cada partido
         * borraba la capacidad, la foto y la superficie que había traído el catálogo. La ciudad
         * entra en la misma regla por lo mismo.
         */
        const nuevos = {
          ...(venue.data.city !== null ? { city: venue.data.city } : {}),
          ...(venue.data.country !== null ? { country: venue.data.country } : {}),
          ...(venue.data.capacity !== null ? { capacity: venue.data.capacity } : {}),
          ...(venue.data.imageUrl !== null ? { imageUrl: venue.data.imageUrl } : {}),
          ...(venue.data.surface !== null ? { surface: venue.data.surface } : {}),
          ...(venue.data.address !== null ? { address: venue.data.address } : {}),
        };
        const cambio =
          !actual ||
          actual.name !== venue.data.name ||
          Object.entries(nuevos).some(([campo, valor]) => actual[campo as keyof typeof nuevos] !== valor);
        if (cambio) {
          await this.prisma.venue.update({
            where: { id },
            data: { name: venue.data.name, ...nuevos },
          });
        }
        continue;
      }

      const creado = await this.prisma.$transaction(async (tx) => {
        const row = await tx.venue.create({
          data: {
            name: venue.data.name,
            city: venue.data.city,
            country: venue.data.country,
            capacity: venue.data.capacity,
            imageUrl: venue.data.imageUrl,
            surface: venue.data.surface,
            address: venue.data.address,
          },
          select: { id: true },
        });
        await tx.externalReference.create({
          data: {
            provider: this.provider.name,
            entityType: 'venue',
            providerRef: venue.providerRef,
            entityId: row.id,
          },
        });
        return row.id;
      });
      ids.set(venue.providerRef, creado);
    }

    return ids;
  }
}
