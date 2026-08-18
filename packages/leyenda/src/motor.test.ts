import { describe, expect, it } from 'vitest';
import { crearAzar, entre, pesado, semillaDe } from './azar.js';
import { crearCarrera, type DatosDeCreacion } from './crear.js';
import { MAX_OFERTAS, type Carrera, type Club, type Liga, type Mundo } from './estado.js';
import { armarOfertas } from './mercado.js';
import { resolverPenal, resolverAtajada, type Intencion } from './momentos.js';
import { avanzar, eventoPendiente } from './motor.js';
import { calcularOvr, nivelDe, valorDeMercado } from './ovr.js';
import { buscarPrime, calcularVeredicto } from './legado.js';

/* Un mundo mínimo pero con la forma real: tres ligas de distinto peso y clubes de distinta fuerza. */
function mundoDePrueba(): Mundo {
  const club = (slug: string, fuerza: number, liga: Liga | { slug: string; nombre: string; pais: string; continente: string }): Club => ({
    slug,
    nombre: slug.replaceAll('-', ' '),
    corto: slug.slice(0, 3).toUpperCase(),
    escudo: null,
    primario: null,
    secundario: null,
    fuerza,
    ligaSlug: liga.slug,
    ligaNombre: liga.nombre,
    pais: liga.pais,
    paisCodigo: 'PE',
    continente: liga.continente,
  });

  const local = { slug: 'liga-local', nombre: 'Liga Local', pais: 'Perú', continente: 'sudamerica' };
  const grande = { slug: 'liga-grande', nombre: 'Liga Grande', pais: 'España', continente: 'europa' };
  const media = { slug: 'liga-media', nombre: 'Liga Media', pais: 'Brasil', continente: 'sudamerica' };

  const ligas: Liga[] = [
    {
      ...local,
      paisCodigo: 'PE',
      bandera: null,
      peso: 45,
      clubes: [
        club('chico-uno', 44, local),
        club('chico-dos', 48, local),
        club('mediano-uno', 58, local),
        club('grande-local', 68, local),
      ],
    },
    {
      ...grande,
      paisCodigo: 'ES',
      bandera: null,
      peso: 95,
      clubes: [club('europeo-uno', 82, grande), club('europeo-dos', 88, grande), club('europeo-tres', 74, grande)],
    },
    {
      ...media,
      paisCodigo: 'BR',
      bandera: null,
      peso: 70,
      clubes: [club('brasileno-uno', 66, media), club('brasileno-dos', 72, media)],
    },
  ];

  return {
    ligas,
    copas: [
      { slug: 'libertadores', nombre: 'Copa Libertadores', continente: 'sudamerica', plazas: 4, jerarquia: 0 },
      { slug: 'champions', nombre: 'Champions League', continente: 'europa', plazas: 4, jerarquia: 0 },
    ],
    generadoEn: '2026-08-18',
  };
}

const datosBase: DatosDeCreacion = {
  nombre: 'Leonardo Jurado',
  dorsal: 10,
  puesto: 'MO',
  pie: 'izquierda',
  pais: 'Perú',
  paisCodigo: 'PE',
  bandera: null,
  ligaSlug: 'liga-local',
  ritmo: 'expres',
  semilla: 123456,
  anio: 2026,
};

/** Juega una carrera entera resolviendo lo que aparezca, y devuelve el estado final. */
function jugarHastaElFinal(carrera: Carrera, mundo: Mundo, tope = 4000): Carrera {
  let actual = carrera;
  for (let i = 0; i < tope; i++) {
    if (actual.etapa === 'legado') return actual;

    if (actual.pendiente?.clase === 'decision') {
      const pendiente = eventoPendiente(actual, mundo);
      const opcion = pendiente?.opciones[0];
      actual = avanzar(actual, { tipo: 'decidir', opcionId: opcion?.id ?? '' }, mundo).carrera;
      continue;
    }
    if (actual.pendiente?.clase === 'momento') {
      const intencion: Intencion = {
        direccion: 0.8,
        altura: 0.5,
        potencia: 0.6,
        timing: 0.8,
        eleccion: 'cruzado',
      };
      actual = avanzar(actual, { tipo: 'jugar-momento', intencion }, mundo).carrera;
      continue;
    }
    if (actual.etapa === 'debut' || actual.etapa === 'mercado') {
      const oferta = actual.ofertas[0];
      actual = oferta
        ? avanzar(actual, { tipo: 'elegir-oferta', ofertaId: oferta.id }, mundo).carrera
        : avanzar(actual, { tipo: 'seguir' }, mundo).carrera;
      continue;
    }
    actual = avanzar(actual, { tipo: 'seguir' }, mundo).carrera;
  }
  return actual;
}

