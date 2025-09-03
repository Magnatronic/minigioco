import { useEffect, useRef } from 'react';
import { AccessibilityManager } from '../../core/AccessibilityManager';

export function ScreenReaderLive({ manager }: { manager: AccessibilityManager }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    manager.bindLiveRegion(ref.current);
    return () => manager.bindLiveRegion(null);
  }, [manager]);
  return <div ref={ref} className="sr-only" role="status" aria-live="polite" />;
}
