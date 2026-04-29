# Contributing

## Setup local

- Backend: `cd backend && npm install`
- Frontend: `cd frontend && npm install`
- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Frontend build: `cd frontend && npm run build`

## Branches et commits

- Utiliser des branches courtes et descriptives.
- Garder les commits focusses sur un seul sujet.
- Eviter de melanger refactor, feature et infra dans la meme PR.

## Qualite attendue

- Preserver le style existant du code.
- Ajouter des tests quand un comportement metier change.
- Eviter les dependances inutiles ou non justifiees.
- Documenter les fichiers de release si le flux de livraison evolue.

## Checklist avant PR

- Les tests pertinents passent.
- Le build frontend passe.
- Les nouveaux fichiers de configuration sont documentes.
- Les secrets ne sont jamais commites.