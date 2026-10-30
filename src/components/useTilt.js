import { useCallback, useEffect, useRef } from "react";

// Pointer-driven 3D tilt. Writes CSS variables (--rx, --ry, --mx, --my) on the
// element that receives the events; the stylesheet decides how to use them.
// Skipped for touch input and for users who prefer reduced motion.
function useTilt(maxDegrees = 7) {
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = useCallback(
    (event) => {
      if (event.pointerType !== "mouse") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        element.style.setProperty("--rx", `${((0.5 - y) * maxDegrees).toFixed(2)}deg`);
        element.style.setProperty("--ry", `${((x - 0.5) * maxDegrees).toFixed(2)}deg`);
        element.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        element.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      });
    },
    [maxDegrees]
  );

  const onPointerLeave = useCallback((event) => {
    cancelAnimationFrame(frame.current);
    event.currentTarget.style.setProperty("--rx", "0deg");
    event.currentTarget.style.setProperty("--ry", "0deg");
  }, []);

  return { onPointerMove, onPointerLeave };
}

export default useTilt;
