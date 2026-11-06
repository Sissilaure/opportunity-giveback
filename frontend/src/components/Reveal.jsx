import { useEffect, useRef, useState } from "react";
import prefersReducedMotion from "../hooks/useReducedMotion";

// Fait apparaître le contenu en fondu + glissement quand il entre à l'écran (une seule fois).
// Sans IntersectionObserver ou avec « réduire les animations », le contenu est visible tout de suite.
export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  // Sans observateur ou en mouvement réduit, on part directement visible (pas de setState dans l'effet).
  const direct = !("IntersectionObserver" in window) || prefersReducedMotion();
  const [visible, setVisible] = useState(direct);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (direct) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [direct]);

  return (
    <Tag
      ref={ref}
      style={{ "--delay": `${delay}ms` }}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
