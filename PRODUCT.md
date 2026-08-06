# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primario: **el hincha analítico** — 22 a 40 años, sigue a su club (típicamente uno sudamericano y
uno europeo), ve entre dos y cinco partidos por semana. Hoy usa Sofascore o FotMob y le frustra
recibir números sin explicación. Su momento clave son los veinte minutos posteriores al pitazo
final: "¿qué acaba de pasar?".

Secundario: **quien llega buscando un dato puntual** desde un buscador o una discusión ("estadísticas
de X esta temporada", "historial A vs B") y necesita la respuesta en la primera pantalla, sin
registrarse.

Terciario, de crecimiento: **el analista amateur** — creador de contenido o periodista independiente
que compara jugadores y sigue tendencias entre ligas, incluida Sudamérica, mal cubierta por los
productos globales.

Escena de uso confirmada: **móvil y escritorio pesan por igual**. Móvil durante el partido en vivo,
escritorio para leer análisis y comparar. Ninguna de las dos es la adaptación de la otra.

## Product Purpose

Athena convierte datos de fútbol en conocimiento. No compite en cobertura de datos —Sofascore y
Flashscore ya ganaron eso— sino en comprensión: cada pantalla responde al menos una de cuatro
preguntas: qué pasó, por qué pasó, qué significa y qué seguir ahora.

Éxito: que el usuario entienda un partido, no solo que consulte su resultado.

## Positioning

La unidad de valor es el **insight con evidencia y procedencia**, no la estadística. Toda narrativa
generada se construye desde un *fact sheet* determinístico armado en la base, se valida cifra por
cifra contra esa evidencia antes de publicarse, y se muestra junto a los datos que la respaldan, el
modelo que la produjo y la versión del prompt. Una narrativa que cita un número inexistente se
descarta en lugar de publicarse.

Consecuencia deliberada: si un partido no tiene material suficiente, Athena **no publica** una previa
de relleno. En una prueba real, de diez partidos próximos se omitieron siete.

## Operating Context

- Cobertura de doce competencias: top-5 de Europa, Champions, Europa League, Libertadores,
  Sudamericana, Liga 1 de Perú, Brasileirão y Liga Profesional Argentina.
- Producto en un solo idioma: **español neutro latinoamericano** (decisión confirmada; los análisis ya
  generados están en registro rioplatense y hay que rehacerlos).
- Zona horaria de presentación: América/Lima. Los datos se almacenan en UTC.
- Los partidos en vivo son un momento de uso real: el estado se refresca mientras se juega.
- Entrada orgánica desde buscadores es un canal existente y funcionando, no el objetivo principal.

## Capabilities and Constraints

**Funciona hoy:** competencias con tabla y calendario, perfiles de equipo y jugador, centro de
partido con marcador, eventos, estadísticas y alineaciones, análisis post-partido y previas con IA,
búsqueda híbrida por nombre y semántica, sesión con favoritos y un inicio personalizado.

**Restricciones técnicas confirmadas:**
- Monorepo Astro 5 SSR + NestJS + PostgreSQL (Supabase) + Redis. El dominio es de Athena; los
  proveedores de datos son reemplazables y una regla de build lo verifica.
- La cuenta del proveedor de datos es **compartida con otros sistemas**, así que el presupuesto de
  peticiones se calcula con la cuota real que devuelven las cabeceras, nunca con el límite del plan.
- El gasto de IA tiene tope propio diario; al alcanzarlo los trabajos fallan a propósito.
- Las páginas de entidad envían **0 KB de JavaScript** hoy y eso es un logro a preservar: React solo
  se hidrata en partidos en vivo.
- Catorce comportamientos están protegidos por tests end-to-end que deben seguir en verde.
- En desarrollo, cada consulta a la base viaja ~800 ms porque está en otra región; esa latencia es
  geográfica y no debe confundirse con lentitud del código.

**Sin decidir:** el hosting de producción. El diseño no asume ninguno.

**No existe todavía:** estadísticas por jugador y partido, plantillas de equipo, estadios, entidad de
entrenador, árbitro ni asistencia. Nada de eso debe diseñarse como si existiera.

## Brand Commitments

- Nombre: **Athena**. Atenea es la diosa de la sabiduría y su símbolo es el búho; el usuario eligió un
  búho geométrico como marca.
- Toda narrativa de IA se presenta bajo la etiqueta **"Análisis Athena"** y **nunca** sin su evidencia
  desplegable, su modelo y su versión de prompt. Es un compromiso de producto, no una decisión visual.
- El texto **nunca** habla de los datos en sí: prohibido escribir "según los datos" o "sin registros
  disponibles". Si algo no se sabe, no se menciona.
- El rating que muestra el proveedor no puede presentarse como un rating de Athena.
- Ambición confirmada: Athena es una **pieza de portafolio que debe demostrar nivel técnico y de
  diseño**. El impacto visual y el acabado pesan más que la amplitud de alcance o la captación de
  tráfico.

## Evidence on Hand

Datos reales sincronizados, no maquetas: doce competencias, ~300 equipos, ~6.350 jugadores, 3.353
partidos de los cuales 985 tienen estadísticas y alineaciones completas, 22.765 titulares con
posición en cancha, y nueve análisis y previas generados con su evidencia.

Documentos de producto existentes: `docs/product/PRODUCT_SPEC.md` (personas, recorridos, páginas) y
`docs/product/DESIGN_SYSTEM.md` (el sistema actual, que este rediseño reemplaza).

Ausencias que no deben inventarse: no hay usuarios reales todavía, ni testimonios, ni métricas de
uso, ni acuerdos comerciales.

## Product Principles

1. **Ningún dato sin contexto, ninguna narrativa sin evidencia.** Es la razón de existir del producto.
2. **Mejor no publicar que publicar relleno.** Si falta material, se omite y se dice.
3. **El dominio es de Athena.** Los proveedores son detalles reemplazables, nunca la forma de los datos.
4. **La performance y la accesibilidad son funciones del producto**, no un pulido posterior.
5. **Casi todo debe ser navegable.** Un nombre, un escudo o un jugador que no llevan a ningún lado son
   una promesa incumplida.

## Accessibility & Inclusion

WCAG 2.1 AA como criterio de aceptación, verificado en **ambos** temas (claro y oscuro) y no solo en
el que se diseña primero. Objetivo Lighthouse ≥95 en las cuatro categorías. El color nunca es el
único canal de información. Navegación completa por teclado, incluida la cancha interactiva y los
modales.
