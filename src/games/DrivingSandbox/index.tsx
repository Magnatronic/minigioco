import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameDefinition, GameConfigSchema, AccessibilityFeature, IGame, GameState, GameConfig } from '../../types/game';
import { AccessibilityManager } from '../../core/AccessibilityManager';
import { InputManager } from '../../core/InputManager';
import { SettingsGroup } from '../../shared/components/settings/SettingsGroup';
import { SettingsRow } from '../../shared/components/settings/SettingsRow';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { useDeviceInput } from '../../shared/hooks/useDeviceInput';

// Simple driver to test keyboard/gamepad input in an open field.

const schema: GameConfigSchema = {
  version: 1,
  properties: {
    speedMult: { type: 'number', min: 1, max: 10 },
    turnDegPerSec: { type: 'number', min: 30, max: 240 },
    friction: { type: 'number', min: 0, max: 0.2 },
    wrapEdges: { type: 'boolean' },
    showGrid: { type: 'boolean' }
  }
};

type DSConfig = {
  speedMult: number; // 1..10 scales base speed
  turnDegPerSec: number; // degrees/sec at full steer
  friction: number; // px/s^2 decel approx, applied continuously
  wrapEdges: boolean;
  showGrid: boolean;
};

const defaultCfg: DSConfig = {
  speedMult: 5,
  turnDegPerSec: 140,
  friction: 0.06,
  wrapEdges: false,
  showGrid: true
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sanitize(raw?: Partial<DSConfig>): DSConfig {
  const r = raw ?? {};
  return {
    speedMult: clamp(Number((r as any).speedMult ?? defaultCfg.speedMult), 1, 10),
    turnDegPerSec: clamp(Number((r as any).turnDegPerSec ?? defaultCfg.turnDegPerSec), 30, 240),
    friction: clamp(Number((r as any).friction ?? defaultCfg.friction), 0, 0.2),
    wrapEdges: (r as any).wrapEdges !== undefined ? Boolean((r as any).wrapEdges) : defaultCfg.wrapEdges,
    showGrid: (r as any).showGrid !== undefined ? Boolean((r as any).showGrid) : defaultCfg.showGrid
  };
}

class DrivingSandboxGame implements IGame {
  id = 'driving-sandbox';
  name = 'Driving Sandbox';
  description = 'Open field to test driving with keyboard or gamepad.';
  category = 'motor' as const;
  configSchema = schema;
  accessibilityFeatures: AccessibilityFeature[] = ['keyboardSupport', 'gamepadSupport', 'highContrast', 'reducedMotion'];

  private state: GameState = { started: false, paused: false, score: 0, timestamp: 0 };
  initialize(_config: GameConfig): void {}
  start(): void { this.state.started = true; this.state.paused = false; }
  pause(): void { this.state.paused = true; }
  resume(): void { this.state.paused = false; }
  reset(): void { this.state = { started: false, paused: false, score: 0, timestamp: 0 }; }
  cleanup(): void {}
  getState(): GameState { return this.state; }
  updateConfig(_config: Partial<GameConfig>): void {}
}

function Car({ x, y, angle, color, size = 38 }: { x: number; y: number; angle: number; color: string; size?: number }) {
  const w = size;
  const h = size * 0.6;
  // Triangle-like car pointing to +X local axis
  return (
    <div
      style={{
        position: 'absolute',
        transform: `translate(${x - w / 2}px, ${y - h / 2}px) rotate(${(angle * 180) / Math.PI}deg)`,
        transformOrigin: '50% 50%',
        width: w,
        height: h,
        pointerEvents: 'none',
        zIndex: 2
      }}
      aria-hidden
    >
      <svg width={w} height={h} viewBox="0 0 100 60" role="img" aria-label="vehicle">
        <polygon points="80,30 10,55 10,5" fill={color} stroke="var(--color-panel-border)" strokeWidth="4" />
        <circle cx="25" cy="50" r="5" fill="black" />
        <circle cx="25" cy="10" r="5" fill="black" />
      </svg>
    </div>
  );
}

function DrivingComponent({ managers }: { managers: { a11y: AccessibilityManager; input: InputManager } }) {
  const [cfg, setCfg] = useState<DSConfig>(() => sanitize({}));
  const cfgRef = useRef(cfg);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(true);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Vehicle state
  const pos = useRef({ x: 0, y: 0 });
  const heading = useRef(0); // radians, 0 -> +X (to right)
  const speed = useRef(0); // px/s

  // Input
  const { vector, sourceRef } = useDeviceInput(managers.input);

  // Init position on mount and on resize
  useEffect(() => {
    const placeCenter = () => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      pos.current.x = r.width / 2;
      pos.current.y = r.height / 2;
      heading.current = 0;
      speed.current = 0;
    };
    placeCenter();
    const onResize = () => placeCenter();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useGameLoop((dtMs) => {
    if (pausedRef.current) return;
    const dt = Math.min(50, dtMs) / 1000; // seconds

    // Only use keyboard/gamepad for driving, ignore pointer
  const steer = sourceRef.current === 'pointer' ? 0 : clamp(vector.x, -1, 1);
  // Invert Y so Up (y=-1) means forward throttle
  const throttle = sourceRef.current === 'pointer' ? 0 : clamp(-vector.y, -1, 1);

    const baseMax = 220; // px/s base max speed
    const maxFwd = baseMax * cfgRef.current.speedMult; // 220..2200
    const maxRev = maxFwd * 0.4; // reverse slower
    const accel = 750; // px/s^2
    const turnRate = (cfgRef.current.turnDegPerSec * Math.PI) / 180; // rad/s at full steer

    // Acceleration
    const targetAcc = throttle * accel; // signed
    // Integrate speed with friction
    speed.current += targetAcc * dt;
    // friction decel always opposes motion
    const fr = cfgRef.current.friction * (speed.current >= 0 ? -1 : 1);
    speed.current += fr * 1000 * dt; // scale friction into px/s^2 region
    // deadband around 0
    if (Math.abs(speed.current) < 5) speed.current = 0;
    // Clamp speeds
    if (speed.current > maxFwd) speed.current = maxFwd;
    if (speed.current < -maxRev) speed.current = -maxRev;

    // Steering. Flip when reversing for natural feel.
    const steerDir = speed.current >= 0 ? 1 : -1;
    // Optionally reduce steering a bit with speed to avoid oversteer (mild, always on)
    const speedFactor = 0.6 + 0.4 / (1 + Math.abs(speed.current) / (maxFwd * 0.5));
    heading.current += steer * steerDir * turnRate * speedFactor * dt;

    // Integrate position
    pos.current.x += Math.cos(heading.current) * speed.current * dt;
    pos.current.y += Math.sin(heading.current) * speed.current * dt;

    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    if (cfgRef.current.wrapEdges) {
      // wrap with margin
      const margin = 10;
      if (pos.current.x < -margin) pos.current.x = r.width + margin;
      if (pos.current.x > r.width + margin) pos.current.x = -margin;
      if (pos.current.y < -margin) pos.current.y = r.height + margin;
      if (pos.current.y > r.height + margin) pos.current.y = -margin;
    } else {
      // clamp and softly stop at borders
      const nx = clamp(pos.current.x, 0, r.width);
      const ny = clamp(pos.current.y, 0, r.height);
      if (nx !== pos.current.x) speed.current = 0;
      if (ny !== pos.current.y) speed.current = 0;
      pos.current.x = nx; pos.current.y = ny;
    }
  }, true);

  // Listen for shell state changes (play/pause/reset)
  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action: string; id: string };
      if (detail?.id !== 'driving-sandbox') return;
  if (detail.action === 'start' || detail.action === 'resume') setPaused(false);
      if (detail.action === 'pause') setPaused(true);
      if (detail.action === 'reset') {
        setPaused(true);
        const r = stageRef.current?.getBoundingClientRect();
        if (r) { pos.current.x = r.width / 2; pos.current.y = r.height / 2; }
        heading.current = 0; speed.current = 0;
      }
    };
    window.addEventListener('game:state', onState as EventListener);
    return () => window.removeEventListener('game:state', onState as EventListener);
  }, []);

  // Visuals
  const gridBackground = useMemo(() => {
    if (!cfg.showGrid) return 'var(--color-stage-bg, #0b0b0b)';
    // Dual grid for visibility in HC
    const cell = 40;
    return `
      radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / ${cell}px ${cell}px,
      linear-gradient(0deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / ${cell * 5}px ${cell * 5}px,
      #0b0b0b
    `;
  }, [cfg.showGrid]);

  // HUD derived values
  const [hudTick, setHudTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHudTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);
  const speedAbs = Math.abs(speed.current);
  const headingDeg = ((heading.current * 180) / Math.PI + 360) % 360;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={stageRef}
        className="tc-stage"
        tabIndex={0}
        aria-label="Driving sandbox stage"
        style={{
          width: '100%', height: '100%', border: '4px solid var(--color-border)', borderRadius: 12,
          background: gridBackground, position: 'relative', overflow: 'hidden', touchAction: 'none', cursor: 'none'
        }}
        onPointerDown={() => {/* pointer not used for driving */}}
      >
        {/* Vehicle */}
        <Car x={pos.current.x} y={pos.current.y} angle={heading.current} color="#ffd800" />

        {/* HUD */}
        <div
          style={{ position: 'absolute', top: 12, left: 12, background: 'var(--color-panel-bg)', color: 'var(--color-panel-fg)',
            border: '2px solid var(--color-panel-border)', borderRadius: 8, padding: '6px 10px', fontWeight: 700, zIndex: 2 }}
            aria-live="polite"
        >
          Speed: {speedAbs.toFixed(0)} px/s · Heading: {headingDeg.toFixed(0)}°
        </div>

        {/* Config Panel */}
        {!paused ? null : (
          <div className="tc-config" role="region" aria-label="Settings">
            <SettingsGroup title="Movement">
              <SettingsRow label="Movement speed">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={cfg.speedMult}
                  style={{ ['--_filled' as any]: `${((cfg.speedMult - 1) / 9) * 100}%` }}
                  title={`x${cfg.speedMult}`}
                  onChange={(e) => setCfg({ ...cfg, speedMult: Number(e.currentTarget.value) })}
                />
              </SettingsRow>
              <SettingsRow label="Turn rate">
                <input
                  type="range"
                  min={30}
                  max={240}
                  step={5}
                  value={cfg.turnDegPerSec}
                  style={{ ['--_filled' as any]: `${((cfg.turnDegPerSec - 30) / (240 - 30)) * 100}%` }}
                  title={`${cfg.turnDegPerSec}°/s`}
                  onChange={(e) => setCfg({ ...cfg, turnDegPerSec: Number(e.currentTarget.value) })}
                />
              </SettingsRow>
              <SettingsRow label="Friction">
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.01}
                  value={cfg.friction}
                  style={{ ['--_filled' as any]: `${(cfg.friction / 0.2) * 100}%` }}
                  title={`${cfg.friction.toFixed(2)}`}
                  onChange={(e) => setCfg({ ...cfg, friction: Number(e.currentTarget.value) })}
                />
              </SettingsRow>
            </SettingsGroup>

            <SettingsGroup title="World">
              <SettingsRow label="Wrap at edges">
                <input
                  type="checkbox"
                  checked={cfg.wrapEdges}
                  onChange={(e) => setCfg({ ...cfg, wrapEdges: e.currentTarget.checked })}
                />
              </SettingsRow>
              <SettingsRow label="Show grid">
                <input
                  type="checkbox"
                  checked={cfg.showGrid}
                  onChange={(e) => setCfg({ ...cfg, showGrid: e.currentTarget.checked })}
                />
              </SettingsRow>
            </SettingsGroup>
          </div>
        )}
      </div>
    </div>
  );
}

const def: GameDefinition = {
  id: 'driving-sandbox',
  name: 'Driving Sandbox',
  description: 'Open field to test driving with keyboard or gamepad.',
  category: 'motor',
  configSchema: schema,
  accessibilityFeatures: ['keyboardSupport', 'gamepadSupport', 'highContrast', 'reducedMotion'],
  createInstance: () => new DrivingSandboxGame(),
  component: DrivingComponent
};

export default def;
