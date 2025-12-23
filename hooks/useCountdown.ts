import { useEffect, useState } from "react";

export function useCountdown(start: number, onComplete?: () => void) {
  const [count, setCount] = useState(start);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (count <= 0) {
      onComplete?.();
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, running, onComplete]);

  const startCountdown = () => {
    setCount(start);
    setRunning(true);
  };

  return { count, running, startCountdown, setCount };
}
