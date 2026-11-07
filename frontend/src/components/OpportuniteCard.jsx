import { Link } from "react-router-dom";
import TypeBadge from "./TypeBadge";
import EcheanceBadge from "./EcheanceBadge";
import VerifiedBadge from "./VerifiedBadge";
import { TYPE_STYLES, imageOpportunite } from "../lib/types";

export default function OpportuniteCard({ opportunite }) {
  const style = TYPE_STYLES[opportunite.type];
  return (
    <Link
      to={`/opportunites/${opportunite.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="photo-chaude relative aspect-[16/9] overflow-hidden bg-primary-light">
        <img
          src={imageOpportunite(opportunite)}
          alt=""
          loading="lazy"
          width="1000"
          height="563"
          className="h-full w-full object-cover saturate-75 transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <TypeBadge type={opportunite.type} />
        </div>
        <span
          className={`absolute inset-x-0 bottom-0 h-1 ${style ? style.bar : "bg-muted"}`}
          aria-hidden="true"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg leading-snug text-ink">{opportunite.titre}</h3>
        <p className="mt-0.5 text-sm text-muted">{opportunite.organisme}</p>

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <VerifiedBadge date={opportunite.dateVerification} />
          <EcheanceBadge
            statutEcheance={opportunite.statutEcheance}
            joursRestants={opportunite.joursRestants}
          />
        </div>
      </div>
    </Link>
  );
}
