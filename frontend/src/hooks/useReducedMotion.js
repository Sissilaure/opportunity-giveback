// Vrai si la personne a demandé à réduire les animations dans son système.
export default function prefersReducedMotion() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
