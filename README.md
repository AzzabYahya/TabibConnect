# TabibConnect

## Nom du projet : TabibConnect (proposition alternative : SahaMawid)

Nom retenu pour le moment : **TabibConnect**.

Pourquoi ce nom :
- Clair, memorisable et immediate pour le marche marocain.
- Combine la confiance medicale (Tabib) et l'usage digital moderne (Connect).

Nom alternatif propose : **SahaMawid**.

## Description du projet

TabibConnect est une plateforme de prise de rendez-vous medicaux en ligne pour le Maroc, inspiree de Doctolib mais enrichie avec des fonctionnalites avancees, une meilleure adaptation locale (langue, fuseau horaire, usages du marche, canaux de communication) et un design plus original.

Objectif principal : connecter patients, medecins, cliniques et administrateurs dans une experience unifiee, rapide et securisee.

Publics cibles :
- Patients : recherche, reservation, suivi des rendez-vous, teleconsultation.
- Medecins : gestion de disponibilites, agenda, dossiers, teleconsultation, facturation.
- Cliniques/Centres : pilotage multi-praticiens et reporting.
- Administrateurs plateforme : moderation, conformite, support et analytics.

## Stack technique complete avec justification de chaque technologie choisie

| Couche | Technologie | Pourquoi ce choix |
|---|---|---|
| Runtime backend | Node.js 22 LTS | Performant en I/O, excellent pour API temps reel et ecosysteme mature. |
| Framework API | Express.js | Simple, flexible, tres bien maitrise en production, parfait pour architecture modulaire evolutive. |
| Langage | TypeScript | Securite de typage, maintenabilite long terme, reduction des regressions. |
| Frontend web | React + Vite | UI dynamique, composable, tres bon DX, build rapide et moderne. |
| Routing frontend | React Router | Gestion claire des espaces patient/medecin/admin et navigation protegee. |
| Data fetching frontend | TanStack Query | Cache intelligent, synchro serveur/client, retries et etats reseau robustes. |
| State management local | Zustand | Etat global leger sans complexite excessive. |
| Design system | Tailwind CSS + composants custom | Vitesse d'implementation, coherence visuelle, personnalisation forte pour un design original. |
| Base de donnees | PostgreSQL 16 | Fiable, ACID, puissant pour requetes relationnelles complexes et reporting. |
| ORM | Prisma | Productivite elevee, schema versionne, migrations robustes, typing end-to-end. |
| Cache / files asynchrones | Redis + BullMQ | Gestion des jobs (rappels, notifications, emails, exports) et acceleration des lectures frequentes. |
| Authentification | JWT + refresh token + RBAC | Securite et separation nette des roles (patient, medecin, admin). |
| Stockage fichiers | S3 compatible (AWS S3/Cloudflare R2/MinIO) | Gestion fiable des documents medicaux, ordonnances et avatars. |
| Notifications | Twilio (SMS/WhatsApp) + SendGrid (email) | Couverture omnicanale adaptee aux usages locaux. |
| Paiements | Stripe (initial) + abstraction pour passerelle locale | Demarrage rapide puis extension vers moyens de paiement adaptes au Maroc. |
| Cartographie | Mapbox | Localisation des cabinets et calcul de distance. |
| Observabilite | Sentry + OpenTelemetry + Grafana/Prometheus | Traquage erreurs, metriques, monitoring technique et metier. |
| Infra / deploiement | Docker + Nginx + GitHub Actions | Environnements reproductibles, CI/CD simple, reverse proxy fiable. |
| Testing | Vitest/Jest + Supertest + Playwright | Couverture unitaire, integration API et parcours E2E critiques. |

## Architecture globale (backend / frontend / base de donnees / services tiers)

### Vue d'ensemble

1. **Frontend React** (espace Patient, Medecin, Admin) consomme l'API REST.
2. **Backend Express** expose les endpoints metier (auth, disponibilites, reservations, teleconsultation, paiement, dossiers).
3. **Worker asynchrone** execute les taches de fond (rappels, notifications, rapports, webhook processing).
4. **PostgreSQL** stocke les donnees transactionnelles et historiques.
5. **Redis** gere cache, rate limit, sessions techniques et files de jobs.
6. **Services tiers** assurent SMS/Email/Paiement/Visio/Cartographie.

### Flux simplifie

```text
React Web (Patient/Medecin/Admin)
            |
            v
       Express API
    /      |       \
   v       v        v
PostgreSQL Redis   Worker (BullMQ)
                    /   |    \
                   v    v     v
                SMS  Email  Paiement/Visio
```

## Liste de toutes les fonctionnalites prevues

