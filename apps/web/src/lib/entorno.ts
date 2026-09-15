const sinBarraFinal = (url: string): string => url.replace(/\/+$/, '');

export const API_URL = sinBarraFinal(
  import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001',
);

export const MEDIA_URL = sinBarraFinal(
  import.meta.env.PUBLIC_MEDIA_URL ?? 'https://media.api-sports.io',
);

export const fotoDeFutbolista = (ref: string): string =>
  `${MEDIA_URL}/football/players/${ref}.png`;

export const escudoDeEquipo = (ref: string): string => `${MEDIA_URL}/football/teams/${ref}.png`;

export const logoDeCompetencia = (ref: string): string =>
  `${MEDIA_URL}/football/leagues/${ref}.png`;

export const banderaDePais = (codigo: string): string =>
  `${MEDIA_URL}/flags/${codigo.toLowerCase()}.svg`;
