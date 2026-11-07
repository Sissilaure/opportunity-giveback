/** @type {import('tailwindcss').Config} */
// Charte Yeelen : tout ce qui touche aux couleurs, polices, arrondis et ombres se règle ICI (et dans index.css pour les variables).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F4EFE6", // fond principal (crème chaud)
        surface: "#EEEBE5", // cartes et champs
        ink: "#191817", // texte principal
        muted: "#6A6660", // texte secondaire (pierre)
        line: "rgba(25, 24, 23, 0.13)", // bordures fines
        white: "#F4EFE6", // « blanc » du site = crème (texte sur fond latérite ou encre)
        // Latérite : boutons principaux, liens, états actifs.
        primary: { DEFAULT: "#8F4E35", dark: "#74402B", light: "#E9DDD0" },
        // Or d'aube : badges, surlignages, détails. Pour du texte sur fond clair, utiliser primary.
        accent: { DEFAULT: "#D6B172", dark: "#8F4E35", light: "#EFE3C8" },
        success: { DEFAULT: "#3F5B45", bg: "#E1E7DA" },
        danger: { DEFAULT: "#A12B2B", bg: "#F2DEDA" },
        // Alias conservés pour compatibilité avec les usages existants.
        cream: "#F4EFE6",
        gold: "#D6B172",
        alert: { bg: "#F2DEDA", text: "#A12B2B" },
        verified: { bg: "#E1E7DA", text: "#3F5B45" },
      },
      fontFamily: {
        display: ["Italiana", "Georgia", "serif"], // titres
        sans: ["Instrument Sans", "system-ui", "sans-serif"], // texte et interface
        serif: ["Instrument Serif", "Georgia", "serif"], // citations, sous-titres, slogan (en italique)
      },
      borderRadius: { card: "10px", lg: "8px", xl: "10px", "2xl": "10px" },
      boxShadow: {
        card: "none",
        "card-hover": "0 8px 20px -14px rgba(25, 24, 23, 0.25)",
        header: "0 1px 0 rgba(25, 24, 23, 0.10)",
      },
      backgroundImage: { glow: "none" },
    },
  },
  plugins: [],
};