### Cote patient
- Inscription/connexion (email + telephone).
- Recuperation mot de passe et verification compte.
- Profil patient complet (infos perso, allergies, antecedents de base).
- Recherche de medecins par specialite, ville, langue, prix, disponibilite.
- Filtres avances (teleconsultation, urgence, sexe praticien, assurance).
- Fiche medecin detaillee (bio, diplomes, experiences, avis, horaires, adresse).
- Prise de rendez-vous en quelques clics.
- Replanification et annulation avec politique configurable.
- Historique des consultations et rendez-vous.
- Notifications multi-canal (SMS, WhatsApp, email, in-app).
- Rappels automatiques avant rendez-vous.
- Teleconsultation video securisee.
- Reception d'ordonnances et documents post-consultation.
- Paiement en ligne et suivi des factures.
- Avis et notation des medecins.
- Espace bilingue/trilingue (AR/FR/EN a terme).

### Recherche medicale (/search)
- Refonte complete du layout en mode fixed-panel: bandeau de recherche en haut, panneau filtres a gauche et panneau resultats a droite.
- Seul le panneau resultats scrolle, pour garder la barre de recherche et les filtres toujours visibles sur grand ecran.
- Vue mobile adaptee avec ouverture des filtres en drawer lateral.
- Filtres disponibles: disponibilite, tarif maximum, sexe medecin, langue multiple, assurance, teleconsultation et note minimale.
- Bascule liste / carte conservee, avec carte Leaflet et selection d'un medecin depuis la carte.

### Cote medecin
- Onboarding medecin avec verification administrative.
- Gestion du profil professionnel (specialites, tarif, langues, bio).
- Gestion des disponibilites (calendrier, exceptions, vacances).
- Gestion des rendez-vous (accepter, deplacer, annuler).
- Tableau de bord activite quotidienne/hebdomadaire.
- Teleconsultation avec notes de consultation.
- Emission d'ordonnances et documents.
- Acces aux dossiers patients autorises.
- Configuration des delais, politiques et motifs de consultation.
- Gestion des paiements et suivi des revenus.

### Cote clinique/centre medical
- Multi-praticiens et multi-agendas.
- Gestion des salles/ressources.
- Supervision des operations et taux d'occupation.
- Reporting centralise.

### Cote administrateur plateforme
- Moderation des comptes et contenus.
- Validation des medecins/documents.
- Gestion des categories/specialites.
- Gestion des litiges et support.
- Dashboard metier (acquisition, retention, no-show, conversion).
- Parametrage des notifications, campagnes et regles globales.

### Fonctionnalites transverses avancees
- Moteur anti no-show (rappels intelligents, penalites configurables).
- Journal d'audit complet des actions sensibles.
- RBAC fin (permissions par role).
- Multi-tenant (evolution future).
- Conformite securite et protection donnees.
- API publique (phase ulterieure) pour integrations partenaires.

## Structure des dossiers du projet (arborescence complete prevue)

> Chaque dossier vide contient un fichier `.gitkeep`.

```text
Docma/
├── README.md
├── DEVLOG.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── app.js
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── .vscode/
│   └── snippets/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── common/
│   │       │   ├── constants/
│   │       │   ├── errors/
│   │       │   ├── utils/
│   │       │   └── validators/
│   │       ├── config/
│   │       ├── docs/
│   │       ├── integrations/
│   │       │   ├── mapbox/
│   │       │   ├── sendgrid/
│   │       │   ├── stripe/
│   │       │   └── twilio/
│   │       ├── jobs/
│   │       ├── middlewares/
│   │       ├── modules/
│   │       │   ├── admin/
│   │       │   ├── appointments/
│   │       │   ├── auth/
│   │       │   ├── availability/
│   │       │   ├── doctors/
│   │       │   ├── insurance/
│   │       │   ├── medical-records/
│   │       │   ├── notifications/
│   │       │   ├── patients/
│   │       │   ├── payments/
│   │       │   ├── prescriptions/
│   │       │   ├── reviews/
│   │       │   ├── search/
│   │       │   ├── specialties/
│   │       │   ├── teleconsultation/
│   │       │   └── users/
│   │       ├── scripts/
│   │       └── tests/
│   │           ├── integration/
│   │           └── unit/
│   ├── web/
│   │   ├── public/
│   │   └── src/
│   │       ├── app/
│   │       ├── assets/
│   │       ├── components/
│   │       │   ├── forms/
│   │       │   ├── layout/
│   │       │   └── ui/
│   │       ├── features/
│   │       │   ├── admin/
│   │       │   ├── appointments/
│   │       │   ├── auth/
│   │       │   ├── doctor/
│   │       │   ├── notifications/
│   │       │   ├── patient/
│   │       │   ├── payments/
│   │       │   ├── reviews/
│   │       │   └── teleconsultation/
│   │       ├── hooks/
│   │       ├── i18n/
│   │       ├── lib/
│   │       ├── routes/
│   │       ├── services/
│   │       ├── store/
│   │       ├── styles/
│   │       └── tests/
│   │           ├── e2e/
│   │           ├── integration/
│   │           └── unit/
│   └── worker/
│       └── src/
│           ├── config/
│           ├── jobs/
│           ├── processors/
│           ├── queues/
│           └── tests/
├── config/
│   ├── environments/
│   └── feature-flags/
├── database/
│   ├── backups/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── seed/
│   └── sql/
│       ├── functions/
│       └── views/
├── docs/
│   ├── adr/
│   ├── api/
│   ├── architecture/
│   ├── compliance/
│   ├── diagrams/
│   ├── product/
│   ├── security/
│   └── ux/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   │   ├── base/
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── prod/
│   │       └── staging/
│   ├── monitoring/
│   │   ├── grafana/
│   │   ├── loki/
│   │   └── prometheus/
│   ├── nginx/
│   └── terraform/
│       ├── envs/
│       │   ├── dev/
│       │   ├── prod/
│       │   └── staging/
│       └── modules/
│           ├── compute/
│           ├── database/
│           └── networking/
├── logs/
├── packages/
│   ├── eslint-config/
│   ├── tsconfig/
│   ├── types/
│   ├── ui/
│   │   └── src/
│   │       ├── components/
│   │       ├── themes/
│   │       └── tokens/
│   └── utils/
├── scripts/
│   ├── db/
│   ├── deploy/
│   └── setup/
├── tests/
│   ├── e2e/
│   ├── performance/
│   └── security/
├── tmp/
└── uploads/
    ├── avatars/
    ├── documents/
    └── prescriptions/
```

