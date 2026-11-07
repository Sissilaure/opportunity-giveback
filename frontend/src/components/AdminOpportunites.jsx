import { useEffect, useState } from "react";
import {
  adminFetchOpportunites,
  adminCreerOpportunite,
  adminApprouverOpportunite,
  adminSupprimerOpportunite,
  adminLancerRechercheIA,
} from "../lib/api";
import TypeBadge from "./TypeBadge";
import { ExternalLinkIcon } from "./icons";
import { lienSur } from "../lib/url";

const TYPES = ["bourse", "stage", "emploi", "concours", "autre"];

const FORMULAIRE_VIDE = {
  titre: "",
  type: "bourse",
  organisme: "",
  siteWeb: "",
  publicEligible: "",
  criteres: "",
  piecesRequises: "",
  dateEcheance: "",
  lienSource: "",
};

export default function AdminOpportunites() {
  const [aVerifier, setAVerifier] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState({});
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [rechercheMessage, setRechercheMessage] = useState("");
  const [erreurAction, setErreurAction] = useState("");

  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [envoiForm, setEnvoiForm] = useState(false);
  const [erreurForm, setErreurForm] = useState("");

  function chargerAVerifier() {
    adminFetchOpportunites("a_verifier")
      .then((data) => setAVerifier(data.opportunites))
      .catch(() => {})
      .finally(() => setChargement(false));
  }

  useEffect(chargerAVerifier, []);

  async function handleApprouver(id) {
    setErreurAction("");
    setActionEnCours((s) => ({ ...s, [id]: true }));
    try {
      await adminApprouverOpportunite(id);
      chargerAVerifier();
    } catch (err) {
      setErreurAction(err.message);
    } finally {
      setActionEnCours((s) => ({ ...s, [id]: false }));
    }
  }

  async function handleRejeter(id) {
    // Suppression définitive : on demande confirmation (un clic malheureux sur mobile suffisait à tout perdre).
    if (!window.confirm("Rejeter et supprimer définitivement cette piste ?")) return;
    setErreurAction("");
    setActionEnCours((s) => ({ ...s, [id]: true }));
    try {
      await adminSupprimerOpportunite(id);
      chargerAVerifier();
    } catch (err) {
      setErreurAction(err.message);
    } finally {
      setActionEnCours((s) => ({ ...s, [id]: false }));
    }
  }

  async function handleRechercheIA() {
    setRechercheEnCours(true);
    setRechercheMessage("");
    try {
      const { ajoutees, examinees } = await adminLancerRechercheIA();
      setRechercheMessage(
        examinees
          ? `${ajoutees} nouvelle(s) piste(s) sur ${examinees} examinée(s), à vérifier ci-dessous.`
          : "Aucune nouvelle piste cette fois-ci.",
      );
      chargerAVerifier();
    } catch (err) {
      setRechercheMessage(err.message);
    } finally {
      setRechercheEnCours(false);
    }
  }

  async function handleSoumettreForm() {
    setErreurForm("");
    if (!form.titre.trim() || !form.organisme.trim() || !form.lienSource.trim()) {
      setErreurForm("Titre, organisme et lien source sont obligatoires.");
      return;
    }
    setEnvoiForm(true);
    try {
      await adminCreerOpportunite(form);
      setForm(FORMULAIRE_VIDE);
      setFormVisible(false);
      setRechercheMessage("Opportunité ajoutée au répertoire.");
    } catch (err) {
      setErreurForm(err.message);
    } finally {
      setEnvoiForm(false);
    }
  }

  function setChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink">Opportunités</p>
          <h2 className="mt-1 font-display text-xl text-ink">Alimentation du répertoire</h2>
          <p className="mt-0.5 text-xs text-muted">
            Le système cherche automatiquement chaque jour, pas besoin de cliquer. Ce bouton force juste un passage immédiat.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRechercheIA}
            disabled={rechercheEnCours}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-60"
          >
            {rechercheEnCours ? "Recherche…" : "Forcer une recherche maintenant"}
          </button>
          <button
            onClick={() => setFormVisible((v) => !v)}
            className="rounded-xl border border-ink/40 bg-transparent px-4 py-2 text-sm font-semibold text-ink shadow-card transition hover:bg-canvas"
          >
            {formVisible ? "Annuler" : "Ajouter manuellement"}
          </button>
        </div>
      </div>

      {rechercheMessage && (
        <p role="status" className="mt-3 text-sm text-muted">
          {rechercheMessage}
        </p>
      )}
      {erreurAction && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {erreurAction}
        </p>
      )}

      {formVisible && (
        <div className="mt-4 rounded-card border border-line bg-surface p-5 shadow-card">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.titre}
              onChange={(e) => setChamp("titre", e.target.value)}
              placeholder="Titre de l'opportunité"
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none sm:col-span-2"
            />
            <select
              value={form.type}
              onChange={(e) => setChamp("type", e.target.value)}
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={form.organisme}
              onChange={(e) => setChamp("organisme", e.target.value)}
              placeholder="Organisme"
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <input
              value={form.siteWeb}
              onChange={(e) => setChamp("siteWeb", e.target.value)}
              placeholder="Site officiel de l'organisme (https://…)"
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <input
              value={form.lienSource}
              onChange={(e) => setChamp("lienSource", e.target.value)}
              placeholder="Lien source de l'annonce (https://…)"
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <input
              type="date"
              value={form.dateEcheance}
              onChange={(e) => setChamp("dateEcheance", e.target.value)}
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none sm:col-span-2"
            />
            <textarea
              value={form.publicEligible}
              onChange={(e) => setChamp("publicEligible", e.target.value)}
              placeholder="Public éligible"
              rows={2}
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none sm:col-span-2"
            />
            <textarea
              value={form.criteres}
              onChange={(e) => setChamp("criteres", e.target.value)}
              placeholder={"Critères (un par ligne)"}
              rows={3}
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <textarea
              value={form.piecesRequises}
              onChange={(e) => setChamp("piecesRequises", e.target.value)}
              placeholder={"Pièces requises (une par ligne)"}
              rows={3}
              className="rounded-lg border border-line bg-canvas p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
          </div>

          {erreurForm && <p className="mt-3 text-sm text-danger">{erreurForm}</p>}

          <button
            onClick={handleSoumettreForm}
            disabled={envoiForm}
            className="mt-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:opacity-60"
          >
            {envoiForm ? "Publication…" : "Publier l'opportunité"}
          </button>
        </div>
      )}

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
        À vérifier ({aVerifier.length})
      </p>

      {chargement && <p className="text-sm text-muted">Chargement…</p>}
      {!chargement && aVerifier.length === 0 && (
        <p className="text-sm text-muted">Rien à vérifier pour le moment.</p>
      )}

      <div className="space-y-3">
        {aVerifier.map((o) => (
          <div key={o.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={o.type} />
              <span className="text-sm font-bold text-ink">{o.titre}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{o.organisme}</p>
            {o.publicEligible && <p className="mt-2 text-sm text-ink/80">{o.publicEligible}</p>}
            {lienSur(o.lienSource) ? (
              <a
                href={lienSur(o.lienSource)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Vérifier la source <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-2 text-sm font-medium text-danger">
                Lien source invalide ou dangereux : à corriger ou à rejeter.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleApprouver(o.id)}
                disabled={actionEnCours[o.id]}
                className="rounded-lg bg-success px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Publier
              </button>
              <button
                onClick={() => handleRejeter(o.id)}
                disabled={actionEnCours[o.id]}
                className="rounded-lg border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-60"
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
