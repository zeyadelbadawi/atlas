/**
 * The current time, re-read on an interval, so relative labels ("2 minutes
 * ago") and the stale check advance while the page sits open.
 */
import { useEffect, useState } from 'react';

export function useNow(tickMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}
