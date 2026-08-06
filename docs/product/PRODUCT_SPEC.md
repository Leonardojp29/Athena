# Athena — Especificación de Producto (PRODUCT_SPEC)

> Entregable de Fase 0. Define QUÉ se construye antes de construir ninguna página.
> Complementa a `DESIGN_SYSTEM.md` (cómo se ve y se comporta) y al plan técnico aprobado (cómo se implementa).
> Idioma del producto: **solo español**. Producto abierto, sin monetización.

---

## 1. Tesis de producto

Athena no compite en cobertura de datos (Sofascore/Flashscore ya ganaron esa carrera). Compite en **comprensión**. Cada pantalla, cada widget y cada estadística debe responder al menos una de estas cuatro preguntas:

| Pregunta | Ejemplo |
|---|---|
| **¿Qué pasó?** | Barcelona venció 3-1 al Real Madrid. |
| **¿Por qué pasó?** | Subió la intensidad de presión tras el minuto 55: 12 recuperaciones en campo rival. |
| **¿Qué significa?** | El resultado consolida su ventaja en la lucha por el título. |
| **¿Qué sigo ahora?** | Este mediocampista joven es uno de los talentos emergentes a seguir. |

**Regla de oro**: nunca se muestra un dato sin contexto, y nunca se muestra una narrativa de IA sin su **evidencia y procedencia** (datos de respaldo, modelo, fecha de generación). La unidad de valor es el *insight con contexto*, no la estadística.

**Alcance de cobertura (~12 competencias, configurable por datos):** Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, UEFA Europa League, Copa Libertadores, Copa Sudamericana, Liga 1 Perú, Brasileirão, Liga Profesional Argentina.

---

## 2. Personas

### P1 — "El hincha analítico" (persona primaria)
- **Quién**: 22–40 años, sigue a su equipo (a menudo sudamericano + un club europeo) y ve 2–5 partidos por semana. Usa Sofascore/FotMob hoy, pero le frustra tener números sin explicación.
- **Necesita**: seguir partidos en vivo, entender *por qué* su equipo ganó/perdió, contexto de la tabla, y descubrir qué significa cada resultado.
- **Dispositivo**: móvil primero (durante el partido), desktop para leer análisis después.
- **Momento clave**: los 20 minutos posteriores al pitazo final ("¿qué acaba de pasar?").

### P2 — "La curiosa del dato" (persona secundaria)
- **Quién**: 18–35 años, consume fútbol vía redes y debates. Llega desde Google buscando "estadísticas de Lautaro Martínez esta temporada" o "historial Alianza vs Universitario".
- **Necesita**: respuestas rápidas y confiables, perfiles de jugador/equipo legibles, comparaciones, y poder citar la fuente.
- **Dispositivo**: móvil casi exclusivamente; sesiones cortas de entrada orgánica (SEO es la puerta principal).
- **Momento clave**: encontrar la respuesta en la primera pantalla sin registrarse.

### P3 — "El analista amateur" (persona de crecimiento)
- **Quién**: creador de contenido, periodista independiente o jugador de fantasy/scouting amateur. Compara jugadores, sigue tendencias entre ligas (incluida Sudamérica, mal cubierta por productos globales).
- **Necesita**: comparaciones profundas, evolución por temporada, jugadores similares, búsqueda potente (incluida búsqueda en lenguaje natural en Fase 4).
- **Dispositivo**: desktop; sesiones largas.
- **Momento clave**: encontrar en Athena un ángulo que otros productos no dan.

---

## 3. Journeys clave

### J1 — Seguir un partido en vivo (P1 · Fase 3)
1. Entra a la Home durante la jornada → ve el bloque "En vivo" con marcadores actualizados.
2. Toca su partido → Match Center: marcador, timeline de eventos, alineaciones, stats en vivo.
3. Gol → el timeline se actualiza (polling 15–20 s); la jerarquía visual destaca el evento.
4. Final del partido → el Match Center transiciona a estado "Finalizado" y (Fase 4) aparece el análisis post-partido con evidencia.
- **Éxito**: el usuario no vuelve a Sofascore durante el partido.

### J2 — Entender un partido ya jugado (P1/P2 · Fase 2, IA en Fase 4)
1. Llega desde Google ("resultado barcelona real madrid") o desde la Home.
2. Página de partido finalizado: marcador, goleadores, timeline, stats comparadas, alineaciones.
3. (Fase 4) Lee el análisis IA "¿Por qué ganó X?" con su evidencia desplegable.
4. CTAs de continuación: perfil de los equipos, tabla de la competencia, próximo partido.
- **Éxito**: sesión que continúa hacia equipo/competencia en vez de terminar en el marcador.

