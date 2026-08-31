import { describe, expect, it } from 'vitest';
import { crearAzar, entre, pesado, semillaDe } from './azar.js';
import { abrirCarrera, avanzarCapitulo, eventoPendiente } from './capitulo.js';
import { crearCarrera, type DatosDeCreacion } from './crear.js';
import { CAPITULOS, MAX_OFERTAS, type Carrera, type Club, type Liga, type Mundo } from './estado.js';
import { armarOfertas } from './mercado.js';
import { resolverPenal, resolverAtajada, type Intencion } from './momentos.js';
import { calcularOvr, nivelDe, valorDeMercado } from './ovr.js';
import { buscarPrime, calcularVeredicto } from './legado.js';

/* Un mundo mínimo pero con la forma real: tres ligas de distinto peso y clubes de distinta fuerza. */
function mundoDePrueba(): Mundo {
  const club = (
    slug: string,
    fuerza: number,
    liga: Liga | { slug: string; nombre: string; pais: string; continente: string },
    renombre = fuerza,
  ): Club => ({
    slug,
    nombre: slug.replaceAll('-', ' '),
    corto: slug.slice(0, 3).toUpperCase(),
    escudo: null,
    primario: null,
    secundario: null,
    fuerza,
    /* Por omisión el renombre acompaña a la fuerza; los tests que miden la escalera lo fijan a mano. */
    renombre,
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
        club('chico-uno', 44, local, 46),
        club('chico-dos', 48, local, 52),
        club('mediano-uno', 58, local, 61),
        club('grande-local', 68, local, 76),
      ],
    },
    {
      ...grande,
      paisCodigo: 'ES',
      bandera: null,
      peso: 95,
      clubes: [
        club('europeo-uno', 82, grande, 92),
        club('europeo-dos', 88, grande, 96),
        club('europeo-tres', 74, grande, 84),
      ],
    },
    {
      ...media,
      paisCodigo: 'BR',
      bandera: null,
      peso: 70,
      clubes: [club('brasileno-uno', 66, media, 78), club('brasileno-dos', 72, media, 85)],
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
  semilla: 123456,
  anio: 2026,
};

/**
 * Juega una carrera entera eligiendo siempre la primera opción. Con doce capítulos, esto son doce
 * llamadas: si algún día vuelve a hacer falta un tope de miles de vueltas, el juego se alargó otra vez.
 */
function jugarHastaElFinal(carrera: Carrera, mundo: Mundo, tope = 40): Carrera {
  let actual = abrirCarrera(carrera, mundo).carrera;
  let vueltas = 0;
  while (actual.etapa !== 'legado' && vueltas++ < tope) {
    if (actual.pendiente?.clase === 'decision') {
      const pendiente = eventoPendiente(actual, mundo);
      actual = avanzarCapitulo(actual, { tipo: 'decidir', opcionId: pendiente?.opciones[0]?.id ?? '' }, mundo).carrera;
      continue;
    }
    if (actual.pendiente?.clase === 'momento') {
      const intencion: Intencion = { direccion: 0.8, altura: 0.5, potencia: 0.6, timing: 0.8, eleccion: 'cruzado' };
      actual = avanzarCapitulo(actual, { tipo: 'jugar-momento', intencion }, mundo).carrera;
      continue;
    }
    const oferta = actual.ofertas[0];
    actual = oferta
      ? avanzarCapitulo(actual, { tipo: 'firmar', ofertaId: oferta.id }, mundo).carrera
      : avanzarCapitulo(actual, { tipo: 'renovar' }, mundo).carrera;
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
  it('son doce capítulos y ni uno más', () => {
    const mundo = mundoDePrueba();
    const final = jugarHastaElFinal(crearCarrera({ ...datosBase, semilla: 4242 }), mundo);

    expect(final.etapa).toBe('legado');
    /* Doce filas: una por bienio, de los 16 a los 38. Es la promesa del rediseño. */
    expect(final.temporadas.length).toBe(CAPITULOS);
    expect(final.temporadas.at(-1)?.edad).toBe(38);
    expect(final.retiro).not.toBeNull();
    expect(final.retiro?.edad).toBe(39);
    expect(final.clubDeOrigen).not.toBeNull();
    expect(final.recuerdos.some((r) => r.tipo === 'debut')).toBe(true);
  });

  it('cada capítulo avanza dos años y escribe una sola fila', () => {
    const mundo = mundoDePrueba();
    let carrera = abrirCarrera(crearCarrera({ ...datosBase, semilla: 5 }), mundo).carrera;
    /* Firmar el primer club ya juega ese bienio: la fila de los 16 se llena de una. */
    const debut = avanzarCapitulo(carrera, { tipo: 'firmar', ofertaId: carrera.ofertas[0]?.id ?? '' }, mundo);
    expect(debut.carrera.temporadas.length).toBe(1);
    expect(debut.capitulo.fila?.edad).toBe(16);
    carrera = debut.carrera;

    const edades: number[] = [16];
    let vueltas = 0;
    while (carrera.etapa !== 'legado' && vueltas++ < 20) {
      const antes = carrera.temporadas.length;
      const oferta = carrera.ofertas[0];
      const eleccion =
        carrera.pendiente?.clase === 'decision'
          ? ({ tipo: 'decidir', opcionId: eventoPendiente(carrera, mundo)?.opciones[0]?.id ?? '' } as const)
          : carrera.pendiente?.clase === 'momento'
            ? ({
                tipo: 'jugar-momento',
                intencion: { direccion: 0.5, altura: 0.5, potencia: 0.6, timing: 0.8 },
              } as const)
            : oferta
              ? ({ tipo: 'firmar', ofertaId: oferta.id } as const)
              : ({ tipo: 'renovar' } as const);

      const { carrera: siguiente, capitulo } = avanzarCapitulo(carrera, eleccion, mundo);
      expect(siguiente.temporadas.length).toBe(antes + 1);
      expect(capitulo.fila).not.toBeNull();
      edades.push(capitulo.fila?.edad ?? 0);
      carrera = siguiente;
    }
    /* 16, 18, 20… de dos en dos, sin saltos ni repeticiones. */
    expect(edades).toEqual([16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]);
    expect(edades.length).toBe(CAPITULOS);
  });

  it('la misma semilla reproduce la misma carrera', () => {
    const mundo = mundoDePrueba();
    const unaVez = jugarHastaElFinal(crearCarrera({ ...datosBase, semilla: 77 }), mundo);
    const otraVez = jugarHastaElFinal(crearCarrera({ ...datosBase, semilla: 77 }), mundo);
    expect(unaVez.temporadas.map((t) => t.ovrFin)).toEqual(otraVez.temporadas.map((t) => t.ovrFin));
    expect(unaVez.trofeos.length).toBe(otraVez.trofeos.length);
    expect(unaVez.recuerdos.map((r) => r.texto)).toEqual(otraVez.recuerdos.map((r) => r.texto));
  });

  it('el progreso se siente: un juvenil con minutos sube de verdad', () => {
    const mundo = mundoDePrueba();
    const final = jugarHastaElFinal(crearCarrera({ ...datosBase, semilla: 909 }), mundo);
    const primera = final.temporadas[0];
    const pico = Math.max(...final.temporadas.map((t) => t.ovrFin));
    /* De la primera fila al pico tiene que haber un salto visible, no dos puntos. */
    expect(pico - (primera?.ovrInicio ?? 0)).toBeGreaterThan(8);
  });

  it('el veredicto sale de la carrera y no de una lista fija', () => {
    const mundo = mundoDePrueba();
    const final = jugarHastaElFinal(crearCarrera({ ...datosBase, semilla: 2024 }), mundo);
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
    const temporadas = Array.from({ length: 10 }, (_, i) => ({
      anio: 2026 + i * 2,
      edad: 16 + i * 2,
      clubSlug: club.slug,
      clubNombre: club.nombre,
      ligaSlug: club.ligaSlug,
      ligaNombre: club.ligaNombre,
      rol: 'titular' as const,
      partidos: 60,
      goles: 16,
      asistencias: 10,
      notaMedia: 7,
      minutos: 5000,
      amarillas: 6,
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

  it('el prime es la mejor ventana, no el pico de media', () => {
    const fila = (edad: number, goles: number, ovr: number) => ({
      anio: 2020 + edad,
      edad,
      clubSlug: 'c',
      clubNombre: 'C',
      ligaSlug: 'l',
      ligaNombre: 'L',
      rol: 'titular' as const,
      partidos: 60,
      goles,
      asistencias: 8,
      notaMedia: 6.5 + goles / 60,
      minutos: 5000,
      amarillas: 4,
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
    /* La media más alta está a los 34, pero el fútbol estuvo entre los 24 y los 28. */
    const prime = buscarPrime([
      fila(20, 10, 70),
      fila(22, 16, 74),
      fila(24, 50, 80),
      fila(26, 56, 82),
      fila(28, 52, 84),
      fila(34, 8, 88),
    ]);
    expect(prime?.desde).toBeGreaterThanOrEqual(24);
    expect(prime?.hasta).toBeLessThanOrEqual(29);
  });
});
