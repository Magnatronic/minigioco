import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  GameDefinition,
  IGame,
  GameState,
  GameConfig,
  GameConfigSchema,
  AccessibilityFeature
} from '../../types/game';
import { AccessibilityManager } from '../../core/AccessibilityManager';
import { InputManager } from '../../core/InputManager';
import { ConfigManager } from '../../core/ConfigManager';

// High-contrast palette pairs per CONTEXT.md (cursor/target should be contrasting)
const PALETTE = [
  { name: 'White on Black', cursor: '#ffffff', bg: '#000000', target: '#ffffff' },
  { name: 'Black on White', cursor: '#000000', bg: '#ffffff', target: '#000000' },
  { name: 'Yellow on Blue', cursor: '#ffd800', bg: '#0033aa', target: '#ffd800' },
  { name: 'Blue on Yellow', cursor: '#0033aa', bg: '#ffd800', target: '#0033aa' },
  { name: 'Red on White', cursor: '#d10f0f', bg: '#ffffff', target: '#d10f0f' },
  { name: 'Green on White', cursor: '#0c8a1f', bg: '#ffffff', target: '#0c8a1f' },
  { name: 'White on Dark Gray', cursor: '#ffffff', bg: '#222222', target: '#ffffff' },
  { name: 'Black on Light Gray', cursor: '#000000', bg: '#dddddd', target: '#000000' }
] as const;

// Config schema (v3 removes the former 'attraction' option)
const schema: GameConfigSchema = {
  version: 3,
  properties: {
    cursorSize: { type: 'number', min: 20, max: 100 },
    cursorShape: { type: 'string' }, // circle | square | cross
    paletteIndex: { type: 'number', min: 0, max: PALETTE.length - 1 },
    targetSize: { type: 'number', min: 50, max: 200 },
    soundOn: { type: 'boolean' },
    volume: { type: 'number', min: 0, max: 1 },
    collectionMode: { type: 'string' }, // instant | dwell | press
    dwellMs: { type: 'number', min: 100, max: 1500 }
  }
};

export type TCConfig = {
  cursorSize: number;
  cursorShape: 'circle' | 'square' | 'cross';
  paletteIndex: number;
  targetSize: number;
  soundOn: boolean;
  volume: number; // 0-1
  collectionMode: 'instant' | 'dwell' | 'press';
  dwellMs: number;
};

const defaultConfig: TCConfig = {
  cursorSize: 60,
  cursorShape: 'cross',
  paletteIndex: 1,
  targetSize: 120,
  soundOn: true,
  volume: 0.6,
  collectionMode: 'instant',
  dwellMs: 600,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sanitizeConfig(raw: Partial<TCConfig> | undefined): TCConfig {
  const r = raw ?? {};
  const paletteIndex = clamp(
    Number((r as any).paletteIndex ?? defaultConfig.paletteIndex),
    0,
    PALETTE.length - 1
  );
  const cursorSize = clamp(Number((r as any).cursorSize ?? defaultConfig.cursorSize), 20, 100);
  const targetSize = clamp(Number((r as any).targetSize ?? defaultConfig.targetSize), 50, 200);
  const volume = clamp(Number((r as any).volume ?? defaultConfig.volume), 0, 1);
  const cursorShape: TCConfig['cursorShape'] = ['circle', 'square', 'cross'].includes(
    (r as any).cursorShape
  )
    ? ((r as any).cursorShape as TCConfig['cursorShape'])
    : defaultConfig.cursorShape;
  const collectionMode: TCConfig['collectionMode'] = ['instant', 'dwell', 'press'].includes(
    (r as any).collectionMode
  )
    ? ((r as any).collectionMode as TCConfig['collectionMode'])
    : defaultConfig.collectionMode;
  const dwellMs = clamp(Number((r as any).dwellMs ?? defaultConfig.dwellMs), 100, 1500);
  const soundOn = (r as any).soundOn !== undefined ? Boolean((r as any).soundOn) : defaultConfig.soundOn;
  return {
    cursorSize,
    cursorShape,
    paletteIndex,
    targetSize,
    soundOn,
    volume,
    collectionMode,
    dwellMs
  };
}

class TargetCollectionGame implements IGame {
  id = 'target-collection';
  name = 'Target Collection';
  description = 'Move a large cursor to collect targets. No time pressure.';
  category = 'motor' as const;
  configSchema = schema;
  accessibilityFeatures: AccessibilityFeature[] = [
    'keyboardSupport',
    'screenReader',
    'highContrast',
    'largeTargets',
    'reducedMotion',
    'gamepadSupport'
  ];

  private state: GameState = { started: false, paused: false, score: 0, timestamp: 0 };
  private cfg: TCConfig = defaultConfig;
  private configMgr: ConfigManager | null = null;
  private a11y: AccessibilityManager | null = null;

  initialize(config: GameConfig) {
    // runtime config merge is handled in component; placeholder for interface
  }
  start() {
    this.state.started = true;
  }
  pause() {
    this.state.paused = true;
  }
  resume() {
    this.state.paused = false;
  }
  reset() {
    this.state = { started: false, paused: false, score: 0, timestamp: 0 };
  }
  cleanup() {}
  getState() {
    return this.state;
  }
  updateConfig(config: Partial<GameConfig>) {
    this.cfg = { ...(this.cfg as TCConfig), ...(config as Partial<TCConfig>) } as TCConfig;
  }
}

// Synth success sound via Web Audio API
let audioCtx: AudioContext | null = null;
function ensureAudioCtx() {
  if (audioCtx) return audioCtx;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  const unlock = () => {
    // resume on first user gesture
    audioCtx?.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return audioCtx;
}
function playSuccess(volume: number) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, ctx.currentTime);
  g.gain.value = volume;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.15);
}