## Etapes de developpement (checklist avec statut : ⬜ non commence)

- ✅ Etape 1 - Initialisation backend (/backend, Express, middleware global, route /api/health)
- ✅ Etape 2 - Conception schema BDD Prisma (modeles + relations + index + migration init)
- ✅ Etape 3 - Systeme d'authentification complet (JWT, refresh token, RBAC, CSRF, rate limit)
- ✅ Etape 4 - API medecins et cabinets (filtres, recherche full-text, suggestions symptomes, disponibilites, geolocalisation)
- ✅ Etape 5 - API rendez-vous transactionnelle + notifications (Socket.io, email, SMS, reminder/no-show)
- ✅ Etape 6 - Initialisation Frontend React (Vite, design system, RTL/LTR, routes metier)
- ✅ Etape 7 - Pages principales du site (Home immersive, recherche avancee, profil medecin interactif)
- ✅ Etape 8 - Dashboards complets (patient, medecin, admin)
- ✅ Etape 9 - Fonctionnalites avancees (teleconsultation video, paiement marocain, ordonnances numeriques)
- ✅ Etape 10 - Tests, deploiement et finalisation (Vitest, Jest, Playwright, Docker, Nginx, SEO)

## Pages principales du frontend (resume Etape 7)

### Home (`/`)

- Hero orientee recherche intelligente avec formulaire symptome + ville et redirection vers `/search`.
- Compteurs animes (medecins, patients, RDV) et sections de preuve sociale.
- Carousel horizontal des specialites les plus recherchees.
- Section "Comment ca marche" en 3 etapes claires.
- Carte Leaflet des hotspots medicaux au Maroc.
- Footer marketing enrichi (liens utiles, contact, reseaux, mobile app).

### Recherche medecins (`/search`)

- Filtres avances: specialite, ville, disponibilite, tarif max, sexe, langue, assurance, teleconsultation.
- Tri dynamique: pertinence, disponibilite, tarif, note.
- Double mode d'affichage: liste detaillee ou carte interactive.
- Infinite scroll en vue liste avec sentinelle d'intersection.
- Enrichissement des resultats via prochaine disponibilite calculee en temps reel.

### Profil medecin (`/doctor/:id`)

- Hero profile avec badges (experience, assurance, note) et infos cles.
- Navigation par onglets: A propos, Disponibilites, Avis, Localisation.
- Selection de date et creneaux disponibles en direct via API.
- Modal de confirmation RDV prete pour branchement `POST /api/appointments`.
- Carte cabinet + lien externe d'itineraire.

### Qualite et validation

- Animations implementees avec Framer Motion pour les transitions d'entree et les reveals de sections.
- Design mobile-first conserve sur les 3 pages (grilles adaptatives et composants responsives).
- Verification technique executee apres implementation:
   - `npm run lint` (frontend) : OK
   - `npm run build` (frontend) : OK

## Dashboards complets (resume Etape 8)

### Dashboard patient (`/dashboard/patient`)

