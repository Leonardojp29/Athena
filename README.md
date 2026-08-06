# Athena

**Football Intelligence Platform** — transforma datos de fútbol en conocimiento.

Athena no muestra fútbol: lo explica. Cada pantalla responde una pregunta — ¿qué pasó?, ¿por qué?, ¿qué significa?, ¿qué sigo ahora?

## Stack

| Capa | Tecnología |
|---|---|
| Web | Astro 5 + React islands + Tailwind + shadcn/ui |
| API | NestJS (monolito modular, REST `/v1`) |
| DB / Auth | Supabase (PostgreSQL + pgvector) + Prisma |
| Jobs / Cache | Redis + BullMQ |
| IA | OpenAI (narrativas con evidencia + embeddings) |
| Datos | API-Football v3 (plan Mega) tras capa de adaptadores |

## Estructura

```
apps/
  web/        Frontend Astro
  api/        NestJS — dos entrypoints: main.api.ts (HTTP) y main.worker.ts (BullMQ)
packages/
  domain/     Modelo de dominio (sin frameworks)
  database/   Prisma schema + cliente
  tokens/     Design tokens (fuente única de verdad visual)
  ui/         Design system (shadcn/ui sobre tokens)
  config/     tsconfig / eslint compartidos
infra/        docker-compose (Redis; Postgres local opcional)
docs/         Arquitectura, ADRs y producto
```

## Desarrollo

Requisitos: Node ≥20, pnpm, Docker.

```bash
cp .env.example .env       # completar credenciales
docker compose -f infra/docker-compose.yml up -d
pnpm install
pnpm dev                   # web :4321 · api :3001 (docs OpenAPI en /docs)
```

Verificación completa: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Documentación

- [Plan y arquitectura](docs/architecture/) · [ADRs](docs/decisions/) · [Producto](docs/product/)
- Referencia del proveedor de datos: [docs/architecture/api-football-reference.md](docs/architecture/api-football-reference.md)

## Principios

1. El dominio es de Athena; los proveedores solo son fuentes de datos.
2. Nunca mostrar un dato sin contexto, nunca una narrativa de IA sin evidencia.
3. Monolito modular: separación lógica sí, microservicios no (por ahora).
4. Performance y accesibilidad son features del producto (Lighthouse ≥95).
