// Rappel calendrier (.ics) pour l'échéance d'une opportunité : fonctionne hors ligne, sans compte ni service tiers.

const echapper = (texte) =>
  String(texte ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

// Les lignes iCalendar ne doivent pas dépasser 75 octets : on replie avec CRLF + espace.
function replier(ligne) {
  const morceaux = [];
  let reste = ligne;
  while (reste.length > 73) {
    morceaux.push(reste.slice(0, 73));
    reste = " " + reste.slice(73);
  }
  morceaux.push(reste);
  return morceaux.join("\r\n");
}

const jour = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");

/**
 * Construit un événement "journée entière" à la date d'échéance, avec une alerte 7 jours avant.
 * Retourne null si la date est absente ou invalide.
 */
export function genererICS({ id, titre, organisme, dateEcheance, url }, maintenant = new Date()) {
  if (!dateEcheance) return null;
  const debut = new Date(`${String(dateEcheance).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(debut.getTime())) return null;
  const fin = new Date(debut.getTime() + 24 * 3600 * 1000);
  const horodatage = maintenant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Opportunity Hub//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:opportunite-${id}@opportunity-hub`,
    `DTSTAMP:${horodatage}`,
    `DTSTART;VALUE=DATE:${jour(debut)}`,
    `DTEND;VALUE=DATE:${jour(fin)}`,
    `SUMMARY:${echapper(`Échéance : ${titre}`)}`,
    `DESCRIPTION:${echapper(`${organisme}${url ? `\n${url}` : ""}`)}`,
    ...(url ? [`URL:${url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${echapper(`Dans 7 jours : ${titre}`)}`,
    "TRIGGER:-P7D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lignes.map(replier).join("\r\n") + "\r\n";
}

export function telechargerICS(opportunite, url) {
  const contenu = genererICS({ ...opportunite, url });
  if (!contenu) return false;
  const blob = new Blob([contenu], { type: "text/calendar;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = `echeance-opportunite-${opportunite.id}.ics`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  return true;
}