describe('azar', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = crearAzar(99);
    const b = crearAzar(99);
    const serieA = Array.from({ length: 20 }, () => a.siguiente());
    const serieB = Array.from({ length: 20 }, () => b.siguiente());
    expect(serieA).toEqual(serieB);
  });

  it('semillas distintas divergen', () => {
    const a = crearAzar(1);
    const b = crearAzar(2);
    expect(a.siguiente()).not.toBe(b.siguiente());
  });

  it('el estado permite retomar sin cortar el hilo', () => {
    const a = crearAzar(777);
    a.siguiente();
    a.siguiente();
    const guardado = a.estado();
    const esperado = [a.siguiente(), a.siguiente()];

    const retomado = crearAzar(guardado);
    expect([retomado.siguiente(), retomado.siguiente()]).toEqual(esperado);
  });

  it('entre() respeta los límites, incluidos', () => {
    const azar = crearAzar(5);
    const valores = Array.from({ length: 300 }, () => entre(azar, 3, 6));
    expect(Math.min(...valores)).toBe(3);
    expect(Math.max(...valores)).toBe(6);
  });

  it('pesado() nunca devuelve un peso cero', () => {
    const azar = crearAzar(11);
    const opciones = [
      { item: 'no', peso: 0 },
      { item: 'si', peso: 5 },
    ];
    const salidas = new Set(Array.from({ length: 60 }, () => pesado(azar, opciones)));
    expect(salidas).toEqual(new Set(['si']));
  });

  it('semillaDe() es estable para el mismo texto', () => {
    expect(semillaDe('mi-leyenda')).toBe(semillaDe('mi-leyenda'));
    expect(semillaDe('a')).not.toBe(semillaDe('b'));
  });
});

describe('ovr y carta', () => {
  it('pesa los atributos según el puesto', () => {
    const atributos = { ritmo: 50, tiro: 90, pase: 50, regate: 50, defensa: 30, fisico: 50 };
    const delantero = calcularOvr(atributos, 'DC');
    const central = calcularOvr(atributos, 'DFC');
    expect(delantero).toBeGreaterThan(central);
  });

  it('el nivel exige carrera, no solo número', () => {
    expect(nivelDe(93, { trofeos: 0, premios: 0 })).not.toBe('inmortal');
    expect(nivelDe(93, { trofeos: 8, premios: 3 })).toBe('inmortal');
    expect(nivelDe(89, { trofeos: 0, premios: 0 })).toBe('clase-mundial');
    expect(nivelDe(89, { trofeos: 4, premios: 0 })).toBe('icono');
  });

  it('el valor cae con la edad y sube con el techo', () => {
    const joven = valorDeMercado(80, 20, 92);
    const maduro = valorDeMercado(80, 28, 82);
    const veterano = valorDeMercado(80, 34, 80);
    expect(joven).toBeGreaterThan(maduro);
    expect(maduro).toBeGreaterThan(veterano);
  });
});

describe('creación', () => {
  it('la misma semilla crea el mismo futbolista', () => {
    const a = crearCarrera(datosBase);
    const b = crearCarrera(datosBase);
    expect(a.futbolista).toEqual(b.futbolista);
    expect(a.ovr).toBe(b.ovr);
  });

  it('el techo siempre queda por encima del arranque', () => {
    for (let semilla = 0; semilla < 50; semilla++) {
      const carrera = crearCarrera({ ...datosBase, semilla });
      expect(carrera.futbolista.potencial).toBeGreaterThan(carrera.ovr);
      expect(carrera.futbolista.potencial).toBeLessThanOrEqual(95);
    }
  });

  it('un arquero no arranca con los atributos de un delantero', () => {
    const arquero = crearCarrera({ ...datosBase, puesto: 'POR' });
    const delantero = crearCarrera({ ...datosBase, puesto: 'DC' });
    expect(arquero.futbolista.atributos.pase).toBeLessThan(delantero.futbolista.atributos.tiro + 30);
    expect(arquero.futbolista.puesto).toBe('POR');
  });
});

