# Opportunity Hub

Répertoire de bourses, stages, emplois et concours vérifiés, destiné aux étudiant·e·s
africain·e·s francophones. Une équipe humaine valide chaque opportunité avant
publication ; une recherche IA propose des pistes en continu, mais rien n'est jamais
publié automatiquement.

## Sommaire

- [Aperçu du projet](#aperçu-du-projet)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Démarrage en local](#démarrage-en-local)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Fonctionnalités clés](#fonctionnalités-clés)
- [Tests](#tests)
- [Déploiement actuel](#déploiement-actuel)
- [Limites connues](#limites-connues)
- [Pistes d'amélioration](#pistes-damélioration)

## Aperçu du projet

Ce dépôt est la **plateforme commune** issue de la charte de projet Give Back, 2iE : elle réunit
le moteur d'Opportunity Hub (groupe 2 : catalogue vérifié, recherche IA, FAQ, espace équipe) et la
charte visuelle et les contenus du site Africa Opportunities (groupe 1 : accueil, catégories, étapes,
témoignages, équipe, newsletter).

Le site a une page d'accueil, cinq parties publiques et un espace équipe protégé (`/admin`) :

- **Accueil** (`/`) — présentation, chiffres réels, catégories, prochaines échéances, étapes,
  témoignages, FAQ et inscription aux alertes.
- **Équipe** (`/equipe`) — présentation de l'équipe et accès au formulaire de contact.
- **Confidentialité** (`/confidentialite`) — données collectées et usage de l'IA.
- **Opportunités** (`/opportunites`, filtre `?type=bourse`) — liste des opportunités vérifiées, filtrables par type, avec une
  recherche classique par mots-clés et une **recherche intelligente** (langage naturel,
  via Gemini) qui classe les résultats par pertinence.
- **Ressources** (`/ressources`) — guides pratiques (CV, lettre de motivation, vigilance
  face aux annonces trompeuses, check-list de dossier).
- **Aide** (`/aide`) — FAQ + formulaire pour poser une question à l'équipe.
- **Espace équipe** (`/admin`) — connexion par email/mot de passe, pour répondre aux
  questions et gérer les opportunités (voir plus bas).

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | React 19 + Vite, React Router, Tailwind CSS |
| Backend | Node.js + Express 4 |
| Base de données | MySQL (compatible), actuellement hébergée sur **TiDB Cloud** |
| IA | Google Gemini (API gratuite) |
| Tests | Vitest (+ Supertest côté backend, Testing Library côté frontend) |
| Hébergement | Backend sur **Render**, frontend sur **Vercel** |

Aucun framework ORM : les requêtes SQL sont écrites à la main via `mysql2/promise`.

## Structure du dépôt

```
backend/
  app.js                    # Construction de l'app Express (testable, sans effet de bord)
  index.js                  # Point d'entrée réel : démarre le serveur + le cycle IA automatique
  db.js                     # Pool MySQL, création des tables question/admin_user
  sessionStore.js           # Store de session MySQL maison (survit aux redémarrages)
  gemini.js                 # Client HTTP minimal pour l'API Gemini
  discoveryIA.js            # Recherche IA de nouvelles opportunités (statut 'a_verifier')
  opportunites.js           # Logique partagée opportunités (formatage, expiration, etc.)
  schemas.js                # Schémas de validation Zod
  errors.js / validate.js   # Middleware d'erreurs et de validation génériques
  rateLimit.js              # Limiteur de débit en mémoire (sans dépendance externe)
  *Routes.js                # Un routeur Express par ressource (admin, questions, ressources, faq...)
  contenuRoutes.js          # Équipe et témoignages (data/equipe.json, data/temoignages.json)
  newsletterRoutes.js       # Inscription aux alertes (table newsletter_abonne, créée au démarrage)
  data/                     # Contenu JSON statique (FAQ, ressources, équipe, témoignages, questions de démo)
  opportunites_reelles.sql  # Schéma complet + données de seed (à importer sur une base neuve)
  tests/api.test.js         # Suite de tests d'intégration (pool factice, aucune vraie base requise)

frontend/
  src/pages/                # Une page par route (Repertoire, Ressources, Aide, Admin, ...)
  src/components/           # Composants réutilisables (cartes, badges, formulaires admin, icônes SVG)
  src/lib/                  # api.js (appels HTTP), markdown.js (rendu léger), suivi.js (localStorage)
  public/logo.png           # Logo de l'app (utilisé dans la nav + favicon)
```

## Démarrage en local

Prérequis : Node.js 20+, et une base MySQL accessible (voir [Base de données](#base-de-données)).

```bash
# Backend
cd backend
cp .env.example .env      # puis remplir les valeurs, voir section suivante
npm install
npm run dev                # nodemon, redémarre automatiquement sur changement

# Frontend (dans un autre terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173 (ou un autre port si occupé)
```

Le backend écoute par défaut sur `http://localhost:4000`.

## Variables d'environnement

Voir `backend/.env.example` et `frontend/.env.example` pour la liste complète et commentée.
Points importants :

- **Connexion à la base** : trois modes possibles selon le fournisseur (voir commentaires
  dans `.env.example`) — CA personnalisée (`DB_CA_CONTENT`/`DB_CA_PATH`, ex. Aiven), TLS
  avec autorité déjà reconnue (`DB_SSL=true`, ex. TiDB Cloud/Let's Encrypt), ou sans TLS
  (MySQL local).
- **`ADMIN_EMAIL` / `ADMIN_PASSWORD`** : ne servent qu'une seule fois, pour créer le
  tout premier compte admin au démarrage si la table `admin_user` est vide. Pour ajouter
  d'autres comptes ensuite : `npm run create-admin -- email@exemple.com "mot de passe"`
  (script dans `backend/scripts/createAdmin.js`).
- **`GEMINI_API_KEY`** : clé gratuite sur [aistudio.google.com](https://aistudio.google.com)
  (bouton "Get API key", aucune carte bancaire). Sans elle, la recherche intelligente et
  la découverte automatique d'opportunités renvoient une erreur claire (503) au lieu de
  planter — le reste du site fonctionne normalement.
- **`FRONTEND_URL`** : doit correspondre exactement à l'URL du frontend déployé, sinon le
  CORS bloque la connexion à l'espace équipe (le Répertoire fonctionne quand même, lui
  n'a pas besoin de cookies).

## Base de données

Le schéma complet (tables + données de démo) est dans `backend/opportunites_reelles.sql`.
Sur une base neuve :

```bash
mysql -h <host> -P <port> -u <user> -p --default-character-set=utf8mb4 <nom_base> < backend/opportunites_reelles.sql
```

Les tables `question`, `admin_user`, `newsletter_abonne` et `sessions` sont créées automatiquement par le
backend à son premier démarrage (pas besoin de les inclure manuellement).

**Important sur l'encodage** : toujours importer avec `--default-character-set=utf8mb4`
(ou l'équivalent de votre client) — un import sans ce flag corrompt silencieusement les
caractères accentués.

## Fonctionnalités clés

### Recherche intelligente (côté visiteur)

Page Répertoire, section "Recherche intelligente" : l'utilisateur décrit sa situation en
langage libre, le backend (`POST /api/recherche-ia`) demande à Gemini de classer les
opportunités déjà vérifiées par pertinence, avec une raison courte pour chacune.

### Découverte automatique + validation (côté équipe)

- Un cycle automatique (`backend/index.js`, tourne au démarrage **et** chaque jour à 6h)
  demande à Gemini de proposer de nouvelles opportunités probables. **Tout atterrit en
  statut `a_verifier`, jamais publié directement** — Gemini n'a pas accès à une recherche
  web en direct (le grounding Google Search dépasse le quota gratuit), donc ces
  propositions s'appuient sur ses connaissances propres et doivent être vérifiées par un
  humain avant publication.
- Le même cycle archive (statut `expiree`) les opportunités publiées dont l'échéance est
  dépassée depuis plus de 20 jours — elles disparaissent du Répertoire sans être
  supprimées.
- Dans `/admin`, la section "Alimentation du répertoire" liste la file "à vérifier" avec
  des boutons Publier/Rejeter, un bouton pour forcer une recherche immédiate, et un
  formulaire d'ajout manuel (publié directement, puisque saisi par un humain).

### Sessions admin persistantes

Les sessions de connexion sont stockées dans la table MySQL `sessions` (voir
`backend/sessionStore.js`), pas en mémoire — un redémarrage du serveur (courant sur un
hébergement gratuit qui se met en veille) ne déconnecte donc pas l'équipe.

## Tests

```bash
cd backend && npm test     # Vitest + Supertest, pool MySQL factice — aucune vraie base requise
cd frontend && npm test    # Vitest + Testing Library
```

Un workflow GitHub Actions (`.github/workflows/ci.yml`) lance lint + tests + build sur
chaque push/PR.

## Déploiement actuel

| Service | Où | Détail |
|---|---|---|
| Frontend | Vercel | Racine du projet : `frontend/` |
| Backend | Render | Racine du projet : `backend/`, build `npm install`, start `node index.js` |
| Base de données | TiDB Cloud (plan Starter, gratuit) | MySQL-compatible, `DB_SSL=true`, pas de certificat à fournir |
| Recherche IA | Google Gemini | Modèle configuré dans `GEMINI_MODEL` (voir `.env.example`) |

Pour redéployer : un `git push` sur `main` déclenche Vercel et Render automatiquement
(auto-deploy activé sur les deux). Les variables d'environnement se gèrent depuis le
tableau de bord de chaque service (ou via leur API respective avec une clé API).

## Limites connues

- **Render (plan gratuit)** : le service backend se met en veille après ~15 minutes
  d'inactivité ; le premier visiteur suivant attend 30-60 secondes le temps qu'il se
  réveille. Pas de contournement gratuit connu.
- **Gemini (plan gratuit)** : quota de requêtes limité ; peut occasionnellement répondre
  "modèle surchargé" (503) aux heures de pointe — déjà géré proprement côté code (message
  clair, pas de crash), il suffit de réessayer.
- **Propositions IA** : à vérifier humainement avant publication — Gemini n'a pas de
  recherche web en direct sur ce projet, ses propositions peuvent être datées ou
  approximatives même si le prompt lui interdit d'inventer un organisme inexistant.
- **Vercel (plan Hobby)** : gratuit uniquement pour un usage non commercial.

## Pistes d'amélioration

- Passer à un plan payant Render (ou un autre hébergeur) si la latence de réveil devient
  gênante en usage réel.
- Ajouter le "grounding" Google Search côté Gemini (nécessite un compte payant) pour que
  la découverte automatique s'appuie sur une vraie recherche web plutôt que sur les
  connaissances internes du modèle.
- Étendre les tests frontend aux pages (actuellement centrés sur les fonctions utilitaires
  et quelques composants).
