import { describe, expect, it } from 'vitest';
import {
  clasificarRondas,
  describirRonda,
  escaleraDesde,
  etapaDeRonda,
  ordenarEtapas,
} from './rounds.js';

describe('describirRonda', () => {
  it('traduce y ordena las llaves de una copa', () => {
    expect(describirRonda('Round of 16')).toMatchObject({
      label: 'Octavos de final',
      eliminatoria: true,
      etapa: 'final',
    });
    /* En número, no en palabras: "treintaidosavos" no se escribe. */
    expect(describirRonda('Round of 32').label).toBe('16avos de final');
    expect(describirRonda('Round of 64').label).toBe('32avos de final');
    expect(describirRonda('Round of 128').label).toBe('64avos de final');
    expect(describirRonda('Quarter-finals')).toMatchObject({ label: 'Cuartos de final' });
    expect(describirRonda('Semi-finals')).toMatchObject({ label: 'Semifinales' });
    expect(describirRonda('Semi-Finals')).toMatchObject({ label: 'Semifinales' });
    expect(describirRonda('Final')).toMatchObject({ label: 'Final', etapa: 'final' });
    expect(describirRonda('Finals')).toMatchObject({ label: 'Final', etapa: 'final' });
  });

  /*
   * Así llama el proveedor a los octavos y a los dieciseisavos. Caían en la regla de la final, y el
   * Mundial de Clubes 2025 mostraba "Final" dos veces con los octavos después de la semifinal.
   */
  it('8th Finals son los octavos y 16th Finals los dieciseisavos, no la final', () => {
    expect(describirRonda('8th Finals')).toMatchObject({ label: 'Octavos de final', etapa: 'final' });
    expect(describirRonda('16th Finals')).toMatchObject({ label: '16avos de final', etapa: 'final' });

    const cwc = clasificarRondas([
      'Group Stage - 1',
      'Quarter-finals',
      'Semi-finals',
      '8th Finals',
      'Final',
      '5th Place Final',
    ]).map((r) => r.label);
    expect(cwc).toEqual([
      'Fase de grupos · fecha 1',
      'Octavos de final',
      'Cuartos de final',
      'Semifinales',
      'Definición de puestos',
      'Final',
    ]);
  });

  /*
   * El repechaje de la fase liga se juega en febrero, después de los grupos; la previa de la UEFA se
   * juega en agosto, antes. Los dos strings terminan en "Play-offs" y compartían regla y rango.
   */
  it('separa el repechaje posterior a la fase liga de la previa de agosto', () => {
    expect(describirRonda('Knockout Round Play-offs')).toMatchObject({
      label: 'Repechaje',
      etapa: 'final',
    });
    expect(describirRonda('Play-offs')).toMatchObject({
      label: 'Repechaje de acceso',
      etapa: 'previa',
    });
    /* Y lo mismo escrito con espacio, que es como lo manda en la Liga MX. */
    expect(describirRonda('Apertura - Play Offs').label).toBe('Apertura · Repechaje de acceso');

    const uefa = clasificarRondas([
      '1st Qualifying Round',
      'Play-offs',
      'League Stage - 8',
      'Knockout Round Play-offs',
      'Round of 16',
      'Final',
    ]).map((r) => r.label);
    expect(uefa).toEqual([
      'Fase previa 1',
      'Repechaje de acceso',
      'Fase liga · fecha 8',
      'Repechaje',
      'Octavos de final',
      'Final',
    ]);
  });

  it('reconoce las fases previas con los dos vocabularios de la Libertadores', () => {
    /* 2026 en adelante. */
    expect(describirRonda('Qualification Round 1').label).toBe('Fase previa 1');
    expect(describirRonda('Qualification Round 3')).toMatchObject({
      label: 'Fase previa 3',
      etapa: 'previa',
    });
    /* Hasta 2025 las nombraba con números, y ahí "1st Round" solo es previa porque hay grupos. */
    const previas = clasificarRondas(['1st Round', '3rd Round', 'Group Stage - 1']);
    expect(previas.slice(0, 2)).toMatchObject([
      { label: 'Fase previa 1', etapa: 'previa' },
      { label: 'Fase previa 3', etapa: 'previa' },
    ]);
  });

  /*
   * La causa de las dos columnas "Final" en la Copa del Rey: así llama el proveedor a las primeras
   * rondas de las copas ibéricas, brasileñas y francesas, y terminan en "finals".
   */
  it('1/128-finals y 1/256-finals son las primeras rondas del cuadro, no la final', () => {
    expect(describirRonda('1/128-finals')).toMatchObject({
      label: '128avos de final',
      etapa: 'final',
    });
    expect(describirRonda('1/256-finals').label).toBe('256avos de final');

    /* La Copa del Rey 2025 completa, en el orden en que se jugó. */
    const copaDelRey = clasificarRondas([
      'Final',
      'Round of 16',
      '1/128-finals',
      'Round of 128',
      'Quarter-finals',
      'Round of 64',
      'Semi-finals',
      'Round of 32',
    ]).map((r) => r.label);
    expect(copaDelRey).toEqual([
      '128avos de final',
      '64avos de final',
      '32avos de final',
      '16avos de final',
      'Octavos de final',
      'Cuartos de final',
      'Semifinales',
      'Final',
    ]);
    /* Y ningún rótulo repetido, que era el síntoma. */
    expect(new Set(copaDelRey).size).toBe(copaDelRey.length);
  });

  /*
   * "3rd Round" significa dos cosas según el torneo, y la diferencia está en la temporada: con fase de
   * grupos es previa —la Libertadores— y sin ella es el cuadro principal —la FA Cup—.
   */
  it('las rondas numeradas son previa con fase de grupos y cuadro sin ella', () => {
    const libertadores = clasificarRondas([
      '1st Round',
      '2nd Round',
      '3rd Round',
      'Group Stage - 1',
      'Round of 16',
      'Final',
    ]);
    expect(libertadores.map((r) => `${r.etapa}:${r.label}`)).toEqual([
      'previa:Fase previa 1',
      'previa:Fase previa 2',
      'previa:Fase previa 3',
      'grupos:Fase de grupos · fecha 1',
      'final:Octavos de final',
      'final:Final',
    ]);

    const faCup = clasificarRondas([
      '1st Round Qualifying',
      '1st Round',
      '4th Round',
      '7th Round',
      'Quarter-finals',
      'Final',
    ]);
    expect(faCup.map((r) => `${r.etapa}:${r.label}`)).toEqual([
      'previa:Fase previa 1',
      'final:1ª ronda',
      'final:4ª ronda',
      'final:7ª ronda',
      'final:Cuartos de final',
      'final:Final',
    ]);
  });

  /* La clasificación de agosto y el cuadro de noviembre caían en el mismo rótulo. */
  it('separa la ronda clasificatoria de la ronda del cuadro', () => {
    expect(describirRonda('1st Round Qualifying').label).toBe('Fase previa 1');
    expect(describirRonda('4th Round Qualifying').label).toBe('Fase previa 4');
    expect(describirRonda('1st Round').label).toBe('1ª ronda');
    expect(describirRonda('1st Round Qualifying').rank).toBeLessThan(
      describirRonda('1st Round').rank,
    );
  });

  /* Dos torneos en una temporada: el rótulo tiene que decir de cuál es la final. */
  it('conserva el torneo cuando la ronda lo nombra', () => {
    expect(describirRonda('Apertura - Final').label).toBe('Apertura · Final');
    expect(describirRonda('Clausura - Final').label).toBe('Clausura · Final');
    expect(describirRonda('Apertura - Quarter-finals').label).toBe('Apertura · Cuartos de final');
    /* Y una fecha numerada no es un torneo: "1st Round - 3" es la fecha 3 de una liguilla. */
    expect(describirRonda('1st Round - 3')).toMatchObject({
      label: '1ª ronda · fecha 3',
      etapa: 'grupos',
      eliminatoria: false,
    });
  });

  /*
   * Ninguno de los treinta y seis encabezados que terminan en "- N" es de eliminación directa, así que
   * un sufijo numérico es siempre una fecha. Sin esto, el Apertura mexicano quedaba sin etapa y las
   * quince fechas de "1st Round - N" de la Liga Pro se dibujaban como quince columnas de cuadro.
   */
  it('una ronda que termina en número es una fecha y no una llave', () => {
    expect(describirRonda('Apertura - 14')).toMatchObject({
      label: 'Apertura · fecha 14',
      etapa: 'grupos',
      eliminatoria: false,
    });
    expect(describirRonda('Clausura - Quadrangular - 3').label).toBe(
      'Clausura · Quadrangular · fecha 3',
    );
    expect(describirRonda('Round - 12').label).toBe('Fecha 12');
    /* Y las que ya tenían regla propia la conservan, con el nombre que usa una liga. */
    expect(describirRonda('Regular Season - 12').label).toBe('Temporada regular · fecha 12');
  });

  /*
   * Salieron de auditar las 243 temporadas del archivo: seis vocabularios distintos que dejaban dos
   * columnas con el mismo nombre en el mismo torneo.
   */
  it('separa las rondas que compartían rótulo en una misma temporada', () => {
    /* El repechaje europeo de la Eredivisie es una llave con semifinal y final. */
    expect(describirRonda('Conference League Play-offs - Semi-finals')).toMatchObject({
      label: 'Repechaje de acceso · Semifinales',
      etapa: 'previa',
    });
    expect(describirRonda('Conference League Play-offs - Final').label).toBe(
      'Repechaje de acceso · Final',
    );

    /* La Copa Chile juega una llave regional y otra nacional en la misma temporada. */
    expect(describirRonda('Regional Semi-finals')).toMatchObject({
      label: 'Regional · semifinales',
      etapa: 'previa',
    });
    expect(describirRonda('Semi-finals').label).toBe('Semifinales');
    expect(describirRonda('Regional Finals').label).toBe('Regional · final');
    expect(describirRonda('Finals').label).toBe('Final');

    /* En los playoffs canadienses la Grand Final es el título y la otra es la puerta de entrada. */
    expect(describirRonda('Grand Final')).toMatchObject({ label: 'Final', rank: 470 });
    expect(describirRonda('Elimination Final').label).toBe('Eliminación');
    expect(describirRonda('Elimination Final').rank).toBeLessThan(describirRonda('Grand Final').rank);

    /* Dos preliminares numeradas seguidas, en la misma copa. */
    expect(describirRonda('3rd Preliminary Round').label).toBe('Preliminar 3');
    expect(describirRonda('4th Preliminary Round').label).toBe('Preliminar 4');

    /* Dos fases de liga con la misma numeración de fechas, y el cierre por grupos de una liga. */
    expect(describirRonda('1st Phase - 3').label).toBe('Primera fase · fecha 3');
    expect(describirRonda('2nd Phase - 3').label).toBe('Segunda fase · fecha 3');
    expect(describirRonda('Championship Group - 5').label).toBe('Grupo campeonato · fecha 5');
    expect(describirRonda('Relegation Group - 5').label).toBe('Grupo descenso · fecha 5');
    expect(describirRonda('Placement Group - 5').label).toBe('Grupo de ubicación · fecha 5');

    /* Los playoffs de la MLS tienen semifinales y finales de conferencia, que no son lo mismo. */
    expect(describirRonda('MLS Cup - Conference Semi-finals').label).toBe(
      'MLS Cup · Semifinales de conferencia',
    );
    expect(describirRonda('MLS Cup - Conference Finals').label).toBe(
      'MLS Cup · Finales de conferencia',
    );
  });

  /* Con el torneo adelante, la ronda seguía siendo una ronda y quedaba fuera del cuadro. */
  it('reconoce la ronda aunque el nombre del torneo venga primero', () => {
    expect(describirRonda('MLS Cup - Round 1')).toMatchObject({
      label: 'MLS Cup · 1ª ronda',
      etapa: 'final',
      eliminatoria: true,
    });
    expect(describirRonda('Apertura - Reclasificación')).toMatchObject({
      label: 'Apertura · Reclasificación',
      etapa: 'final',
    });
    /* Y lo que no es nada sigue sin ser nada: no se inventa una ronda. */
    expect(describirRonda('R66244')).toMatchObject({ etapa: null, eliminatoria: false });
  });

  it('la fase liga del formato nuevo es fase de grupos', () => {
    expect(describirRonda('League Stage - 8')).toMatchObject({
      label: 'Fase liga · fecha 8',
      etapa: 'grupos',
      eliminatoria: false,
    });
    /* La AFC juega las dos zonas a la vez: sin la zona en el rótulo, la fecha 3 existía dos veces. */
    expect(describirRonda('League Phase East - 3')).toMatchObject({
      label: 'Fase liga Este · fecha 3',
      etapa: 'grupos',
    });
    expect(describirRonda('League Phase West - 3').label).toBe('Fase liga Oeste · fecha 3');
    expect(describirRonda('Ranking of second-placed teams - 2')).toMatchObject({
      label: 'Mejores segundos · fecha 2',
      etapa: 'grupos',
    });
  });

  it('distingue las dos preliminares que la CAF juega en la misma temporada', () => {
    expect(describirRonda('1st Preliminary Round').label).toBe('Preliminar 1');
    expect(describirRonda('2nd Preliminary Round').label).toBe('Preliminar 2');
    expect(describirRonda('Preliminary round').label).toBe('Ronda preliminar');
    expect(describirRonda('1st Preliminary Round').rank).toBeLessThan(
      describirRonda('2nd Preliminary Round').rank,
    );
  });

  it('conserva la fecha en la fase de grupos y la letra cuando viene en la ronda', () => {
    expect(describirRonda('Group Stage - 6').label).toBe('Fase de grupos · fecha 6');
    expect(describirRonda('Group Stage - 6').eliminatoria).toBe(false);
    /* Temporadas viejas: la letra del grupo viaja dentro del nombre de la ronda. */
    expect(describirRonda('Group H - 6').label).toBe('Grupo H · fecha 6');
    expect(describirRonda('Group A - 1')).toMatchObject({ label: 'Grupo A · fecha 1', etapa: 'grupos' });
  });

  it('el tercer puesto no es la final', () => {
    expect(describirRonda('3rd Place Final').label).toBe('Tercer puesto');
    expect(describirRonda('Third place').label).toBe('Tercer puesto');
    expect(describirRonda('3rd Place Final').rank).toBeLessThan(describirRonda('Final').rank);
  });

  it('lo que no reconoce lo deja como vino, sin adivinar y fuera del cuadro', () => {
    expect(describirRonda('Copa Perú - Etapa Nacional')).toMatchObject({
      label: 'Copa Perú - Etapa Nacional',
      rank: 999,
      eliminatoria: false,
      etapa: null,
    });
    /* Basura del proveedor: mejor afuera que inventada. */
    expect(describirRonda('R66244').etapa).toBeNull();
  });
});

