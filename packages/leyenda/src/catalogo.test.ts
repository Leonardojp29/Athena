/**
 * Las reglas del catálogo, vigiladas.
 *
 * Tres cosas se rompieron de verdad y por eso están acá: eventos escritos con condiciones imposibles
 * que nunca se vieron en una partida, dos opciones del mismo evento con la misma pista palabra por
 * palabra —o sea tres voces donde tenían que haber cuatro—, y el escándalo sin graduar: a los
 * dieciocho el juego ofrecía un rondo mientras la cadena del amaño también era alcanzable.
 */
import { describe, expect, it } from 'vitest';
import { CAPITULOS, categoriasDelPaso } from './capitulo.js';
import {
  CAPITULO_DE_PICANTE,
  CATALOGO,
  OPCIONES_POR_EVENTO,
  picanteDe,
  type Evento,
} from './eventos/index.js';

/** El primer capítulo en el que un evento puede aparecer, cruzando su categoría con su picante. */
function primerCapituloPosible(evento: Evento): number | null {
  for (let capitulo = 0; capitulo < CAPITULOS; capitulo++) {
    if (capitulo < CAPITULO_DE_PICANTE[picanteDe(evento)]) continue;
    if (categoriasDelPaso(capitulo).includes(evento.categoria)) return capitulo;
  }
  return null;
}

/** La edad del jugador en cada capítulo: se empieza a los 16 y cada capítulo son dos años. */
const edadEn = (capitulo: number) => 16 + capitulo * 2;

