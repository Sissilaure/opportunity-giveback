// Étapes d'une candidature, dans l'ordre naturel. Les clés sont celles de l'ENUM `suivi_candidature.statut` en base.
export const STATUTS_SUIVI = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "soumise", label: "Dossier envoyé" },
  { value: "acceptee", label: "Acceptée" },
  { value: "refusee", label: "Refusée" },
];

export const libelleStatutSuivi = (value) => STATUTS_SUIVI.find((s) => s.value === value)?.label || "À faire";
