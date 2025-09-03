type Vector = { x: number; y: number };

export class InputManager {
  private listeners = new Set<(v: Vector) => void>();
  private triggerListeners = new Set<() => void>();
  private gamepadId: number | null = null;
  private raf: number | null = null;
  private gamepadButtonDown = false;

  constructor() {
    window.addEventListener('gamepadconnected', () => this.pollGamepad());
    window.addEventListener('gamepaddisconnected', () => this.stopPolling());

    const keys = new Set<string>();
    window.addEventListener('keydown', (e) => {
      keys.add(e.key.toLowerCase());
      this.emit(this.keyVector(keys));
  // trigger on Space/Enter
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'space' || k === 'enter') this.emitTrigger();
    });
    window.addEventListener('keyup', (e) => {
      keys.delete(e.key.toLowerCase());
      this.emit(this.keyVector(keys));
    });
  }

  onMove(cb: (v: Vector) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(v: Vector) {
    for (const l of this.listeners) l(v);
  }

  private emitTrigger() {
    for (const l of this.triggerListeners) l();
  }

  onTrigger(cb: () => void) {
    this.triggerListeners.add(cb);
    return () => this.triggerListeners.delete(cb);
  }

  private keyVector(keys: Set<string>): Vector {
    const up = keys.has('arrowup') || keys.has('w');
    const down = keys.has('arrowdown') || keys.has('s');
    const left = keys.has('arrowleft') || keys.has('a');
    const right = keys.has('arrowright') || keys.has('d');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
  }

  private pollGamepad() {
    const step = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads.find((p) => !!p) || null;
      if (gp) {
        this.gamepadId = gp.index;
        const axX = gp.axes[0] ?? 0;
        const axY = gp.axes[1] ?? 0;
        const dead = 0.2;
        const x = Math.abs(axX) > dead ? axX : 0;
        const y = Math.abs(axY) > dead ? axY : 0;
        this.emit({ x, y });
        // trigger on any primary button rising-edge
        const anyPressed = (gp.buttons || []).some((b) => !!b && b.pressed);
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
  }
}
