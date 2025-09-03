import { ThemeManager } from '../../core/ThemeManager';
import { AccessibilityManager } from '../../core/AccessibilityManager';

type Props = {
  theme: ThemeManager;
  a11y: AccessibilityManager;
};

export function A11yToolbar({ theme, a11y }: Props) {
  return (
    <div className="toolbar" role="region" aria-label="Accessibility toolbar">
      <button
        className="btn"
        onClick={() => {
          const next = !theme.isHighContrast();
          theme.setHighContrast(next);
          a11y.announce(`High contrast ${next ? 'enabled' : 'disabled'}`);
        }}
      >
        High contrast
      </button>
      <button
        className="btn"
        onClick={() => {
          const next = !theme.isReducedMotion();
          theme.setReducedMotion(next);
          a11y.announce(`Reduced motion ${next ? 'enabled' : 'disabled'}`);
        }}
      >
        Reduced motion
      </button>
      <label className="font-label">
        Base font
        <input
          aria-label="Base font size"
          type="range"
          min={18}
          max={22}
          defaultValue={18}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            theme.setBaseFont(Number(e.currentTarget.value));
          }}
        />
      </label>
    </div>
  );
}
