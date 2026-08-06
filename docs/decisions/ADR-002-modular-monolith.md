# ADR-002 — Monolito modular con dos entrypoints

**Estado**: Aceptada · **Fecha**: 2026-08-06

## Problema

La plataforma necesita servir HTTP y procesar jobs pesados (sync, IA, estadística) sin que uno afecte al otro, con un solo desarrollador manteniendo el sistema.

## Opciones consideradas

1. Microservicios desde el inicio (prohibido por el master prompt, y con razón: overhead operativo sin justificación).
2. Un solo proceso que hace HTTP y jobs (los jobs pesados degradan la latencia HTTP).
3. **Un solo proyecto NestJS con dos entrypoints**: `main.api.ts` (HTTP) y `main.worker.ts` (consumers BullMQ), desplegados como procesos separados del mismo artefacto.

## Decisión

Opción 3. Módulos NestJS compartidos, deploy como dos procesos. Nunca ejecutar operaciones pesadas dentro de un request HTTP: todo trabajo pesado va a colas.

## Trade-offs

- (+) Un codebase, un pipeline, refactors atómicos; aislamiento de carga real.
- (+) La extracción futura a servicios sigue los bordes de módulo ya definidos.
- (−) Disciplina requerida para que los módulos no se acoplen entre sí (revisión + domain events como mecanismo de comunicación).