- Vue d ensemble du prochain rendez-vous, de l historique, des medecins favoris et des notifications.
- Gestion locale des actions de rendez-vous: annulation, reprogrammation et reprise d un ancien suivi.
- Profil medical centralise avec antecedents, assurance, contact d urgence et ordonnances uploadées.
- Centre de notifications et systeme d avis post-consultation directement accessibles dans le dashboard.

### Dashboard medecin (`/dashboard/doctor`)

- Agenda hebdomadaire interactif avec drag and drop pour reorganiser les blocs de disponibilite.
- Statistiques metier: RDV du jour, taux d occupation, revenus du mois et demandes en attente.
- Gestion des disponibilites par cabinet avec calendrier de configuration et synthese visuelle.
- Liste des patients du jour, traitement des demandes de RDV et apercu du profil public editable.

### Dashboard admin (`/dashboard/admin`)

- Validation des comptes medecins avec controle des documents INPE et moderation des dossiers.
- Statistiques globales de la plateforme avec journal d activite et suivi de moderation.
- Gestion des signalements d avis avec actions de validation, escalade et archivage.

## Fonctionnalites avancees (resume Etape 9)

### Teleconsultation video

- Salle d attente virtuelle avant d entrer en consultation.
- Session video WebRTC via `simple-peer` ou Daily.co selon le niveau d infra souhaite.
- Chat texte integre pendant la visio pour echanges rapides.
- Partage d ecran pour presenter examens, radios ou resultats.
- Upload de documents pendant la consultation pour enrichir le dossier.

### Paiement marocain

- Paiement declenche a la confirmation du rendez-vous.
- Carte bancaire tokenisee via CMI (Centre Monetaire Interbancaire) pour ne jamais exposer le PAN cote serveur.
- Recu PDF genere apres la transaction pour le patient.
- Remboursement automatique si le medecin annule le rendez-vous.

### Ordonnances numeriques

- Le medecin peut generer une ordonnance digitale apres la consultation.
- Le patient recoit un PDF par email avec un QR code de verification.
- La pharmacie scanne le QR pour valider l ordonnance et verifier son authenticite.

### Comment ca marche techniquement

#### WebRTC (peer-to-peer)

- Le navigateur ouvre camera et micro, puis les pairs echangent une offre SDP, une reponse SDP et les candidats ICE via une signalisation initiale.
- Les serveurs STUN aident a decouvrir les adresses publiques, et TURN sert de relais si un reseau bloque le P2P.
- Le flux audio/video circule ensuite directement entre les navigateurs, ce qui limite la latence et la charge serveur.
- Daily.co reste une bonne alternative si on veut deleguer le signaling, le TURN et une partie de l orchestration video.

#### Paiement en ligne et tokenisation CB

- Le numero de carte est envoye au prestataire de paiement, pas stocke dans TabibConnect.
- Le prestataire renvoie un token ou une reference de transaction; le backend ne garde que ces identifiants et les etats de paiement.
- La capture peut etre faite au moment de la confirmation du RDV, puis un refund peut etre automatise si le medecin annule.
- Cette approche simplifie la conformite PCI en evitant de manipuler des donnees carte sensibles.

#### Generation PDF avec Node.js

- `Puppeteer` convient quand on part d un template HTML/CSS riche et qu on veut un rendu proche du navigateur.
- `pdfkit` convient quand on prefere composer le document de maniere programmatique, champ par champ.
- Pour une ordonnance, on peut generer le QR code, l injecter dans le PDF, puis envoyer le fichier par email et le stocker dans l archive medicale.

## API Medecins et Cabinets (resume Etape 4)

### Routes medecins (`/api/doctors`)

| Methode | Route | Description |
|---|---|---|
| GET | `/api/doctors` | Liste de medecins avec filtres : `specialite`, `ville`, `availableToday`, `accepteAssurance`, `minNote`, `maxTarif`, `langue`. |
| GET | `/api/doctors/:id` | Profil complet d'un medecin (infos pro, cabinets, documents, rating). |
| GET | `/api/doctors/search?q=` | Recherche full-text (`nomComplet`, `specialite`, `bio`) + suggestion de specialites par symptomes. |
| PUT | `/api/doctors/profile` | Mise a jour du profil medecin authentifie (role DOCTOR). |
| GET | `/api/doctors/:id/availabilities?date=YYYY-MM-DD` | Calcul temps reel des creneaux disponibles pour une date donnee. |
| GET | `/api/doctors/:id/reviews` | Liste paginee des avis patients avec moyenne. |

### Routes cabinets (`/api/cabinets`)

| Methode | Route | Description |
|---|---|---|
| POST | `/api/cabinets` | Creation d'un cabinet par medecin authentifie (role DOCTOR). |
| GET | `/api/cabinets/:id` | Details cabinet (medecins associes, disponibilites actives). |
| GET | `/api/cabinets/nearby?lat=&lng=&radius=` | Recherche geolocalisee des cabinets proches via formule Haversine. |