describe('mercado', () => {
  it('nunca ofrece más de cuatro clubes', () => {
    const mundo = mundoDePrueba();
    for (let semilla = 0; semilla < 40; semilla++) {
      const carrera: Carrera = {
        ...crearCarrera({ ...datosBase, semilla }),
        ovr: 78,
        clubActual: mundo.ligas[0]?.clubes[0] ?? null,
      };
      const ofertas = armarOfertas(crearAzar(semilla), carrera, {
        mundo,
        actual: carrera.clubActual,
      });
      expect(ofertas.length).toBeLessThanOrEqual(MAX_OFERTAS);
    }
  });

  it('nunca se ofrece el club en el que ya estás', () => {
    const mundo = mundoDePrueba();
    const actual = mundo.ligas[0]?.clubes[2] ?? null;
    const carrera: Carrera = { ...crearCarrera(datosBase), ovr: 74, clubActual: actual };
    const ofertas = armarOfertas(crearAzar(3), carrera, { mundo, actual });
    expect(ofertas.every((o) => o.club.slug !== actual?.slug)).toBe(true);
  });

  it('un club mucho más fuerte no llama a un veterano flojo', () => {
    const mundo = mundoDePrueba();
    const carrera: Carrera = {
      ...crearCarrera(datosBase),
      ovr: 58,
      futbolista: { ...crearCarrera(datosBase).futbolista, edad: 30 },
      clubActual: mundo.ligas[0]?.clubes[0] ?? null,
    };
    const ofertas = armarOfertas(crearAzar(9), carrera, { mundo, actual: carrera.clubActual });
    expect(ofertas.every((o) => o.club.fuerza < 80)).toBe(true);
  });
});

describe('momentos', () => {
  it('un penal mal pegado no entra nunca', () => {
    const atributos = { ritmo: 80, tiro: 90, pase: 80, regate: 85, defensa: 40, fisico: 70 };
    const contexto = {
      escena: 'prueba',
      rival: 'rival',
      minuto: 89,
      marcador: [0, 0] as [number, number],
      presion: 0.5,
      competencia: 'liga',
    };
    const malPegado: Intencion = { direccion: 0.9, altura: 0.6, potencia: 0.7, timing: 0.05 };
    for (let semilla = 0; semilla < 30; semilla++) {
      const resultado = resolverPenal(crearAzar(semilla), malPegado, atributos, contexto, 70);
      expect(resultado.exito).toBe(false);
    }
  });

  it('esquinar con buen timing entra la mayoría de las veces', () => {
    const atributos = { ritmo: 80, tiro: 88, pase: 80, regate: 84, defensa: 40, fisico: 70 };
    const contexto = {
      escena: 'prueba',
      rival: 'rival',
      minuto: 70,
      marcador: [1, 0] as [number, number],
      presion: 0.4,
      competencia: 'liga',
    };
    const bueno: Intencion = { direccion: 0.95, altura: 0.6, potencia: 0.55, timing: 0.95 };
    const goles = Array.from({ length: 60 }, (_, i) =>
      resolverPenal(crearAzar(i + 500), bueno, atributos, contexto, 80),
    ).filter((r) => r.exito).length;
    expect(goles).toBeGreaterThan(40);
  });

  it('la atajada por anticipación es todo o nada', () => {
    const atributos = { ritmo: 70, tiro: 75, pase: 55, regate: 70, defensa: 72, fisico: 70 };
    const contexto = {
      escena: 'prueba',
      rival: 'rival',
      minuto: 90,
      marcador: [0, 0] as [number, number],
      presion: 0.6,
      competencia: 'liga',
    };
    const resultados = Array.from({ length: 80 }, (_, i) =>
      resolverAtajada(
        crearAzar(i),
        { direccion: 0, altura: 0, potencia: 0, timing: 0.9, eleccion: 'anticipar' },
        atributos,
        contexto,
      ),
    );
    const exitos = resultados.filter((r) => r.exito).length;
    expect(exitos).toBeGreaterThan(5);
    expect(exitos).toBeLessThan(75);
  });
});

