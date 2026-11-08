import { useMemo, useState } from "react";
import { adminImporterOpportunites } from "../lib/api";
import { preparerImport, MAX_LIGNES, MODELE_CSV } from "../lib/importCsv";

const TAILLE_MAX_FICHIER = 1024 * 1024; // 1 Mo : largement assez pour 100 lignes

// File.text() n'existe pas sur les navigateurs un peu anciens : repli sur FileReader.
const lireTexte = (fichier) =>
  typeof fichier.text === "function"
    ? fichier.text()
    : new Promise((resolve, reject) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resolve(String(lecteur.result));
        lecteur.onerror = () => reject(lecteur.error);
        lecteur.readAsText(fichier);
      });

function telechargerModele() {
  const blob = new Blob([MODELE_CSV], { type: "text/csv;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = "modele-import-opportunites.csv";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

const STATUTS = {
  ajoutee: { texte: "Ajoutée", classe: "text-success" },
  doublon: { texte: "Déjà présente", classe: "text-muted" },
  invalide: { texte: "Refusée", classe: "text-danger" },
};

/**
 * Import de plusieurs opportunités d'un coup : on colle un tableau (Excel, Google Sheets) ou on choisit un fichier CSV,
 * on voit l'aperçu avec les erreurs ligne par ligne, puis on envoie. Rien n'est écrit tant qu'on n'a pas cliqué sur « Importer ».
 */
export default function ImportOpportunites({ onImporte }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [mode, setMode] = useState("publier");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [compteRendu, setCompteRendu] = useState(null);

  const analyse = useMemo(() => preparerImport(texte), [texte]);
  const valides = analyse.lignes.filter((l) => l.erreurs.length === 0);
  const aCorriger = analyse.lignes.length - valides.length;
  const tropDeLignes = analyse.lignes.length > MAX_LIGNES;

  async function lireFichier(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX_FICHIER) {
      setErreur("Ce fichier est trop gros (1 Mo maximum). Découpez-le en plusieurs imports.");
      return;
    }
    setErreur("");
    setCompteRendu(null);
    try {
      setTexte(await lireTexte(fichier));
    } catch {
      setErreur("Impossible de lire ce fichier. Essayez de copier-coller son contenu à la place.");
    }
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur("");
    try {
      const resultat = await adminImporterOpportunites(valides.map((l) => l.donnees), mode);
      setCompteRendu(resultat);
      setTexte("");
      onImporte?.();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  function recommencer() {
    setCompteRendu(null);
    setTexte("");
    setErreur("");
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="mt-3 inline-flex min-h-[40px] items-center rounded-xl border border-ink/40 bg-transparent px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink"
      >
        Importer plusieurs opportunités
      </button>
    );
  }

  return (
    <section className="mt-4 rounded-card border border-line bg-surface p-5" aria-labelledby="titre-import">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="titre-import" className="text-base font-semibold text-ink">
            Importer plusieurs opportunités
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            Collez un tableau (Excel, Google Sheets) ou choisissez un fichier CSV. {MAX_LIGNES} lignes maximum par import.
          </p>
        </div>
        <button onClick={() => setOuvert(false)} className="min-h-[40px] shrink-0 px-2 text-sm font-medium text-muted hover:text-ink">
          Fermer
        </button>
      </div>

      {compteRendu ? (
        <div className="mt-4" role="status">
          <p className="text-sm font-semibold text-ink">
            {compteRendu.ajoutees} opportunité{compteRendu.ajoutees > 1 ? "s" : ""} ajoutée{compteRendu.ajoutees > 1 ? "s" : ""}
            {compteRendu.mode === "publier" ? " et publiée" + (compteRendu.ajoutees > 1 ? "s" : "") : ", en attente de vérification"}.
          </p>
          {(compteRendu.doublons > 0 || compteRendu.invalides > 0) && (
            <p className="mt-1 text-sm text-muted">
              {compteRendu.doublons} déjà présente{compteRendu.doublons > 1 ? "s" : ""}, {compteRendu.invalides} refusée
              {compteRendu.invalides > 1 ? "s" : ""}.
            </p>
          )}
          {compteRendu.resultats.some((r) => r.statut !== "ajoutee") && (
            <ul className="mt-3 space-y-1 text-sm">
              {compteRendu.resultats
                .filter((r) => r.statut !== "ajoutee")
                .map((r) => (
                  <li key={r.ligne}>
                    <span className={`font-semibold ${STATUTS[r.statut].classe}`}>Ligne {r.ligne}</span> {r.titre && `« ${r.titre} » `}: {r.raison}
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Les images d'aperçu des organismes sont récupérées en arrière-plan, quelques minutes peuvent être nécessaires.</p>
          <button onClick={recommencer} className="mt-4 min-h-[44px] rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">
            Faire un autre import
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={telechargerModele} className="min-h-[40px] rounded-lg border border-ink/40 px-3 py-2 text-sm font-semibold text-ink hover:border-ink">
              Télécharger le modèle
            </button>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center rounded-lg border border-ink/40 px-3 py-2 text-sm font-semibold text-ink hover:border-ink">
              Choisir un fichier
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={lireFichier} className="sr-only" />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            Colonnes obligatoires : <strong>titre, type, organisme, lien_source</strong>. Facultatives : site_web, public, criteres, pieces,
            date_limite. Séparez plusieurs critères ou pièces par « | ». Type : bourse, stage, emploi, concours ou autre.
          </p>

          <label htmlFor="import-texte" className="mt-4 block text-sm font-medium text-ink">
            Tableau à importer
          </label>
          <textarea
            id="import-texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={"titre;type;organisme;lien_source\nBourse exemple;bourse;Fondation X;https://…"}
            className="mt-1.5 w-full rounded-lg border border-line bg-canvas p-3 font-mono text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none"
          />

          {analyse.manquantes.length > 0 && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              Colonne{analyse.manquantes.length > 1 ? "s" : ""} obligatoire{analyse.manquantes.length > 1 ? "s" : ""} introuvable
              {analyse.manquantes.length > 1 ? "s" : ""} : {analyse.manquantes.join(", ")}. La première ligne doit contenir les noms des colonnes.
            </p>
          )}
          {analyse.ignorees.length > 0 && analyse.manquantes.length === 0 && (
            <p className="mt-3 text-xs text-muted">Colonnes ignorées (non reconnues) : {analyse.ignorees.join(", ")}.</p>
          )}

          {analyse.lignes.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink" aria-live="polite">
                {analyse.lignes.length} ligne{analyse.lignes.length > 1 ? "s" : ""} : <span className="text-success">{valides.length} valide{valides.length > 1 ? "s" : ""}</span>
                {aCorriger > 0 && <>, <span className="text-danger">{aCorriger} à corriger</span></>}
              </p>
              {tropDeLignes && (
                <p role="alert" className="mt-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                  {MAX_LIGNES} lignes maximum par import : découpez votre fichier en plusieurs parties.
                </p>
              )}
              <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
                <table className="w-full sm:min-w-[34rem] text-left text-xs">
                  <thead className="sticky top-0 bg-canvas text-muted">
                    <tr>
                      <th className="px-2 py-2 font-semibold">N°</th>
                      <th className="px-2 py-2 font-semibold">Titre</th>
                      <th className="px-2 py-2 font-semibold">Type</th>
                      <th className="px-2 py-2 font-semibold">Organisme</th>
                      <th className="px-2 py-2 font-semibold">Date limite</th>
                      <th className="hidden px-2 py-2 font-semibold sm:table-cell">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyse.lignes.map((l) => (
                      <tr key={l.numero} className="border-t border-line align-top">
                        <td className="px-2 py-2 text-muted">{l.numero}</td>
                        <td className="px-2 py-2 text-ink">
                          {l.donnees.titre}
                          {/* Sur téléphone la colonne « État » est hors écran : le motif s'affiche donc sous le titre. */}
                          <span className={`mt-1 block font-semibold sm:hidden ${l.erreurs.length === 0 ? "text-success" : "text-danger"}`}>
                            {l.erreurs.length === 0 ? "Valide" : l.erreurs.join(" ")}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-ink">{l.donnees.type}</td>
                        <td className="px-2 py-2 text-ink">{l.donnees.organisme}</td>
                        <td className="px-2 py-2 text-ink">{l.donnees.dateEcheance || "—"}</td>
                        <td className="hidden px-2 py-2 sm:table-cell">
                          {l.erreurs.length === 0 ? <span className="font-semibold text-success">Valide</span> : <span className="text-danger">{l.erreurs.join(" ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {aCorriger > 0 && <p className="mt-2 text-xs text-muted">Les lignes à corriger ne seront pas importées. Corrigez-les dans le tableau, ou importez les lignes valides maintenant.</p>}
            </div>
          )}

          {valides.length > 0 && !tropDeLignes && (
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-ink">Que faire des {valides.length} ligne{valides.length > 1 ? "s" : ""} valide{valides.length > 1 ? "s" : ""} ?</legend>
              {[
                { valeur: "publier", titre: "Publier tout de suite", detail: "Vous avez vérifié ces informations : elles seront visibles immédiatement." },
                { valeur: "a_verifier", titre: "Mettre en attente", detail: "Elles rejoignent la liste « À vérifier » ; la lecture automatique du site officiel pourra les publier." },
              ].map((o) => (
                <label key={o.valeur} className="mt-2 flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border border-line p-3">
                  <input type="radio" name="mode-import" value={o.valeur} checked={mode === o.valeur} onChange={() => setMode(o.valeur)} className="mt-0.5 h-5 w-5 accent-primary" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{o.titre}</span>
                    <span className="block text-xs text-muted">{o.detail}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {erreur && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              {erreur}
            </p>
          )}

          <button
            onClick={envoyer}
            disabled={envoi || valides.length === 0 || tropDeLignes}
            className="mt-4 min-h-[44px] rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {envoi ? "Import en cours…" : valides.length > 0 ? `Importer ${valides.length} opportunité${valides.length > 1 ? "s" : ""}` : "Importer"}
          </button>
        </>
      )}
    </section>
  );
}
