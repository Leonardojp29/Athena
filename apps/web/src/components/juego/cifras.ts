/**
 * Cómo se escriben los números del juego.
 *
 * Estaba triplicado —`Ofertas`, `Ficha` y el chip de `Celebracion` tenían cada uno su versión— y las
 * tres decían lo mismo de forma distinta: "540 mil", "540 K" y "0.5 M" para la misma plata.
 */

/** Millones a texto. Sobre diez millones los decimales no dicen nada. */
export function plata(millones: number): string {
  if (millones >= 10) return `${Math.round(millones)} M`;
  if (millones >= 1) return `${millones.toFixed(1).replace('.', ',')} M`;
  return `${Math.round(millones * 1000)} mil`;
}

/**
 * Los seguidores de Instagram, derivados de la fama.
 *
 * No es un dial nuevo del estado a propósito: el motor ya mueve `fama` en cada decisión, así que un
 * ampay te sube los seguidores sin que nadie tenga que acordarse de tocar dos números. La curva es
 * exponencial porque así funciona: pasar de conocido a famoso multiplica la audiencia, no le suma.
 * Y la exposición modula el resultado —el que vive en la portada tiene más seguidores que el que
 * juega igual de bien y no sale nunca—.
 */
export function seguidoresDe(fama: number, exposicion: number): number {
  const base = 10_000 * Math.exp(0.0842 * Math.max(0, fama));
  return Math.round(base * (0.75 + Math.max(0, exposicion) / 200));
}

/** Un número de seguidores como se lee en un perfil: 28 mil, 1,3 M, 22 M. */
export function seguidores(fama: number, exposicion: number): string {
  const total = seguidoresDe(fama, exposicion);
  if (total >= 10_000_000) return `${Math.round(total / 1_000_000)} M`;
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (total >= 1_000) return `${Math.round(total / 1_000)} mil`;
  return String(total);
}
