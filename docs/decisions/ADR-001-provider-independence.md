# ADR-001 — Independencia del proveedor de datos

**Estado**: Aceptada · **Fecha**: 2026-08-06

## Problema

Athena consume datos de API-Football, pero el master prompt exige poder reemplazarlo (SportMonks, Opta, Stats Perform, scouting propio) sin reescribir el dominio.

## Opciones consideradas

1. Consumir API-Football directamente desde frontend/backend (rápido, acoplamiento total).
2. Espejar las tablas del proveedor en Postgres (`api_players`...) y construir encima (acoplamiento al esquema ajeno).
3. **Puertos y adaptadores**: interfaz `FootballDataProvider` en el dominio, adaptador por proveedor, tabla `external_references` que mapea UUIDs propios ↔ ids del proveedor.

## Decisión

Opción 3. El dominio define el modelo (`Player`, `Team`, `Match`...); el adaptador traduce en la frontera y es el único módulo que conoce URLs, formatos y rarezas del proveedor. Los ids del proveedor existen solo en `external_references` (son estables: la documentación garantiza que nunca cambian).

## Trade-offs

- (+) Cambiar de proveedor = nuevo adaptador + poblar mapeos. Nada más se toca.
- (+) Permite múltiples proveedores simultáneos a futuro.
- (−) Capa extra de traducción y mantenimiento de mapeos. Aceptado: es el costo del requisito central.

## Cumplimiento

Regla `no-restricted-imports` en el ESLint compartido (dependency-cruiser en Fase 1): ningún tipo `ApiFootball*` puede importarse fuera de `providers/api-football/`.
