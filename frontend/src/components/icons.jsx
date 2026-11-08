// Jeu d'icônes maison en SVG inline (aucune dépendance, aucun emoji) : chaque icône
// hérite de sa couleur via currentColor et se dimensionne avec className.

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M16.5 16.5 13 13" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}>
      <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4h5v5M15.5 4.5 9 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m12 4.5-6 5.5 6 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m8 4.5 6 5.5-6 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5c0 4-1.5 5-1.5 5h12s-1.5-1-1.5-5A4.5 4.5 0 0 0 10 2.5Z" strokeLinejoin="round" />
      <path d="M8.3 15.5a1.8 1.8 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  );
}
