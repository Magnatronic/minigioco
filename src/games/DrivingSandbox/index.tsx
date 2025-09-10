import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameDefinition, GameConfigSchema, AccessibilityFeature, IGame, GameState, GameConfig } from '../../types/game';
import { AccessibilityManager } from '../../core/AccessibilityManager';
import { InputManager } from '../../core/InputManager';
import { SettingsGroup } from '../../shared/components/settings/SettingsGroup';
import { SettingsRow } from '../../shared/components/settings/SettingsRow';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { useDeviceInput } from '../../shared/hooks/useDeviceInput';

// Simple driver to test keyboard/gamepad input in an open field.

// High-contrast palette pairs (vehicle on background)
const PALETTE = [
  { name: 'Yellow on Blue', car: '#ffd800', bg: '#0033aa' },
  { name: 'Blue on Yellow', car: '#0033aa', bg: '#ffd800' },
  { name: 'White on Black', car: '#ffffff', bg: '#000000' },
  { name: 'Black on White', car: '#000000', bg: '#ffffff' },
  { name: 'Red on White', car: '#d10f0f', bg: '#ffffff' },
  { name: 'Green on White', car: '#0c8a1f', bg: '#ffffff' },
  { name: 'White on Dark Gray', car: '#ffffff', bg: '#222222' },
  { name: 'Black on Light Gray', car: '#000000', bg: '#dddddd' }
] as const;

const schema: GameConfigSchema = {
  version: 2,
  properties: {
    speedMult: { type: 'number', min: 1, max: 10 },
    turnDegPerSec: { type: 'number', min: 30, max: 240 },
    friction: { type: 'number', min: 0, max: 0.2 },
    wrapEdges: { type: 'boolean' },
    showGrid: { type: 'boolean' },
    vehicleShape: { type: 'string' },
    vehicleSize: { type: 'number', min: 24, max: 120 },
    paletteIndex: { type: 'number', min: 0, max: PALETTE.length - 1 }
  }
};

type DSConfig = {
  speedMult: number; // 1..10 scales base speed
  turnDegPerSec: number; // degrees/sec at full steer
  friction: number; // px/s^2 decel approx, applied continuously
  wrapEdges: boolean;
  showGrid: boolean;
  vehicleShape: 'car' | 'rectangle';
  vehicleSize: number;
  paletteIndex: number;
};

