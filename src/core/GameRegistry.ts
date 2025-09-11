import type { GameDefinition } from '../types/game';

export class GameRegistry {
  private games = new Map<string, GameDefinition>();
  private listeners = new Set<() => void>();

  constructor() {
    // Eagerly discover games on construction so lists render immediately
    try {
      this.discover();
    } catch {
      // ignore in non-vite contexts
    }
  }

  register(def: GameDefinition) {
    if (this.games.has(def.id)) return;
    this.games.set(def.id, def);
  this.notify();
  }

  get(id: string) {
    return this.games.get(id);
  }

  list() {
    return [...this.games.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private discover() {
    // Merge multiple globs to be resilient across environments (dev/test/build)
    const g1 = import.meta.glob('/src/games/**/index.ts', { eager: true });
    const g2 = import.meta.glob('/src/games/**/index.tsx', { eager: true });
    const g3 = import.meta.glob('../games/**/index.ts', { eager: true });
    const g4 = import.meta.glob('../games/**/index.tsx', { eager: true });
    const modules = { ...(g1 as object), ...(g2 as object), ...(g3 as object), ...(g4 as object) } as Record<
      string,
      { default?: GameDefinition; register?: (r: GameRegistry) => void }
    >;

    let found = 0;
    for (const path in modules) {
      const mod = modules[path];
      if (typeof mod?.register === 'function') {
        mod.register(this);
        found++;
      } else if (mod?.default) {
        this.register(mod.default);
        found++;
      }
    }
    return found;
  }

  async loadGames() {
    const found = this.discover();
    // Fallback in browser: explicit dynamic imports if glob resolution yielded nothing
    if (found === 0) {
      try {
        const dm = await import('../games/TargetCollection/index');
        if (typeof (dm as any)?.register === 'function') {
          (dm as any).register(this);
        } else if ((dm as any)?.default) {
          this.register((dm as any).default as GameDefinition);
        }
      } catch {
        // ignore if dynamic import fails
      }
    }
    this.notify();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }
}
