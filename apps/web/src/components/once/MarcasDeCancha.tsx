/*
 * Las marcas de la cancha en React, con la misma geometría que `PitchMarks.astro`: espacio
 * 1050 × 680, que son los metros reales por diez.
 *
 * Existe una copia porque una isla no puede montar un componente de Astro, y valía más repetir
 * ochenta líneas de SVG que sacar la cancha del juego. Los tres grupos `data-trazo` heredan del
 * sitio la animación del trazado —contorno, áreas y círculos, en ese orden—, que es el gesto del
 * entrenador dibujando y no una textura de tiza imitada.
 */
const L = 1050;
const W = 680;
const FRANJAS = 6;
const franja = L / FRANJAS;

const AREA_GRANDE = { largo: 165, ancho: 403 };
const AREA_CHICA = { largo: 55, ancho: 183 };
const PENAL = 110;
const CIRCULO = 91.5;
/* Media cuerda del arco del área: √(91,5² − (16,5 − 11)²) ≈ 73. */
const ARCO = 73;

const trazo = {
  fill: 'none',
  stroke: 'var(--a-color-chalk)',
  strokeOpacity: 0.5,
  strokeWidth: 3,
  strokeLinejoin: 'round',
} as const;

export function MarcasDeCancha() {
  return (
    <>
      <rect width={L} height={W} fill="var(--a-color-pitch)" />
      {[1, 3, 5].map((i) => (
        <rect key={i} x={i * franja} y="0" width={franja} height={W} fill="var(--a-color-pitch-dark)" />
      ))}

      <g data-trazo="contorno" {...trazo}>
        <rect pathLength="1" x="6" y="6" width={L - 12} height={W - 12} />
        <line pathLength="1" x1={L / 2} y1="6" x2={L / 2} y2={W - 6} />
      </g>

      <g data-trazo="areas" {...trazo}>
        <rect pathLength="1" x="6" y={(W - AREA_GRANDE.ancho) / 2} width={AREA_GRANDE.largo} height={AREA_GRANDE.ancho} />
        <rect pathLength="1" x="6" y={(W - AREA_CHICA.ancho) / 2} width={AREA_CHICA.largo} height={AREA_CHICA.ancho} />
        <rect
          pathLength="1"
          x={L - 6 - AREA_GRANDE.largo}
          y={(W - AREA_GRANDE.ancho) / 2}
          width={AREA_GRANDE.largo}
          height={AREA_GRANDE.ancho}
        />
        <rect
          pathLength="1"
          x={L - 6 - AREA_CHICA.largo}
          y={(W - AREA_CHICA.ancho) / 2}
          width={AREA_CHICA.largo}
          height={AREA_CHICA.ancho}
        />
      </g>

      <g data-trazo="circulos" {...trazo}>
        <circle pathLength="1" cx={L / 2} cy={W / 2} r={CIRCULO} />
        <path
          pathLength="1"
          d={`M ${6 + AREA_GRANDE.largo} ${W / 2 - ARCO} A ${CIRCULO} ${CIRCULO} 0 0 1 ${6 + AREA_GRANDE.largo} ${W / 2 + ARCO}`}
        />
        <path
          pathLength="1"
          d={`M ${L - 6 - AREA_GRANDE.largo} ${W / 2 - ARCO} A ${CIRCULO} ${CIRCULO} 0 0 0 ${L - 6 - AREA_GRANDE.largo} ${W / 2 + ARCO}`}
        />
      </g>

      <g fill="var(--a-color-chalk)" fillOpacity="0.5">
        <circle cx={L / 2} cy={W / 2} r="5" />
        <circle cx={6 + PENAL} cy={W / 2} r="5" />
        <circle cx={L - 6 - PENAL} cy={W / 2} r="5" />
      </g>
    </>
  );
}
