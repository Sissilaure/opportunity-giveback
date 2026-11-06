import { useEffect, useRef, useState } from "react";
import prefersReducedMotion from "../hooks/useReducedMotion";

// Compteur animé de 0 à `valeur` quand il devient visible.
export default function CountUp({ valeur, duree = 1200 }) {
  const ref = useRef(null);
  const direct = !("IntersectionObserver" in window) || prefersReducedMotion();
  const [affiche, setAffiche] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (direct) return undefined;
    let raf;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const debut = performance.now();
      const tick = (maintenant) => {
        const t = Math.min((maintenant - debut) / duree, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setAffiche(Math.round(valeur * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valeur, duree, direct]);

  return <span ref={ref}>{direct ? valeur : affiche}</span>;
}