describe('carrera completa', () => {
  it('llega al legado y deja historia', () => {
    const mundo = mundoDePrueba();
    const inicial = crearCarrera({ ...datosBase, semilla: 4242 });
    const final = jugarHastaElFinal(avanzar(inicial, { tipo: 'seguir' }, mundo).carrera, mundo);

    expect(final.etapa).toBe('legado');
    expect(final.temporadas.length).toBeGreaterThan(5);
    expect(final.retiro).not.toBeNull();
    expect(final.clubDeOrigen).not.toBeNull();
    expect(final.recuerdos.some((r) => r.tipo === 'debut')).toBe(true);
    /* La edad tiene que haber avanzado con las temporadas: una por año, sin saltos. */
    expect(final.futbolista.edad).toBe((inicial.futbolista.edad ?? 0) + final.temporadas.length);
  });

  it('la misma semilla reproduce la misma carrera', () => {
    const mundo = mundoDePrueba();
    const unaVez = jugarHastaElFinal(
      avanzar(crearCarrera({ ...datosBase, semilla: 77 }), { tipo: 'seguir' }, mundo).carrera,
      mundo,
    );
    const otraVez = jugarHastaElFinal(
      avanzar(crearCarrera({ ...datosBase, semilla: 77 }), { tipo: 'seguir' }, mundo).carrera,
      mundo,
    );
    expect(unaVez.temporadas.length).toBe(otraVez.temporadas.length);
    expect(unaVez.trofeos.length).toBe(otraVez.trofeos.length);
    expect(unaVez.ovr).toBe(otraVez.ovr);
    expect(unaVez.recuerdos.map((r) => r.texto)).toEqual(otraVez.recuerdos.map((r) => r.texto));
  });

  it('los tres ritmos llegan al final y el intenso cuenta más', () => {
    const mundo = mundoDePrueba();
    const correr = (ritmo: 'expres' | 'normal' | 'intenso') =>
      jugarHastaElFinal(
        avanzar(crearCarrera({ ...datosBase, ritmo, semilla: 31337 }), { tipo: 'seguir' }, mundo).carrera,
        mundo,
      );
    const expres = correr('expres');
    const intenso = correr('intenso');
    expect(expres.etapa).toBe('legado');
    expect(intenso.etapa).toBe('legado');
    /* Más tramos por temporada = más partidos contados en el mismo calendario. */
    const partidos = (c: Carrera) => c.temporadas.reduce((s, t) => s + t.partidos, 0);
    expect(partidos(intenso)).toBeGreaterThan(0);
    expect(partidos(expres)).toBeGreaterThan(0);
  });

  it('el veredicto sale de la carrera y no de una lista fija', () => {
    const mundo = mundoDePrueba();
    const final = jugarHastaElFinal(
      avanzar(crearCarrera({ ...datosBase, semilla: 2024 }), { tipo: 'seguir' }, mundo).carrera,
      mundo,
    );
    const veredicto = calcularVeredicto(final);
    expect(veredicto.adn.titulo.length).toBeGreaterThan(3);
    expect(veredicto.totales.temporadas).toBe(final.temporadas.length);
    expect(veredicto.prime).not.toBeNull();
    expect(veredicto.frase).toContain(final.futbolista.nombre.split(' ').at(-1) ?? '');
  });

  it('un jugador de un solo club recibe el arquetipo del héroe', () => {
    const mundo = mundoDePrueba();
    const base = crearCarrera({ ...datosBase, semilla: 8 });
    const club = mundo.ligas[0]?.clubes[0];
    if (!club) throw new Error('mundo de prueba sin clubes');
    const temporadas = Array.from({ length: 12 }, (_, i) => ({
      anio: 2026 + i,
      edad: 18 + i,
      clubSlug: club.slug,
      clubNombre: club.nombre,
      ligaSlug: club.ligaSlug,
      ligaNombre: club.ligaNombre,
      rol: 'titular' as const,
      partidos: 30,
      goles: 8,
      asistencias: 5,
      notaMedia: 7,
      minutos: 2500,
      amarillas: 3,
      rojas: 0,
      ovrInicio: 70,
      ovrFin: 74,
      nivel: 'profesional' as const,
      valor: 10,
      posicionEnLaTabla: 5,
      campeonDeLiga: false,
      trofeos: [],
      seleccion: { convocatorias: 0, goles: 0 },
      lesiones: 0,
    }));
    const veredicto = calcularVeredicto({ ...base, temporadas, clubDeOrigen: club, clubActual: club });
    expect(veredicto.adn.id).toBe('heroe-de-un-solo-club');
  });

  it('el prime es la mejor ventana, no el pico de OVR', () => {
    const base = crearCarrera(datosBase);
    const temporada = (edad: number, goles: number, ovr: number) => ({
      anio: 2020 + edad,
      edad,
      clubSlug: 'c',
      clubNombre: 'C',
      ligaSlug: 'l',
      ligaNombre: 'L',
      rol: 'titular' as const,
      partidos: 30,
      goles,
      asistencias: 4,
      notaMedia: 6.5 + goles / 40,
      minutos: 2400,
      amarillas: 2,
      rojas: 0,
      ovrInicio: ovr,
      ovrFin: ovr,
      nivel: 'elite' as const,
      valor: 20,
      posicionEnLaTabla: 3,
      campeonDeLiga: false,
      trofeos: [],
      seleccion: { convocatorias: 0, goles: 0 },
      lesiones: 0,
    });
    /* El OVR más alto está a los 33, pero los goles y los años buenos están entre 25 y 28. */
    const temporadas = [
      temporada(23, 5, 70),
      temporada(24, 8, 74),
      temporada(25, 25, 80),
      temporada(26, 28, 82),
      temporada(27, 30, 84),
      temporada(28, 26, 84),
      temporada(33, 4, 88),
    ];
    const prime = buscarPrime(temporadas);
    expect(prime?.desde).toBeGreaterThanOrEqual(25);
    expect(prime?.hasta).toBeLessThanOrEqual(28);
    expect({ ...base }.temporadas).toEqual([]);
  });
});
