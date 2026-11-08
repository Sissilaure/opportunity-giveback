import { ClockIcon } from "./icons";

// La date limite est l'information la plus utile d'une carte : texte en gras, contour net.
export default function EcheanceBadge({ statutEcheance, joursRestants }) {
  if (statutEcheance === "permanente") return null;

  if (statutEcheance === "depassee") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-bg px-2.5 py-1 text-xs font-semibold text-danger">
        Échéance dépassée
      </span>
    );
  }

  const isProche = statutEcheance === "proche";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
        isProche ? "bg-danger-bg text-danger" : "border border-ink/25 text-ink"
      }`}
    >
      <ClockIcon className="h-3 w-3 shrink-0" />
      Échéance {joursRestants} j
    </span>
  );
}
