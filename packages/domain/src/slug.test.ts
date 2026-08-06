import { describe, expect, it } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Lionel Messi')).toBe('lionel-messi');
  });

  it('strips diacritics common in Spanish names', () => {
    expect(slugify('James Rodríguez')).toBe('james-rodriguez');
    expect(slugify('Atlético de Madrid')).toBe('atletico-de-madrid');
  });

  it('collapses non-alphanumeric runs and trims edges', () => {
    expect(slugify('Saint-Étienne (FC) ')).toBe('saint-etienne-fc');
  });
});
