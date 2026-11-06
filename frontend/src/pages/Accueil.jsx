import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchOpportunites, fetchStats, fetchTemoignages, fetchFaq } from "../lib/api";
import { TYPE_STYLES, TYPE_IMAGES } from "../lib/types";
import useTitre from "../hooks/useTitre";
import OpportuniteCard from "../components/OpportuniteCard";
import Newsletter from "../components/Newsletter";
import Reveal from "../components/Reveal";
import CountUp from "../components/CountUp";
import { ChevronRightIcon, ChevronDownIcon, CheckIcon } from "../components/icons";

const CATEGORIES = [
  { type: "bourse", titre: "Bourses", texte: "Financements d'études, du premier cycle au doctorat." },
  { type: "stage", titre: "Stages", texte: "Expériences professionnelles en organisations et entreprises." },
  { type: "emploi", titre: "Emplois", texte: "Premiers postes et programmes de jeunes professionnels." },
  { type: "concours", titre: "Concours", texte: "Compétitions, prix et appels à projets pour les jeunes." },
  { type: "autre", titre: "Autres programmes", texte: "Formations, échanges et programmes de leadership." },
];

const ETAPES = [
  {
    titre: "Découvrir",
    texte: "Parcourez le catalogue ou décrivez votre situation à la recherche intelligente. Chaque fiche est classée par type.",
  },
  {
    titre: "Comprendre",
    texte: "Ouvrez la fiche : critères d'éligibilité, pièces à fournir, échéance et source officielle, sans jargon.",
  },
  {
    titre: "Se préparer",
    texte: "Utilisez nos guides, modèles de CV et de lettre de motivation, et la check-list de dossier.",
  },
  {
    titre: "Candidater",
    texte: "Rendez-vous sur le site officiel de l'organisme. Vous candidatez toujours auprès de lui, sans intermédiaire ni commission.",
  },
  {
    titre: "Rester informé",
    texte: "Inscrivez-vous aux alertes, posez vos questions à l'équipe et retrouvez les réponses dans la FAQ.",
  },
];

const ARGUMENTS = [
  {
    titre: "Information vérifiée",
    texte: "Chaque fiche affiche sa source officielle et sa date de vérification. Les offres expirées sont archivées automatiquement.",
  },
  {
    titre: "Accompagnement pas à pas",
    texte: "Guides de candidature, modèles de CV et de lettres, check-list de dossier et conseils pour repérer les fausses annonces.",
  },
  {
    titre: "Une équipe qui répond",
    texte: "Une question sur une bourse ou un dossier ? L'équipe répond, et la réponse profite à toute la communauté.",
  },
];

function SectionTitre({ surtitre, titre, texte }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-widest text-accent-dark">{surtitre}</p>
      <h2 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {titre}
      </h2>
      {texte && <p className="mt-2 text-base text-muted">{texte}</p>}
    </Reveal>
  );
}

function Statistique({ valeur, libelle }) {
  return (
    <div>
      <p className="font-display text-5xl font-semibold text-primary">
        <CountUp valeur={valeur} />
      </p>
      <p className="mt-1 text-sm text-muted">{libelle}</p>
    </div>
  );
}

