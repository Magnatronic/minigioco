import { useEffect, useRef, useState } from 'react';
import { InputManager } from '../../core/InputManager';

type Source = 'keyboard' | 'gamepad' | 'pointer';

export function useDeviceInput(input: InputManager) {
  const [vector, setVector] = useState({ x: 0, y: 0 });
  const sourceRef = useRef<Source>('pointer');
  const activeRef = useRef<Source>('pointer');
  const lastBySource = useRef<{ keyboard: { x: number; y: number }; gamepad: { x: number; y: number }; pointer: { x: number; y: number } }>(
    { keyboard: { x: 0, y: 0 }, gamepad: { x: 0, y: 0 }, pointer: { x: 0, y: 0 } }
  );

  useEffect(() => {
    const EPS = 0.0001;
    const significant = (v: { x: number; y: number }) => Math.hypot(v.x, v.y) > EPS;
    const unsub = input.onMove((v, source) => {
      // Record last vector per source
      (lastBySource.current as any)[source] = v;

      // Decide active source: prioritize keyboard while any key is held
      if (source === 'keyboard') {
        if (significant(v)) {
          activeRef.current = 'keyboard';
        } else {
          // keys released; unlock to allow next source to claim control
          activeRef.current = 'pointer';
        }
      } else if (source === 'gamepad') {
        // Allow override if keyboard is idle
        const kbActive = significant(lastBySource.current.keyboard);
        if (significant(v) && !kbActive) {
          activeRef.current = 'gamepad';
        }
      } else if (source === 'pointer') {
        // Pointer only takes over if no keyboard currently active and movement is significant
        const kbActive = significant(lastBySource.current.keyboard);
        if (!kbActive && significant(v)) {
          activeRef.current = 'pointer';
        }
      }

      sourceRef.current = activeRef.current;
      const next = (lastBySource.current as any)[activeRef.current] as { x: number; y: number };
      setVector(next);
    });
    return () => { unsub(); };
  }, [input]);

  return { vector, sourceRef } as const;
}
