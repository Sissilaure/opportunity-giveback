/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Charte visuelle commune (reprise du site du groupe 1) : fond crème, bleu nuit, or, vert profond.
        canvas: "#FAF9F6",
        surface: "#FFFFFF",
        ink: "#10151F",
        muted: "#575B63",
        line: "#E6E3DD",
        // Bleu marine et or : repris directement du logo, pour une identité cohérente.
        primary: { DEFAULT: "#1B2A4A", dark: "#101B33", light: "#E8ECF3" },
        accent: { DEFAULT: "#C9A25D", dark: "#9A7632", light: "#F6EFDF" },
        success: { DEFAULT: "#2F5D50", bg: "#E6EFEC" },
        danger: { DEFAULT: "#B3302B", bg: "#FBEAEA" },
        // Violet réservé aux concours : différencie les catégories entre elles, sans virer à l'arc-en-ciel.
        feature: { DEFAULT: "#6D4AA6", bg: "#F1ECFA" },
        // Alias conservés pour compatibilité avec les usages existants.
        cream: "#FAF9F6",
        gold: "#C9A25D",
        alert: { bg: "#FBEAEA", text: "#B3302B" },
        verified: { bg: "#E6EFEC", text: "#2F5D50" },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px" },
      boxShadow: {
        card: "0 1px 2px rgba(18,22,43,0.05), 0 1px 1px rgba(18,22,43,0.04)",
        "card-hover": "0 16px 32px -14px rgba(18,22,43,0.28), 0 2px 6px rgba(18,22,43,0.06)",
        header: "0 1px 0 rgba(18,22,43,0.06), 0 8px 24px -16px rgba(18,22,43,0.18)",
      },
      backgroundImage: {
        glow:
          "radial-gradient(680px circle at 12% -15%, rgba(27,42,74,0.10), transparent 55%), radial-gradient(520px circle at 92% -10%, rgba(201,162,93,0.16), transparent 50%)",
      },
    },
  },
  plugins: [],
};