// UI component
function TargetCollectionComponent({ managers }: { managers: { a11y: AccessibilityManager; input: InputManager; config: ConfigManager } }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Persistent config
  const configKey = 'game:target-collection';
  const [cfg, setCfg] = useState<TCConfig>(() =>
    sanitizeConfig(
      managers.config.load<TCConfig>(configKey, { version: 3, defaults: defaultConfig })
    )
  );
  useEffect(() => {
    managers.config.save<TCConfig>(configKey, { version: 3, defaults: defaultConfig }, cfg);
  }, [cfg, managers.config]);

  // State
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(true);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Keep loop-visible config in a ref to avoid stale closures
  const cfgRef = useRef({
    collectionMode: cfg.collectionMode,
    dwellMs: cfg.dwellMs,
    cursorSize: cfg.cursorSize,
    targetSize: cfg.targetSize
  });
  useEffect(() => {
    cfgRef.current = {
      collectionMode: cfg.collectionMode,
      dwellMs: cfg.dwellMs,
      cursorSize: cfg.cursorSize,
      targetSize: cfg.targetSize
    };
  }, [cfg.collectionMode, cfg.dwellMs, cfg.cursorSize, cfg.targetSize]);

  const palette = PALETTE[cfg.paletteIndex] ?? PALETTE[0];

  // Helpers to detect when OS/browser may auto-darken and counter it for light backgrounds (Edge)
  const toRgb = (hex: string) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };
  const luminance = (hex: string) => {
    const { r, g, b } = toRgb(hex);
    const convert = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const rL = convert(r);
    const gL = convert(g);
    const bL = convert(b);
    return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
  };
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bgIsLight = luminance(palette.bg) > 0.6; // treat near-white as light
  const [fixDarkening, setFixDarkening] = useState<boolean>(prefersDark && bgIsLight);

  // Detect if computed background is darker than intended (Edge/OS darking) and toggle fix
  const parseComputedRgb = (css: string) => {
    const m = css.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return { r: 0, g: 0, b: 0 };
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  };
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const intendedLum = luminance(palette.bg);
    const raf = requestAnimationFrame(() => {
      const actual = getComputedStyle(stage).backgroundColor;
      const actualLum = luminance(
        (() => {
          const { r, g, b } = parseComputedRgb(actual);
          const hex = `#${[r, g, b]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')}`;
          return hex;
        })()
      );
      if (intendedLum > 0.6 && actualLum < 0.4) {
        setFixDarkening(true);
      } else if (intendedLum <= 0.6) {
        // For darker palettes, don't force invert
        setFixDarkening(false);
      } else {
        setFixDarkening(false);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [palette.bg]);

  // Input smoothing and 60fps loop
  const velRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const targetPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const unsubRef = useRef<() => void>();
  const triggerUnsubRef = useRef<() => void>();
  const overlapRef = useRef(false);
  const dwellStartRef = useRef<number | null>(null);
  const collectedGuardRef = useRef(false);

  // helpers
  const randomTarget = (stage: DOMRect) => {
    const margin = cfg.targetSize / 2 + 50;
    const x = Math.random() * (stage.width - margin * 2) + margin;
    const y = Math.random() * (stage.height - margin * 2) + margin;
    return { x, y };
  };

  const describeLocation = (p: { x: number; y: number }, stage: DOMRect) => {
    const x = p.x / stage.width;
    const y = p.y / stage.height;
    const horiz = x < 0.33 ? 'left' : x > 0.66 ? 'right' : 'center';
    const vert = y < 0.33 ? 'top' : y > 0.66 ? 'bottom' : 'middle';
    if (horiz === 'center' && vert === 'middle') return 'center';
    return `${vert} ${horiz}`;
  };

  const placeTarget = () => {
    const stage = stageRef.current?.getBoundingClientRect();
    const el = targetRef.current;
    if (!stage || !el) return;
    const p = randomTarget(stage);
    targetPosRef.current = p;
  const half = cfg.targetSize / 2;
  el.style.transform = `translate(${p.x - half}px, ${p.y - half}px)`;
    managers.a11y.announce('Target appeared ' + describeLocation(p, stage));
  };

  const collectTarget = () => {
    if (collectedGuardRef.current) return;
    collectedGuardRef.current = true;
    // pulse animation
    const el = targetRef.current;
    if (el) {
      const reduced = getComputedStyle(document.documentElement)
        .getPropertyValue('--reduced-motion')
        .trim() === '1';
      if (!reduced) {
        el.animate(
          [
            { transform: el.style.transform + ' scale(1)', filter: 'brightness(1)' },
            { transform: el.style.transform + ' scale(1.2)', filter: 'brightness(1.4)' }
          ],
          { duration: 150, easing: 'ease-out' }
        );
      }
      // immediate hide to avoid double-scoring and provide clear feedback
      el.style.opacity = '0';
    }
    setScore((s) => s + 1);
    managers.a11y.announce('Target collected');
    if (cfg.soundOn) playSuccess(cfg.volume);
    // place next
    setTimeout(() => {
      placeTarget();
      const el2 = targetRef.current;
      if (el2) el2.style.opacity = '1';
      collectedGuardRef.current = false;
    }, 300);
  };

  const checkCollision = () => {
    const c = posRef.current;
    const t = targetPosRef.current;
    const dist = Math.hypot(c.x - t.x, c.y - t.y);
    const generous = (cfgRef.current.cursorSize + cfgRef.current.targetSize) / 2 * 1.05; // slightly generous detection
    const overlap = dist <= generous;
    overlapRef.current = overlap;
    return overlap;
  };

  const step = () => {
    const stage = stageRef.current?.getBoundingClientRect();
    const cursor = cursorRef.current;
    if (!stage || !cursor) {
      rafRef.current = requestAnimationFrame(step);
      return;
    }

  // movement: blend toward pointer location and apply keyboard/gamepad velocity
  const kbSpeed = 2.2; // fixed keyboard/gamepad speed
  const alpha = 0.22; // fixed smoothing factor for pointer blending
  // always follow the pointer smoothly, even when paused
  posRef.current.x += (pointerTargetRef.current.x - posRef.current.x) * alpha;
  posRef.current.y += (pointerTargetRef.current.y - posRef.current.y) * alpha;
  // apply keyboard/gamepad velocity on both axes
  posRef.current.x += velRef.current.x * kbSpeed;
  posRef.current.y += velRef.current.y * kbSpeed;
  const halfCursor = cfgRef.current.cursorSize / 2;
  posRef.current.x = Math.max(halfCursor, Math.min(stage.width - halfCursor, posRef.current.x));
  posRef.current.y = Math.max(halfCursor, Math.min(stage.height - halfCursor, posRef.current.y));

  // attraction removed in v3

  cursor.style.transform = `translate(${posRef.current.x - halfCursor}px, ${posRef.current.y - halfCursor}px)`;
  if (!pausedRef.current) {
      const overlap = checkCollision();
      if (!collectedGuardRef.current) {
    if (cfgRef.current.collectionMode === 'instant' && overlap) {
          collectTarget();
    } else if (cfgRef.current.collectionMode === 'dwell') {
          const now = performance.now();
          if (overlap) {
            if (dwellStartRef.current == null) dwellStartRef.current = now;
      if (now - dwellStartRef.current >= cfgRef.current.dwellMs) {
              collectTarget();
              dwellStartRef.current = null;
            }
          } else {
            dwellStartRef.current = null;
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(step);
  };

  // Input subscriptions
  useEffect(() => {
    unsubRef.current = managers.input.onMove((v) => {
      // simple easing to smooth
      velRef.current.x = v.x;
      velRef.current.y = v.y;
    });
    return () => unsubRef.current?.();
  }, [managers.input]);

  // Press-to-collect via keyboard/gamepad trigger
  useEffect(() => {
    triggerUnsubRef.current = managers.input.onTrigger(() => {
      if (cfg.collectionMode !== 'press') return;
      if (paused) return;
      if (!collectedGuardRef.current && overlapRef.current) collectTarget();
    });
    return () => triggerUnsubRef.current?.();
  }, [cfg.collectionMode, paused, managers.input]);

  useEffect(() => {
    // initialize positions
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    posRef.current = { x: stage.width / 2, y: stage.height / 2 };
    placeTarget();
    rafRef.current = requestAnimationFrame(step);
    const onResize = () => {
      const st = stageRef.current?.getBoundingClientRect();
      if (!st) return;
      posRef.current.x = Math.max(cfg.cursorSize / 2, Math.min(st.width - cfg.cursorSize / 2, posRef.current.x));
      posRef.current.y = Math.max(cfg.cursorSize / 2, Math.min(st.height - cfg.cursorSize / 2, posRef.current.y));
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.targetSize]);

  // keyboard controls: pause/reset (avoid conflicts in press mode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const pauseKey = cfg.collectionMode === 'press' ? 'p' : ' ';
      const resetKey = cfg.collectionMode === 'press' ? 'r' : 'enter';
      if (k === pauseKey || (pauseKey === ' ' && e.key === ' ')) {
        setPaused((p) => !p);
        managers.a11y.announce('Game ' + (paused ? 'resumed' : 'paused'));
      } else if (k === resetKey) {
        // reset
        setScore(0);
        const st = stageRef.current?.getBoundingClientRect();
        if (st) posRef.current = { x: st.width / 2, y: st.height / 2 };
        placeTarget();
        managers.a11y.announce('Game reset');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, managers.a11y, cfg.collectionMode]);

  // React to GameShell state events to hide/show config
  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action: string; id: string };
      if (detail?.id !== 'target-collection') return;
      if (detail.action === 'start' || detail.action === 'resume') setPaused(false);
      if (detail.action === 'pause') setPaused(true);
      if (detail.action === 'reset') {
        setPaused(true);
        setScore(0);
        const st = stageRef.current?.getBoundingClientRect();
        if (st) posRef.current = { x: st.width / 2, y: st.height / 2 };
        placeTarget();
      }
    };
    window.addEventListener('game:state', onState as EventListener);
    return () => window.removeEventListener('game:state', onState as EventListener);
  }, []);

  // ESC exits fullscreen handled by browser; no extra code needed

  // UI rendering
  const shapeStyle = useMemo(() => {
    const size = cfg.cursorSize;
    // Choose a halo color that contrasts with the cursor/target color
    const cursorLum = luminance(palette.cursor);
    const halo = cursorLum > 0.5 ? '#000000' : '#ffffff';
    const common: React.CSSProperties = {
      width: size,
      height: size,
      background: 'transparent',
      color: palette.cursor,
      border: `4px solid ${palette.cursor}`,
      borderRadius: cfg.cursorShape === 'circle' ? '50%' : '8px',
      position: 'absolute',
  transform: `translate(${posRef.current.x - size / 2}px, ${posRef.current.y - size / 2}px)`,
      pointerEvents: 'none',
      // Always-visible halo so cursor stands out over target/background
      boxShadow: `0 0 0 3px ${halo}`,
      zIndex: 2
    };
    return common;
  }, [cfg.cursorSize, cfg.cursorShape, palette.cursor]);

  const targetStyle = useMemo(() => {
    const size = cfg.targetSize;
    const common: React.CSSProperties = {
      width: size,
      height: size,
      background: palette.target,
      borderRadius: '50%',
      position: 'absolute',
  transform: `translate(${targetPosRef.current.x - size / 2}px, ${targetPosRef.current.y - size / 2}px)`,
      zIndex: 1
    };
    return common;
  }, [cfg.targetSize, palette.target]);

  return (
    <div
      ref={stageRef}
      className="tc-stage"
      style={{
  width: '100%',
  height: 'clamp(420px, 75vh, 90vh)',
        border: '4px solid var(--color-border)',
        borderRadius: '12px',
        position: 'relative',
        background: palette.bg,
  overflow: 'hidden',
  // Counter Edge/OS auto-darkening only when palette expects light bg
  filter: fixDarkening ? 'invert(1) hue-rotate(180deg)' : undefined,
  willChange: fixDarkening ? 'filter' : undefined,
  touchAction: 'none',
  cursor: 'none'
      }}
      aria-label="Target Collection stage"
      tabIndex={0}
      onPointerEnter={(e) => {
        const r = stageRef.current?.getBoundingClientRect();
        if (!r) return;
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        const half = cfg.cursorSize / 2;
        const x = Math.max(half, Math.min(r.width - half, cx));
        const y = Math.max(half, Math.min(r.height - half, cy));
        pointerTargetRef.current.x = x;
        pointerTargetRef.current.y = y;
        posRef.current.x = x;
        posRef.current.y = y;
      }}
      onPointerMove={(e) => {
        const r = stageRef.current?.getBoundingClientRect();
        if (!r) return;
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        const half = cfg.cursorSize / 2;
        pointerTargetRef.current.x = Math.max(half, Math.min(r.width - half, cx));
        pointerTargetRef.current.y = Math.max(half, Math.min(r.height - half, cy));
      }}
      onPointerDown={() => {
        if (cfgRef.current.collectionMode !== 'press') return;
        if (pausedRef.current) return;
  const over = checkCollision();
  if (!collectedGuardRef.current && (over || overlapRef.current)) collectTarget();
      }}
    >
      {/* Cursor */}
      <div ref={cursorRef} style={shapeStyle} aria-hidden="true">
        {cfg.cursorShape === 'cross' && (
          <svg width={cfg.cursorSize} height={cfg.cursorSize} viewBox="0 0 100 100">
            <line x1="50" y1="10" x2="50" y2="90" stroke={palette.cursor} strokeWidth="10" />
            <line x1="10" y1="50" x2="90" y2="50" stroke={palette.cursor} strokeWidth="10" />
          </svg>
        )}
      </div>

      {/* Target */}
      <div ref={targetRef} style={targetStyle} />

      {/* HUD */}
      <div
        className="tc-hud"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(255,255,255,0.85)',
          color: '#000',
          border: '2px solid #000',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 24,
          fontWeight: 700,
          zIndex: 2
        }}
        aria-live="polite"
      >
        Score: {score}
      </div>

    {/* Config Panel */}
  {!paused && null}
  {paused && (
  <div className="tc-config" role="region" aria-label="Settings">
        <label className="tc-row">
          Cursor size
          <input
            type="range"
            min={20}
            max={100}
            value={cfg.cursorSize}
            onChange={(e) => setCfg({ ...cfg, cursorSize: Number(e.currentTarget.value) })}
          />
        </label>
        
        <label className="tc-row">
          Cursor shape
          <select
            value={cfg.cursorShape}
            onChange={(e) => setCfg({ ...cfg, cursorShape: e.currentTarget.value as TCConfig['cursorShape'] })}
          >
            <option value="circle">Circle</option>
            <option value="square">Square</option>
            <option value="cross">Cross</option>
          </select>
        </label>
        <label className="tc-row">
          Palette
          <select
            value={cfg.paletteIndex}
            onChange={(e) => setCfg({ ...cfg, paletteIndex: Number(e.currentTarget.value) })}
          >
            {PALETTE.map((p, i) => (
              <option key={i} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="tc-row">
          Target size
          <input
            type="range"
            min={50}
            max={200}
            value={cfg.targetSize}
            onChange={(e) => setCfg({ ...cfg, targetSize: Number(e.currentTarget.value) })}
          />
        </label>
        <label className="tc-row">
          Success sound
          <input
            type="checkbox"
            checked={cfg.soundOn}
            onChange={(e) => setCfg({ ...cfg, soundOn: e.currentTarget.checked })}
          />
        </label>
        <label className="tc-row">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cfg.volume}
            onChange={(e) => setCfg({ ...cfg, volume: Number(e.currentTarget.value) })}
            disabled={!cfg.soundOn}
          />
        </label>
  {/* Attraction control removed in v3 */}
        <label className="tc-row">
          Collect by
          <select
            value={cfg.collectionMode}
            onChange={(e) => setCfg({ ...cfg, collectionMode: e.currentTarget.value as TCConfig['collectionMode'] })}
          >
            <option value="instant">Instant (on overlap)</option>
            <option value="dwell">Dwell on target</option>
            <option value="press">Press (Space/Enter/Click)</option>
          </select>
        </label>
        {cfg.collectionMode === 'dwell' && (
          <label className="tc-row">
            Dwell time (ms)
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={cfg.dwellMs}
              onChange={(e) => setCfg({ ...cfg, dwellMs: Number(e.currentTarget.value) })}
            />
          </label>
        )}
  </div>
  )}
    </div>
  );
}

const def: GameDefinition = {
  id: 'target-collection',
  name: 'Target Collection',
  description: 'Move a large cursor to collect targets. No time pressure.',
  category: 'motor',
  configSchema: schema,
  accessibilityFeatures: [
    'keyboardSupport',
    'screenReader',
    'highContrast',
    'largeTargets',
    'reducedMotion',
    'gamepadSupport'
  ],
  createInstance: () => new TargetCollectionGame(),
  component: TargetCollectionComponent
};

export default def;
