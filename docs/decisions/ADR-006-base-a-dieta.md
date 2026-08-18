# ADR-006 — La base a dieta: sin payloads crudos, vectores a media precisión, sin login

**Estado**: Aceptada · **Fecha**: 2026-08-18

## Problema

La base marcó 1.134 MB con el archivo a medio cargar (el free tier de Supabase admite 500 MB y su
gracia se otorga una sola vez: después, solo-lectura). Medido con `pg_column_size` sobre la base
real: 368 MB eran columnas `raw` —el payload del proveedor guardado entero junto a las ~30 columnas
tipadas que ya lo representan— y 159 MB eran embeddings float32 con un índice HNSW que 8.700 filas
no ameritan. Ningún código leía nada de eso: doce agentes de auditoría, con verificación adversarial
por hallazgo, no encontraron un solo lector.

## Decisión

- **Sin payloads crudos.** `match_player_statistics.raw`, `player_season_statistics.raw` y
  `match_statistics.raw` se eliminan y dejan de escribirse. Si el producto algún día tipa una
  métrica nueva, se re-pide al proveedor con los backfills que ya existen: re-pedir es más barato
  que almacenar por si acaso. `match_events.detail` **se queda**: es canónico y lo leen el minuto a
  minuto, las vistas y los insights.
- **Vectores `halfvec(1536)` y sin índice ANN.** El cast conserva los datos (float16 no mueve un
  coseno sobre embeddings normalizados). Con ~9k filas, el scan exacto es recall 100% y las rutas
  que lo usan cachean (120 s el buscador, 24 h los vecinos); un HNSW con `halfvec_cosine_ops`
  vuelve a valer la pena hacia las ~50k filas.
- **Sin login.** Decisión de producto: la web es anónima por ahora. Se eliminan Supabase Auth, el
  módulo `/me`, las tablas `user_profiles`/`favorites` (y con ellas la FK a `auth.users` y las
  políticas `auth.uid()`, las últimas ataduras del esquema a Supabase). Los favoritos ya eran
  localStorage-first y siguen intactos. Bonus medido: el layout hacía dos llamadas a Supabase Auth
  por render de cada página.
- **Supabase Pro ($25/mes, spend cap encendido)** como piso de plataforma: el archivo completo
  2021+ suma ~+400 MB aún a dieta y crece ~280 MB por temporada — no cabe en 500 MB. Alternativas
  medidas y descartadas: Neon y Railway cuestan lo mismo o más para una app que late cada minuto y
  pierden pg_cron; un VPS a $5 queda como puerta abierta (el proyecto es portable: la única atadura
  restante es pg_cron, y es infra, no código).

## Resultado

1.134 MB → **496 MB** tras migración + `VACUUM FULL`, con cero funcionalidad perdida. Las filas de
notas por jugador pasaron de ~1.218 a ~430 bytes: el mismo archivo, a un tercio del costo de
almacenarlo.

## Trade-offs

- (+) El crecimiento por temporada baja a la mitad; los backups de Pro pesan y cuestan menos.
- (+) Esquema portable a cualquier Postgres (la salida barata del VPS queda siempre abierta).
- (−) Una métrica nueva del proveedor exige re-sincronizar en vez de re-mapear lo guardado.
- (−) La búsqueda semántica paga ~decenas de ms extra por scan exacto — invisible detrás del caché.
