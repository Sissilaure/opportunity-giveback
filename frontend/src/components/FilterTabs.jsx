const FILTERS = [
  { value: "toutes", label: "Toutes" },
  { value: "bourse", label: "Bourses" },
  { value: "stage", label: "Stages" },
  { value: "emploi", label: "Emplois" },
  { value: "concours", label: "Concours" },
  { value: "autre", label: "Autres" },
];

export default function FilterTabs({ value, onChange }) {
  return (
    <div role="group" aria-label="Filtrer par type" className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          aria-pressed={value === f.value}
          className={`min-h-[40px] shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
            value === f.value
              ? "bg-primary text-white shadow-card"
              : "bg-surface text-ink shadow-card hover:bg-primary-light"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}