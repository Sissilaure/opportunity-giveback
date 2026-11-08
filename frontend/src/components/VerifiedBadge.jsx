import { CheckIcon } from "./icons";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

// Le signe distinctif de Yeelen : chaque opportunité vérifiée porte ce cachet. Quand la publication vient de la lecture
// automatique du site officiel (sans relecture humaine), le cachet le dit : on ne laisse pas croire à une relecture.
export default function VerifiedBadge({ date, auto = false, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
        auto ? "bg-accent-light text-ink" : "bg-success-bg text-success"
      } ${className}`}
    >
      <CheckIcon className="h-3 w-3 shrink-0" />
      {auto ? "Source officielle vérifiée" : "Vérifié"} le {formatDate(date)}
    </span>
  );
}