### J3 — Conocer a un jugador (P2/P3 · Fase 2, comparación/similares en Fase 4)
1. Busca al jugador (buscador global o Google).
2. Perfil: identidad, equipo actual, stats de la temporada por competencia, trayectoria.
3. (Fase 4) Insight de rendimiento ("subió su contribución de gol 40% vs. temporada pasada") + "jugadores similares" vía embeddings.
4. CTA: ver su equipo, ver su próximo partido, comparar.
- **Éxito**: la persona entiende el *estado de forma* del jugador, no solo sus números.

### J4 — Seguir mi competencia (P1 · Fase 2)
1. Navega a la competencia (menú o Home).
2. Ve tabla de posiciones, jornada actual/próxima, goleadores y asistidores.
3. Cruza a un partido de la jornada o al perfil de un equipo.
- **Éxito**: la página de competencia es la "home" de facto de su liga.

### J5 — Buscar y descubrir (P2/P3 · Fase 2 básica, Fase 4 semántica)
1. Usa el buscador global (siempre visible en el header, atajo `/`).
2. v1 (Fase 2): resultados por texto — jugadores, equipos, competencias, partidos (Postgres FTS + trigram).
3. v2 (Fase 4): búsqueda híbrida y en lenguaje natural ("mejores jóvenes mediocampistas de Sudamérica").
- **Éxito**: <2 s a un resultado relevante; cero resultados es un estado diseñado, no un callejón.

### J6 — Hacer de Athena "mi" plataforma (P1 · Fase 5)
1. Se registra (email o Google vía Supabase Auth) tras un prompt contextual no intrusivo (p. ej. "Sigue a este equipo").
2. Onboarding: elige equipos, jugadores y competencias favoritas.
3. Home personalizada: sus partidos primero, insights de sus favoritos, feed relevante.
- **Éxito**: retorno diario; la Home anónima y la personalizada comparten estructura (la personalización reordena, no rediseña).

---

## 4. Arquitectura de navegación (site map)

```
/                                Home
/partidos                        Listado de partidos por fecha (hoy por defecto)
/partidos/:slug-:id              Match Center (previa | en vivo | finalizado — una sola URL)
/competiciones                   Índice de competencias cubiertas
/competiciones/:slug-:id         Página de competencia (tabs: tabla, partidos, estadísticas)
/equipos/:slug-:id               Perfil de equipo (tabs: resumen, plantilla, partidos, estadísticas)
/jugadores/:slug-:id             Perfil de jugador (tabs: resumen, estadísticas, trayectoria)
/buscar?q=...                    Resultados de búsqueda
/cuenta                          (Fase 5) Preferencias, favoritos, sesión
```

**Navegación global (header, persistente):**
- Logo Athena → Home.
- Enlaces primarios: **Partidos · Competiciones · Buscar**.
- Selector de tema claro/oscuro.
- (Fase 5) Avatar/entrar.
- En móvil: buscador y navegación colapsan en patrón estándar; el acceso a "Partidos de hoy" nunca queda a más de un toque.

**Reglas de rutas y URLs:**
- Slugs propios en español + ID corto estable (`/jugadores/lionel-messi-8231`): el slug puede cambiar, el ID es canónico → redirección 301 si el slug cambia.
- Una sola URL por partido durante todo su ciclo de vida (previa → vivo → finalizado): concentra señales SEO y enlaces compartidos.
- Breadcrumbs en todas las páginas de entidad: `Inicio › Competición › Equipo › Jugador`.

---

## 5. Páginas del MVP: propósito, widgets, jerarquía y CTAs

Convenciones para todos los widgets:
- **Estados obligatorios**: `loading` (skeleton con la silueta real del contenido), `empty` (mensaje útil en español + acción sugerida), `error` (mensaje humano + reintentar; nunca stacktraces). Un widget que falla nunca rompe la página: se degrada de forma aislada.
- **Datos**: todo widget se alimenta de la vista compuesta de su página (`/v1/views/...`, un solo round-trip). El frontend jamás llama a API-Football.
- **IA**: todo widget de insight muestra chip "Análisis Athena" + evidencia desplegable + fecha de generación. Sin evidencia, no se publica.

### 5.1 Home (`/`)

**Propósito**: el pulso del fútbol hoy, con comprensión. No es un portal de noticias.

