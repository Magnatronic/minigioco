import { useEffect, useRef } from 'react';

export function useGameLoop(update: (dt: number) => void, active: boolean) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
      return;
    }

    const step = () => {
      const now = performance.now();
      const dt = lastRef.current == null ? 16.7 : Math.min(50, now - lastRef.current);
      lastRef.current = now;
      update(dt);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [active, update]);
}
