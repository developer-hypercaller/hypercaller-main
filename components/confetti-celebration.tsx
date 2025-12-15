"use client";

import { useEffect } from "react";

export function ConfettiCelebration() {
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let cancelled = false;
    
    // Dynamically import confetti to avoid SSR issues
    import("canvas-confetti")
      .then((confettiModule) => {
        if (cancelled) return;
      const confetti = confettiModule.default;
      
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (interval) clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Launch confetti from the left
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });

        // Launch confetti from the right
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Confetti failed to load; skipping animation.", err);
        }
    });

    // Cleanup function
    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return null;
}

