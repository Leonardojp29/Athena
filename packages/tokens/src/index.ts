/**
 * Typed access to design tokens for JS contexts (charts, canvas, motion).
 * The CSS file (./tokens.css) is the source of truth for rendering;
 * these constants mirror the scale names so TS code never hardcodes values.
 */

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** CSS variable names, for programmatic reads via getComputedStyle. */
export const cssVar = {
  colorPrimary: '--color-primary',
  colorSuccess: '--color-success',
  colorDanger: '--color-danger',
  colorWarning: '--color-warning',
  colorText: '--color-text',
  colorTextMuted: '--color-text-muted',
  colorSurface: '--color-surface',
  colorBorder: '--color-border',
} as const;
