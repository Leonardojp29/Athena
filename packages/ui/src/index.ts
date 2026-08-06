/**
 * Athena design system package.
 * shadcn/ui components land here in Fase 2 (after `shadcn init` creates
 * components.json and the shadcn skill activates). Until then this package
 * only re-exports token helpers so apps depend on it from day one.
 */
export { breakpoints, motion, cssVar } from '@athena/tokens';

/** Compose class names. Replaced by clsx + tailwind-merge with shadcn in Fase 2. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
