import React, { useMemo, useRef, useState } from 'react';
import type { GameDefinition } from '../../types/game';
import { SettingsGroup } from '../../shared/components/settings/SettingsGroup';
import { SettingsRow } from '../../shared/components/settings/SettingsRow';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { useDeviceInput } from '../../shared/hooks/useDeviceInput';
import { AccessibilityManager } from '../../core/AccessibilityManager';
import { InputManager } from '../../core/InputManager';

export default function TemplateGameComponent({
  managers
}: {
  managers: { a11y: AccessibilityManager; input: InputManager };
}) {
  // Example: basic config state (replace with schema-backed state if needed)
  const [exampleNumber, setExampleNumber] = useState(5);

  // Game state
  const [paused, setPaused] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);

  // Input
  const { vector, sourceRef } = useDeviceInput(managers.input);

  // Loop (dt in ms)
  useGameLoop((dt) => {
    if (paused) return;
    // use dt, vector, and sourceRef.current here
    // ... game logic ...
  }, true);

  // Render
  const bg = useMemo(() => '#1a1a1a', []);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={stageRef}
        className="tc-stage"
        style={{ width: '100%', height: '100%', background: bg, borderRadius: 12, border: '4px solid var(--color-border)' }}
        tabIndex={0}
        aria-label="Template stage"
      />
      {/* Example settings (replace per game) */}
      {paused && (
        <div className="tc-config" role="region" aria-label="Settings">
          <SettingsGroup title="Example">
            <SettingsRow label="Example number">
              <input
                type="range"
                min={1}
                max={10}
                value={exampleNumber}
                onChange={(e) => setExampleNumber(Number(e.currentTarget.value))}
              />
            </SettingsRow>
          </SettingsGroup>
        </div>
      )}
    </div>
  );
}
