# Contribuer à Yeelen

Merci de participer ! Ce guide explique comment travailler à plusieurs sans casser le site en production.

## Règle d'or

**Ne poussez jamais directement sur `main`.** Un push sur `main` redéploie automatiquement
Vercel (frontend) et Render (backend). Tout passe par une branche, puis une pull request.

## Workflow

1. Récupérer la dernière version : `git checkout main && git pull`
2. Créer une branche depuis `main`, nommée selon le type de travail :
   - `feature/nom-court` — nouvelle fonctionnalité
   - `fix/nom-court` — correction de bug
   - `docs/nom-court` — documentation
   - `chore/nom-court` — maintenance, outillage
3. Faire des commits petits et clairs (une phrase qui dit ce qui change).
4. Pousser la branche : `git push -u origin nom-de-la-branche`
5. Ouvrir une pull request vers `main` et demander une relecture.
6. Fusionner seulement quand la CI est verte et qu'au moins une personne a relu.

## Avant d'ouvrir une PR

```bash
cd backend && npm test
cd frontend && npm run lint && npm test && npm run build
```

La CI (`.github/workflows/ci.yml`) relance ces commandes sur chaque PR.

## Secrets et données

- Ne commitez jamais un fichier `.env`, une clé API ou un certificat. Utilisez
  `backend/.env.example` et `frontend/.env.example` comme modèles.
- Ne commitez pas d'export de base de données (`backend/backups/` est ignoré).
- Si un secret a été poussé par erreur, révoquez-le immédiatement : le supprimer du
  dernier commit ne suffit pas, il reste dans l'historique.

## Mise en route

Voir le [README](README.md) pour l'installation locale, les variables d'environnement et la base de données.