| # | Widget | Pregunta que responde | Datos | Fase |
|---|---|---|---|---|
| 1 | Partidos de hoy / en vivo | ¿Qué está pasando ahora? | fixtures del día (estado, marcador, minuto), agrupados por competencia | 2 (estático) / 3 (vivo) |
| 2 | Destacado del día | ¿Qué es lo más importante hoy? | partido priorizado (regla por liga/relevancia) + su previa/análisis | 2 / 4 (narrativa) |
| 3 | Resultados recientes | ¿Qué pasó ayer/esta semana? | últimos fixtures finalizados por competencia | 2 |
| 4 | Tablas en un vistazo | ¿Cómo van las ligas? | top 4–6 de standings por competencia seguida | 2 |
| 5 | Insights recientes | ¿Qué significa lo que pasó? | últimos `insights` publicados con evidencia | 4 |
| 6 | Mis favoritos (usuarios logueados) | ¿Qué hay de lo mío? | favoritos del usuario + sus próximos partidos | 5 |

- **Jerarquía**: (1) en vivo/hoy — lo más perecedero arriba; (2) destacado; (3) resultados; (4) tablas; (5) insights. Con sesión (Fase 5), "Mis favoritos" sube al tope y reordena el resto — misma estructura, distinto orden.
- **Estados**: día sin partidos en las competencias cubiertas → empty state que muestra los próximos partidos ("Hoy no hay fútbol en tus competencias; el sábado vuelve la Premier").
- **CTAs**: entrar a un Match Center; ver competencia completa; (Fase 5) "Elige tus equipos".

### 5.2 Match Center (`/partidos/:slug-:id`)

**Propósito**: la experiencia premium de partido. Una URL, tres modos según el estado del fixture.

**Modo previa** (antes del kickoff):
| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Cabecera de partido | ¿Quién juega, cuándo, dónde, por qué importa? | equipos, kickoff (hora local del usuario), competencia, jornada, estadio | 2 |
| Forma reciente | ¿Cómo llegan? | últimos 5 resultados por equipo (W/D/L) | 2 |
| Historial directo | ¿Qué dice el historial? | head-to-head de partidos previos en dominio propio | 2 |
| Contexto de tabla | ¿Qué se juega cada uno? | posición y puntos en standings | 2 |
| Alineaciones probables/confirmadas | ¿Quiénes juegan? | lineups (aparecen ~20–40 min antes) | 3 |
| Previa IA | ¿Qué hay que mirar? | narrativa desde fact sheet + evidencia | 4 |

**Modo en vivo** (isla React, polling 15–20 s):
| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Marcador vivo | ¿Cómo va? | marcador, minuto, estado | 3 |
| Timeline de eventos | ¿Qué está pasando? | match_events (goles, tarjetas, cambios) con minuto y actores | 3 |
| Stats en vivo | ¿Quién domina? | match_statistics comparadas (posesión, tiros, etc.) — solo partidos priorizados (cadencia 1/min) | 3 |
| Alineaciones | ¿Quién está en cancha? | lineups + sustituciones aplicadas | 3 |

**Modo finalizado**:
| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Resultado y goleadores | ¿Qué pasó? | marcador final, autores de goles | 2 |
| Timeline completo | ¿Cómo se desarrolló? | match_events ordenados | 2 |
| Stats comparadas | ¿Los números respaldan el resultado? | match_statistics ambos equipos (con mitades cuando existan) | 2 |
| Alineaciones y actuaciones | ¿Quién jugó y cómo? | lineups + stats por jugador | 2 |
| Análisis post-partido IA | ¿Por qué pasó y qué significa? | narrativa + evidencia (fact sheet) | 4 |

- **Jerarquía**: marcador siempre primero (es la respuesta a "¿qué pasó?"); luego el cómo (timeline), luego el porqué (stats/análisis), luego el detalle (alineaciones).
- **Estados especiales**: TBD/postergado/cancelado son estados diseñados con mensaje claro; si las stats en vivo no están priorizadas para ese partido, el widget lo dice ("Estadísticas detalladas al finalizar") en lugar de mostrarse vacío.
- **CTAs**: perfiles de ambos equipos; tabla de la competencia; próximo partido de cada equipo; compartir.

### 5.3 Perfil de jugador (`/jugadores/:slug-:id`)

**Propósito**: entender quién es y en qué estado de forma está — no una tabla de números.

| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Cabecera de identidad | ¿Quién es? | nombre, foto, posición, edad, nacionalidad, equipo actual, dorsal | 2 |
| Stats de temporada | ¿Cómo viene esta temporada? | player_season_statistics por (competencia, equipo) — una tarjeta por entrada; transferido = varias | 2 |
| Trayectoria | ¿De dónde viene? | entity_relationships `played_for` + domain_events (transferencias) como timeline | 2 |
| Próximo partido | ¿Cuándo lo veo jugar? | próximo fixture de su equipo | 2 |
| Evolución por temporada | ¿Mejora o empeora? | serie histórica de player_season_statistics | 2 |
| Insight de rendimiento | ¿Qué significa su momento? | narrativa IA + evidencia | 4 |
| Jugadores similares | ¿A quién más debería mirar? | pgvector similar_to + justificación | 4 |

- **Jerarquía**: identidad → temporada actual → evolución/trayectoria → inteligencia (insights, similares).
- **Estados**: jugador sin minutos en la temporada → empty con contexto ("Sin participación esta temporada" + motivo si consta: lesión vía domain_events); lesionado → badge visible en cabecera.
- **CTAs**: ver equipo; ver próximo partido; (Fase 4) comparar/similares; (Fase 5) seguir jugador.

### 5.4 Perfil de equipo (`/equipos/:slug-:id`)

**Propósito**: el estado del club: cómo viene, quién lo compone, qué le viene.

| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Cabecera de club | ¿Quién es? | nombre, escudo, competencia(s), estadio, DT actual | 2 |
| Forma y posición | ¿Cómo viene? | últimos 5 resultados + posición en tabla con Δ | 2 |
| Próximos partidos | ¿Qué le viene? | siguientes fixtures (todas sus competencias) | 2 |
| Últimos resultados | ¿Qué hizo? | fixtures finalizados recientes | 2 |
| Plantilla | ¿Quiénes la componen? | squad por posición, con stats básicas de temporada | 2 |
| Stats de temporada | ¿Cuáles son sus patrones? | team_season_statistics (goles a favor/contra, local/visita…) | 2 |
| Análisis de tendencia | ¿Por qué está donde está? | narrativa IA + evidencia | 4 |

- **Jerarquía**: identidad → forma/posición (lo que el hincha pregunta primero) → calendario → plantilla → stats profundas → análisis.
- **Estados**: equipo eliminado de una copa → esa competencia se muestra con estado final, no desaparece.
- **CTAs**: próximo Match Center; competencia; jugadores destacados de la plantilla; (Fase 5) seguir equipo.

### 5.5 Página de competencia (`/competiciones/:slug-:id`)

**Propósito**: la home de cada liga/copa: tabla, jornada y protagonistas.

| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Cabecera | ¿Qué competencia y temporada veo? | nombre, logo, temporada activa (con selector histórico) | 2 |
| Tabla de posiciones | ¿Cómo va la liga? | standings (soporta grupos y apertura/clausura como tablas múltiples) con zonas (título/copas/descenso) explicadas | 2 |
| Jornada | ¿Qué se juega / se jugó? | fixtures de la jornada actual y navegación entre jornadas | 2 |
| Goleadores y asistidores | ¿Quiénes son los protagonistas? | topscorers / topassists | 2 |
| Evolución de la tabla | ¿Cómo cambió la pelea? | snapshots históricos de standings | 2 |
| Análisis de la jornada | ¿Qué significó la fecha? | narrativa IA + evidencia | 4 |

- **Jerarquía**: tabla primero en ligas; en copas (UCL, Libertadores) la fase/llave actual primero. La estructura del widget de standings se adapta al formato (dato, no código).
- **Estados**: pretemporada/receso → empty con fecha de reinicio y última tabla final.
- **CTAs**: Match Center de la jornada; perfiles de equipos; perfil de goleadores; (Fase 5) seguir competencia.

### 5.6 Búsqueda (`/buscar` + overlay global)

**Propósito**: puerta de entrada universal. Overlay rápido (atajo `/`) + página completa de resultados.

| Widget | Pregunta | Datos | Fase |
|---|---|---|---|
| Resultados agrupados | ¿Dónde está lo que busco? | FTS español + trigram sobre jugadores, equipos, competencias, partidos; agrupados por tipo | 2 |
| Sugerencias en vacío | ¿Qué puedo explorar? | entidades populares/recientes | 2 |
| Búsqueda semántica / NL | ¿Puedo preguntar como hablo? | híbrido FTS + pgvector (RRF), NL→filtros con OpenAI | 4 |

