# DEVLOG - TabibConnect

## Objectif du document

Ce fichier centralise toutes les decisions techniques prises pendant le projet afin de garder une trace claire du *pourquoi* et du *comment*.

## Format de journalisation

Chaque entree doit suivre ce format :
- Date
- Contexte
- Decision
- Alternatives considerees
- Impact court terme
- Impact long terme
- Actions suivantes

---

## 2026-04-17 - Etape 0 : Initialisation du projet

### Contexte
Lancement du projet plateforme de rendez-vous medicaux en ligne pour le Maroc, avec objectif de depasser un produit type Doctolib en fonctionnalites et en experience.

### Decisions prises
1. **Nom projet retenu : TabibConnect**
   - Alternative proposee : SahaMawid.

2. **Architecture monorepo par domaines**
   - `apps/web` pour le frontend React.
   - `apps/api` pour le backend Node.js/Express.
   - `apps/worker` pour les traitements asynchrones.
   - `packages/*` pour mutualiser UI, types et utilitaires.

3. **Socle technique principal valide**
   - Backend : Node.js + Express + TypeScript.
   - Frontend : React + Vite + TypeScript.
   - Base de donnees : PostgreSQL.
   - ORM : Prisma.
   - Jobs async : Redis + BullMQ.

4. **Structure de projet complete creee des le depart**
   - Dossiers backend/frontend/infra/docs/tests pre-crees.
   - Ajout de `.gitkeep` dans chaque dossier vide pour figer l'arborescence dans Git.

### Alternatives considerees
- Backend NestJS (non retenu pour garder une base Express plus flexible au depart).
- Frontend Next.js (non retenu pour simplifier le demarrage SPA avec API separee).
- ORM Drizzle/Sequelize (non retenus face a la maturite schema/migration de Prisma).

### Impact court terme
- Onboarding equipe accelere grace a une structure claire.
- Decisions techniques alignees avant ecriture de code.

### Impact long terme
- Evolution modulaire plus simple (ajout mobile, microservices, multi-tenant).
- Meilleure maintenabilite et traçabilite des choix d'architecture.

### Actions suivantes
- Etape 1 : cadrage fonctionnel detaille du MVP.
- Etape 2 : initialisation effective du monorepo (package manager, configs TS/lint/test).
- Etape 3 : demarrage du backend (auth + prise de rendez-vous).

---

## 2026-04-17 - Etape 1 : Initialisation du backend Express

### Contexte
L'objectif etait de poser une base backend executable tout de suite, avec une structure claire et une route de verification de sante API.

### Decisions prises
1. **Creation d'un backend dedie dans `/backend`**
   - Initialisation npm locale au dossier backend.

2. **Socle middleware de base active**
   - `helmet` pour durcissement des en-tetes HTTP.
   - `cors` pour controler les origines autorisees.
   - `morgan` pour logs HTTP en developpement.
   - `dotenv` pour gestion de configuration par environnement.

3. **Separation `app.js` / `server.js`**
   - `app.js` porte la composition Express.
   - `server.js` porte le bootstrap reseau (listen sur le port).

4. **Prisma initialise avec schema minimal PostgreSQL**
   - Base de migration et generation client preparee.

5. **Middleware global d'erreurs ajoute**
   - Capture centralisee des erreurs metier et techniques.

### Alternatives considerees
- Lancer le backend dans `apps/api` des cette etape.
- Utiliser un framework plus opinionated des le depart (NestJS).

### Impact court terme
- API demarrable immediatement via `npm run dev` ou `npm run start`.
- Endpoint de controle operationnel : `/api/health`.

### Impact long terme
- Base claire pour modulariser auth, rendez-vous, notifications et paiements.
- Tests d'integration simplifies grace a la separation app/serveur.

### Actions suivantes
- Etape 2 : cadrage produit detaille et priorisation du MVP.
- Etape 3 : modelisation des entites Prisma (users, doctors, patients, appointments).
- Etape 4 : implementation auth JWT + hash bcrypt.

---

## 2026-04-17 - Etape 2 : Conception du schema Prisma