const defaultCfg: DSConfig = {
  speedMult: 5,
  turnDegPerSec: 140,
  friction: 0.06,
  wrapEdges: false,
  showGrid: true,
  vehicleShape: 'car',
  vehicleSize: 44,
  paletteIndex: 0
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
    showGrid: (r as any).showGrid !== undefined ? Boolean((r as any).showGrid) : defaultCfg.showGrid,
    vehicleShape: ['car', 'rectangle'].includes((r as any).vehicleShape)
      ? ((r as any).vehicleShape as DSConfig['vehicleShape'])
      : defaultCfg.vehicleShape,
    vehicleSize: clamp(Number((r as any).vehicleSize ?? defaultCfg.vehicleSize), 24, 120),
    paletteIndex: clamp(Number((r as any).paletteIndex ?? defaultCfg.paletteIndex), 0, PALETTE.length - 1)
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

function CarShape({ color, shape, size }: { color: string; shape: 'car' | 'rectangle'; size: number }) {
  if (shape === 'rectangle') {
    const w = size;
    const h = size * 0.6;
    return (
      <svg width={w} height={h} viewBox="0 0 100 60" role="img" aria-label="vehicle">
        <rect x="8" y="8" width="84" height="44" rx="10" ry="10" fill={color} stroke="var(--color-panel-border)" strokeWidth="4" />
      </svg>
    );
  }
  const w = size;
  const h = size * 0.6;
  return (
    <svg width={w} height={h} viewBox="0 0 100 60" role="img" aria-label="vehicle">
      <polygon points="80,30 10,55 10,5" fill={color} stroke="var(--color-panel-border)" strokeWidth="4" />
      <circle cx="25" cy="50" r="5" fill="black" />
      <circle cx="25" cy="10" r="5" fill="black" />
    </svg>
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
  const carRef = useRef<HTMLDivElement>(null);
  const smooth = useRef({ steer: 0, throttle: 0 });

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
      const w = cfgRef.current.vehicleSize;
      const h = cfgRef.current.vehicleSize * 0.6;
      const el = carRef.current;
      if (el) {
        el.style.transform = `translate(${pos.current.x - w / 2}px, ${pos.current.y - h / 2}px) rotate(0deg)`;
      }
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
  const targetSteer = sourceRef.current === 'pointer' ? 0 : clamp(vector.x, -1, 1);
  // Invert Y so Up (y=-1) means forward throttle
  const targetThrottle = sourceRef.current === 'pointer' ? 0 : clamp(-vector.y, -1, 1);

    // Smooth inputs to avoid jerkiness
    const smoothingPerSec = 10; // higher = snappier
    const a = 1 - Math.exp(-smoothingPerSec * dt);
    smooth.current.steer += (targetSteer - smooth.current.steer) * a;
    smooth.current.throttle += (targetThrottle - smooth.current.throttle) * a;
    const steer = smooth.current.steer;
    const throttle = smooth.current.throttle;

  const baseMax = 220; // px/s base max speed
    const maxFwd = baseMax * cfgRef.current.speedMult; // 220..2200
    const maxRev = maxFwd * 0.4; // reverse slower
  const accel = 900; // px/s^2
    const turnRate = (cfgRef.current.turnDegPerSec * Math.PI) / 180; // rad/s at full steer

  // Acceleration
  const targetAcc = throttle * accel; // signed
  // Integrate speed, then apply multiplicative drag (fraction per second)
  speed.current += targetAcc * dt;
  speed.current *= Math.max(0, 1 - cfgRef.current.friction * dt);
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

    // Apply transform directly for smooth visuals
    const w = cfgRef.current.vehicleSize;
    const h = cfgRef.current.vehicleSize * 0.6;
    const el = carRef.current;
    if (el) {
      el.style.transform = `translate(${pos.current.x - w / 2}px, ${pos.current.y - h / 2}px) rotate(${(heading.current * 180) / Math.PI}deg)`;
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
  const palette = useMemo(() => PALETTE[cfg.paletteIndex]!, [cfg.paletteIndex]);
  const gridBackground = useMemo(() => {
    const base = palette.bg;
    if (!cfg.showGrid) return base;
    const cell = 40;
    const light = 'rgba(255,255,255,0.10)';
    const mid = 'rgba(0,0,0,0.10)';
    return `
      linear-gradient(0deg, ${light} 1px, transparent 1px) 0 0 / ${cell}px ${cell}px,
      linear-gradient(90deg, ${light} 1px, transparent 1px) 0 0 / ${cell}px ${cell}px,
      linear-gradient(0deg, ${mid} 1px, transparent 1px) 0 0 / ${cell * 5}px ${cell * 5}px,
      linear-gradient(90deg, ${mid} 1px, transparent 1px) 0 0 / ${cell * 5}px ${cell * 5}px,
      ${base}
    `;
  }, [cfg.showGrid, palette.bg]);

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
        {/* Vehicle (wrapper transformed imperatively for smoothness) */}
        <div
          ref={carRef}
          style={{ position: 'absolute', transformOrigin: '50% 50%', width: cfg.vehicleSize, height: cfg.vehicleSize * 0.6, pointerEvents: 'none', zIndex: 2 }}
          aria-hidden
        >
          <CarShape color={PALETTE[cfg.paletteIndex]!.car} shape={cfg.vehicleShape} size={cfg.vehicleSize} />
        </div>

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
            
            <SettingsGroup title="Appearance">
              <SettingsRow label="Vehicle shape">
                <select
                  value={cfg.vehicleShape}
                  onChange={(e) => setCfg({ ...cfg, vehicleShape: e.currentTarget.value as DSConfig['vehicleShape'] })}
                >
                  <option value="car">Car</option>
                  <option value="rectangle">Rectangle</option>
                </select>
              </SettingsRow>
              <SettingsRow label="Vehicle size">
                <input
                  type="range"
                  min={24}
                  max={120}
                  step={2}
                  value={cfg.vehicleSize}
                  style={{ ['--_filled' as any]: `${((cfg.vehicleSize - 24) / (120 - 24)) * 100}%` }}
                  title={`${cfg.vehicleSize}px`}
                  onChange={(e) => setCfg({ ...cfg, vehicleSize: Number(e.currentTarget.value) })}
                />
              </SettingsRow>
              <SettingsRow label="Palette">
                <select
                  value={cfg.paletteIndex}
                  onChange={(e) => setCfg({ ...cfg, paletteIndex: Number(e.currentTarget.value) })}
                >
                  {PALETTE.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
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
