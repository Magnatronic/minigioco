declare module 'jest-axe' {
  import type { AxeResults } from 'axe-core';
  export const axe: (container: HTMLElement, options?: unknown) => Promise<AxeResults>;
  export const toHaveNoViolations: () => void;
}