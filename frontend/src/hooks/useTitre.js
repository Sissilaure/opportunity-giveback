import { useEffect } from "react";

// Titre d'onglet propre à chaque page (utile aussi aux lecteurs d'écran et à l'historique).
export default function useTitre(titre) {
  useEffect(() => {
    document.title = titre ? `${titre} · Opportunity Hub` : "Opportunity Hub";
  }, [titre]);
}
