# TabibConnect — Master Documentation (Source de Vérité)

> **Plateforme web de prise de rendez-vous médicaux** (Patient, Médecin, Admin) — Maroc  
> **Dernière mise à jour :** 20 mai 2026 (Documentation alignée sur le code)  
> **Objectif :** Ce document centralise TOUTES les informations nécessaires pour une IA ou un développeur.

# TabibConnect

> Plateforme web marocaine de prise de rendez-vous médicaux pour les patients, les médecins et les administrateurs.
>
> Dernière mise à jour: 24 mai 2026.

TabibConnect est une application full-stack orientée santé qui couvre la recherche de médecins, la prise de rendez-vous, la gestion des profils médicaux, les ordonnances numériques, la modération admin et les notifications temps réel.

La documentation ci-dessous est volontairement complète pour servir de référence de projet. Les captures d’écran existantes sont conservées telles quelles.

## Sommaire

- [Vue d’ensemble](#vue-densemble)
- [Captures d’écran](#captures-d%C3%A9cran)
- [Fonctionnalités](#fonctionnalit%C3%A9s)
- [Architecture technique](#architecture-technique)
- [Structure du dépôt](#structure-du-d%C3%A9p%C3%B4t)
- [Démarrage local](#d%C3%A9marrage-local)
 - [Installation détaillée](INSTALLATION.md)
- [Variables d’environnement](#variables-denvironnement)
- [API](#api)
- [Modèle de données](#mod%C3%A8le-de-donn%C3%A9es)
- [Jobs et temps réel](#jobs-et-temps-r%C3%A9el)
- [Sécurité](#s%C3%A9curit%C3%A9)
- [Tests](#tests)
- [Docker et production](#docker-et-production)
- [Données de démonstration](#donn%C3%A9es-de-d%C3%A9monstration)
- [Recherche et correspondance automatique](#recherche-et-correspondance-automatique)
- [Contribution](#contribution)

## 📷 Visuels de la Plateforme (UI/UX)

## Vue d’ensemble

TabibConnect regroupe trois grands espaces:

- Patient: recherche de médecins, prise de rendez-vous, suivi des rendez-vous, avis, notifications.
- Médecin: agenda, gestion des disponibilités, dossier patient, notes cliniques, ordonnances, profile management.
- Admin: vérification des comptes, validation des modifications, supervision des avis, contrôle opérationnel.

Le projet fonctionne avec une API Express, une base PostgreSQL via Prisma, un frontend React/Vite et un canal Socket.IO pour pousser les notifications en temps réel.

## Captures d’écran

### 1. Page d’accueil et navigation
![Home Page](frontend/public/docs/screenshots/homepage.png)
Une entrée visuelle vers la plateforme avec recherche rapide, accès aux profils et mise en avant des parcours principaux.

### 2. Recherche et pagination intelligente
![Search Results](frontend/public/docs/screenshots/search_results.png)
La recherche affiche une liste paginée de médecins avec filtres, tri et regroupement par spécialité.

La barre de recherche de la homepage propose des suggestions en temps réel: spécialités, médecins et symptômes.

### 3. Carte interactive de localisation des médecins
![Search Map](frontend/public/docs/screenshots/search_map.png)
La carte OpenStreetMap montre les cabinets et leur localisation pour aider l’utilisateur à comparer la proximité géographique.

### 4. Connexion sécurisée
![Login Page](frontend/public/docs/screenshots/login.png)
Connexion avec gestion des erreurs, sessions sécurisées et redirection selon le rôle.

#### Comptes de test

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Admin | admin@tabibconnect.ma | TabibConnect@2026 |
| Docteur | dr.amine.fassi@tabibconnect.ma | TabibConnect@2026 |
| Patient | youssef.benali@tabibconnect.ma | TabibConnect@2026 |

### 5. Dashboard médecin
![Doctor Dashboard](frontend/public/docs/screenshots/doctor_dashboard.png)
Vue d’exploitation du cabinet: agenda, patients du jour, demandes à traiter, avis, disponibilités et gestion du profil.

### 6. Dashboard administration
![Admin Dashboard](frontend/public/docs/screenshots/admin_dashboard.png)
Poste de supervision pour la validation, la surveillance et les opérations sensibles.

## Fonctionnalités

### Patient

- Recherche de médecins par nom, spécialité, symptôme et ville.
- Suggestions en temps réel sur la homepage.
- Consultation des profils médecins, avis, tarifs, langues, cabinets et disponibilités.
- Réservation de rendez-vous en présentiel ou en téléconsultation.
- Annulation avec règles de fenêtre de temps.
- Consultation de l’historique et des notifications.
- Dépôt d’avis après rendez-vous complété.

### Médecin

- Tableau de bord avec rendez-vous du jour, demandes à traiter et patients suivis.
- Confirmation, annulation et complétion d’un rendez-vous.
- Gestion des disponibilités hebdomadaires par cabinet.
- Consultation du dossier patient et création de notes cliniques.
- Création et partage d’ordonnances numériques avec QR code.
- Téléversement de documents et photo de profil.
- Demandes de modification de profil ou de localisation soumises à validation admin.

### Admin

- Vérification des comptes médecins et des avis.
- Création de comptes depuis l’espace admin.
- Supervision des changements de profil et de localisation.
- Consultation des statistiques globales et des métriques de la plateforme.

## Architecture technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Query, React Router v6, React Hook Form, Zod, i18next, Framer Motion |
| Backend | Node.js, Express 5, Prisma 6 |
| Base de données | PostgreSQL 16 |
| Cache | Redis optionnel pour certaines données de recherche |
| Temps réel | Socket.IO |
| Sécurité | JWT access/refresh, double CSRF, Helmet, CSP, rate limiting |
| Jobs | node-cron |
| Documents | Multer, PDFKit, QRCode, Tesseract.js, pdf-parse |
| Paiement | Stripe |
| SMS | Twilio |
| Tests | Jest, Supertest, Vitest, Playwright |

## Structure du dépôt

- `backend/` : API Express, Prisma, services métiers, jobs, scripts de seed.
- `frontend/` : application React/Vite, pages métier, composants UI, tests frontend.
- `uploads/` : fichiers servis ou générés par la plateforme.
- `docs/screenshots/` et `frontend/public/docs/screenshots/` : captures d’écran déjà présentes.
- `scripts/` : scripts d’exécution multi-services et utilitaires.

## Démarrage local

### Prérequis

- Node.js 22 ou compatible.
- PostgreSQL 16.
- Redis si tu veux activer le cache localement.

### Installation

```bash
npm --prefix backend install
npm --prefix frontend install
```

Pour des instructions d'installation complètes et pas-à-pas (migrations, seed, configuration des services externes), voir [INSTALLATION.md](INSTALLATION.md).

### Lancer les services séparément

Backend:

```bash
cd backend
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

### Lancer les deux services depuis la racine

```bash
npm run dev
```

Le script racine lance le backend et le frontend via `scripts/run-platform.js`.

## Variables d’environnement

### Backend

Le backend lit ses variables depuis `backend/.env.example` puis `backend/.env`.

- `NODE_ENV` : environnement d’exécution.
- `PORT` : port backend, par défaut `4000`.
- `APP_BASE_URL` : URL publique du backend.
- `FRONTEND_URL` : URL du frontend.
- `CORS_ORIGIN` : liste CSV des origines autorisées.
- `DATABASE_URL` : connexion PostgreSQL.
- `REDIS_URL` : URL Redis pour le cache.
- `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` : secrets de session.
- `JWT_ACCESS_EXPIRES_IN` et `JWT_REFRESH_EXPIRES_IN` : durée des tokens.
- `BCRYPT_SALT_ROUNDS` : coût du hachage des mots de passe.
- `CSRF_SECRET`, `CSRF_COOKIE_NAME`, `CSRF_HEADER_NAME` : protection CSRF.
- `REFRESH_TOKEN_COOKIE_NAME` : cookie de refresh token.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` : paiement carte.
- `SMTP_*` : emails transactionnels.
- `TWILIO_*` : SMS transactionnels.
- `FREE_CANCELLATION_HOURS` : fenêtre d’annulation gratuite.
- `REMINDER_HOURS_BEFORE`, `REMINDER_WINDOW_MINUTES` : rappel RDV.
- `NO_SHOW_GRACE_MINUTES` : délai avant bascule en no-show.
- `UPLOAD_DOCUMENTS_DIR` : dossier de stockage des documents.
- `EMAIL_VERIFY_TOKEN_EXPIRES_MINUTES` : expiration de vérification email.
- `RESET_PASSWORD_TOKEN_EXPIRES_MINUTES` : expiration du reset password.
- `CIN_VERIFICATION_*` : paramétrage OCR et score de vérification CIN.

### Frontend

- `VITE_API_URL` : base d’API utilisée par le frontend.

## API

Base locale: `http://localhost:4000/api/v1`

### Routes publiques et d’authentification

- `/auth` : inscription, connexion, refresh, logout, vérification email, reset password, CSRF token.
- `/home` : résumé public de la plateforme.
- `/search` : suggestions et filtres de recherche.
- `/doctors` : listing, profil public, disponibilités, avis.
- `/cabinets` : consultation des cabinets.
- `/health` : état du service.

### Routes protégées principales

- `/appointments` : création, annulation, confirmation, complétion, reprogrammation, notes, avis, ordonnances.
- `/dashboard` : dashboards patient, médecin et admin.
- `/admin` : validation comptes, avis, comptes créés par admin.
- `/notifications` : consultation et marquage des notifications.
- `/payments` : gestion des flux de paiement.
- `/users` : gestion des comptes.
- `/patients` : profil et données patient.
- `/ordonnance/verify/:qrCode` : vérification publique d’une ordonnance.

### Parcours rendez-vous

Statuts disponibles dans la base:

- `EN_ATTENTE`
- `CONFIRME`
- `ANNULE`
- `COMPLETE`
- `NO_SHOW`

Flux métier courant:

1. Le patient crée un rendez-vous en `EN_ATTENTE`.
2. Le médecin peut le `CONFIRME`.
3. Le médecin peut ensuite le passer en `COMPLETE` quand la consultation est finie.
4. Un rendez-vous non honoré peut être basculé automatiquement en `NO_SHOW` par les jobs.
5. Les avis patient ne sont autorisés qu’après un rendez-vous `COMPLETE`.

### Ordonnance numérique

- Création d’une ordonnance liée au rendez-vous.
- Génération de PDF avec QR code.
- Upload de document possible.
- Renvoi par email.
- Vérification publique via QR code.

### CSRF et session

- Le frontend récupère un token CSRF via `/auth/csrf-token`.
- Les mutations envoient l’en-tête `x-csrf-token`.
- Les cookies de refresh sont utilisés avec `withCredentials`.

### Temps réel

- Socket.IO authentifié via access token.
- Canal utilisateur: `user:<id>`.
- Événement principal de notification: `notification:new`.

## Modèle de données

Le schéma Prisma centralise les entités suivantes:

- `User` : compte de base, rôle, tokens, vérification.
- `Patient` : profil patient, CIN, avertissements, antécédents.
- `Doctor` : profil médecin, spécialité, langues, diplômes, tarifs.
- `Cabinet` : localisation, coordonnées, photos.
- `Disponibilite` : créneaux hebdomadaires.
- `RendezVous` : rendez-vous, statut, paiements, avis, ordonnances.
- `Paiement` : état et méthode du paiement.
- `Ordonnance` : prescription numérique.
- `Notification` : messages temps réel et système.
- `Avis` : note et commentaire post-consultation.
- `DoctorCabinet` : relation médecin/cabinet.
- `DoctorPatientNote` : notes cliniques médecin-patient.
- `DoctorDocument` et `PatientDocument` : documents uploadés.
- `DoctorChangeRequest` et `PatientChangeRequest` : modifications soumises à validation.
- `AuditLog` : traçabilité admin et événements métier.

## Jobs et temps réel

Le backend lance deux tâches cron principales:

- Rappel rendez-vous à l’approche de la consultation.
- Détection automatique des no-show après le délai de grâce.

Le calendrier des jobs est défini dans `backend/src/jobs/appointmentJobs.js`.

Le délai de passage en no-show est configuré via `NO_SHOW_GRACE_MINUTES`.

## Sécurité

- Double protection CSRF sur les mutations.
- CORS limité aux origines configurées.
- Helmet et Content Security Policy actifs.
- Secrets par défaut refusés en production.
- Rate limiting sur l’authentification.
- Nettoyage des entrées via middleware.
- Contrôles de rôle sur toutes les routes sensibles.
- Documents et uploads servis par contrôleur, pas en exposition brute.

## Tests

### Backend

```bash
npm --prefix backend test
npm --prefix backend test:watch
npm --prefix backend test:coverage
npm --prefix backend test:etape5:mvp
```

### Frontend

```bash
npm --prefix frontend test
npm --prefix frontend test:watch
npm --prefix frontend test:e2e
npm --prefix frontend run build
npm --prefix frontend run lint
```

## Docker et production

Le fichier `docker-compose.yml` orchestre:

- PostgreSQL
- Redis
- Backend
- Frontend
- Nginx reverse proxy
- Certbot en option

### Démarrage

```bash
docker compose up -d --build
```

### Points à préparer

1. Créer un fichier `.env.production`.
2. Renseigner les secrets applicatifs.
3. Ajuster `DATABASE_URL`, `REDIS_URL`, `APP_BASE_URL`, `FRONTEND_URL` et `VITE_API_URL`.
4. Vérifier le domaine Nginx / Certbot si le projet est exposé en public.

## Données de démonstration

Le seed remplit la base avec des comptes de démonstration et des données métier réalistes:

- Patients de test.
- Médecins de test.
- Cabinets marocains.
- Créneaux de disponibilité.
- Documents et photos stockés dans des fichiers locaux du dépôt.

Les comptes de test visibles plus haut correspondent aux seeds actuels.

## Recherche et correspondance automatique

Le moteur de recherche n’utilise pas encore de vrai modèle IA génératif.

À ce stade, la plateforme repose sur:

- un mappage symptômes → spécialités en français et en arabe,
- du fuzzy matching pour tolérer les fautes de frappe,
- un tri par pertinence,
- des suggestions regroupées par spécialités, médecins et symptômes,
- des filtres de recherche synchronisés avec la base de données,
- des villes récupérées depuis les données publiques.

Le libellé produit côté accueil est donc volontairement orienté vers une correspondance automatique, pas vers une promesse d’IA avancée.

## Contribution

- Ne jamais committer de secrets.
- Ne pas modifier les captures d’écran tant qu’elles restent valides.
- Garder les changements métier couverts par des tests quand c’est possible.
- Préférer les données réellement synchronisées avec la base plutôt que des listes figées côté frontend.
- Respecter les conventions de thème UI clair et médical déjà en place.

## Notes utiles

- Le backend expose aussi les ordonnances PDF via `/uploads/ordonnances`.
- Le frontend utilise React Query pour la plupart des fetchs métier.
- Les suggestions d’accueil, les filtres de recherche et certains tableaux de bord lisent les données directement depuis l’API, pas depuis des mocks.
