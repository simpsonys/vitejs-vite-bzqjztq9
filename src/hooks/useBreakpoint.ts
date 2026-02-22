import { useState, useEffect } from 'react';
import type { Breakpoint } from '../types';

export function useBreakpoint(): Breakpoint {
  const getW = () =>
    typeof window !== "undefined"
      ? (window.visualViewport?.width ?? window.innerWidth)
      : 1024;

  const [w, setW] = useState(getW);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const fn = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setW(getW()), 80);
    };
    window.addEventListener("resize", fn);
    window.visualViewport?.addEventListener("resize", fn);
    return () => {
      window.removeEventListener("resize", fn);
      window.visualViewport?.removeEventListener("resize", fn);
      clearTimeout(timer);
    };
  }, []);

  if (w >= 1024) return "desktop";
  if (w >= 600) return "tablet";
  return "mobile";
}
