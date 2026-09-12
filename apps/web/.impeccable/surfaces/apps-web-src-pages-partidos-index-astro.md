---
version: 1
slug: "apps-web-src-pages-partidos-index-astro"
primary_target: "apps/web/src/pages/partidos/index.astro"
related_targets: []
---

# El calendario

## A quién sirve y en qué momento

El hincha analítico, un sábado, con el teléfono en la mano y una pregunta que caduca: **qué puedo
ver ahora**. Y el mismo hincha el jueves en el escritorio, con otra pregunta más lenta: **cuándo
juega el mío**. Modo Operate: nadie viene acá a leer, viene a decidir qué mirar.

## Qué tiene que lograr

Que en la primera pantalla se sepa qué rueda en este momento, y que en tres segundos de scroll se
sepa a qué hora está el bloque grande del día. Todo lo demás es secundario.

## La decisión de fondo

**Un calendario tiene dos ejes y esta página solo tenía uno: dónde.** El orden era continente →
país → liga, y con ochenta partidos en dieciocho países eso obliga a barrer el árbol entero para
encontrar el presente.

Ahora manda **cuándo**. El reloj baja por la izquierda como la columna de horarios de una pizarra de
entrenador, y cada hora trae lo que arranca ahí, todavía agrupado por torneo adentro: la liga sigue
importando, pero después del horario y no antes. El lugar queda a un clic (`?ver=lugar`) y los dos
ejes son enlaces de verdad, así que la elección viaja en la URL y la página no hidrata nada.

El momento focal es la **banda de ahora**, sobre la pizarra: lo único de la página que no sirve
dentro de una hora va primero y a sangre.

Y lo que lo vuelve un calendario y no una lista ordenada por tiempo son dos gestos: **la línea de
ahora** que cruza la parrilla a la hora en punto —sin ella hay que leer los números para saber qué
ya pasó— y **el índice del día** en la columna derecha, pegajoso, que dice dónde estás parado y
lleva de un clic a cualquier bloque sin recorrer el medio. El índice es el mismo riel para los dos
ejes y esa simetría es deliberada: por hora indexa horas, por lugar indexa continentes. Dos lentes
sobre el mismo día, no dos páginas.

## Lo que se muestra y con qué se sostiene

- **Ahora / Enseguida.** Lo que rueda con su minuto, o los que arrancan a la próxima hora con
  cuánto falta. Los que arrancan juntos van juntos: mostrar tres de seis sería elegir por el lector.
- **La carga del día.** Una barra por hora con cuántos partidos empiezan ahí, la hora en curso en
  rojo y la más cargada en azul. Lleva su tabla en `figcaption`: un gráfico sin ella es color y
  altura, dos canales que un lector de pantalla no tiene.
- **La semana con peso.** Cada día trae su cuenta y una barra proporcional. Antes eran siete cajitas
  idénticas y elegir el sábado costaba lo mismo que el martes, teniendo uno ochenta y siete partidos
  y el otro nueve.
- **El realce.** Tres razones y las tres se defienden con un dato: el clásico está declarado a mano
  en el dominio —un clásico es historia y barrio, no una columna—, la ronda la nombra el torneo de
  cuartos en adelante, y el duelo de arriba sale de las posiciones reales. Se devuelve **una sola**,
  la más fuerte. Sin ninguna, el partido no se realza: inventar una razón para llenar la pantalla es
  lo contrario de esto. En un día de ochenta y siete partidos se realzan cinco.
- **La esquina de la fila informa o calla.** Un partido por jugar mostraba "Programado" siete veces
  dentro del mismo bloque. Ahí va el minuto exacto, y solo cuando no es la hora en punto: el riel ya
  la dijo.

## Rangos reales

Entre 9 y 87 partidos por día, medido sobre la ventana de siete días. Un día grande son 18
competencias, 18 países y 4 continentes. Un día chico tiene una sola liga y dos partidos. La hora
pico llega a 18 partidos en un bloque; la mayoría de las horas tiene uno o dos.

## Lo que no se toca

El eje por lugar sigue siendo el mismo componente de la home (`MatchGeography`), con su árbol y su
orden. Las direcciones de partido, el canónico por `?fecha=` y el hueco de anuncio del costado
quedan como están.

## Límites

Cero JavaScript propio salvo el refresco de marcadores, que solo se dibuja cuando hay algo en juego.
El índice y las anclas son enlaces, así que saltar de hora no cuesta un byte.

**El ancho se llena con algo que sirve.** Acotar la parrilla dejaba cuatrocientos píxeles muertos a
la derecha; ahora ahí vive el índice, desde `lg` y no desde 1800, porque saber dónde estás en el
tiempo vale en cualquier escritorio. Debajo del índice va el hueco de anuncio, en la misma columna.

Los dos ejes comparten el mismo ritmo de pistas de `auto-fill`: las horas en 24rem, los países en
30rem. A mil doscientos píxeles una fila de partido en una sola columna manda los dos equipos a los
bordes y deja el marcador solo en el medio. El riel de horas funciona desde 390 px sin
desplazamiento horizontal, y ahí el índice se retira: en un teléfono no hay costados.

## Lo que sigue abierto

El realce no sabe de favoritos: el servidor no conoce los del lector. Si algún día el equipo que
alguien sigue tiene que subir en la parrilla, se reordena en el cliente como ya se hace con las
ligas favoritas del riel de la home, y se reordena, no se filtra.