### Contexte
La mission consistait a transformer les besoins metiers de TabibConnect en modele relationnel PostgreSQL exploitable immediatement via Prisma.

### Decisions prises
1. **Modele central autour de `RendezVous`**
   - Le rendez-vous relie patient, medecin, cabinet et disponibilite pour piloter planning et parcours patient.

2. **Separation `User` / `Patient` / `Doctor`**
   - `User` porte les donnees d'authentification communes.
   - `Patient` et `Doctor` portent les attributs metiers specifiques.

3. **Relation N-N explicite `DoctorCabinet`**
   - Permet de tracer l'exercice multi-cabinets et d'etendre la relation (dates, statut) plus tard.

4. **Enums pour les champs de domaine**
   - Roles, statuts de rendez-vous, type consultation, methode/statut paiement, etc.

5. **Strategie d'index orientee usages reel produit**
   - Recherche medecin (specialite/ville), consultation agenda (doctor/date), inbox notifications (user/isRead), reporting paiements.

6. **Migration initiale creee en SQL**
   - `prisma migrate diff` utilise pour generer le SQL initial en l'absence de serveur PostgreSQL local actif.

7. **Seed marocain prepare**
   - Jeux de donnees realistes (villes, cabinets, specialites FR/AR translittere, disponibilites, rendez-vous, avis, paiements).

