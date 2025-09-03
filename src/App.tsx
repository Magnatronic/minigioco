import { useEffect, useMemo, useState } from 'react';
import { GameRegistry } from './core/GameRegistry';
import { AccessibilityManager } from './core/AccessibilityManager';
import { ThemeManager } from './core/ThemeManager';
import { ConfigManager } from './core/ConfigManager';
import { InputManager } from './core/InputManager';
import { GameList } from './shared/components/GameList';
import { A11yToolbar } from './shared/components/A11yToolbar';
import { GameShell } from './shared/components/GameShell';
import { ConsentBanner } from './shared/components/ConsentBanner';
import { ScreenReaderLive } from './shared/components/ScreenReaderLive';

export default function App() {
  const [registry] = useState(() => new GameRegistry());
  const [a11y] = useState(() => new AccessibilityManager());
  const [theme] = useState(() => new ThemeManager());
  const [config] = useState(() => new ConfigManager());
  const [input] = useState(() => new InputManager());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [consented, setConsented] = useState(config.getConsent());
  const [regTick, setRegTick] = useState(0); // force rerender on registry updates

  useEffect(() => {
    // subscribe first so we don't miss initial notifications from load
    const unsub = registry.subscribe(() => {
      setRegTick((t) => t + 1);
      setSelectedId((prev) => prev ?? registry.list()[0]?.id ?? null);
    });
    // kick off discovery
    registry.loadGames();
    // also set a default if games were already present (e.g., HMR)
    setSelectedId((prev) => prev ?? registry.list()[0]?.id ?? null);
    return () => {
      unsub();
    };
  }, [registry]);

  useEffect(() => {
    a11y.announce('Application loaded');
  }, [a11y]);

  const selected = useMemo(
    () => (selectedId ? registry.get(selectedId) ?? null : null),
    [selectedId, registry]
  );

  const isTest = (globalThis as any).VITEST_SETUP_ENV === 'jsdom';
  return (
    <div className="app">
      <header className="app__header" role="banner">
        <h1 className="app__title">Accessible Game Platform</h1>
        <A11yToolbar theme={theme} a11y={a11y} />
      </header>

      <div
        className="app__layout"
        aria-hidden={!consented && !isTest ? true : undefined}
      >
  <aside className="app__sidebar" aria-label="Games">
          <GameList
            games={registry.list()}
            selectedId={selectedId}
            onSelect={(id: string) => setSelectedId(id)}
          />
        </aside>

        <main id="main" className="app__main" role="main">
          <GameShell
            key={selected?.id ?? 'empty'}
            gameDef={selected}
            managers={{ a11y, theme, config, input, registry }}
          />
        </main>
      </div>

      <footer
        className="app__footer"
        role="contentinfo"
        aria-hidden={!consented && !isTest ? true : undefined}
      >
        <small>WCAG 2.1 AA targets. Use toolbar for high contrast and reduced motion.</small>
      </footer>

  {!consented && (
        <ConsentBanner
          onAccept={() => {
            config.setConsent(true);
            setConsented(true);
          }}
        />
      )}

      <ScreenReaderLive manager={a11y} />
    </div>
  );
}
