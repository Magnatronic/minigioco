export class AccessibilityManager {
  private liveRegion: HTMLElement | null = null;

  bindLiveRegion(el: HTMLElement | null) {
    this.liveRegion = el;
  }

  announce(message: string) {
    if (!this.liveRegion) return;
    const el = this.liveRegion;
    el.textContent = '';
    setTimeout(() => (el.textContent = message), 20);
  }
}
