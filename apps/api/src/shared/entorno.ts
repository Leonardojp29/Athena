const sinBarraFinal = (url: string): string => url.replace(/\/+$/, '');

export const API_FOOTBALL_BASE_URL = sinBarraFinal(
  process.env.API_FOOTBALL_BASE_URL ?? 'https://v3.football.api-sports.io',
);

export const MEDIA_URL = sinBarraFinal(
  process.env.MEDIA_URL ?? 'https://media.api-sports.io',
);

export const fotoDeFutbolista = (ref: string): string =>
  `${MEDIA_URL}/football/players/${ref}.png`;

export const escudoDeEquipo = (ref: string): string => `${MEDIA_URL}/football/teams/${ref}.png`;

export const logoDeCompetencia = (ref: string): string =>
  `${MEDIA_URL}/football/leagues/${ref}.png`;

export const banderaDePais = (codigo: string): string =>
  `${MEDIA_URL}/flags/${codigo.toLowerCase()}.svg`;

export const origenesPermitidos = (): string[] => [
  ...new Set(
    [
      ...(process.env.WEB_ORIGIN ?? '').split(','),
      ...(process.env.WEB_ORIGIN_LOCAL ?? 'http://localhost:4321,http://127.0.0.1:4321').split(','),
    ]
      .map((o) => o.trim())
      .filter(Boolean),
  ),
];
