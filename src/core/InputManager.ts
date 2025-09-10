type Vector = { x: number; y: number };
type Source = 'keyboard' | 'gamepad' | 'pointer';

export class InputManager {
  private listeners = new Set<(v: Vector, source: Source) => void>();
  private triggerListeners = new Set<() => void>();
  private gamepadId: number | null = null;
  private raf: number | null = null;
  private gamepadButtonDown = false;
  // calibration
  private deadZone = 0.25; // ignore tiny stick drift
  private responseCurve = 1.6; // ease-in curve for fine control

  constructor() {
    window.addEventListener('gamepadconnected', () => this.pollGamepad());
    window.addEventListener('gamepaddisconnected', () => this.stopPolling());
  // Start polling eagerly so controllers/D-pad work even if the page loads with a pad already connected
  this.pollGamepad();

    const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      // prevent page scroll/navigation on arrows
      if (k.startsWith('arrow') || k === 'up' || k === 'down' || k === 'left' || k === 'right') {
        e.preventDefault();
      }
      keys.add(k);
      this.emit(this.keyVector(keys), 'keyboard');
  // trigger on Space/Enter
  if (k === ' ' || k === 'space' || k === 'enter') this.emitTrigger();
  }, { capture: true });
  window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k.startsWith('arrow') || k === 'up' || k === 'down' || k === 'left' || k === 'right') {
        e.preventDefault();
      }
      keys.delete(k);
      this.emit(this.keyVector(keys), 'keyboard');
  }, { capture: true });
    window.addEventListener('blur', () => {
      if (keys.size) {
        keys.clear();
        this.emit({ x: 0, y: 0 }, 'keyboard');
      }
    });
  }

  onMove(cb: (v: Vector, source: Source) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(v: Vector, source: Source) {
    for (const l of this.listeners) l(v, source);
  }

  private emitTrigger() {
    for (const l of this.triggerListeners) l();
  }

  onTrigger(cb: () => void) {
    this.triggerListeners.add(cb);
    return () => this.triggerListeners.delete(cb);
  }

  private keyVector(keys: Set<string>): Vector {
    const up = keys.has('arrowup') || keys.has('up') || keys.has('w');
    const down = keys.has('arrowdown') || keys.has('down') || keys.has('s');
    const left = keys.has('arrowleft') || keys.has('left') || keys.has('a');
    const right = keys.has('arrowright') || keys.has('right') || keys.has('d');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  }

  // Allow runtime calibration from UI
  setCalibration(opts: Partial<{ deadZone: number; responseCurve: number }>) {
    if (typeof opts.deadZone === 'number') this.deadZone = Math.min(0.9, Math.max(0, opts.deadZone));
    if (typeof opts.responseCurve === 'number') this.responseCurve = Math.max(0.5, opts.responseCurve);
  }
  getCalibration() {
    return { deadZone: this.deadZone, responseCurve: this.responseCurve };
  }

  private shapeAxis(v: number): number {
    const a = Math.abs(v);
    if (a <= this.deadZone) return 0;
    const n = (a - this.deadZone) / (1 - this.deadZone); // normalize 0..1 after dead zone
    const curved = Math.pow(n, this.responseCurve);
    return Math.sign(v) * curved;
  }

  private pollGamepad() {
    const step = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads.find((p) => !!p) || null;
      if (gp) {
        this.gamepadId = gp.index;
        // Sticks (prefer left stick axes[0], axes[1])
        const axX = this.shapeAxis(gp.axes?.[0] ?? 0);
        const axY = this.shapeAxis(gp.axes?.[1] ?? 0);
        // D-pad fallback (buttons 12=Up, 13=Down, 14=Left, 15=Right)
        const b = gp.buttons || [];
        const dpadX = (b[15]?.pressed ? 1 : 0) - (b[14]?.pressed ? 1 : 0);
        const dpadY = (b[13]?.pressed ? 1 : 0) - (b[12]?.pressed ? 1 : 0);
        // Prefer the larger magnitude per axis
        const x = Math.abs(axX) >= Math.abs(dpadX) ? axX : dpadX;
        const y = Math.abs(axY) >= Math.abs(dpadY) ? axY : dpadY;
        this.emit({ x, y }, 'gamepad');
        // trigger on any primary button rising-edge
        const anyPressed = (gp.buttons || []).some((btn) => !!btn && btn.pressed);
        if (anyPressed && !this.gamepadButtonDown) {
          this.emitTrigger();
        }
        this.gamepadButtonDown = anyPressed;
      }
      this.raf = requestAnimationFrame(step);
    };
    if (!this.raf) this.raf = requestAnimationFrame(step);
  }

  private stopPolling() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.gamepadId = null;
  this.gamepadButtonDown = false;
  }
}