describe('etapas', () => {
  it('dice a qué etapa pertenece una ronda', () => {
    expect(etapaDeRonda('Round of 16')).toBe('final');
    expect(etapaDeRonda('Group Stage - 3')).toBe('grupos');
    expect(etapaDeRonda('2nd Qualifying Round')).toBe('previa');
    expect(etapaDeRonda(null)).toBeNull();
  });

  /*
   * Lo que hace que la página se reordene sola: mientras se juegan los octavos manda el cuadro, y
   * cuando arranca la fase de grupos de la temporada siguiente manda la fase de grupos.
   */
  it('pone primero la etapa en juego y después el resto por importancia', () => {
    expect(ordenarEtapas('final')).toEqual(['final', 'grupos', 'previa']);
    expect(ordenarEtapas('grupos')).toEqual(['grupos', 'final', 'previa']);
    expect(ordenarEtapas('previa')).toEqual(['previa', 'final', 'grupos']);
    expect(ordenarEtapas(null)).toEqual(['final', 'grupos', 'previa']);
  });
});

describe('escaleraDesde', () => {
  /* Con los octavos en marcha ya se sabe que vienen cuartos, semis y final. */
  it('deduce el camino que falta hasta la final', () => {
    expect(escaleraDesde(8)).toEqual([
      { label: 'Cuartos de final', rank: 440, llaves: 4 },
      { label: 'Semifinales', rank: 450, llaves: 2 },
      { label: 'Final', rank: 470, llaves: 1 },
    ]);
    expect(escaleraDesde(2)).toEqual([{ label: 'Final', rank: 470, llaves: 1 }]);
    expect(escaleraDesde(1)).toEqual([]);
  });

  it('no inventa una escalera cuando el número de llaves no se parte en dos', () => {
    expect(escaleraDesde(3)).toEqual([]);
    expect(escaleraDesde(6)).toEqual([]);
    expect(escaleraDesde(0)).toEqual([]);
  });
});
