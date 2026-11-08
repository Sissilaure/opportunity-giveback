// Symbole Yeelen : un soleil d'aube fait de bandes horizontales (mêmes mesures que logo-symbole.svg).
// Les bandes apparaissent l'une après l'autre, de la plus basse à la plus haute (désactivé si animation réduite).
const BANDES = [
  [308, 311, "#DFCCA6"], [327, 330, "#DDBF90"], [345, 349, "#DDB372"], [364, 369, "#D0A465"],
  [382, 389, "#CA9553"], [400, 409, "#C58650"], [418, 428, "#B97646"], [436, 447, "#AA623F"],
  [454, 467, "#9F5439"], [472, 487, "#8E4633"], [490, 507, "#7F3B2A"],
];
const REFLETS = [[355, 724, 541, 545], [420, 659, 559, 562], [479, 599, 578, 580]];

export default function Soleil({ className = "", anime = true }) {
  return (
    <svg viewBox="265 303 550 282" className={className} aria-hidden="true" focusable="false">
      <clipPath id="soleil-clip">
        <circle cx="540" cy="508" r="217" />
      </clipPath>
      <g clipPath="url(#soleil-clip)">
        {BANDES.map(([y0, y1, c], i) => (
          <rect
            key={y0}
            x="323"
            y={y0}
            width="434"
            height={y1 - y0 + 1}
            fill={c}
            className={anime ? "soleil-bande" : undefined}
            style={anime ? { "--delay": `${(BANDES.length - 1 - i) * 90 + 150}ms` } : undefined}
          />
        ))}
      </g>
      <rect x="270" y="516" width="539" height="7" fill="#191817" className={anime ? "soleil-bande" : undefined} style={anime ? { "--delay": "0ms" } : undefined} />
      {REFLETS.map(([x0, x1, y0, y1], i) => (
        <rect
          key={y0}
          x={x0}
          y={y0}
          width={x1 - x0}
          height={y1 - y0 + 1}
          fill="#9B604D"
          className={anime ? "soleil-bande" : undefined}
          style={anime ? { "--delay": `${1100 + i * 120}ms` } : undefined}
        />
      ))}
    </svg>
  );
}
