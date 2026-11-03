import { useEffect, useRef, useState } from "react";

const showsImmediately = () =>
  typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// True once the element has scrolled into view. It stays true, so a card only
// animates in the first time. Visible straight away for people who prefer
// reduced motion or browsers without IntersectionObserver.
function useReveal() {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(showsImmediately);

  useEffect(() => {
    if (revealed || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [revealed]);

  return [ref, revealed];
}

export default useReveal;
