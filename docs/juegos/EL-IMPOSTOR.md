# El Impostor

Seis futbolistas, cinco cumplen la condición y uno se coló. Diez segundos para encontrarlo.

> 5 fueron titulares del Bayern en la final de Champions 2020. Uno venía de otro lado.
> **Neuer · Kimmich · Gnabry · Lewandowski · Müller · Perišić**

Un error termina la partida. Lo que se puntúa no son los aciertos sino la racha, y eso cambia el
juego entero: no se trata de saber más, sino de no equivocarse nunca.

## La idea que ordena todo

**El ritmo manda sobre todo lo demás.** Diez segundos por ronda es la regla, no un parámetro; de ahí
sale cada decisión:

- **Las cartas llevan rostro y apellido y nada más.** Ni club, ni puesto, ni país: cualquiera de
  esos datos resolvería la ronda sin pensar.
- **`esImpostor` viaja con la ronda.** Al contrario que en [Adivina el XI](ADIVINA-EL-XI.md), donde
  esconder la respuesta es el juego, acá esconderla costaría un viaje a la red justo en el instante
  de fallar. El récord se guarda en el navegador de quien juega, así que hacer trampa solo se la
  hace uno mismo. El día que haya tabla de posiciones, la validación se muda al servidor.
- **El `reveal` también viaja.** Al perder hay que poder decir *por qué* ese no pertenecía, y
  pedirlo entonces metería un segundo de espera en el peor momento.
- **La tanda siguiente se pide tres rondas antes de hacer falta.** Encadenar después de acertar no
  puede costar una espera: para cuando el jugador llega al final de las diez, la siguiente ya está.

## Los retos

Los 50 viven como código en `apps/api/src/modules/juegos/retos-impostor.config.ts`, con el id de
equipo y de competencia fijados a mano. **Entraron 48**; dos quedaron bloqueados por errores reales
del catálogo y no se sustituyeron por cuenta propia:

| Reto | Qué pasó |
|---|---|
| IMP-008 | Álex Valera no jugó Universitario 2-1 LDU: ni titular ni suplente |
| IMP-019 | Godín fue **suplente** ante Ghana, así que sería un segundo impostor válido |

Los 48 se reparten en 24 difíciles, 13 normales y 11 fáciles; por tema, 18 de clubes, 17 de
selecciones, 10 peruanos y 3 de trayectorias, sobre 184 futbolistas distintos.

**Los futbolistas van por nombre y los equipos por id.** Cada nombre se resuelve *dentro de su
reto* —contra los veintitantos de una alineación, «Guerrero» es uno solo—; resolverlos contra los
46.000 de la base sería el problema de homónimos que ya costó caro en el buscador de Adivina el XI.
Cuando el contexto no alcanza, el nombre del catálogo tiene que ser preciso: en el Barcelona 2007 el
proveedor llama «Xavier Hernández Creus» al Xavi de verdad y existe además un «Xavi Torres», así que
IMP-050 escribe el nombre largo.

## La política de contenido, hecha código

La auditoría comprueba las cinco reglas y ninguna es opinable:

1. **Los seis existen** en Athena o se pueden sincronizar.
2. **Los seis tienen foto real.** La silueta genérica no cuenta, y se detecta comparando el
   contenido de la imagen y no su tamaño: Cannavaro y Materazzi la comparten byte a byte, que es
   como se descartó el reto de Italia 2006.
3. **Ninguna imagen se repite** dentro de un reto: dos cartas iguales son una pista regalada.
4. **El impostor pertenece al mismo entorno** —plantel, torneo, selección o generación—, con
   prioridad al que sí estaba pero no cumplía el detalle exacto. Nada de rivales evidentes.
5. Si falta un futbolista o una foto real, **el reto queda bloqueado** hasta que lo reemplace
   Leonardo.

El estado `ok-a-mano` no es un rechazo: es un reto que el proveedor no cubre —el Barcelona de la
final de 2011 pertenece a la temporada 2010 y la Champions arranca en 2011— pero cuyos seis existen
con foto. Entra marcado `validado_a_mano` y su verdad futbolística la respalda el editor. Hoy hay
uno solo.

## El sorteo

El catálogo entero son 48 retos de seis cartas: cabe en memoria del proceso, así que una tanda no
toca la base. De ahí salen diez rondas barajadas, cada una con sus seis cartas también barajadas, y
`excluir` deja fuera las ya vistas. Si lo excluido no alcanza, se completa con el resto: agotar
cuarenta y ocho en una racha es posible, y quedarse sin juego ahí sería el peor final.

**Dos rondas parecidas no salen pegadas.** Se parecen cuando comparten cartas —Perú 2018 y Perú 2019
tienen cuatro nombres en común— o cuando son la misma escena vista desde cada lado: IMP-024 pregunta
por el XI de Brasil e IMP-030 por el de Bélgica del mismo cruce, **sin repetir una sola carta**. Lo
segundo no se puede ver mirando las caras, y por eso cada reto guarda su `contexto`. La tanda se
arma de forma voraz, eligiendo cada vez la que menos choca con la recién puesta; hacia el final
puede no quedar ninguna limpia, y ahí se acepta el choque antes que servir una tanda corta.

## Qué hace cada archivo

| Archivo | Responsabilidad |
|---|---|
| `packages/el-impostor/src/motor.ts` | Las reglas, sin DOM y sin reloj propio |
| `apps/api/src/modules/juegos/retos-impostor.config.ts` | Los 50 retos y cómo se comprueba cada uno |
| `apps/api/src/modules/juegos/auditar-impostor.service.ts` | Los busca en el proveedor y compara las fotos |
| `apps/api/src/modules/juegos/nombres.ts` | Resuelve un nombre dentro de una lista corta |
| `apps/api/src/modules/juegos/importar-impostor.service.ts` | Los trae a la base con sus seis cartas |
| `apps/api/src/modules/juegos/retos-del-impostor.service.ts` | El sorteo de la tanda |
| `apps/web/src/components/impostor/ElImpostor.tsx` | La puerta: el reloj y el encadenado de tandas |
| `apps/web/src/components/impostor/Ronda.tsx` | Enunciado, reloj, racha y las seis cartas |
| `apps/web/src/components/impostor/CartaDeJugador.tsx` | La carta: rostro y apellido, nada más |
| `apps/web/src/lib/impostor.ts` | El pedido de tanda y el récord en `localStorage` |

## Lo que se guarda, y lo que no

`athena:impostor` guarda cuatro cifras —mejor racha, última racha, partidas y rondas acertadas— más
las últimas treinta claves vistas, para que la tanda siguiente traiga otras.

Mi Leyenda no guarda historial a propósito: una carrera terminada se cuenta y desaparece. Esto no lo
contradice. Una racha es un número que invita a volver, no un archivo de partidas que las convierte
en museo, y por eso no se guarda ni una fecha.

## Verificar

```bash
pnpm --filter @athena/api auditar:impostor    # el informe en docs/juegos/AUDITORIA-EL-IMPOSTOR.md
pnpm --filter @athena/api importar:impostor   # idempotente por clave; SOLO=IMP-050 para uno
pnpm --filter @athena/el-impostor test        # las reglas: racha, reloj, encadenado
pnpm --filter @athena/web exec playwright test e2e/el-impostor.spec.ts
```

Lo que sale `impostor-cumple`, `falta-alguno` o con una foto repetida es un reto roto: se reporta y
queda bloqueado, no se arregla por cuenta propia.