### Fonctionnalites intelligentes

- Mapping JSON symptomes -> specialites : `backend/src/data/symptomSpecialtyMap.json`.
- Suggestions automatiques de specialites dans `/api/doctors/search`.
- Algorithme de creneaux disponibles base sur disponibilites recurrentes + rendez-vous deja reserves.

## API Rendez-vous et Notifications (resume Etape 5)

### Cadrage MVP

Flux critique du sprint MVP:
- Patient trouve un medecin.
- Patient choisit un creneau disponible.
- Medecin confirme le rendez-vous.
- Patient recoit les emails transactionnels.

### Routes rendez-vous (`/api/appointments`)

| Methode | Route | Description |
|---|---|---|
| POST | `/api/appointments` | Cree un RDV `EN_ATTENTE`, verifie la disponibilite en temps reel, applique un verrou transactionnel anti-double reservation, puis envoie les emails de demande. |
| GET | `/api/appointments/my` | Patient: RDV a venir tries par date. Medecin: RDV du jour et des 7 prochains jours. |
| GET | `/api/appointments/upcoming` | Prochains RDV actifs avec `rappelEnvoye` et flag de rappel derive. |
| PUT | `/api/appointments/:id/confirm` | Medecin uniquement. Passe le statut en `CONFIRME` et notifie par email. |
| PUT | `/api/appointments/:id/cancel` | Patient ou medecin. Annulation patient autorisee seulement si RDV a plus de 2h. Notification email envoyee. |

### Contrat detaille des endpoints MVP

#### `POST /api/appointments`

- Auth: `Bearer` requis, role `PATIENT`.
- Body JSON:
   - `doctorId` (string, requis)
   - `disponibiliteId` (string, requis)
   - `cabinetId` (string, optionnel)
   - `motif` (string, requis)
   - `typeConsultation` (`PRESENTIEL` ou `TELECONSULTATION`, requis)
   - `notes` (string, optionnel)
   - `dateHeure` (ISO datetime, requis)
- Reponse succes: `201` avec objet RDV complet (`patient`, `doctor`, `cabinet`, `disponibilite`, `statut=EN_ATTENTE`).
- Codes HTTP possibles:
   - `201` creation OK
   - `400` payload invalide ou incoherence doctor/cabinet/disponibilite
   - `403` medecin non verifie
   - `404` patient/medecin introuvable
   - `409` creneau deja pris ou conflit de reservation concurrente

#### `GET /api/appointments/my`

- Auth: `Bearer` requis, roles `PATIENT` ou `DOCTOR`.
- Parametres: aucun.
- Reponse succes: `200` liste triee par `dateHeure ASC`.
- Codes HTTP possibles:
   - `200` lecture OK
   - `401` token absent/invalide
   - `403` role non autorise

#### `PUT /api/appointments/:id/confirm`

- Auth: `Bearer` requis, role `DOCTOR`.
- Parametres URL:
   - `id` (ID RDV, requis)
- Body: aucun.
- Reponse succes: `200` RDV mis a jour avec `statut=CONFIRME`.
- Codes HTTP possibles:
   - `200` confirmation OK
   - `400` statut non confirmable
   - `403` RDV non assigne a ce medecin
   - `404` RDV introuvable
   - `409` conflit concurrent

#### `PUT /api/appointments/:id/cancel`

- Auth: `Bearer` requis, roles `PATIENT` ou `DOCTOR`.
- Parametres URL:
   - `id` (ID RDV, requis)
- Body JSON:
   - `reason` (string, requis)
- Reponse succes: `200` RDV mis a jour avec `statut=ANNULE` + metadonnees d'annulation.
- Codes HTTP possibles:
   - `200` annulation OK
   - `400` annulation patient hors delai (< 2h) ou statut non annulable
   - `403` utilisateur non proprietaire/assigne
   - `404` RDV introuvable
   - `409` conflit concurrent

#### `GET /api/appointments/upcoming`

- Auth: `Bearer` requis, roles `PATIENT` ou `DOCTOR`.
- Parametres: aucun.
- Reponse succes: `200` liste des RDV actifs a venir + objet `reminder`.
- Codes HTTP possibles:
   - `200` lecture OK
   - `401` token absent/invalide
   - `403` role non autorise

### Notifications multicanal

- Notifications in-app persistantes en base (`Notification`) a chaque evenement (creation, confirmation, annulation, rappel, no-show).
- Emission temps reel Socket.io (`notification:new`) dans la room `user:<userId>`.
- Emails transactionnels pour demande creee, confirmation, annulation et rappel J-1.
- SMS via Twilio si credentials presents, sinon fallback local en mode mock.

### Jobs planifies (cron MVP)