### Alternatives considerees
- Profil unique pour patient et medecin dans `User` (non retenu: trop rigide et moins clair metier).
- Relation implicite many-to-many doctor/cabinet (non retenue: moins evolutive qu'une table de jonction explicite).

### Impact court terme
- Base de donnees prete pour implementation des modules Auth, Agenda, RDV, Paiements.
- Structure assez expressive pour supporter dashboard et filtres recherche.

### Impact long terme
- Evolution plus simple vers multi-cliniques, analytics et extension mobile.
- Maintenabilite accrue grace aux enums et contraintes relationnelles explicites.

### Actions suivantes
- Etape 3 : cadrage produit detaille et definition MVP.
- Etape 4 : implementation des endpoints Auth + Users + Patients + Doctors.
- Etape 5 : mise en place du module RendezVous (creation, confirmation, annulation).

---

## 2026-04-20 - Etape 3 : Systeme d'authentification complet

### Contexte
La mission etait de mettre en production locale un socle d'auth complet et securise, aligne avec le schema Prisma existant.

### Decisions prises
1. **JWT dual token mis en place**
   - Access token court (15 min).
   - Refresh token long (7 jours) stocke en cookie HttpOnly et hash en base.

2. **Extension du schema `User` pour les flux de securite**
   - Champs pour verification email, reset password, refresh token et expirations.

3. **RBAC au niveau middleware**
   - `authenticate` pour verifier le bearer token.
   - `authorize(roles[])` pour filtrer les roles.

4. **Protection anti-abus et anti-CSRF**
   - Rate limiting auth : 5 tentatives / 15 minutes.
   - CSRF double submit cookie pattern avec route de generation token.

5. **Validation + sanitisation entree API**
   - `express-validator` route par route.
   - Middleware de sanitisation global.

6. **Flux emails transactionnels**
   - Nodemailer avec templates HTML pour verification email et reset password.
   - Fallback Ethereal en local si SMTP absent.

7. **Onboarding medecin avec upload documents**
   - Upload multipart via Multer.
   - Persistance metadonnees documents en base (`DoctorDocument`).

### Alternatives considerees
- Refresh token purement stateless (non retenu: logout/revocation plus faible).
- `csurf` (non retenu car package deprecie, remplace par `csrf-csrf`).

### Impact court terme
- Auth API exploitable immediatement (`/api/auth/*`).
- Flux login/refresh/logout/forgot-password valides en local.

### Impact long terme
- Base solide pour espaces Patient/Doctor/Admin et controle d'acces fin.
- Meilleure resilience contre attaques bruteforce et CSRF.

### Actions suivantes
- Etape 4 : cadrage produit detaille et priorisation MVP.
- Etape 5 : implementation modules metier (disponibilites et rendez-vous).
- Etape 6 : integration front React avec gestion de session et CSRF.

---

## 2026-04-21 - Etape 4 : API medecins et cabinets complete

### Contexte
La mission etait de livrer une API metier exploitable pour discovery medecin, recherche intelligente, disponibilites temps reel et geolocalisation des cabinets.

### Decisions prises
1. **Endpoints medecins/cabinets dedies**
   - `GET /api/doctors` avec filtres metier.
   - `GET /api/doctors/:id`, `GET /api/doctors/:id/availabilities`, `GET /api/doctors/:id/reviews`.
   - `GET /api/doctors/search` (full-text + suggestions symptomes).
   - `PUT /api/doctors/profile` (DOCTOR uniquement).
   - `POST /api/cabinets`, `GET /api/cabinets/:id`, `GET /api/cabinets/nearby`.

2. **Recherche full-text PostgreSQL**
   - Usage `to_tsvector` + `plainto_tsquery` + `ts_rank` pour classer les resultats medecins.

3. **Suggestion symptomes -> specialites**
   - Mapping JSON versionne dans le code (`symptomSpecialtyMap.json`).
   - Fallback resultats par specialites suggerees meme sans match textuel direct.

4. **Algorithme disponibilites temps reel**
   - Construction des slots a partir des disponibilites recurrentes (`jourSemaine`, `heureDebut`, `heureFin`, `dureeConsultation`).
   - Exclusion des slots deja occupes par des rendez-vous `EN_ATTENTE` et `CONFIRME`.

5. **Geolocalisation par Haversine**
   - Requete SQL avec calcul distance km entre point utilisateur et cabinets stockes.

6. **Schema Prisma et migration complementaires**
   - Ajout `Doctor.nomComplet` pour la recherche par nom.
   - Migration `doctor_name_field` appliquee en base.

### Alternatives considerees
- Recherche Prisma `contains` uniquement (non retenue: moins pertinente que full-text ranke).
- Geolocalisation cote application sans SQL (non retenue: moins efficace a grande echelle).

### Impact court terme
- API medecins/cabinets directement consommable par le front.
- Parcours patient de recherche et selection praticien fortement accelere.

### Impact long terme
- Base robuste pour ranking intelligent, personnalisation et recommandations.
- Facile extension vers PostGIS/geospatial index si volumetrie augmente.

### Actions suivantes
- Etape 5 : cadrage produit detaille et priorisation MVP.
- Etape 6 : integration front React des ecrans recherche medecin/cabinet.
- Etape 7 : module rendez-vous transactionnel complet (creation, annulation, replanification).

---

## 2026-04-21 - Etape 5 : API rendez-vous et notifications complete

### Contexte
La mission etait d'implementer un module rendez-vous transactionnel de bout en bout avec notifications multicanal, temps reel et automatisations cron.

### Decisions prises
1. **Module rendez-vous dedie sous `/api/appointments`**
   - Endpoints livres: creation, listing `my`, listing `upcoming`, confirmation, annulation, completion.

2. **Concurrence optimiste sur la reservation**
   - Ajout `Disponibilite.bookingVersion` pour verrouillage CAS au moment de la reservation.
   - Ajout `RendezVous.version` pour proteger les transitions de statut (`EN_ATTENTE` -> `CONFIRME` -> `COMPLETE/ANNULE/NO_SHOW`).

3. **Extension lifecycle rendez-vous**
   - Nouveaux champs Prisma: `cancellationReason`, `cancelledAt`, `cancelledByRole`, `confirmedAt`, `completedAt`, `noShowAt`.
   - Index supplementaires pour les requetes agenda/statut.

4. **Notifications unifiees (in-app + temps reel + email + SMS)**
   - Persistance `Notification` en base pour audit/UX.
   - Emission Socket.io `notification:new` vers room `user:<id>`.
   - Emails transactionnels (confirmation, annulation, rappel).
   - SMS Twilio avec fallback mock local si credentials absents.

5. **Automatisation cron metier**
   - Rappels 24h traites toutes les heures (cadence MVP).
   - Bascule `NO_SHOW` toutes les heures apres delai de grace configurable.

6. **Bootstrap serveur et configuration renforces**
   - Passage a serveur HTTP explicite pour initialiser Socket.io.
   - Auth JWT cote socket (handshake bearer/auth token).
   - Nouvelles variables env pour regles d'annulation, rappels et no-show.

7. **Ajustements MVP critiques post-audit**
   - Blocage `POST /api/appointments` si medecin `isVerified=false` (HTTP 403).
   - Annulation patient refusee si le rendez-vous est a moins de 2h (HTTP 400 metier).
   - `GET /api/appointments/my` aligne MVP: patient (a venir), medecin (jour + semaine).
   - Script dedie `scripts/etape5_mvp_critical_tests.js` couvrant exactement les 3 tests critiques demandes.

### Alternatives considerees
- Verrou pessimiste SQL direct (non retenu: plus couplant, moins portable avec Prisma transactionnelle actuelle).
- Polling HTTP pour notifications front (non retenu: latence et charge superieures vs Socket.io).

### Impact court terme
- Flux patient/medecin rendez-vous operationnel en API.
- Notifications evenementielles immediates disponibles pour integration frontend.
- Rappels/no-show automatisees sans intervention manuelle.

### Impact long terme
- Base solide pour replanification, politiques d'annulation monetisees et dashboards no-show.
- Architecture evolutive vers workers dedies/queues si volumetrie augmente.

### Actions suivantes
- Etape 6 : integration front React des ecrans agenda/rendez-vous en temps reel.
- Etape 7 : cadrage produit detaille MVP et parcours UX complets.
- Etape 8 : instrumentation metriques (taux no-show, taux confirmation, delais de traitement).

---

## 2026-04-21 - Etape 7 : Pages principales du site (frontend)

### Contexte
La mission etait de livrer une experience utilisateur complete sur les pages les plus visibles du produit: accueil, recherche medecin et profil medecin.

### Decisions prises
1. **HomePage transformee en page immersive orientee conversion**
   - Hero recherche (symptome + ville), compteurs animes, sections "comment ca marche", hotspots carte Maroc et footer riche.

2. **SearchPage upgradee en recherche avancee reelle**
   - Filtres metier complets (specialite, ville, disponibilite, tarif, sexe, langue, assurance, teleconsultation).
   - Tri multi-criteres et bascule liste/carte.
   - Infinite scroll en mode liste avec IntersectionObserver.
   - Enrichissement "prochain creneau" via appels disponibilites par medecin.

3. **DoctorProfilePage refondue en parcours actionnable**
   - Hero profil complet (note, experience, assurance, langues, villes).
   - Onglets A propos / Disponibilites / Avis / Localisation.
   - Selection de date + creneaux live et modal de confirmation RDV.
   - Carte cabinet et lien itineraire.

4. **Qualite frontend verifiee en sortie de sprint**
   - Lint frontend vert apres correction des warnings bloquants.
   - Build production Vite valide.

### Alternatives considerees
- Pagination classique cote recherche (non retenue pour privilegier une navigation continue sur mobile).
- Profil medecin monobloc sans onglets (non retenu pour limiter la charge cognitive).

### Impact court terme
- Parcours patient beaucoup plus concret de la decouverte jusqu'au pre-booking.
- Base UI solide pour brancher la reservation finale sur `POST /api/appointments`.

### Impact long terme
- Architecture d'ecrans evolutive (ajout favoris, comparateur, recommandations personnalisees).
- Meilleure retention utilisateur grace a une UX plus moderne et orientee action.

### Actions suivantes
- Brancher la confirmation modal du profil sur la creation de rendez-vous cote API.
- Ajouter tests E2E des parcours Home -> Search -> Profile -> Booking.
- Introduire code splitting pour reduire la taille du bundle frontend.

## 2026-04-22 - Etape 8 : Dashboards complets

### Contexte
La mission etait de transformer les espaces Patient, Medecin et Admin en tableaux de bord complets, plus utiles qu une simple vue de synthese, tout en restant coherents avec le design du frontend.

### Decisions prises
1. **Dashboard Patient enrichi**
   - Vue d ensemble du prochain rendez-vous, de l historique, des medecins favoris, du profil medical, des notifications et des avis post-consultation.
   - Actions locales pour annuler, reprogrammer et reprendre un rendez-vous.

2. **Dashboard Medecin interactif**
   - Agenda hebdomadaire par cabinet avec blocs glissables en drag and drop.
   - Statistiques metier, disponibilites par cabinet, patients du jour, demandes en attente et editeur de profil public avec apercu.

3. **Dashboard Admin / backoffice**
   - File de validation des comptes medecins avec controle des documents INPE.
   - Vue des stats globales et gestion des signalements d avis avec actions de moderation.

4. **Données de dashboard centralisees**
   - Ajout d un fichier commun `dashboardContent` pour conserver des donnees de demo coherentes entre les trois espaces.
   - Reutilisation des composants UI et de `MotionCard` pour garder une experience unifiee.

### Alternatives considerees
- Brancher les dashboards sur de nouvelles routes backend avant de livrer l UI (non retenu pour livrer rapidement les parcours etudiants de l etape).
- Utiliser des graphiques lourds ou une librairie de charts (non retenu: la lisibilite et la vitesse d execution ont ete privilegiees).

### Impact court terme
- Les trois dashboards sont utilisables comme vraies surfaces produit et donnent de la profondeur au MVP.
- Le frontend gagne en densite fonctionnelle sans perdre la coherence visuelle du reste de l application.

### Impact long terme
- Les futurs branchements vers des API authentifiees pourront remplacer les donnees locales sans changer la structure des pages.
- Le backoffice admin et les ecrans metier disposent maintenant de bases UI solides pour evoluer.

### Actions suivantes
- Brancher les dashboards sur des donnees de session et des endpoints metier authentifies.
- Ajouter les parcours de reservation et de moderation en mode full API.

## 2026-04-22 - Etape 9 : Fonctionnalites avancees

### Contexte
La mission etait de cadrer et documenter les fonctionnalites avancees du produit: teleconsultation video, paiement marocain et ordonnances numeriques, avec une explication claire des briques techniques retenues.

### Decisions prises
1. **Teleconsultation video documentee autour de WebRTC**
   - Salle d attente virtuelle avant la consultation.
   - Echange video via WebRTC, avec `simple-peer` comme option P2P legere ou Daily.co si l on veut deleguer le signaling et l orchestration temps reel.
   - Chat texte, partage d ecran et upload de documents pendant la session.

2. **Paiement marocain cible autour de CMI**
   - Paiement au moment de la confirmation du rendez-vous.
   - Carte bancaire tokenisee, sans stockage du numero de carte cote TabibConnect.
   - Recu PDF et mecanisme de remboursement automatique si le medecin annule.

3. **Ordonnances numeriques**
   - Generation d une ordonnance digitale post-consultation.
   - PDF envoye au patient avec QR code de verification.
   - Scannage QR par la pharmacie pour validation.

4. **Explications techniques ajoutees dans le README**
   - WebRTC: signalisation, SDP, ICE, STUN/TURN, flux P2P.
   - Paiement: tokenisation CB et capture apres confirmation.
   - PDF: generation avec Puppeteer ou pdfkit selon le type de document.

### Alternatives considerees
- WebRTC uniquement via Daily.co (non retenu comme unique option, afin de conserver un chemin P2P simple avec `simple-peer`).
- PDF generes exclusivement avec une librairie programmatique (non retenu, car Puppeteer est plus adapte aux modeles visuels d ordonnance et de recu).

### Impact court terme
- La roadmap produit et la documentation technique couvrent maintenant le cycle complet consultation -> paiement -> ordonnance.
- Les prochaines integrations runtime pourront reutiliser ce cadrage sans re-decider l architecture.

### Impact long terme
- Base claire pour connecter un fournisseur video, un PSP marocain et un service d archivage documentaire.
- Les utilisateurs beneficient d un parcours plus fluide et plus credible autour de la consultation medicale.

### Actions suivantes
- Brancher WebRTC sur le workflow de consultation en temps reel.
- Integrer CMI ou un PSP compatible pour la capture et les remboursements.
- Generer les ordonnances PDF avec QR de verification et envoi email.

## 2026-04-22 - Etape 10 : Tests, deploiement et finalisation

### Contexte
La mission etait de fermer la release avec des tests executables, une chaine Docker complete, un reverse proxy Nginx avec TLS et la documentation de livraison finale.

### Decisions prises
1. **Tests backend automatisees**
   - Ajout de Jest et Supertest.
   - Couverture du endpoint de sante et de deux services metier: auth et rendez-vous.

2. **Tests frontend automatisees**
   - Ajout de Vitest et React Testing Library pour les composants.
   - Ajout de Playwright pour le parcours Home -> Search avec mocks reseau.

3. **Deployment Docker compose**
   - Ajout de Dockerfiles dedies pour le backend et le frontend.
   - Ajout de `docker-compose.yml` pour PostgreSQL, Redis, backend, frontend, Nginx et Certbot.

4. **Reverse proxy et SSL**
   - Configuration Nginx pour servir le frontend, router `/api` et supporter Socket.io.
   - Configuration Certbot Webroot pour Let's Encrypt.

5. **SEO et release docs**
   - Ajout de `robots.txt`, `sitemap.xml`, meta tags et titre applicatif.
   - Ajout de `CONTRIBUTING.md`, `CHANGELOG.md` et `.env.production.example`.

### Alternatives considerees
- Un runner unique de tests a la racine (non retenu: le repo reste organise par package frontend/backend).
- Un serveur frontend en mode preview Node au lieu de Nginx (non retenu: Nginx est plus simple pour servir des assets statiques et le SPA fallback).

### Impact court terme
- La release est executable localement et verifiable par tests.
- Les instructions de mise en ligne sont maintenant reproductibles.

### Impact long terme
- Le repo dispose d une base de CI/CD, de verification et de deploiement plus saine.
- Les futures evolutions peuvent s ajouter sans refaire tout le socle de livraison.

### Actions suivantes
- Brancher ces tests et scripts dans une CI distante si necessaire.
- Remplacer les valeurs placeholders du domaine par les vraies valeurs de production.

## 2026-04-22 - Etape 11 : Acces progressif et refonte UX frontend

### Contexte
La mission etait de mettre en place un acces progressif coherent sur tout le frontend, de refondre les parcours login et inscription, puis d enrichir les pages visibles avec une navigation plus claire, un footer global et des interactions plus fluides.

### Decisions prises
1. **Garde d acces reutilisable**
   - Creation de `PrivateRoute` pour les dashboards proteges par role.
   - Introduction d une modal d acces partagee pour les reservations et les routes protegees non authentifiees.

2. **Connexion et inscription refondues**
   - Login en deux colonnes avec image medicale, trust copy et redirection `redirect` apres authentification.
   - Inscription avec choix patient/medecin, wizard multi-etapes et upload INPE pour les medecins.

3. **Homepage et navigation**
   - Carousel infini des specialites, banniere de preuve sociale, cartes villes cliquables et avis patients en slider manuel.
   - Footer global restaure dans le shell commun.

4. **Recherche et profil medecin**
   - Layout recherche fixe avec scroll confine a la colonne de droite.
   - Boutons de reservation relies au profil medecin et modal d acces progressive.

### Alternatives considerees
- Centraliser l authentification dans un provider React complet (non retenu pour rester au plus proche du stockage local deja en place).
- Utiliser une page de redirection interstitielle au lieu d une modal (non retenu pour conserver un parcours plus direct).

### Impact court terme
- Les routes protegees ne renvoient plus vers des ecrans vides.
- La navigation principale distingue clairement le public du protege.

### Impact long terme
- La base UX reste simple a etendre pour de nouveaux roles ou de nouveaux parcours sensibles.

### Actions suivantes
- Lancer la build frontend finale.
- Verifier le parcours public -> modal -> login -> redirection sur les pages critiques.
