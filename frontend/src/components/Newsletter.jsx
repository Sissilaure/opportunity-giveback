import { useState } from "react";
import { Link } from "react-router-dom";
import { inscrireNewsletter } from "../lib/api";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [frequence, setFrequence] = useState("hebdomadaire");
  const [statut, setStatut] = useState("idle");
  const [erreur, setErreur] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatut("sending");
    setErreur("");
    try {
      await inscrireNewsletter(email, frequence);
      setStatut("sent");
      setEmail("");
    } catch (err) {
      setErreur(err.message);
      setStatut("error");
    }
  }

  return (
    <section id="newsletter" className="bg-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Alerte opportunités</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Ne ratez plus aucune échéance
          </h2>
          <p className="mt-3 text-base text-white/80">
            Recevez les nouvelles opportunités vérifiées directement par email, au rythme qui vous convient.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-card bg-white/5 p-5 ring-1 ring-white/15">
          <label htmlFor="newsletter-email" className="text-sm font-medium">
            Votre adresse email
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom@exemple.com"
            className="mt-2 w-full rounded-lg border border-white/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none"
          />

          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Fréquence</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {[
                { value: "hebdomadaire", label: "Une fois par semaine" },
                { value: "immediate", label: "Dès qu'une opportunité est publiée" },
              ].map((opt) => (
                <label key={opt.value} className="flex min-h-[44px] items-center gap-2.5">
                  <input
                    type="radio"
                    name="frequence"
                    value={opt.value}
                    checked={frequence === opt.value}
                    onChange={() => setFrequence(opt.value)}
                    className="h-5 w-5 accent-accent"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={statut === "sending"}
            className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-primary-dark transition hover:brightness-110 disabled:opacity-60"
          >
            {statut === "sending" ? "Inscription…" : "Je m'inscris"}
          </button>

          <p className="mt-3 text-xs text-white/70">
            Votre email sert uniquement à vous envoyer ces alertes. Désinscription possible à tout moment.{" "}
            <Link to="/confidentialite" className="underline">
              En savoir plus
            </Link>
          </p>

          {statut === "sent" && (
            <p role="status" className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
              Merci ! Votre inscription est enregistrée.
            </p>
          )}
          {statut === "error" && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{erreur}</p>
          )}
        </form>
      </div>
    </section>
  );
}
