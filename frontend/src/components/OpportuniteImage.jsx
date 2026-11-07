import { useState } from "react";
import { imageOpportunite } from "../lib/types";

// Image d'une opportunité : celle publiée par l'organisme si elle existe, sinon (ou si elle ne charge pas) une photo
// de la catégorie. `no-referrer` : on ne dit pas au site de l'organisme quelle page Yeelen l'affiche.
export default function OpportuniteImage({ opportunite, className = "", eager = false }) {
  const [casse, setCasse] = useState(false);
  const externe = opportunite.imageUrl && !casse;
  return (
    <img
      src={externe ? opportunite.imageUrl : imageOpportunite(opportunite)}
      alt=""
      width="1000"
      height="563"
      loading={eager ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      onError={() => setCasse(true)}
      className={className}
    />
  );
}
