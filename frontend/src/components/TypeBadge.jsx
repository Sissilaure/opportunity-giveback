import { TYPE_LABELS, TYPE_STYLES } from "../lib/types";

export default function TypeBadge({ type }) {
  const style = TYPE_STYLES[type];
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide ${
        style ? style.badge : "bg-canvas text-ink"
      }`}
    >
      {TYPE_LABELS[type] || (type ? type.toUpperCase() : "")}
    </span>
  );
}
