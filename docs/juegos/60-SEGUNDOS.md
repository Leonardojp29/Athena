# 60 Segundos

Un minuto exacto y todas las preguntas de fútbol que puedas responder.

> **FÁCIL** · racha 4 · x2 · 1.300 pts · **41.7**
> ¿Quién marcó el gol que le dio el Mundial 2014 a Alemania?

Fallar **no termina la partida**: cuesta la racha y el multiplicador, y se sigue. Es lo contrario de
[El Impostor](EL-IMPOSTOR.md), donde un error te mata, y esa diferencia es la que justifica que
existan los dos.

## La idea que ordena todo

**El reloj es uno solo y no se detiene por nada.** Ni en la transición, ni al acertar, ni al fallar.
De ahí sale cada decisión:

- **Las cincuenta preguntas viajan juntas al empezar** —unos doce kilobytes—. Un viaje a la red
  entre pregunta y pregunta se nota más que el peso cuando la partida dura un minuto. Eso significa
  que las respuestas están en las herramientas del navegador, igual que en El Impostor; el récord es
  local, así que hacer trampa solo se la hace uno mismo.
- **El multiplicador que se cobra es el que el jugador estaba viendo**, no el que resulta del
  acierto. Con racha 5 la pantalla dice `x2`: ese acierto puntúa `x2` y recién después la insignia
  salta a `x3`. Cobrar el nuevo sería cobrarle algo que no vio.
- **El bonus de rapidez es plano.** `+50` fuera del multiplicador, solo al acertar y solo si la
  respuesta llegó antes de dos segundos. Es un extra, no una apuesta.
- **La explicación no aparece durante los sesenta segundos.** Es texto que nadie llega a leer con el
  reloj corriendo; vive en «Repasar errores», que es lo único del juego sin reloj.

## Las preguntas

Las 50 viven como código en `apps/api/src/modules/juegos/preguntas-60.config.ts`, con el id de
equipo y de competencia fijados a mano y los futbolistas por nombre —cada nombre se resuelve dentro
de su contexto, los veintitantos de un acta, y no contra los 46.000 de la base—.

**Entraron las 50.** La auditoría no encontró ninguna que el proveedor contradiga:

| Estado | Cuántas |
|---|---:|
| Validadas contra API-Football | **40** |
| Validación editorial | 7 |
| Fuera de la cobertura del proveedor | 3 |

Los tres últimos entran marcados `validado_a_mano` y conviene saber cuáles son, porque su verdad la
respalda el editor y no el dato:

| Pregunta | Por qué el proveedor no la puede comprobar |
|---|---|
| Q028 · Fàbregas en Arsenal y Barcelona | `getTransfers` va por equipo y no por jugador, y Athena no tiene sus fichajes |
| Q036 · el penal que falló Cueva ante Dinamarca | el acta del partido no registra penales fallados |
| Q047 · el repechaje ante Nueva Zelanda | la competencia 37 no trae fixtures de 2017 |

Los siete editoriales son los que el proveedor no publica por definición: el Balón de Oro (Q004,
Q046), los máximos goleadores históricos (Q005, Q006, Q050), la Libertadores 2010 —cubierta desde
2019— (Q035) y la chilena de Bale (Q043), de la que se confirma el gol pero no la ejecución.

**Lo que hay que decir del catálogo tal como llegó:**

- 16 de las 50 son «¿quién ganó tal torneo?» y una sola tiene foto. El encargo pide que no se
  sientan cincuenta preguntas idénticas de cuatro botones, y esa variedad la pone el juego —abajo,
  «La escena»—, no la mezcla.
- La tabla del documento original dice Fácil 29 / Normal 19 / Difícil 2; las preguntas son **32 /
  16 / 2**.
- El contenido peruano son 12 de 50, **24 %**, justo por debajo del 25-30 % que pide el encargo.

## La escena, que es de donde sale la variedad

Con la misma pregunta de cuatro botones, cada tipo trae su propio material y Athena ya lo tiene: el
escudo sale del id del equipo, la bandera del código de país y la foto del id del futbolista, así
que nada de esto pesa en la respuesta del servidor.

| Tipo | Qué se ve arriba del enunciado |
|---|---|
| `campeon` | el logo de la competencia |
| `resultado` · `quien-marco` · `titularidad` | los dos escudos, enfrentados con un «vs» |
| `trayectoria` | los clubes en fila, con flechas |
| `quien-es` | la foto del futbolista, grande y redonda |
| `verdadero-falso` | nada: dos botones a todo el ancho, para responder sin apuntar |

Las selecciones llevan bandera y no escudo, y el código va fijado en el catálogo: el proveedor
devuelve la bandera de Argentina pero el sello de la FPF para Perú.

## El sorteo

El catálogo entero cabe en memoria del proceso, así que una partida no toca la base. De ahí salen
las cincuenta barajadas, con las opciones de cada una también barajadas.

**Dos preguntas seguidas nunca son del mismo tipo.** Con dieciséis «¿quién ganó…?» en cincuenta,
barajando a secas tres seguidas de esa forma son lo normal y la partida se siente como un
formulario. El orden se arma de forma voraz, prefiriendo la que menos choque con la recién puesta
—mismo contexto pesa el doble que mismo tipo—; medido sobre el catálogo real, salen **cero pares
pegados** en los cuarenta y nueve.

## Qué hace cada archivo

| Archivo | Responsabilidad |
|---|---|
| `packages/sesenta-segundos/src/motor.ts` | Las reglas, sin DOM y sin reloj propio |
| `apps/api/src/modules/juegos/preguntas-60.config.ts` | Las 50 preguntas y cómo se comprueba cada una |
| `apps/api/src/modules/juegos/auditar-60.service.ts` | Las verifica contra el proveedor |
| `apps/api/src/modules/juegos/importar-60.service.ts` | Las trae a la base con sus opciones |
| `apps/api/src/modules/juegos/preguntas-del-60.service.ts` | El barajado y el orden que no repite tipo |
| `apps/web/src/components/sesenta/SesentaSegundos.tsx` | La puerta: el reloj y el encadenado |
| `apps/web/src/components/sesenta/Partida.tsx` | Reloj, puntaje, racha, multiplicador y pregunta |
| `apps/web/src/components/sesenta/Escena.tsx` | Lo que se ve arriba del enunciado, según el tipo |
| `apps/web/src/lib/sesenta.ts` | El pedido de preguntas y el récord en `localStorage` |
| `apps/web/src/lib/sonido.ts` | Los momentos de sonido, nombrados y todavía en silencio |

## El sonido

`sonido.ts` nombra los siete momentos que lo pedirían —largada, acierto, fallo, multiplicador,
apremio, pánico, final y récord— contra una función que hoy no hace nada. **No hay interruptor de
silencio a propósito**: un botón que silencia el silencio es una promesa vacía. El día que haya
archivos, el interruptor llega con ellos.

## Lo que se guarda

`athena:sesenta` guarda cinco cifras —mejor puntaje, más correctas en una partida, mejor racha,
partidas jugadas y correctas acumuladas— y ninguna fecha. Un récord es un número que invita a
volver, no un archivo de partidas.

## Verificar

```bash
pnpm --filter @athena/api auditar:60     # el informe en docs/juegos/AUDITORIA-60-SEGUNDOS.md
pnpm --filter @athena/api importar:60    # idempotente por clave; SOLO=Q001 para una
pnpm --filter @athena/sesenta-segundos test
pnpm --filter @athena/web exec playwright test e2e/60-segundos.spec.ts
```

Lo que la auditoría marque **INCORRECTA** es una pregunta rota: se reporta y queda bloqueada, no se
arregla por cuenta propia.