- **Estados**: sin resultados → sugerencias por similitud (trigram tolera typos: "Mbape" → Mbappé) + tipos de búsqueda de ejemplo; error → campo sigue operable con reintento.
- **CTAs**: navegar a la entidad; en Fase 4, refinar la consulta natural.

### 5.7 Listado de partidos (`/partidos`)

**Propósito**: agenda del fútbol por día — el índice del Match Center.

- **Widgets**: selector de fecha (hoy por defecto) · lista agrupada por competencia (orden: en vivo → por jugar → finalizados) · filtro por competencia. Fase 2; los estados en vivo se activan en Fase 3.
- **Estados**: día vacío → enlace al próximo día con partidos.
- **CTA**: entrar a cada Match Center.

---

## 6. SEO por tipo de página

Principios globales: SSR con contenido completo en el HTML inicial; metadata y OpenGraph en español; canonical por ID (los cambios de slug redirigen 301); sitemap segmentado por tipo de entidad (partidos recientes con mayor frecuencia de actualización); Lighthouse ≥ 95; imágenes desde CDN propio (módulo `media`), nunca hotlink al proveedor.

| Página | Title pattern | JSON-LD | Notas |
|---|---|---|---|
| Home | `Athena — El fútbol, explicado` | `WebSite` + `SearchAction` | Habilita sitelinks search box |
| Partido | `{Local} {gl}-{gv} {Visita} — {Competencia} {fecha} \| Athena` (previa: `{Local} vs {Visita} — previa, hora y canal`) | `SportsEvent` (con `eventStatus`) | Una URL para todo el ciclo de vida; el title muta con el estado |
| Jugador | `{Nombre} — estadísticas, equipo y trayectoria \| Athena` | `Person` (athlete) | Descripción con equipo y stats clave de temporada |
| Equipo | `{Equipo} — plantilla, partidos y estadísticas \| Athena` | `SportsTeam` | |
| Competencia | `{Competencia} {temporada}: tabla de posiciones y partidos \| Athena` | `SportsOrganization` + `ItemList` (tabla) | Candidata a rich results de standings |
| Búsqueda | `noindex` | — | Nunca se indexan resultados |

Las narrativas IA (Fase 4) son contenido único e indexable — diferenciador SEO real frente a las páginas plantilla de la competencia. Siempre server-rendered y siempre con la evidencia en el DOM.

---

## 7. Mapa de fases

| Fase | Qué habilita en producto | Páginas/widgets |
|---|---|---|
| **Fase 2 — Producto de lectura** | Todo lo navegable sin vivo, sin IA, sin login | Home (partidos del día estáticos, resultados, tablas), Match Center modo previa/finalizado, perfiles de jugador y equipo, competencia, búsqueda v1, /partidos, SEO completo |
| **Fase 3 — Match Center en vivo** | El vivo como isla React (TanStack Query, polling) | Marcador vivo, timeline en vivo, stats en vivo (partidos priorizados), alineaciones; bloque "En vivo" en Home y /partidos |
| **Fase 4 — Inteligencia** | Insights con evidencia + búsqueda semántica | Previa y análisis post-partido IA, insight de jugador/equipo, análisis de jornada, jugadores similares, búsqueda NL, widget de insights en Home |
| **Fase 5 — Personalización** | Cuentas y favoritos (Supabase Auth) | Onboarding, favoritos, Home personalizada, /cuenta, CTAs "seguir" en todas las entidades |

Reglas transversales:
- Cada widget de fase futura tiene reservado su lugar en la jerarquía desde Fase 2, pero **no se renderiza vacío**: simplemente no existe hasta su fase (controlado por feature flags: `live_match_center`, `ai_insights`, `semantic_search`, `recommendations`).
- Nada del MVP requiere login. La autenticación solo agrega (favoritos, orden personalizado), nunca bloquea contenido.
- Analítica de producto (PostHog) desde Fase 2 con la taxonomía tipada del plan: `match_viewed`, `player_viewed`, `team_viewed`, `search_performed`, `insight_read`, `ai_feature_used`, `favorite_added`.

---

## 8. Fuera de alcance del MVP (explícito)

Noticias/editorial, comentarios/social, notificaciones push, apps móviles nativas, odds/apuestas como feature de producto, predicciones propias, heatmaps tácticos con datos de tracking (el proveedor no los da), multi-idioma, monetización. Cada uno tiene camino de evolución en el plan técnico; ninguno condiciona el diseño del MVP.