export default function Accueil() {
  useTitre("");
  const { hash } = useLocation();
  const [stats, setStats] = useState(null);
  const [aLaUne, setALaUne] = useState([]);
  const [temoignages, setTemoignages] = useState([]);
  const [faq, setFaq] = useState([]);
  const [faqOuverte, setFaqOuverte] = useState(null);

  // Chaque bloc se charge indépendamment : si l'un échoue, le reste de l'accueil s'affiche quand même.
  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
    fetchOpportunites()
      .then((data) => setALaUne(data.opportunites.filter((o) => o.statutEcheance !== "depassee").slice(0, 3)))
      .catch(() => {});
    fetchTemoignages().then(setTemoignages).catch(() => {});
    fetchFaq().then((data) => setFaq(data.slice(0, 5))).catch(() => {});
  }, []);

  // Les liens d'ancre (#comment-ca-marche, #newsletter) venant d'une autre page : React Router ne défile pas tout seul.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, stats]);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-line bg-glow">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-success shadow-card">
              <CheckIcon className="h-3 w-3" /> Bourses, stages et opportunités vérifiés
            </p>
            <h1
              className="animate-fade-up mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-6xl"
              style={{ "--delay": "100ms" }}
            >
              Chaque opportunité mérite d'être <span className="text-accent-dark">trouvée</span>.
            </h1>
            <p className="animate-fade-up mt-4 max-w-xl text-lg text-muted" style={{ "--delay": "200ms" }}>
              Nous recensons et expliquons les bourses d'études, stages, emplois et concours destinés aux jeunes
              africains. Information vérifiée, critères clairs, lien direct vers la plateforme officielle.
            </p>
            <div className="animate-fade-up mt-7 flex flex-col gap-3 sm:flex-row" style={{ "--delay": "300ms" }}>
              <Link
                to="/opportunites"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark hover:shadow-card-hover"
              >
                Explorer les opportunités
                <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/ressources"
                className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink shadow-card transition hover:border-primary"
              >
                Comment candidater
              </Link>
            </div>

            {stats && (
              <div className="animate-fade-up mt-12 grid grid-cols-2 gap-6 border-t border-line pt-8 sm:max-w-md" style={{ "--delay": "400ms" }}>
                <Statistique valeur={stats.total} libelle="opportunités vérifiées et ouvertes" />
                <Statistique valeur={stats.organismes} libelle="organismes partenaires" />
              </div>
            )}
          </div>

          <div className="animate-fade-up relative mx-auto w-full max-w-md lg:max-w-none" style={{ "--delay": "250ms" }} aria-hidden="true">
            <div className="overflow-hidden rounded-[28px] shadow-card-hover">
              <img
                src="/images/accompagnement.jpg"
                alt=""
                width="1000"
                height="667"
                fetchPriority="high"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="animate-float absolute -bottom-6 -left-4 hidden w-44 overflow-hidden rounded-2xl border-4 border-canvas shadow-card-hover sm:block">
              <img src="/images/campus.jpg" alt="" width="1000" height="563" loading="lazy" className="aspect-[16/10] w-full object-cover" />
            </div>
            <div
              className="animate-pop-in absolute right-2 top-6 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 shadow-card-hover sm:-right-4"
              style={{ "--delay": "700ms" }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-bg text-success">
                <CheckIcon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-ink">
                Source officielle
                <span className="block font-normal text-muted">vérifiée par l'équipe</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <SectionTitre
          surtitre="Par type d'opportunité"
          titre="Trouvez ce qui correspond à votre parcours"
          texte="Cinq grandes catégories, mises à jour et vérifiées par l'équipe."
        />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => {
            const nombre = stats?.parType?.[c.type] ?? 0;
            return (
              <Reveal key={c.type} delay={i * 80}>
                <Link
                  to={`/opportunites?type=${c.type}`}
                  className="group relative block h-full overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-primary-light">
                    <img
                      src={TYPE_IMAGES[c.type]}
                      alt=""
                      loading="lazy"
                      width="1000"
                      height="563"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/70 via-primary-dark/10 to-transparent" />
                    <p className="absolute bottom-3 left-4 font-display text-4xl font-semibold text-white">{nombre}</p>
                    <span className={`absolute inset-x-0 bottom-0 h-1 ${TYPE_STYLES[c.type].bar}`} aria-hidden="true" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg font-semibold text-ink">{c.titre}</h3>
                    <p className="mt-1 text-sm text-muted">{c.texte}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Voir les opportunités{" "}
                      <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {aLaUne.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionTitre
                surtitre="À la une"
                titre="Les prochaines échéances"
                texte="Des programmes vérifiés, ouverts aux candidatures. Chaque fiche renvoie vers la source officielle."
              />
              <Link to="/opportunites" className="inline-block py-2 text-sm font-semibold text-primary hover:underline">
                Voir toutes les opportunités →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aLaUne.map((opp, i) => (
                <Reveal key={opp.id} delay={i * 90}>
                  <OpportuniteCard opportunite={opp} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="comment-ca-marche" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14 sm:px-8">
        <SectionTitre
          surtitre="Comment ça marche"
          titre="De la découverte à la candidature, en cinq étapes"
          texte="Vous ne candidatez jamais en aveugle : chaque action est expliquée, chaque document est listé, chaque échéance est visible."
        />
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ETAPES.map((e, i) => (
            <Reveal as="li" key={e.titre} delay={i * 90}>
              <div className="h-full rounded-card border border-line bg-surface p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                <span className="font-display text-3xl font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink">{e.titre}</h3>
                <p className="mt-1 text-sm text-muted">{e.texte}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <SectionTitre
            surtitre="Pourquoi Opportunity Hub"
            titre="L'information, ce n'est pas assez. Il faut la comprendre."
            texte="Savoir qu'une bourse existe ne suffit pas : il faut savoir qui peut postuler, quoi fournir et quand."
          />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {ARGUMENTS.map((a, i) => (
              <Reveal key={a.titre} delay={i * 100}>
                <div className="h-full rounded-card border border-line bg-canvas p-5">
                  <h3 className="font-display text-xl font-semibold text-ink">{a.titre}</h3>
                  <p className="mt-2 text-sm text-muted">{a.texte}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-6 rounded-card bg-primary p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-display text-xl font-semibold">Une recherche qui comprend votre situation</p>
              <p className="mt-1 text-sm text-white/80">
                Décrivez votre profil en une phrase : l'IA classe les opportunités par pertinence. Ses suggestions
                restent à vérifier sur la source officielle.
              </p>
            </div>
            <Link
              to="/opportunites"
              className="mt-4 inline-block shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-primary-dark transition hover:brightness-110 sm:mt-0"
            >
              Essayer la recherche intelligente
            </Link>
          </Reveal>
        </div>
      </section>

      {temoignages.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <SectionTitre surtitre="Témoignages" titre="Ils ont trouvé leur opportunité" />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {temoignages.map((t, i) => (
              <Reveal as="figure" key={t.id} delay={i * 100} className="rounded-card border border-line bg-surface p-6 shadow-card">
                <span className="font-display text-5xl leading-none text-accent" aria-hidden="true">
                  “
                </span>
                <blockquote className="-mt-2 font-display text-lg leading-relaxed text-ink">{t.texte}</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-ink">{t.nom}</span>
                  <span className="text-muted">
                    {" "}
                    · {t.pays} · {t.parcours}, boursier {t.annee}
                  </span>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
            <SectionTitre
              surtitre="Questions fréquentes"
              titre="Tout ce que vous voulez savoir"
              texte="Une question qui n'est pas listée ? Posez-la à l'équipe."
            />
            <Reveal className="mt-6 divide-y divide-line border-y border-line">
              {faq.map((item) => {
                const ouverte = faqOuverte === item.id;
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => setFaqOuverte(ouverte ? null : item.id)}
                      aria-expanded={ouverte}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-ink"
                    >
                      <span>{item.question}</span>
                      <ChevronDownIcon
                        className={`h-4 w-4 shrink-0 text-accent transition-transform duration-300 ${ouverte ? "rotate-180" : ""}`}
                      />
                    </button>
                    {/* grid 0fr -> 1fr : ouverture fluide sans connaître la hauteur du texte */}
                    <div
                      className={`grid transition-all duration-300 ease-out ${ouverte ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <p className="overflow-hidden text-sm text-muted">
                        <span className="block pb-4">{item.reponse}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </Reveal>
            <Link to="/aide" className="mt-4 inline-block py-2 text-sm font-semibold text-primary hover:underline">
              Voir toute la FAQ et poser une question →
            </Link>
          </div>
        </section>
      )}

      <Newsletter />
    </main>
  );
}