- Rappel 24h: toutes les heures (`process24hReminders`).
- Passage automatique en `NO_SHOW`: toutes les heures (`processNoShowUpdates`) pour les rendez-vous confirmes depasses de la fenetre de grace.
- Parametrage runtime via variables d'environnement (`FREE_CANCELLATION_HOURS`, `REMINDER_*`, `NO_SHOW_GRACE_MINUTES`).

### Tests critiques MVP (3 uniquement)

- Test 1: double reservation simultanee sur meme creneau -> attendu `201` + `409`.
- Test 2: creation RDV avec medecin non verifie -> attendu `403`.
- Test 3: annulation patient hors delai (<2h) -> attendu `400` + statut RDV inchange.

Execution locale:
- `cd backend && npm run test:etape5:mvp`

## Routes Frontend (resume Etape 6)

| Route | Ecran | Description |
|---|---|---|
| `/` | Home | Landing medicale avec highlights produit et CTA patient. |
| `/search` | Recherche | Recherche medecins (filtres specialite/ville) + visualisation Leaflet des cabinets. |
| `/doctor/:id` | Profil medecin | Fiche detaillee medecin, langues, cabinets, modal de preparation RDV. |
| `/login` | Auth connexion | Formulaire valide avec `react-hook-form` + `zod`. |
| `/register` | Auth inscription | Formulaire patient avec validation metier (+212, password policy). |
| `/dashboard/patient` | Dashboard patient | Vue patient (prochains rendez-vous, suivi). |
| `/dashboard/doctor` | Dashboard medecin | Vue medecin (confirmations, activite). |
| `/dashboard/admin` | Dashboard admin | Backoffice de validation medecins, stats plateforme et moderation des avis. |
| `/appointment/:id` | Detail RDV | Detail d'un rendez-vous avec format de date localise FR/AR. |

### Frontend stack implementee (Etape 6)

- Vite + React 19.
- Tailwind CSS + design tokens marocains (`#1A6B8A`, `#2ECC8F`, `#F4A62A`).
- Design system maison: `Button`, `Input`, `Card`, `Badge`, `Modal`, `Skeleton`, `Avatar`.
- Router: `react-router-dom@6` via `createBrowserRouter`.
- Data fetching: `@tanstack/react-query` + `axios`.
- Formulaires: `react-hook-form` + `zod`.
- Notification UX: `react-hot-toast`.
- Cartographie: `leaflet` + `react-leaflet`.
- Internationalisation: `i18next` + `react-i18next` (FR/AR) avec bascule RTL/LTR.

## Schema BDD (resume Etape 2)

- Modeles principaux : User, Patient, Doctor, Cabinet, DoctorCabinet, Disponibilite, RendezVous, Avis, Notification, Paiement.
- Relations 1-1 : User -> Patient, User -> Doctor.
- Relation N-N : Doctor <-> Cabinet via DoctorCabinet (table de jonction explicite).
- Relations 1-N : Doctor -> Disponibilite, Patient -> RendezVous, Doctor -> RendezVous, User -> Notification, Doctor -> Paiement.
- Relations metier critiques : RendezVous lie patient, medecin, cabinet et disponibilite; Avis et Paiement sont rattaches au rendez-vous.
- Index metiers : recherche par specialite/ville, consultation d'agenda par doctor/date, suivi notifications utilisateur, reporting paiements.

## API Auth (resume Etape 3)

### Routes d'authentification

| Methode | Route | Description |
|---|---|---|
| GET | `/api/auth/csrf-token` | Retourne un token CSRF a envoyer dans le header `x-csrf-token` pour les routes sensibles. |
| POST | `/api/auth/register/patient` | Inscription patient. |
| POST | `/api/auth/register/doctor` | Inscription medecin avec upload de documents (`multipart/form-data`, champ `documents`). |
| POST | `/api/auth/login` | Connexion email/password. |
| POST | `/api/auth/logout` | Deconnexion (necessite access token valide). |
| POST | `/api/auth/refresh-token` | Renouvelle l'access token via refresh token en cookie HttpOnly. |
| GET | `/api/auth/verify-email/:token` | Verification d'email. |
| POST | `/api/auth/forgot-password` | Declenche le flux mot de passe oublie. |
| POST | `/api/auth/reset-password/:token` | Reinitialise le mot de passe avec token. |

### Mecanismes de securite actifs

- JWT access token (15 min) + refresh token (7 jours).
- Hash bcrypt (`saltRounds=12`) pour les mots de passe.
- Middleware `authenticate` + `authorize(roles[])`.
- Rate limiting auth : 5 tentatives / 15 min.
- Validation et sanitisation des inputs (`express-validator` + middleware sanitize).
- CSRF double submit cookie pattern sur les routes auth sensibles.
- Envoi d'emails HTML (verification / reset password) via Nodemailer.

## Variables d'environnement necessaires (.env.example)

