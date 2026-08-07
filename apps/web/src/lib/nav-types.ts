/*
 * Los tipos del árbol de navegación, aparte de `nav.ts`, para que un componente pueda importar
 * solo el tipo sin arrastrar el respaldo cableado ni la llamada al API.
 */
export type { NavCompetition, NavContinent, NavCountry, Continent } from './nav';
export type { GeographyContinent, GeographyCountry } from './api';
