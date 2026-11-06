import { SearchIcon } from "./icons";

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label="Rechercher une opportunité"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher une bourse…"
        className="w-full rounded-full border border-line bg-surface py-3 pl-9 pr-4 text-sm text-ink placeholder:text-muted shadow-card focus:border-primary focus:outline-none"
      />
    </div>
  );
}