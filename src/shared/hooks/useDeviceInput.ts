import { useEffect, useRef, useState } from 'react';
import { InputManager } from '../../core/InputManager';

type Source = 'keyboard' | 'gamepad' | 'pointer';

export function useDeviceInput(input: InputManager) {
  const [vector, setVector] = useState({ x: 0, y: 0 });
  const sourceRef = useRef<Source>('pointer');

  useEffect(() => {
    const unsub = input.onMove((v, source) => {
      setVector(v);
      if (source !== 'pointer') {
        const mag = Math.hypot(v.x, v.y);
        if (mag > 0.0001) sourceRef.current = source;
      } else {
        sourceRef.current = 'pointer';
      }
    });
    return () => { unsub(); };
  }, [input]);

  return { vector, sourceRef } as const;
}