```dotenv
# Application
NODE_ENV=development
APP_NAME=TabibConnect
API_PORT=4000
WEB_PORT=5173
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:5173
TZ=Africa/Casablanca

# Database (PostgreSQL + Prisma)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tabibconnect
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/tabibconnect

# Redis / Queue
REDIS_URL=redis://localhost:6379
QUEUE_PREFIX=tabibconnect

# Auth / Security
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
SESSION_SECRET=change_me_session_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# File storage (S3 compatible)
S3_ENDPOINT=http://localhost:9000
S3_REGION=eu-west-1
S3_BUCKET=tabibconnect
S3_ACCESS_KEY_ID=change_me
S3_SECRET_ACCESS_KEY=change_me
S3_FORCE_PATH_STYLE=true

# Notifications
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
SENDGRID_API_KEY=
EMAIL_FROM=no-reply@tabibconnect.ma

# Rendez-vous (Etape 5)
FREE_CANCELLATION_HOURS=2
REMINDER_HOURS_BEFORE=24
REMINDER_WINDOW_MINUTES=10
NO_SHOW_GRACE_MINUTES=30

# Paiement
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYMENT_PROVIDER_MODE=sandbox

# Cartographie
MAPBOX_API_KEY=

# Observabilite
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=

# Frontend public env
VITE_API_URL=http://localhost:4000/api/v1
VITE_PUBLIC_APP_NAME=TabibConnect
VITE_MAPBOX_PUBLIC_KEY=
VITE_SENTRY_DSN=
```

### Variables backend actuellement utilisees (Etapes 1 a 5)

| Variable | Usage actuel |
|---|---|
| NODE_ENV | Active le mode d'execution (development/production). |
| PORT | Port HTTP du serveur Express. |
| CORS_ORIGIN | Origine autorisee pour les requetes CORS. |
| DATABASE_URL | Connection PostgreSQL lue par Prisma. |
| JWT_ACCESS_SECRET | Signature des access tokens. |
| JWT_REFRESH_SECRET | Signature des refresh tokens. |
| JWT_ACCESS_EXPIRES_IN | Duree de vie de l'access token (15m). |
| JWT_REFRESH_EXPIRES_IN | Duree de vie du refresh token (7d). |
| BCRYPT_SALT_ROUNDS | Cout du hash bcrypt (12). |
| RATE_LIMIT_AUTH_WINDOW_MS | Fenetre du rate limiting auth. |
| RATE_LIMIT_AUTH_MAX | Nombre max de tentatives auth par fenetre. |
| CSRF_SECRET | Secret de signature CSRF. |
| CSRF_COOKIE_NAME | Nom du cookie CSRF. |
| CSRF_HEADER_NAME | Header attendu pour le token CSRF. |
| SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS | Parametres SMTP pour envoi email. |
| TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM | Parametres SMS Twilio (fallback mock si absents). |
| FREE_CANCELLATION_HOURS | Fenetre d'annulation gratuite (heures avant RDV). |
| REMINDER_HOURS_BEFORE | Delai cible pour rappel automatique avant RDV. |
| REMINDER_WINDOW_MINUTES | Tolerance autour de la cible de rappel 24h. |
| NO_SHOW_GRACE_MINUTES | Delai apres l'heure du RDV avant bascule NO_SHOW. |

## Instructions d'installation

### Lancement du backend (Etape 1)

1. Aller dans le dossier backend :
   - `cd backend`
2. Copier les variables d'environnement :
   - `cp .env.example .env`
3. Installer les dependances :
   - `npm install`
4. Demarrer en mode developpement (nodemon) :
   - `npm run dev`
5. Ou demarrer en mode standard :
   - `npm run start`
6. Tester la sante de l'API :
   - `GET http://localhost:4000/api/health`

### Base de donnees (Etape 2)

1. Generer le client Prisma :
   - `npm run prisma:generate`
2. Creer et appliquer la migration initiale :
   - `npx prisma migrate dev --name init`
3. Injecter des donnees de test marocaines :
   - `npm run prisma:seed`

> Important : PostgreSQL doit etre demarre et accessible sur `DATABASE_URL` avant `migrate dev` et `seed`.

### Authentification (Etape 3)

1. Recuperer un token CSRF :
   - `GET /api/auth/csrf-token`
2. Envoyer le header CSRF (`x-csrf-token`) pour les routes POST auth.
3. Connexion :
   - `POST /api/auth/login`
4. Renouvellement du token d'acces :
   - `POST /api/auth/refresh-token`
5. Deconnexion :
   - `POST /api/auth/logout`

> Note : le refresh token est stocke en cookie HttpOnly. Cote client, il faut envoyer les credentials avec les requetes cross-site.

### API medecins et cabinets (Etape 4)

