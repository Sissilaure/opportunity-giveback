# Yeelen

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
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Déploiement actuel](#déploiement-actuel)
- [Limites connues](#limites-connues)
- [Pistes d'amélioration](#pistes-damélioration)

## Aperçu du projet

Ce dépôt est la **plateforme commune** issue de la charte de projet Give Back, 2iE : elle réunit
le moteur d'Yeelen (groupe 2 : catalogue vérifié, recherche IA, FAQ, espace équipe) et la
charte visuelle et les contenus du site Africa Opportunities (groupe 1 : accueil, catégories, étapes,
témoignages, équipe, newsletter).

Le site a une page d'accueil, cinq parties publiques et un espace équipe protégé (`/admin`) :

- **Accueil** (`/`) — présentation, chiffres réels, catégories, prochaines échéances, étapes,
  témoignages, FAQ et inscription aux alertes.
- **Mon suivi** (`/suivi`) — opportunités mises de côté, stockées sur l'appareil (sans compte).
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

## Comptes, suivi et notifications

- **Compte facultatif** : email + mot de passe (≥ 10 caractères), session de 30 jours. Hachage **scrypt** (`motDePasse.js`) : il
  s'exécute dans le pool de threads de Node, alors que bcryptjs gelait tout le serveur à chaque connexion (mesuré : 10
  connexions simultanées = 3,6 s d'attente pour tous les visiteurs ; avec scrypt, les autres pages ne sont plus ralenties). Aucun email
  n'est envoyé : tout fonctionne sans service d'envoi. Pas de « mot de passe oublié » automatique pour l'instant (il
  nécessiterait l'envoi d'emails) : l'utilisateur écrit depuis la page Aide.
- **Suivi de candidatures** : à faire, en cours, dossier envoyé, acceptée, refusée, plus une note. Le suivi gardé sur
  l'appareil avant la création du compte est repris automatiquement.
- **Notifications dans l'application** (cloche) : rappels à 7, 3 et 1 jour de la date limite, échéance dépassée, et
  nouveautés de la semaine. Elles sont calculées à la demande, sans tâche planifiée à faire tourner. Une candidature
  déjà envoyée n'est plus rappelée.
- **Données** : tables `utilisateur`, `suivi_candidature`, `notification_lue` (créées au démarrage). Le compte se supprime
  depuis « Mon suivi » (confirmation par mot de passe) et efface toutes ses données.
- **API** : `/api/compte/{inscription,connexion,deconnexion,moi}`, `/api/compte/suivi`, `/api/compte/notifications`.

### Veille automatique (sources réelles)

Chaque jour (6 h UTC) et à chaque démarrage, `veille.js` lit des **flux RSS publics d'opportunités** (par défaut :
scholars4dev, Opportunity Desk, Opportunities for Africans ; modifiable avec `VEILLE_FLUX`). Pour chaque nouvel article :
l'IA en extrait la fiche **en français** (titre, organisme, public, critères, pièces, date limite *seulement si elle est
écrite*) et désigne, **par son numéro** dans la liste des liens de l'article, la page officielle de l'organisme. Le serveur
lit alors cette page officielle (`safeFetch.js` + `verification.js`) : si le programme et l'organisme y figurent, la fiche est
**publiée directement** avec l'image de l'organisme ; sinon elle reste en attente et est retentée chaque jour. Les adresses typiques des fausses bourses sont **refusées d'office** (`domaineSuspect` dans `verification.js` : http, adresse IP, noms trompeurs, liens raccourcis, hébergements gratuits, extensions à risque, y compris après redirection) : la fiche reste alors « à vérifier ». Les listes
(« Top 10 bourses »), opportunités échues, doublons et articles sans lien officiel sont ignorés. Chaque article n'est examiné
qu'une fois (table `veille_article`). Seuls des **faits** sont repris, jamais le texte des articles. Pourquoi des flux et pas
« l'IA cherche sur le web » : la clé Gemini gratuite n'a pas accès à la recherche web (quota nul) ; de mémoire, l'IA se trompe
souvent de lien. Réglages : `VEILLE=false` (désactive), `VEILLE_MAX_ARTICLES` (12 par passage), `AUTO_PUBLISH=false`
(tout attend une validation humaine).

## Publication automatique des opportunités

La recherche IA (chaque jour à 6 h UTC et au démarrage) propose des pistes. Pour chacune, le serveur **lit la page
officielle** (`safeFetch.js`, protégé contre le SSRF : adresses internes, redirections, taille et délai bornés) et vérifie
que le programme et l'organisme y figurent (`verification.js`). Si oui, la fiche est **publiée directement**, avec
l'image d'aperçu de l'organisme (balise Open Graph, https uniquement) et la mention « Source officielle vérifiée » :
elle n'est pas présentée comme relue par un humain. Sinon elle reste « à vérifier » et est retentée chaque jour.
`AUTO_PUBLISH=false` rétablit la validation humaine systématique. Les colonnes `image_url` et `verification_auto` sont
ajoutées toutes seules à la table `opportunite`.

## Import en lot (espace équipe)

