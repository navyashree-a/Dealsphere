import { useEffect, useState } from "react";

// Which nav link's section is in view: the last section whose top has passed a
// line a third of the way down the screen. Reads positions on every update, so
// sections that move (search results, "Show more") are still tracked.
function useActiveSection(links) {
  const [activeHref, setActiveHref] = useState("");
  const hrefs = links.map((link) => link.href).join(" ");

  useEffect(() => {
    if (!hrefs) return undefined;
    const targets = hrefs.split(" ");
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      let current = "";
      targets.forEach((href) => {
        const section = document.getElementById(href.slice(1));
        if (section && section.getBoundingClientRect().top <= line) current = href;
      });
      setActiveHref(current || targets[0]);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [hrefs]);

  return activeHref;
}

export default useActiveSection;