1. Lister les medecins filtres :
   - `GET /api/doctors?specialite=Cardiologie&ville=Casablanca&accepteAssurance=true`
2. Faire une recherche full-text + symptomes :
   - `GET /api/doctors/search?q=douleur thoracique`
3. Recuperer les disponibilites d'un medecin pour une date :
   - `GET /api/doctors/:id/availabilities?date=YYYY-MM-DD`
4. Creer un cabinet (medecin connecte) :
   - `POST /api/cabinets`
5. Chercher des cabinets proches :
   - `GET /api/cabinets/nearby?lat=33.58&lng=-7.62&radius=10`

### Rendez-vous et notifications (Etape 5)

1. Creer un rendez-vous (patient authentifie) :
   - `POST /api/appointments`
2. Confirmer un rendez-vous (medecin assigne) :
   - `PUT /api/appointments/:id/confirm`
3. Annuler un rendez-vous (patient ou medecin) :
   - `PUT /api/appointments/:id/cancel`
4. Marquer un rendez-vous comme termine :
   - `PUT /api/appointments/:id/complete`
5. Consulter la liste des rendez-vous utilisateur :
   - `GET /api/appointments/my`
   - `GET /api/appointments/upcoming`
6. Les rappels et no-show sont traites automatiquement par cron au demarrage du serveur.

### Frontend React (Etape 6)

1. Aller dans le dossier frontend :
   - `cd frontend`
2. Installer les dependances :
   - `npm install`
3. Lancer le serveur de developpement :
   - `npm run dev`
4. Construire en production :
   - `npm run build`
5. Routes frontend disponibles :
   - Publiques : `/`, `/search`, `/doctor/:id`, `/login`, `/register`
   - Protegees : `/dashboard/patient`, `/dashboard/doctor`, `/dashboard/admin`

### Systeme d'acces par niveaux

1. Niveau 1 - acces public sans connexion
   - Accueil `/`
   - Recherche `/search`
   - Profil medecin `/doctor/:id` en lecture seule
2. Niveau 2 - acces protege via `PrivateRoute`
   - Dashboard patient `/dashboard/patient`
   - Dashboard medecin `/dashboard/doctor`
   - Dashboard admin `/dashboard/admin`
3. Parcours reservation
   - Le bouton `Prendre RDV` sur un profil medecin ouvre une modal de connexion si l utilisateur n est pas authentifie.
   - Les boutons `Se connecter` et `Creer un compte` conservent un `redirect` vers la page d origine.
   - Le lien `Continuer sans compte` reste desactive avec un tooltip explicite.
4. Retour apres authentification
   - La page de connexion redirige vers la route demandee via le parametre `redirect`.
   - La page d inscription conserve aussi ce retour vers la route d origine.

### Suite du setup global

1. Le socle v1 est complet et la release est maintenant centrée sur la stabilité, la documentation et le déploiement.
2. Les prochaines évolutions fonctionnelles restent possibles, mais hors du chemin critique de livraison.

## Livraison finale (résumé Étape 10)

### Tests valides

- Backend API: `cd backend && npm test`
- Frontend UI: `cd frontend && npm test`
- Build production: `cd frontend && npm run build`
- E2E Playwright: `cd frontend && npm run test:e2e`.
- Homepage finale ✅ : hero médical, recherche renforcée, carte du Maroc, statistiques, témoignages et section "Comment ça marche" finalisés.
- Corrections UI/UX appliquées ✅ : accès progressif, login, inscription, recherche scrollable, footer global et profils médecins enrichis.
- Premiere installation browser Playwright: `npx playwright install chromium`

### Deploiement Docker

- [docker-compose.yml](docker-compose.yml) orchestre PostgreSQL, Redis, backend, frontend, Nginx et Certbot.
- [backend/Dockerfile](backend/Dockerfile) genere le client Prisma et lance le serveur Node.
- [frontend/Dockerfile](frontend/Dockerfile) build l application et la sert via Nginx.
- [infrastructure/nginx/default.conf](infrastructure/nginx/default.conf) gere le reverse proxy, le TLS et Socket.io.
- Premiere mise en ligne: `docker compose --env-file .env.production up -d --build`
- Premier certificat TLS: `docker compose --profile certbot run --rm certbot`

### SEO et performance

- Meta tags, title et description definis dans [frontend/index.html](frontend/index.html).
- Indexation et crawl controles via [frontend/public/robots.txt](frontend/public/robots.txt) et [frontend/public/sitemap.xml](frontend/public/sitemap.xml).
- Split des bundles Vite conserve pour separer les vendor chunks.
- Cache statique Nginx sur `/assets/` pour accelerer le chargement.

### Fichiers de release

- [.env.production.example](.env.production.example)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CHANGELOG.md](CHANGELOG.md)

TabibConnect est pret pour une mise en ligne controlee.
