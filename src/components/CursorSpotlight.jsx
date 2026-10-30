import { useEffect, useRef } from "react";

// Website-wide cursor spotlight, mounted once in Root.jsx so it covers every
// customer screen and the admin panel without re-initialising.
//
// - One passive window "pointermove" listener; no React state updates.
// - The glow is a fixed-size element moved with transform (GPU only) and eased
//   towards the pointer inside requestAnimationFrame. The loop stops once the
//   glow catches up, so nothing runs while the mouse is still.
// - The layer ignores pointer events and only adds light (see index.css).
// - Hidden for touch input, over areas marked data-spotlight="off" (photos),
//   when the pointer leaves the window, and when the user prefers reduced
//   motion (also enforced in CSS).
const EASE = 0.22;

function CursorSpotlight() {
  const glowRef = useRef(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let visible = false;

    const setVisible = (next) => {
      if (next === visible) return;
      visible = next;
      glow.classList.toggle("is-visible", next);
    };

    const render = () => {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      if (Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5) {
        x = targetX;
        y = targetY;
        frame = 0;
      } else {
        frame = requestAnimationFrame(render);
      }
      glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onPointerMove = (event) => {
      if (event.pointerType === "touch" || reducedMotion.matches) {
        setVisible(false);
        return;
      }
      // Areas marked data-spotlight="off" (e.g. the profile photo card) turn
      // the light off, because the lime glow would tint photos.
      if (event.target instanceof Element && event.target.closest('[data-spotlight="off"]')) {
        setVisible(false);
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        // Appear at the pointer instead of sliding in from an old position.
        x = targetX;
        y = targetY;
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        setVisible(true);
      }
      if (!frame) frame = requestAnimationFrame(render);
    };

    // relatedTarget is null when the pointer leaves the browser window.
    const onMouseOut = (event) => {
      if (!event.relatedTarget) setVisible(false);
    };
    const hide = () => setVisible(false);
    const onMotionChange = () => {
      if (reducedMotion.matches) setVisible(false);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("blur", hide);
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("blur", hide);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div className="cursor-spotlight" aria-hidden="true">
      <div className="cursor-spotlight__glow" ref={glowRef} />
    </div>
  );
}

export default CursorSpotlight;
