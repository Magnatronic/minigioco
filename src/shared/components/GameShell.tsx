import { useEffect, useRef, useState } from 'react';
import type { GameDefinition } from '../../types/game';
import { AccessibilityManager } from '../../core/AccessibilityManager';
import { ThemeManager } from '../../core/ThemeManager';
import { ConfigManager } from '../../core/ConfigManager';
import { InputManager } from '../../core/InputManager';
import { GameRegistry } from '../../core/GameRegistry';

type Managers = {
  a11y: AccessibilityManager;
  theme: ThemeManager;
  config: ConfigManager;
  input: InputManager;
  registry: GameRegistry;
};

export function GameShell({
  gameDef,
  managers
}: {
  gameDef: GameDefinition | null;
  managers: Managers;
}) {
  const [state, setState] = useState({ score: 0, paused: false });
  const gameRef = useRef<ReturnType<GameDefinition['createInstance']> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!gameDef) return;
    const game = gameDef.createInstance();
    gameRef.current = game;
    game.initialize({});
    managers.a11y.announce(`${gameDef.name} loaded`);
    return () => {
      game.cleanup();
      gameRef.current = null;
    };
  }, [gameDef, managers.a11y]);

  if (!gameDef) {
    return (
      <div className="game-area" aria-label="Game area" tabIndex={0}>
        <p>Select a game to begin.</p>
      </div>
    );
  }

  return (
    <section className="game-area" aria-label={`${gameDef.name} game`} tabIndex={0}>
  <header className="game-area__header" role="group">
        <h2>{gameDef.name}</h2>
        <div className="game-controls">
          <button
            className="btn"
            onClick={() => {
              gameRef.current?.start();
              managers.a11y.announce('Game started');
              window.dispatchEvent(
                new CustomEvent('game:state', { detail: { action: 'start', id: gameDef.id } })
              );
            }}
          >
            Start
          </button>
          <button
            className="btn"
            onClick={() => {
              gameRef.current?.pause();
              managers.a11y.announce('Game paused');
              setState((s) => ({ ...s, paused: true }));
              window.dispatchEvent(
                new CustomEvent('game:state', { detail: { action: 'pause', id: gameDef.id } })
              );
            }}
          >
            Pause
          </button>
          <button
            className="btn"
            onClick={() => {
              gameRef.current?.resume();
              managers.a11y.announce('Game resumed');
              setState((s) => ({ ...s, paused: false }));
              window.dispatchEvent(
                new CustomEvent('game:state', { detail: { action: 'resume', id: gameDef.id } })
              );
            }}
          >
            Resume
          </button>
          <button
            className="btn"
            onClick={() => {
              gameRef.current?.reset();
              managers.a11y.announce('Game reset');
              setState({ score: 0, paused: false });
              window.dispatchEvent(
                new CustomEvent('game:state', { detail: { action: 'reset', id: gameDef.id } })
              );
            }}
          >
            Reset
          </button>
          <button
            className="btn"
            onClick={async () => {
              const el = stageRef.current;
              if (!el) return;
              if (!document.fullscreenElement) {
                await el.requestFullscreen();
                setIsFullscreen(true);
                managers.a11y.announce('Entered fullscreen');
              } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
                managers.a11y.announce('Exited fullscreen');
              }
            }}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </header>

      <div
        className="game-stage"
        role="region"
        aria-label="Stage"
        ref={stageRef}
      >
        {gameDef.component ? (
          <gameDef.component managers={managers} gameRef={gameRef} />
        ) : (
          <div id="stage-placeholder" />
        )}
      </div>

      <div className="game-area__footer" role="status" aria-live="polite">
        <span>Score: {state.score}</span>
      </div>
    </section>
  );
}