Dans `/admin`, le bouton **« Importer plusieurs opportunités »** permet d'ajouter jusqu'à 100 opportunités d'un coup : on
colle un tableau (Excel, Google Sheets) ou on choisit un fichier CSV, avec un modèle à télécharger. Colonnes obligatoires :
`titre`, `type`, `organisme`, `lien_source` ; facultatives : `site_web`, `public`, `criteres`, `pieces`, `date_limite`
(plusieurs critères ou pièces séparés par « | »). L'aperçu valide chaque ligne avant l'envoi (type, lien http(s), date
`JJ/MM/AAAA` ou `AAAA-MM-JJ`). Au choix : **publier tout de suite** (l'équipe a vérifié) ou **mettre en attente** (la lecture
automatique du site officiel pourra publier ensuite). Le serveur revalide chaque ligne, écarte les doublons (même titre,
accents et majuscules ignorés, aussi à l'intérieur du fichier) et rend compte ligne par ligne. Les images d'aperçu des
organismes sont récupérées en arrière-plan, sans faire attendre. Route : `POST /api/admin/opportunites/importer`
(session équipe obligatoire, 10 imports par 10 minutes ; seule route de l'API qui accepte un corps de plus de 20 Ko).

## Sécurité

Mesures en place (et testées dans `backend/tests/api.test.js`) :

- **Liens** : seuls les liens `http(s)` sont acceptés à l'écriture (admin et propositions de l'IA) **et**
  filtrés à la lecture, côté API (`security.js`) et côté interface (`frontend/src/lib/url.js`). Un lien
  `javascript:` ou `data:` ne devient jamais cliquable.
- **CSRF** : en production le cookie de session est `SameSite=None` (frontend et backend sur deux
  domaines). Toute écriture dont l'en-tête `Origin` n'est pas `FRONTEND_URL` est refusée (403).
- **Session** : `SESSION_SECRET` est obligatoire en production (le serveur refuse de démarrer sans) ;
  l'identifiant de session est régénéré à la connexion ; cookie `httpOnly` + `secure`.
- **En-têtes HTTP** : `helmet` côté API ; en-têtes (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`) côté frontend dans `frontend/vercel.json`.
- **Abus** : limite globale par IP sur `/api`, limites plus strictes sur la connexion, les questions, la
  newsletter et les appels à l'IA ; corps JSON limité à 20 Ko.
- **IA** : sa sortie est traitée comme une entrée non fiable (liens vérifiés, longueurs bornées). Les messages
  publics ne révèlent jamais la configuration (ex. clé absente).
- **Connexion équipe** : verrou par IP (10 essais / 15 min) **et** par compte (8 essais / 15 min), comparaison de
  mot de passe à temps constant (compte inconnu inclus), bcrypt coût 12, mot de passe d'au moins 12 caractères via
  `scripts/createAdmin.js`, `SESSION_SECRET` de 32 caractères minimum en production, sessions expirées purgées chaque jour.
- **Origine autorisée** : `FRONTEND_URL` est normalisé (un `/` final ou des majuscules ne bloquent plus les formulaires).
- **Recherche** : les jokers SQL `%` et `_` saisis par le visiteur sont neutralisés.
- **Dépendances** : `npm audit` : frontend sans alerte ; backend : seul `zod` (alerte sur de très grosses collections,
  non applicable ici) ; sa mise à jour en v4 est un changement majeur à faire à part.

## Design et animations

Identité **Yeelen** (« lumière » en dioula) : sobre, éditoriale, beaucoup d'espace.

- **Couleurs** : crème `#F4EFE6` (fond), `#EEEBE5` (cartes), encre `#191817`, pierre `#6A6660`, latérite `#8F4E35`
  (boutons, liens, états actifs), or d'aube `#D6B172` (badges, détails). Contrastes vérifiés au niveau WCAG AA.
- **Polices** : Italiana (grands titres, majuscules espacées), Instrument Sans (texte et interface),
  Instrument Serif italique (slogan, citations, sous-titres).
- **Où changer la charte** : `frontend/tailwind.config.js` (couleurs, polices, arrondis, ombres) et
  `frontend/src/index.css` (règles des titres). Les composants n'utilisent que des noms de rôle (`primary`, `accent`,
  `canvas`, `ink`…), jamais de couleur en dur.
- **Fichiers de marque** : `frontend/public/brand/` (logos SVG, symbole), `favicon.*`, `apple-touch-icon.png`,
  `icon-*.png`, `og-image.png`, `manifest.webmanifest`. `VITE_SITE_URL` (voir `frontend/.env.production`) donne
  l'adresse absolue de l'image d'aperçu des liens : à régler sur le domaine réel.
- **Animations** en CSS pur (`index.css`, `Reveal.jsx`, `CountUp.jsx`, `Soleil.jsx`) : apparition au défilement,
  compteurs, transition de page, bandes du soleil qui s'allument. Désactivées pour les personnes qui demandent de
  réduire les animations (`prefers-reduced-motion`).

Photos : [Pexels](https://www.pexels.com) (licence libre, attribution non requise), hébergées dans
`frontend/public/images`. L'image d'une opportunité dépend de son type ; une même catégorie en alterne
quelques-unes selon l'identifiant.

### Mobile et performance

- Testé de 320 à 1280 px : aucun débordement horizontal ; zones tactiles ≥ 40 px ; police des champs à 16 px sur
  mobile (pas de zoom automatique d'iOS) ; encoche/barre de gestes respectées (`viewport-fit=cover`).
- Menu mobile complet (Échap, `aria-current`), filtres défilants avec `aria-pressed`.
- Fiche : bouton **Partager** (partage natif / copie du lien) et **Rappel calendrier** (.ics, alerte J-7).
- Liste : réponses périmées ignorées, bouton « Réessayer », message si le serveur gratuit met du temps à démarrer.
- Poids : logo ramené de 1,6 Mo à 16 Ko pour la barre de navigation ; espace équipe chargé à la demande ;
  API compressée (gzip) avec cache public de 30 s sur les lectures (jamais sur `/api/admin`).
- `ErrorBoundary` : plus de page blanche en cas d'erreur d'affichage. Manifeste web (ajout à l'écran d'accueil).

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
