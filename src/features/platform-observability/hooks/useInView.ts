/**
 * Reports once an element has come near the viewport, so a card can defer
 * its request until it is about to be seen. Latches true — scrolling away
 * does not cancel a series that is already loaded. Without
 * IntersectionObserver (old browsers, tests) it is simply true.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

export function useInView<T extends Element>(
  rootMargin = '200px'
): readonly [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (inView || !ref.current || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView] as const;
}
