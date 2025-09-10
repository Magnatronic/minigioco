export class ThemeManager {
  setHighContrast(on: boolean) {
    document.documentElement.setAttribute('data-high-contrast', on ? 'on' : 'off');
  }
  isHighContrast(): boolean {
    return document.documentElement.getAttribute('data-high-contrast') === 'on';
  }

  setReducedMotion(on: boolean) {
    document.documentElement.style.setProperty('--reduced-motion', on ? '1' : '0');
  }
  isReducedMotion(): boolean {
    return getComputedStyle(document.documentElement).getPropertyValue('--reduced-motion') === '1';
  }
}
