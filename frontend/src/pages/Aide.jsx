import { useEffect, useState } from "react";
import { fetchFaq, fetchQuestionsRepondues, envoyerQuestion } from "../lib/api";
import { ChevronDownIcon } from "../components/icons";
import useTitre from "../hooks/useTitre";

export default function Aide() {
  useTitre("Aide");
  const [faq, setFaq] = useState([]);
  const [questionsRepondues, setQuestionsRepondues] = useState([]);
  const [openFaqId, setOpenFaqId] = useState(null);
  const [texte, setTexte] = useState("");
  const [statut, setStatut] = useState(null);
  const [erreurMessage, setErreurMessage] = useState("");

  useEffect(() => {
    fetchFaq().then(setFaq).catch(() => {});

    function chargerQuestionsRepondues() {
      fetchQuestionsRepondues().then(setQuestionsRepondues).catch(() => {});
    }

    chargerQuestionsRepondues();
    const intervalle = window.setInterval(chargerQuestionsRepondues, 10000);
    return () => window.clearInterval(intervalle);
  }, []);

  async function handleEnvoyer() {
    const contenu = texte.trim();
    if (!contenu) {
      setStatut("error");
      setErreurMessage("Merci d'écrire votre question avant d'envoyer.");
      return;
    }
    setStatut("sending");
    try {
      await envoyerQuestion(contenu);
      setStatut("sent");
      setTexte("");
    } catch (err) {
      setStatut("error");
      setErreurMessage(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">Aide</p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Aide</h1>
      <p className="mt-1 text-base italic text-muted">Une question ? Un blocage ?</p>

      <div className="relative mt-5 overflow-hidden rounded-card bg-ink p-5 text-white shadow-card-hover">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary opacity-40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">Canal d'orientation</p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-snug">Vous n'êtes pas seul·e dans vos démarches</h2>
          <p className="mt-1 text-sm text-white/80">
            Posez une question, elle sera lue par un membre de l'équipe et vous orientera.
          </p>
        </div>
      </div>

      {faq.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Questions fréquentes</p>
          <div className="mt-2 divide-y divide-line border-b border-line">
            {faq.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm font-medium text-ink"
                  >
                    <span>{item.question}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 text-accent transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && <p className="pb-3 text-sm text-muted">{item.reponse}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {questionsRepondues.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Questions de la communauté</p>
          <div className="mt-2 space-y-3">
            {questionsRepondues.map((question) => (
              <div key={question.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <p className="text-sm font-medium text-ink">{question.texte}</p>
                <p className="mt-2 border-l-2 border-accent pl-3 text-sm text-muted">{question.reponse}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-card border border-line bg-surface p-4 shadow-card">
        <p className="text-xs text-muted">
          Votre question sera lue par un membre de l'équipe et redirigée si besoin.
        </p>
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Écrivez votre question ici…"
          rows={4}
          className="mt-3 w-full rounded-lg border border-line bg-canvas p-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleEnvoyer}
          disabled={statut === "sending"}
          className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark hover:shadow-card-hover disabled:opacity-60"
        >
          {statut === "sending" ? "Envoi…" : "Poser une question"}
        </button>

        {statut === "sent" && (
          <p className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
            Question envoyée. Une personne de l'équipe y répondra prochainement.
          </p>
        )}
        {statut === "error" && (
          <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{erreurMessage}</p>
        )}
      </div>
    </main>
  );
}
