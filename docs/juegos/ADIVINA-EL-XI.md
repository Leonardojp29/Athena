# Adivina el XI

Te damos el partido; tú pones los once que salieron a la cancha.

> Real Madrid 1-4 Ajax · Champions 2018/19 · octavos de final, vuelta
> **Adivina el XI titular del Ajax**

La dificultad no está en esconder qué partido es —el contexto es la pista gratuita— sino en si te
acuerdas del once exacto. Todo lo demás sale de ahí.

## La idea que ordena todo

**La respuesta no puede estar en el navegador.** Un juego de adivinar donde las herramientas de
desarrollo dicen la respuesta no es un juego. Por eso el reto que viaja al cliente lleva, por
casillero, el `playerId`, la casilla y el puesto, y **ningún nombre**. El cliente ya conoce el
nombre y la foto del futbolista que el usuario eligió porque se los dio el buscador, así que para
acertar le basta comparar ids. Los nombres llegan por `solucion`, y solo al pedir la primera pista
o al terminar la partida.

De esa regla salen tres decisiones más:

- El buscador es propio y no `/search`: aquel devuelve la nacionalidad como subtítulo y consulta
  equipos y competencias, y cualquiera de esos datos sería una pista regalada.
- La pista se pide al servidor en vez de mandar las iniciales con el reto.
- Los faltantes se revelan apagados en su casilla recién cuando la partida terminó.

## Los retos

Los 66 parten de `internacional.md` y `peruano.md` y viven como código en
`apps/api/src/modules/juegos/retos-once.config.ts`, con el id de competencia y de los dos equipos
fijados a mano. No se sustituye un partido desde el código: si no sirve, se reporta.

**El catálogo es propio y no referencia `matches`.** Athena no tiene los partidos viejos —de la
Champions solo guarda alineaciones desde la temporada 2021, del Mundial solo 2026—, así que
apoyarse en ellos obligaría a importar mundiales enteros para alimentar un juego. `retos_del_once`
es una instantánea del partido; solo el once apunta a `players`, para que el nombre y la foto sigan
al futbolista si se corrigen.

**Nueve retos llevan su disposición escrita a mano.** Son internacionales de 2018 para atrás donde
el proveedor confirma los once pero no publica formación ni casillas —y no es un corte por fecha: el
Barcelona 6-1 PSG de 2017 sí las trae—. La prioridad es siempre la misma: primero lo del proveedor,
después lo escrito a mano, y solo se descarta si no hay once confiables. La lista a mano tiene que
hablar exactamente de los once que él confirma, así que una alineación corregida se detecta en la
auditoría en vez de dibujar a alguien que no jugó.

## Qué hace cada archivo

| Archivo | Responsabilidad |
|---|---|
| `packages/adivina-el-xi/src/motor.ts` | Las reglas, sin DOM y sin reloj propio |
| `apps/api/src/modules/juegos/retos-once.config.ts` | Los 66 retos y las nueve disposiciones a mano |
| `apps/api/src/modules/juegos/auditar-retos.service.ts` | Los busca en el proveedor y dice si sirven |
| `apps/api/src/modules/juegos/importar-retos.service.ts` | Los trae a la base con su once y sus casillas |
| `apps/api/src/modules/juegos/casillas-manuales.ts` | De la lista por línea a las casillas `fila:columna` |
| `apps/api/src/modules/juegos/retos-del-once.service.ts` | El sorteo, el buscador y la solución |
| `apps/web/src/components/once/AdivinaElXI.tsx` | La puerta: configuración o partida |
| `apps/web/src/components/once/Partida.tsx` | Cancha, barra de tiempo, buscador y pista |
| `apps/web/src/components/once/CanchaDelReto.tsx` | Los once casilleros sobre la cancha |
| `apps/web/src/components/once/BuscadorDeJugadores.tsx` | El buscador, con su adelanto local |
| `apps/web/src/lib/adivina.ts` | Los pedidos y las preferencias en `localStorage` |

## El buscador, que es donde se juega la partida

Tres cosas lo hacen rápido, y las tres se midieron:

1. **Los índices.** La consulta arrancó en 1,2 s porque `coalesce(full_name, '')` no coincide con la
   expresión del índice y Postgres barría los 46.444 futbolistas. Sin el `coalesce` usa los cinco
   índices con un BitmapOr: **73 ms**.
2. **La memoria del proceso.** Antes pasaba por `vistas_cache`, que cuesta una lectura y una
   escritura contra una base fuera de región: dos viajes de casi un segundo para responder un
   tecleo. Ahora recuerda en el proceso y una consulta repetida vuelve en **1 ms**.
3. **El adelanto en el cliente.** Mientras el servidor contesta, se filtra lo que ya respondió la
   palabra más corta, así la lista no queda en blanco.

Y sobre todo **el índice local**: doce mil futbolistas —los más conocidos, más los once de cada reto
sin falta— viajan al navegador como pares `[ref, nombre]`. Son 131 KB comprimidos, se bajan durante
la presentación del partido y el navegador los guarda un día, así que la segunda partida no los
vuelve a pedir. Buscar deja de salir a la red: **de 7,35 s a 8–17 ms**.

De ahí sale que la identidad dentro del juego sea el `provider_ref` y no el UUID de Athena: treinta
y seis caracteres contra seis son trescientos KB de diferencia sobre doce mil fichas. La foto
tampoco viaja, se arma con el mismo id.

**El orden importa tanto como la velocidad.** Con el puntaje de la búsqueda del sitio, escribir
"messi" devolvía *Messias* primero, y "ramos" cuatro homónimos antes que Sergio Ramos. Acá el
apellido pesa más que el principio de la ficha, el nombre abreviado tiene un castigo —"L. Martinez"
se parece más a "martinez" que "Lisandro Martínez", y al que busca le sirve menos— y desempata la
relevancia del futbolista, que sale del palmarés: los minutos no servían porque miden cobertura de
Athena y no fama.

## Verificar

```bash
pnpm --filter @athena/adivina-el-xi test
pnpm --filter @athena/api test
pnpm --filter @athena/web exec playwright test e2e/adivina-el-xi.spec.ts
pnpm --filter @athena/api auditar:retos     # los 66 contra el proveedor, sin escribir nada
pnpm --filter @athena/api importar:retos    # idempotente por clave
```

El informe de la auditoría vive en `docs/juegos/AUDITORIA-ADIVINA-EL-XI.md` y se regenera en cada
corrida.
