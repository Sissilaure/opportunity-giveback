import { CheckIcon } from "./icons";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

// Le signe distinctif d'Yeelen : chaque opportunité vérifiée porte ce cachet,
// pour rendre visible en un coup d'œil ce qui fait la valeur du répertoire.
export default function VerifiedBadge({ date, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md bg-success-bg px-2.5 py-1 text-xs font-medium text-success ${className}`}
    >
      <CheckIcon className="h-3 w-3 shrink-0" />
      Vérifié le {formatDate(date)}
    </span>
  );
}