describe('el catálogo', () => {
  it('no tiene ids repetidos', () => {
    const ids = CATALOGO.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada evento ofrece cuatro voces', () => {
    for (const evento of CATALOGO) {
      expect(evento.opciones, evento.id).toHaveLength(OPCIONES_POR_EVENTO);
    }
  });

  /* Dos opciones con la misma pista son la misma opción escrita dos veces. */
  it('ninguna opción repite el texto ni la pista de otra del mismo evento', () => {
    for (const evento of CATALOGO) {
      const textos = evento.opciones.map((o) => o.texto);
      const pistas = evento.opciones.map((o) => o.pista).filter((p): p is string => Boolean(p));
      expect(new Set(textos).size, `${evento.id}: textos repetidos`).toBe(textos.length);
      expect(new Set(pistas).size, `${evento.id}: pistas repetidas`).toBe(pistas.length);
    }
  });

  it('toda opción avisa lo que se juega', () => {
    for (const evento of CATALOGO) {
      for (const opcion of evento.opciones) {
        expect(opcion.pista, `${evento.id}/${opcion.id}`).toBeTruthy();
      }
    }
  });

  it('los ids de las opciones no se repiten dentro de un evento', () => {
    for (const evento of CATALOGO) {
      const ids = evento.opciones.map((o) => o.id);
      expect(new Set(ids).size, evento.id).toBe(ids.length);
    }
  });

  it('el resultado cuenta qué pasó, no solo qué hiciste', () => {
    /*
     * La queja que este test existe para que no vuelva: "Dijiste que iban a ganar. La frase quedó en
     * la portada" no es una consecuencia, es la crónica de lo que el jugador ya sabe que hizo. Una
     * consecuencia tiene desenlace, y un desenlace no cabe en ocho palabras.
     */
    const cortos: string[] = [];
    for (const evento of CATALOGO) {
      for (const opcion of evento.opciones) {
        /*
         * Con riesgo, el desenlace vive en los dos relatos; sin riesgo, en el resultado. Cuando la
         * rama termina la carrera, el desenlace lo cuenta el texto del final y el relato es el golpe
         * seco que lo precede: ahí lo corto es lo correcto.
         */
        const ramas: Array<[string, { final?: unknown } | undefined]> = opcion.riesgo
          ? [
              [opcion.riesgo.relatoBien, opcion.riesgo.bien],
              [opcion.riesgo.relatoMal, opcion.riesgo.mal],
            ]
          : [[opcion.resultado, opcion.efectos]];
        for (const [texto, efectos] of ramas) {
          if (efectos?.final) continue;
          if (texto.split(' ').length < 12) cortos.push(`${evento.id}/${opcion.id}: "${texto}"`);
        }
      }
    }
    expect(cortos).toEqual([]);
  });

  it('toda opción arriesgada avisa en la pista y cuenta las dos caras', () => {
    for (const evento of CATALOGO) {
      for (const opcion of evento.opciones) {
        if (!opcion.riesgo) continue;
        expect(opcion.pista, `${evento.id}/${opcion.id}`).toBeTruthy();
        expect(opcion.riesgo.prob).toBeGreaterThan(0);
        expect(opcion.riesgo.prob).toBeLessThan(1);
        expect(opcion.riesgo.relatoBien.length).toBeGreaterThan(0);
        expect(opcion.riesgo.relatoMal.length).toBeGreaterThan(0);
      }
    }
  });

  it('un final de carrera solo llega por una opción que lo avisa', () => {
    for (const evento of CATALOGO) {
      for (const opcion of evento.opciones) {
        const final = opcion.efectos.final ?? opcion.riesgo?.mal.final ?? opcion.riesgo?.bien.final;
        if (!final) continue;
        /* Nunca sale de la nada: la pista tiene que estar y el texto tiene que contar qué pasó. */
        expect(opcion.pista, `${evento.id}/${opcion.id}`).toBeTruthy();
        expect(final.texto.length).toBeGreaterThan(30);
      }
    }
  });

  it('todo evento es alcanzable alguna vez', () => {
    for (const evento of CATALOGO) {
      expect(primerCapituloPosible(evento), `${evento.id} no sale nunca`).not.toBeNull();
    }
  });

  /*
   * Una condición de edad que la categoría vuelve imposible es letra muerta. Pasaba: el número
   * retirado pedía 32 años y `legado` no abría hasta los 34, así que ese `edadMin` no significaba
   * nada. El test viejo solo miraba que existiera *alguna* intersección.
   */
  it('ninguna condición de edad es letra muerta', () => {
    for (const evento of CATALOGO) {
      const capitulo = primerCapituloPosible(evento);
      if (capitulo === null || evento.condiciones?.edadMin === undefined) continue;
      expect(
        evento.condiciones.edadMin,
        `${evento.id}: pide edadMin ${evento.condiciones.edadMin} pero recién puede salir a los ${edadEn(capitulo)}`,
      ).toBeGreaterThanOrEqual(edadEn(capitulo) - 1);
    }
  });

  it('un evento con techo de edad llega antes de ese techo', () => {
    for (const evento of CATALOGO) {
      const capitulo = primerCapituloPosible(evento);
      if (capitulo === null || evento.condiciones?.edadMax === undefined) continue;
      expect(evento.condiciones.edadMax, `${evento.id}`).toBeGreaterThanOrEqual(edadEn(capitulo));
    }
  });

  /* La escalera: a los dieciocho no puede pasar lo que solo le pasa a alguien con plata y prensa. */
  it('el picante sube con la carrera', () => {
    for (const evento of CATALOGO) {
      const capitulo = primerCapituloPosible(evento);
      if (capitulo === null) continue;
      expect(capitulo, `${evento.id} (picante ${picanteDe(evento)})`).toBeGreaterThanOrEqual(
        CAPITULO_DE_PICANTE[picanteDe(evento)],
      );
    }
  });

  it('los tres niveles de picante están escritos', () => {
    for (const nivel of [1, 2, 3] as const) {
      const cuantos = CATALOGO.filter((e) => picanteDe(e) === nivel).length;
      expect(cuantos, `nivel ${nivel}`).toBeGreaterThan(4);
    }
  });

  it('el arranque de la carrera tiene con qué llenarse', () => {
    const alPrincipio = CATALOGO.filter((e) => (primerCapituloPosible(e) ?? 99) <= 2);
    expect(alPrincipio.length).toBeGreaterThan(9);
  });

  /* Una factura agendada que apunta a un evento borrado deja la cadena colgando en el aire. */
  it('toda factura agendada existe en el catálogo', () => {
    const ids = new Set(CATALOGO.map((e) => e.id));
    for (const evento of CATALOGO) {
      for (const opcion of evento.opciones) {
        for (const efectos of [opcion.efectos, opcion.riesgo?.bien, opcion.riesgo?.mal]) {
          if (!efectos?.luego) continue;
          expect(ids.has(efectos.luego.eventoId), `${evento.id} agenda ${efectos.luego.eventoId}`).toBe(true);
          expect(efectos.luego.enCapitulos, `${evento.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  /* Un evento que exige una etiqueta que nadie reparte es un evento que no existe. */
  it('toda etiqueta exigida la reparte alguien', () => {
    const repartidas = new Set<string>();
    for (const evento of CATALOGO) {
      for (const opcion of evento.opciones) {
        for (const efectos of [opcion.efectos, opcion.riesgo?.bien, opcion.riesgo?.mal]) {
          for (const etiqueta of efectos?.etiquetas ?? []) repartidas.add(etiqueta);
        }
      }
    }
    /* Las que reparte el motor y no el catálogo: la memoria de la cancha y del mercado. */
    const delMotor = ['promesa:rota', 'momento:exito', 'momento:fallo', 'regreso:casa', 'debut'];
    for (const evento of CATALOGO) {
      for (const etiqueta of evento.condiciones?.conEtiquetas ?? []) {
        const existe = repartidas.has(etiqueta) || delMotor.some((d) => etiqueta.startsWith(d));
        expect(existe, `${evento.id} exige "${etiqueta}" y nadie la reparte`).toBe(true);
      }
    }
  });

  it('el catálogo no nombra diarios de fuera del grupo', () => {
    const texto = JSON.stringify(CATALOGO);
    for (const prohibido of ['Trome', 'Ojo', 'Depor', 'El Comercio', 'Olé', 'Marca']) {
      expect(texto.includes(prohibido), `aparece ${prohibido}`).toBe(false);
    }
  });

  /* El registro tiene que ser peruano: el catálogo se escribió mezclado y se notaba al leerlo. */
  it('no quedan giros rioplatenses ni monedas de otro país', () => {
    const texto = JSON.stringify(CATALOGO);
    for (const giro of [
      'predio',
      'carta documento',
      'agencia tributaria',
      'la mutual',
      'con vos',
      'tu vieja',
      'boliche',
      'campera',
      'a la noche',
      'un peso',
      'pesos',
    ]) {
      /* El giro entero, no la subcadena: «toda la noche» no es «a la noche». */
      const suelto = new RegExp(`(?<!\\p{L})${giro}(?!\\p{L})`, 'u');
      expect(suelto.test(texto), `aparece "${giro}"`).toBe(false);
    }
  });
});
