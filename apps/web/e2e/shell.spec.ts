import { expect, test } from '@playwright/test';

const RUTAS = ['/', '/partidos', '/competencias', '/competencias/primera-division'];

test.describe('shell del sitio', () => {
  /*
   * El header se quedó con lo mínimo: el catálogo vive en la barra lateral de la home. Si alguien
   * vuelve a colgar navegación acá, este test lo dice.
   */
  test('el header queda con el logo, el buscador y la sesión', async ({ page, isMobile }) => {
    await page.goto('/');
    const header = page.locator('header');

    await expect(header.getByLabel('Athena — inicio')).toBeVisible();
    // en móvil el campo cede su lugar al atajo a /buscar: no hay ancho para las dos cosas
    await expect(
      isMobile
        ? header.getByLabel('Buscar', { exact: true })
        : header.getByLabel('Buscar equipos, jugadores o competencias'),
    ).toBeVisible();
    await expect(header.getByLabel('Abrir el catálogo de competencias')).toHaveCount(0);
    await expect(header.getByRole('link', { name: 'Competencias', exact: true })).toHaveCount(0);
  });

  /*
   * El orden es la mitad del pedido: continente, después país, después torneo. Si alguna vez
   * alguien vuelve a agrupar por liga a secas, esto lo dice antes que una captura.
   */
  test('el catálogo se lee continente → país → torneo', async ({ page }) => {
    await page.goto('/competencias');

    const continentes = page.locator('main h2');
    const titulos = await continentes.allInnerTexts();
    expect(titulos.length).toBeGreaterThanOrEqual(4);
    expect(titulos[0]).toMatch(/sudam[eé]rica/i);

    // dentro del primer continente, países con su bandera y sus torneos
    const primerPais = page.locator('main section section').first();
    await expect(primerPais.locator('h3')).not.toBeEmpty();
    expect(await primerPais.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(0);
    // el catálogo real pasa los cuarenta torneos; con menos, la nav cayó al respaldo cableado
    expect(await page.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(30);
  });

  /*
   * La barra lateral es la navegación de la home: Hoy, Favoritos y Competencias. Una liga se abre
   * en el mismo contenedor —sin cambiar de página— y deja la salida a la vista completa.
   */
  test('la barra lateral abre una liga sin salir de la home', async ({ page, isMobile }) => {
    test.skip(isMobile, 'la barra lateral no se muestra en móvil');
    await page.goto('/');

    const nav = page.locator('main nav[aria-label="Navegación de la home"]');
    await expect(nav.getByRole('link', { name: /^Hoy/ })).toBeVisible();
    await expect(nav.getByText('Favoritos', { exact: true })).toBeVisible();
    await expect(nav.getByText('Competencias', { exact: true })).toBeVisible();

    const pais = nav.locator('summary').filter({ hasText: /Per[uú]/ }).first();
    await pais.click();

    const liga = nav.locator('a[href^="/?liga="]').first();
    const slug = (await liga.getAttribute('href'))!.replace('/?liga=', '');
    await liga.click();

    await expect(page).toHaveURL(new RegExp(`\\?liga=${slug}$`));
    await expect(page.getByRole('link', { name: /ver la liga completa/i })).toHaveAttribute(
      'href',
      `/competencias/${slug}`,
    );
  });

  /*
   * La tabla tiene que abrir en la fase que se está jugando. La Liga 1 abría en el Apertura
   * —cerrado en mayo— mientras se jugaba el Clausura, y quien miraba creía estar viendo el torneo
   * en curso. El dato de verdad es la jornada del próximo partido, así que el test la compara con
   * la fase abierta en lugar de cablear "Clausura", que el año que viene sería mentira.
   */
  test('la tabla abre en la fase que se está jugando', async ({ page, request }) => {
    const vista = await (
      await request.get('http://localhost:3001/v1/views/competition/primera-division')
    ).json();
    const fases: Array<{ label: string; current: boolean }> = vista.standingGroups;
    test.skip(fases.length < 2, 'esta competencia no tiene fases para elegir');

    const enJuego = fases.find((f) => f.current);
    expect(enJuego, 'ninguna fase quedó marcada como en juego').toBeTruthy();

    for (const ruta of ['/competencias/primera-division', '/?liga=primera-division']) {
      await page.goto(ruta);
      const control = page.locator('main [role="group"][aria-label="Fase de la temporada"]');
      await expect(control).toBeVisible();

      const abierta = control.locator('a[aria-current="true"]');
      await expect(abierta).toHaveCount(1);
      /*
       * La fase abierta es la que está en juego, no la primera que devolvió la base. Se compara el
       * valor y no la URL cruda: el proveedor pasó a etiquetar "Primera Division: Clausura" —con
       * espacios— y `+` y `%20` son la misma cosa en una consulta.
       */
      const href = await abierta.getAttribute('href');
      const tabla = new URL(href as string, 'http://localhost:4321').searchParams.get('tabla');
      expect(tabla).toBe(enJuego!.label);
    }
  });

  /*
   * Un equipo se abre en el mismo contenedor que la liga: desde una tabla de posiciones, tocar un
   * equipo mandaba a otra página y perdías de vista el día entero.
   */
  test('un equipo de la tabla se abre dentro de la home', async ({ page, isMobile }) => {
    test.skip(isMobile, 'la barra lateral no se muestra en móvil');
    await page.goto('/?liga=primera-division');

    const equipo = page.locator('main a[href^="/?equipo="]').first();
    const slug = (await equipo.getAttribute('href'))!.replace('/?equipo=', '');
    await equipo.click();

    await expect(page).toHaveURL(new RegExp(`\\?equipo=${slug}$`));
    await expect(page.getByRole('link', { name: /ver el equipo completo/i })).toHaveAttribute(
      'href',
      `/equipos/${slug}`,
    );
    /* Sigue siendo la home: la barra lateral y el día no se fueron a ninguna parte. */
    await expect(page.locator('main nav[aria-label="Navegación de la home"]')).toBeVisible();
  });

  /*
   * El riel de la home muestra los goleadores de una región, y arranca en la de este público. "Lo
   * mejor del mundo" traía a un delantero de la MLS que a quien mira desde Lima no le mueve nada.
   */
  test('los goleadores del riel cambian de región por URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'el riel no se muestra en móvil');
    await page.goto('/');

    const riel = page.locator('main aside').last();
    const selector = riel.locator('[role="group"][aria-label="Región"]');
    await expect(selector.locator('a[aria-current="true"]')).toHaveText(/sudam[eé]rica/i);

    const sudamericanos = await riel.locator('a[href^="/?jugador="]').allInnerTexts();
    test.skip(sudamericanos.length === 0, 'todavía no hay goleadores cargados');

    await selector.getByRole('link', { name: 'Europa' }).click();
    await expect(page).toHaveURL(/\?region=europa$/);
    await expect(selector.locator('a[aria-current="true"]')).toHaveText(/europa/i);

    /* Otra región, otros goleadores: si la lista no cambia, el filtro no está filtrando. */
    const europeos = await riel.locator('a[href^="/?jugador="]').allInnerTexts();
    expect(europeos).not.toEqual(sudamericanos);
  });

  /*
   * La vista simplificada del equipo tiene que traer a los futbolistas: sin ellos mostraba cómo va
   * y sus partidos, que es la mitad de por qué alguien entra a un club.
   */
  test('el equipo abierto en la home muestra su plantilla', async ({ page, isMobile }) => {
    test.skip(isMobile, 'la barra lateral no se muestra en móvil');
    await page.goto('/?equipo=universitario');

    const tarjeta = page.locator('[style*="view-transition-name: equipo"]');
    await expect(tarjeta.getByRole('heading', { name: /plantilla/i })).toBeVisible();
    /* Once o más: una plantilla con tres nombres no es una plantilla. */
    expect(await tarjeta.locator('a[href^="/?jugador="]').count()).toBeGreaterThan(10);
    await expect(tarjeta.getByRole('heading', { name: /goleadores del equipo/i })).toBeVisible();

    /* Y el orden: lo que se juega antes de quiénes lo definen. */
    const partidos = await tarjeta
      .getByRole('heading', { name: /próximos partidos|últimos resultados/i })
      .first()
      .boundingBox();
    const goleadores = await tarjeta
      .getByRole('heading', { name: /goleadores del equipo/i })
      .boundingBox();
    expect(partidos!.y).toBeLessThan(goleadores!.y);
  });

  /*
   * En una copa el riel muestra el cuadro y los grupos en dos pestañas, y el cuadro se recorre ronda
   * por ronda: con dieciséis llaves en dieciseisavos, apilar todas las rondas hacía un riel de tres
   * pantallas. Abre en la ronda que se está jugando.
   */
  test('el riel de una copa recorre el cuadro ronda por ronda', async ({ page }) => {
    await page.goto('/?liga=fifa-club-world-cup');

    const riel = page.locator('main aside').last();
    const rondas = riel.locator('[data-rondas]');
    test.skip((await rondas.count()) === 0, 'esta copa todavía no tiene cuadro');

    /* Dos pestañas: la del cuadro abierta y la de grupos a un clic. */
    await expect(riel.getByRole('tablist')).toBeVisible();
    await expect(riel.locator('[data-ronda-panel]:not([hidden])')).toHaveCount(1);

    const titulo = async () =>
      (await riel.locator('[data-ronda-panel]:not([hidden]) p').first().innerText()).split('\n')[0];
    const primera = await titulo();

    const atras = riel.locator('[data-ronda-anterior]');
    test.skip(await atras.isDisabled(), 'esta copa tiene una sola ronda en el cuadro');

    await atras.click();
    expect(await titulo()).not.toBe(primera);
    /* Y se puede volver: la flecha de la derecha deja de estar deshabilitada. */
    await expect(riel.locator('[data-ronda-siguiente]')).toBeEnabled();
  });

  /*
   * La fase de grupos se abre grupo por grupo: la tabla dice cómo quedó, pero no contra quién ni con
   * qué goles. El detalle pone la tabla y los partidos de una fecha en dos columnas, y abre en la
   * fecha que se juega —o la última jugada, que en un torneo terminado es donde quedó—.
   */
  test('un grupo abre su tabla y sus partidos, y se navega sin recargar', async ({ page }) => {
    await page.goto('/competencias/conmebol-libertadores');

    const abrir = page.locator('[data-abrir-grupo]').first();
    test.skip((await abrir.count()) === 0, 'esta copa no tiene fase de grupos cargada');
    const grupo = (await abrir.getAttribute('data-abrir-grupo')) as string;
    await abrir.click();

    /* Sin recargar: la URL lleva el grupo y el panel ya estaba en la página. */
    await expect(page).toHaveURL(/\?grupo=/);
    const panel = page.locator(`[data-panel-grupo="${grupo}"]`);
    await expect(panel).toBeVisible();

    /* Dos partidos de esa fecha, con su marcador. */
    const partidos = panel.locator('[data-fecha-panel]:not([hidden]) [data-partido]');
    expect(await partidos.count()).toBeGreaterThan(0);
    await expect(partidos.first().locator('[data-marcador]')).toBeVisible();

    /* La flecha mueve de fecha y el título la acompaña. */
    const titulo = panel.locator('[data-fecha-titulo]');
    const antes = await titulo.textContent();
    await panel.locator('[data-fecha-anterior]').click();
    expect(await titulo.textContent()).not.toBe(antes);

    /* Y se salta a otro grupo sin volver a la grilla. */
    const otro = panel.locator('[data-abrir-grupo]').nth(1);
    const etiqueta = (await otro.getAttribute('data-abrir-grupo')) as string;
    await otro.click();
    await expect(page.locator(`[data-panel-grupo="${etiqueta}"]`)).toBeVisible();
    await expect(panel).toBeHidden();
  });

  /*
   * Y un equipo también se abre dentro de su copa: el escudo de una llave enlazaba a `?equipo=` y
   * la página ignoraba el parámetro, así que el clic no hacía nada. Lo que importa es su camino en
   * el torneo —de la fase previa hasta donde llegó—, que no existe en su ficha de club.
   */
  test('un equipo de copa se abre dentro de la copa con su camino', async ({ page }) => {
    await page.goto('/competencias/copa-del-rey');

    const alEquipo = page.locator('main a[href*="?equipo="]:visible').first();
    test.skip((await alEquipo.count()) === 0, 'esta copa no tiene cuadro con equipos');
    await alEquipo.click();
    await expect(page).toHaveURL(/\?equipo=/);

    /* Su camino: al menos un partido, y todos son de este equipo. */
    await expect(page.getByText(/su camino en el torneo/i)).toBeVisible();
    const filas = page.locator('main [data-partido]');
    expect(await filas.count()).toBeGreaterThan(0);

    /* Y la salida devuelve al cuadro, sin equipo en la URL. */
    await page.getByRole('link', { name: /volver al cuadro/i }).click();
    await expect(page).toHaveURL(/\/competencias\/copa-del-rey$/);
  });

  /*
   * Las selecciones tienen su propia rama en la barra: el Mundial y la Copa América llegan sin país,
   * igual que la Libertadores, y metidos en el árbol de clubes quedaban escondidos dentro de
   * "Internacional". El grupo es la confederación y la FIFA abre la lista.
   */
  test('la barra lateral tiene su sección de selecciones y lleva al Mundial', async ({ page }) => {
    await page.goto('/');

    const barra = page.getByRole('navigation', { name: /navegación de la home/i });
    await expect(barra.getByText('Selecciones', { exact: true })).toBeVisible();

    const fifa = barra.locator('[data-rama="conf:mundial"]');
    test.skip((await fifa.count()) === 0, 'todavía no hay torneos de selecciones sincronizados');
    await fifa.locator('summary').click();

    const alMundial = fifa.getByRole('link', { name: 'Mundial', exact: true });
    await expect(alMundial).toBeVisible();
    await alMundial.click();

    /* El Mundial es una copa: su cuadro se dibuja como el de cualquier otra. */
    await expect(page).toHaveURL(/liga=mundial/);
    await expect(page.getByRole('heading', { name: /mundial/i }).first()).toBeVisible();
  });

  /*
   * Un partido de copa se abre dentro de su copa y es el centro de partido entero, no un resumen
   * recortado: las mismas cuatro pestañas que su página, con la cabecera del torneo todavía arriba.
   * El motivo es simple: el partido de los octavos es del torneo, y verlo no debería sacarte de él.
   */
  test('un partido de copa se abre dentro de la copa con sus cuatro pestañas', async ({ page }) => {
    await page.goto('/competencias/copa-del-rey');

    /* `:visible` porque el cuadro dibuja todas las rondas y muestra una: la oculta no se clickea. */
    const alPartido = page.locator('main a[href*="partido="]:visible').first();
    test.skip((await alPartido.count()) === 0, 'esta copa no tiene partidos con cuadro');
    await alPartido.click();

    /* La copa sigue siendo la dueña de la página, y el marcador vive en su misma pizarra. */
    await expect(page.getByRole('heading', { level: 1, name: /copa del rey/i })).toBeVisible();
    await expect(page.locator('main section.bg-board [data-marcador]')).toBeVisible();

    const pestanas = page.getByRole('navigation', { name: /secciones del partido/i });
    for (const nombre of ['Resumen', 'Alineaciones', 'Análisis IA', 'Historial']) {
      await expect(pestanas.getByText(nombre, { exact: true })).toBeVisible();
    }

    /* Cambiar de pestaña no saca de la copa ni pierde el partido de la URL. */
    const alineaciones = pestanas.getByRole('link', { name: 'Alineaciones' });
    test.skip((await alineaciones.count()) === 0, 'este partido no tiene alineaciones publicadas');
    await alineaciones.click();
    await expect(page).toHaveURL(/\?partido=[0-9a-f-]+&vista=alineaciones/);
    await expect(page.getByRole('heading', { level: 1, name: /copa del rey/i })).toBeVisible();
    await expect(page.locator('[data-cancha]')).toBeVisible();

    /* Y la salida devuelve al cuadro, sin partido en la URL. */
    await page.getByRole('link', { name: /volver al cuadro/i }).click();
    await expect(page).toHaveURL(/\/competencias\/copa-del-rey$/);
  });

  /*
   * El riel del equipo muestra con qué salió en su último partido, no los goleadores del mundo:
   * quien abrió a Alianza no vino a ver quién la rompe en Europa. Se dibuja con el `grid` del
   * proveedor, así que cada ficha queda donde jugó y abre las estadísticas de ese partido.
   */
  test('en un equipo el riel muestra la alineación de su último partido', async ({ page }) => {
    await page.goto('/?equipo=alianza-lima');

    const riel = page.locator('main aside').last();
    const cancha = riel.getByRole('heading', { name: /con qué salió/i });
    test.skip((await cancha.count()) === 0, 'este equipo no tiene alineación publicada todavía');
    await expect(cancha).toBeVisible();

    /* Los goleadores del mundo no aparecen en la vista de equipo. */
    await expect(page.getByRole('heading', { name: /los que la rompen/i })).toHaveCount(0);

    /* Los cinco paneles están en el documento; las once fichas son las del que está abierto. */
    const abierto = riel.locator('[data-panel]:not([hidden])');
    const fichas = abierto.locator('[data-iman]');
    expect(await fichas.count()).toBe(11);

    await fichas.first().click();
    const ficha = page.locator('#ficha-jugador');
    await expect(ficha).toBeVisible();
    await expect(ficha.locator('#ficha-nombre')).not.toBeEmpty();

    /*
     * La ficha se abre dentro de la cancha y solo la cancha se difumina: el resto de la página queda
     * a la vista, que es lo que uno quiere mientras compara.
     */
    await expect(ficha).toHaveAttribute('data-contenida', '');
    await expect(riel.locator('[data-cancha][data-difuminada]')).toHaveCount(1);

    /* Y al cerrar, la cancha vuelve a estar nítida. */
    await page.keyboard.press('Escape');
    await expect(ficha).toBeHidden();
    await expect(riel.locator('[data-difuminada]')).toHaveCount(0);
  });

  /*
   * Las flechas recorren las últimas cinco alineaciones sin navegar: el cambio es instantáneo y la
   * fecha elegida queda en la URL, así que el enlace se puede compartir.
   */
  test('las flechas de la alineación cambian de partido sin recargar', async ({ page }) => {
    await page.goto('/?equipo=alianza-lima');

    const tarjeta = page.locator('[data-alineaciones]');
    test.skip((await tarjeta.count()) === 0, 'este equipo no tiene alineaciones publicadas');

    const siguiente = tarjeta.locator('[data-alineacion-siguiente]');
    test.skip((await siguiente.count()) === 0, 'solo hay una alineación, sin flechas');

    const paneles = tarjeta.locator('[data-panel]');
    const ids = await paneles.evaluateAll((nodos) =>
      nodos.map((n) => (n as HTMLElement).dataset.panel as string),
    );
    expect(ids.length).toBeGreaterThan(1);
    /* Uno visible por vez: el resto está en el documento pero oculto. */
    await expect(tarjeta.locator('[data-panel]:not([hidden])')).toHaveCount(1);

    /*
     * Los paneles van en orden de calendario, así que se abre el último —el partido más reciente— y
     * de ahí solo se puede ir hacia atrás: la flecha derecha arranca deshabilitada.
     */
    const visible = tarjeta.locator('[data-panel]:not([hidden])');
    await expect(visible).toHaveAttribute('data-panel', ids[ids.length - 1] as string);
    await expect(siguiente).toBeDisabled();

    /* Izquierda es el partido anterior: el panel que está justo antes en el documento. */
    await tarjeta.locator('[data-alineacion-anterior]').click();
    const segundo = ids[ids.length - 2] as string;
    await expect(visible).toHaveAttribute('data-panel', segundo);
    await expect(page).toHaveURL(new RegExp(`fecha=${segundo}`));
    await expect(siguiente).toBeEnabled();

    /* Y los puntos dicen dónde estás y permiten saltar directo. */
    const puntos = tarjeta.locator('[data-alineacion-punto]');
    expect(await puntos.count()).toBe(ids.length);
    await expect(puntos.nth(ids.length - 2)).toHaveAttribute('aria-current', 'true');
    await puntos.first().click();
    await expect(visible).toHaveAttribute('data-panel', ids[0] as string);

    /* Once fichas en la cancha del panel abierto, no las de los cinco paneles juntos. */
    const abierto = tarjeta.locator('[data-panel]:not([hidden])');
    expect(await abierto.locator('[data-cancha] [data-iman]').count()).toBe(11);
    /* Y el banco, fuera de la cancha: los suplentes no tienen casilla donde ponerlos. */
    await expect(abierto.getByRole('heading', { name: /el banco/i })).toBeVisible();
    expect(await abierto.locator('[data-cancha]').getByText(/el banco/i).count()).toBe(0);

    /* El enlace con la fecha abre ese mismo partido. */
    await page.goto(`/?equipo=alianza-lima&fecha=${segundo}`);
    await expect(tarjeta.locator('[data-panel]:not([hidden])')).toHaveAttribute(
      'data-panel',
      segundo as string,
    );
  });

  /*
   * Un jugador también se abre dentro de la home: se llega desde los goleadores de una liga y desde
   * lo mejor del día, y en los dos casos salir de la página para ver una ficha es de más.
   */
  test('un goleador se abre dentro de la home', async ({ page, isMobile }) => {
    test.skip(isMobile, 'la barra lateral no se muestra en móvil');
    await page.goto('/?liga=primera-division');

    const jugador = page.locator('main a[href^="/?jugador="]').first();
    test.skip((await jugador.count()) === 0, 'esta liga todavía no tiene goleadores cargados');
    const slug = (await jugador.getAttribute('href'))!.replace('/?jugador=', '');
    await jugador.click();

    await expect(page).toHaveURL(new RegExp(`\\?jugador=${slug}$`));
    await expect(page.getByRole('link', { name: /ver el perfil completo/i })).toHaveAttribute(
      'href',
      `/jugadores/${slug}`,
    );
    await expect(page.locator('main nav[aria-label="Navegación de la home"]')).toBeVisible();
  });

  /*
   * Dentro de una liga, "lo mejor del día" de todo el mundo no dice nada. El riel pasa a mostrar el
   * once ideal de la última jornada de esa liga.
   */
  /*
   * El centro cuenta qué pasa y el riel cómo va: para llegar a la fecha de hoy había que pasar por
   * dieciocho filas de tabla, así que los partidos van primero y la tabla se mudó al riel.
   */
  test('en una liga, el centro arranca en los partidos y la tabla vive en el riel', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/?liga=primera-division');

    const liga = page.locator('section', { has: page.getByRole('link', { name: /ver la liga completa/i }) });
    await expect(liga.getByRole('heading', { name: /próximos partidos|últimos resultados/i }).first()).toBeVisible();
    /* La tabla ya no está en el centro: si vuelve, este bloque deja de tener sentido. */
    await expect(liga.locator('table')).toHaveCount(0);

    /* Y el orden dentro de la tarjeta: los partidos antes de los goleadores. */
    const partidos = await liga
      .getByRole('heading', { name: /próximos partidos/i })
      .first()
      .boundingBox();
    const goleadores = await liga.getByRole('heading', { name: /goleadores/i }).first().boundingBox();
    expect(partidos!.y).toBeLessThan(goleadores!.y);

    /* En móvil el riel va debajo y no tiene columna propia, pero la tabla sigue siendo suya. */
    const riel = page.locator('main aside').last();
    await expect(riel.getByRole('heading', { name: /tabla de posiciones/i })).toBeVisible();
    await expect(riel.locator('table')).toHaveCount(1);

    if (!isMobile) {
      /* En escritorio, el riel está al costado: su tabla arranca a la derecha del centro. */
      const centro = await liga.boundingBox();
      const tabla = await riel.locator('table').boundingBox();
      expect(tabla!.x).toBeGreaterThan(centro!.x + centro!.width - 4);
    }
  });

  test('en una liga el riel muestra el once de esa liga', async ({ page, isMobile }) => {
    test.skip(isMobile, 'el riel no se muestra en móvil');
    await page.goto('/?liga=primera-division');

    const once = page.getByRole('heading', { name: /el once de la fecha/i });
    test.skip((await once.count()) === 0, 'esta liga todavía no tiene notas para armar el once');
    await expect(once).toBeVisible();
    /* Y deja de mostrar lo mejor del día global. */
    await expect(page.getByRole('heading', { name: /lo mejor de/i })).toHaveCount(0);

    /*
     * Once fichas sobre la cancha, no una lista: si `layout` deja de cerrar la formación, el
     * componente cae a la lista por puesto y esto lo dice.
     */
    const riel = page.locator('main aside').last();
    const fichas = riel.locator('[data-iman]');
    expect(await fichas.count()).toBe(11);

    /* Vertical: más alta que ancha, porque vive en un riel de 24rem. */
    const cancha = await riel.locator('[class*="aspect-"]').first().boundingBox();
    expect(cancha!.height).toBeGreaterThan(cancha!.width);

    /* El arquero abajo y los delanteros arriba, como se mira una alineación. */
    const alturas = await fichas.evaluateAll((as) =>
      as.map((a) => Math.round(a.getBoundingClientRect().top)),
    );
    expect(Math.max(...alturas)).toBeGreaterThan(Math.min(...alturas) + 100);

    /*
     * Y la ficha abre las estadísticas de ese partido, que es el partido por el que el jugador
     * entró al once. Antes navegaba a su perfil y perdías el contexto de la jornada.
     */
    const ficha = page.locator('#ficha-jugador');
    await expect(ficha).toBeHidden();
    await fichas.first().click();
    await expect(ficha).toBeVisible();
    await expect(ficha.locator('#ficha-nombre')).not.toBeEmpty();
    /*
     * Los tres destacados —minutos, nota y goles— y al menos una fila de detalle. Contar más de dos
     * filas era medir una casualidad: a un arquero el proveedor le manda dos estadísticas, así que
     * la prueba se caía cuando el once de la fecha lo abría un arquero.
     */
    expect(await ficha.locator('[data-ficha-destacados] > *').count()).toBe(3);
    expect(await ficha.locator('[data-ficha-detalle] > *').count()).toBeGreaterThan(0);
  });

  /*
   * Abrir un equipo o una liga es una navegación de verdad: la página se rearma en el servidor. Sin
   * recordar el árbol, los países que habías desplegado se cerraban y el scroll volvía arriba, como
   * si hubieras entrado de nuevo. De una vista a otra solo tiene que cambiar el contenedor.
   */
  test('la barra lateral no se reinicia al abrir un equipo', async ({ page, isMobile }) => {
    test.skip(isMobile, 'la barra lateral no se muestra en móvil');
    await page.goto('/?liga=primera-division');

    const nav = page.locator('main nav[aria-label="Navegación de la home"]');
    /* se despliega algo que el servidor no abre solo: así se comprueba que se recordó */
    await nav.locator('summary').filter({ hasText: /Uruguay/ }).first().click();
    const abiertas = (r: typeof nav) =>
      r.locator('details[open]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.rama));
    const antes = await abiertas(nav);
    expect(antes).toContain('pais:UY');

    await page.locator('main a[href^="/?equipo="]').first().click();
    await expect(page).toHaveURL(/\?equipo=/);

    expect(await abiertas(nav)).toEqual(antes);
  });

  /*
   * Los favoritos viven en el navegador y eso hay que decirlo: un favorito que desaparece al
   * cambiar de dispositivo, sin haberlo avisado, se siente como un bug.
   */
  test('marcar una liga favorita avisa dónde queda guardada', async ({ page, isMobile }) => {
    test.skip(isMobile, 'la barra lateral no se muestra en móvil');
    await page.goto('/');

    const nav = page.locator('main nav[aria-label="Navegación de la home"]');
    await nav.locator('summary').filter({ hasText: /Per[uú]/ }).first().click();
    await nav.locator('button[data-favorito]').first().click();

    await expect(page.getByText(/en este navegador/i)).toBeVisible();
    await expect(nav.locator('[data-favoritos-lista] a')).toHaveCount(1);
    await expect(nav.locator('button[data-favorito][aria-pressed="true"]')).toHaveCount(1);
  });

  test('la home agrupa los partidos del día por continente y país', async ({ page }) => {
    await page.goto('/');
    const grupos = page.locator('main details > summary h3');
    expect(await grupos.count()).toBeGreaterThan(0);

    // una sola columna: los continentes se apilan, no se reparten en tres
    const primero = await grupos.first().boundingBox();
    const ultimo = await grupos.last().boundingBox();
    if (primero && ultimo && (await grupos.count()) > 1) {
      expect(Math.abs(primero.x - ultimo.x)).toBeLessThan(4);
    }
  });

  /*
   * El filtro por país va por URL: si alguien lo convierte en estado hidratado, el enlace deja
   * de ser compartible y el botón atrás deja de funcionar.
   */
  test('filtrar por país es una URL compartible', async ({ page, isMobile }) => {
    test.skip(isMobile, 'el filtro lateral no se muestra en móvil');
    await page.goto('/');

    const nav = page.locator('main nav[aria-label="Navegación de la home"]');
    await nav.locator('summary').filter({ hasText: /Per[uú]/ }).first().click();

    const peru = nav.locator('a[href="/?pais=PE"]');
    test.skip((await peru.count()) === 0, 'Perú no está en el catálogo');

    await peru.first().click();
    await expect(page).toHaveURL(/\?pais=PE/);
    await expect(page.getByRole('heading', { level: 2, name: /hoy en per/i })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('el índice de partidos navega entre días', async ({ page }) => {
    await page.goto('/partidos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/partidos/i);

    await page.getByLabel('Día anterior').click();
    await expect(page).toHaveURL(/\/partidos\?fecha=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('una fecha inválida no rompe la página', async ({ page }) => {
    const res = await page.goto('/partidos?fecha=maniana');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  /*
   * El marcador lleva `view-transition-name`, y eso lo promueve a su propia capa: sin
   * pointer-events-none esa capa tapa el enlace estirado y el centro de cada fila deja de ser
   * clickeable. Es invisible a ojo y se rompe con una clase de menos.
   */
  test('el centro de una fila de partido es clickeable, no solo los bordes', async ({ page }) => {
    await page.goto('/partidos');
    const marcador = page.locator('main [data-marcador], main a[href^="/partidos/"]').first();
    await expect(marcador).toBeAttached();

    const fila = page.locator('main a[href^="/partidos/"]').first();
    const caja = await fila.boundingBox();
    expect(caja).not.toBeNull();

    // clic en el centro geométrico: justo donde vive el marcador
    await page.mouse.click(caja!.x + caja!.width / 2, caja!.y + caja!.height / 2);
    // timeout amplio: la vista de partido arma la cancha y viaja a Supabase
    await expect(page).toHaveURL(/\/partidos\/[0-9a-f-]{36}/, { timeout: 20_000 });
  });

  /*
   * El pie pasó a una línea cuando el catálogo se mudó al cajón: repetir seis ligas ahí era
   * ruido con costo. Lo que no puede faltar son las dos salidas.
   */
  test('el pie deja salidas al catálogo y al calendario', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Competencias' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Calendario' })).toBeVisible();
  });
});

test.describe('iconografía', () => {
  /*
   * Los emojis se usaban como iconos y se veían distintos en cada sistema operativo.
   * Este test es el que impide que vuelvan sin que nadie lo note.
   */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

  for (const ruta of RUTAS) {
    test(`${ruta} no usa emojis como iconos`, async ({ page }) => {
      await page.goto(ruta);
      const texto = await page.locator('body').innerText();
      const halladas = [...texto].filter((c) => EMOJI.test(c));
      expect(halladas, `emojis encontrados: ${halladas.join(' ')}`).toHaveLength(0);
    });
  }

  test('los iconos heredan color del tema en lugar de fijar un hex', async ({ page }) => {
    await page.goto('/');
    const conHex = await page
      .locator('svg [stroke^="#"], svg [fill^="#"], svg[stroke^="#"], svg[fill^="#"]')
      .count();
    expect(conHex).toBe(0);
  });
});
