# RAPPORT DE STAGE TECHNIQUE — TABIBCONNECT

> **Document source exhaustif destiné à un agent IA** pour la génération d'un rapport de stage professionnel complet avec tous les diagrammes nécessaires (UML, architecture, séquence, déploiement, etc.).

---

## INFORMATIONS GÉNÉRALES DU STAGE

- **Projet** : TabibConnect — Plateforme web de prise de rendez-vous médicaux
- **Durée du stage** : 1 mois (environ 29 avril 2026 – 26 mai 2026, d'après l'historique Git)
- **Pays cible** : Maroc
- **Type de projet** : Application web full-stack (SPA + API REST + temps réel)
- **Rôle du stagiaire** : Développeur full-stack — conception, développement, tests et déploiement de l'intégralité de la plateforme
- **Taille du code produit** : ~29 070 lignes de code (≈12 968 lignes backend, ≈16 102 lignes frontend), 158 fichiers source (76 backend, 82 frontend), 484 lignes de schéma Prisma, 12 migrations de base de données

---

## TABLE DES MATIÈRES (pour le rapport final)

1. Remerciements
2. Introduction générale
3. Présentation de l'organisme d'accueil
4. Contexte et problématique
5. Cahier des charges
6. Analyse et conception (diagrammes UML)
7. Architecture technique
8. Réalisation et implémentation
9. Tests et validation
10. Déploiement et mise en production
11. Bilan et perspectives
12. Conclusion
13. Annexes

---

## 1. INTRODUCTION GÉNÉRALE

### 1.1 Contexte du stage

Ce stage technique d'une durée d'un mois a eu pour objectif la conception et le développement complet d'une plateforme web de prise de rendez-vous médicaux baptisée **TabibConnect** (de l'arabe « طبيب » signifiant « médecin » et « Connect » pour la mise en relation numérique). Le projet s'inscrit dans le cadre de la digitalisation du secteur de la santé au Maroc, répondant à un besoin croissant de simplification de l'accès aux soins médicaux.

### 1.2 Problématique

Au Maroc, la prise de rendez-vous médicaux reste largement manuelle : appels téléphoniques, déplacements physiques, longues files d'attente. Les patients n'ont pas de visibilité sur les disponibilités des médecins, et les praticiens manquent d'outils numériques pour gérer efficacement leur activité. TabibConnect vise à résoudre ces problèmes en offrant une plateforme centralisée et moderne.

### 1.3 Objectifs du stage

- Concevoir et développer une plateforme web complète de gestion de rendez-vous médicaux
- Implémenter trois espaces distincts : Patient, Médecin et Administrateur
- Mettre en place un système de notifications en temps réel
- Développer un moteur de recherche intelligent avec correspondance symptômes-spécialités
- Implémenter un système d'ordonnances numériques avec génération de PDF et QR codes
- Assurer la sécurité des données médicales conformément aux bonnes pratiques
- Containeriser l'application pour le déploiement en production

---

## 2. CAHIER DES CHARGES DÉTAILLÉ

### 2.1 Acteurs du système

Le système comporte **trois acteurs principaux** (rôles) :

| Acteur | Rôle dans le système |
|--------|---------------------|
| **Patient** | Utilisateur final qui recherche des médecins, prend des rendez-vous, consulte ses notifications et dépose des avis |
| **Médecin (Doctor)** | Professionnel de santé qui gère son agenda, ses disponibilités, ses patients, ses notes cliniques et ses ordonnances |
| **Administrateur (Admin)** | Superviseur de la plateforme qui valide les comptes, modère les avis, gère les demandes de modification et consulte les métriques |

### 2.2 Fonctionnalités par acteur

#### 2.2.1 Fonctionnalités Patient

1. **Inscription et authentification** : Création de compte avec vérification email, connexion sécurisée (JWT), réinitialisation de mot de passe
2. **Recherche de médecins** : Par nom, spécialité, symptôme (mapping intelligent symptôme→spécialité en français et arabe), ville ; avec fuzzy matching pour tolérer les fautes de frappe
3. **Suggestions en temps réel** : Autocomplétion sur la page d'accueil regroupant spécialités, médecins et symptômes
4. **Consultation de profils médecins** : Avis, tarifs, langues parlées, diplômes, cabinets avec localisation sur carte OpenStreetMap, disponibilités
5. **Prise de rendez-vous** : En présentiel ou en téléconsultation, avec sélection du créneau disponible
6. **Gestion des rendez-vous** : Consultation de l'historique, annulation avec règles de fenêtre de temps (annulation gratuite paramétrable en heures)
7. **Paiement** : Support Cash, CMI (carte bancaire via Stripe), Virement
8. **Avis post-consultation** : Dépôt d'avis uniquement après rendez-vous complété (statut COMPLETE)
9. **Notifications** : Réception en temps réel via Socket.IO (rappels RDV, confirmations, annulations, paiements)
10. **Profil patient** : Gestion des informations personnelles, CIN, antécédents médicaux, groupe sanguin, documents
11. **Vérification CIN** : Upload du document CIN avec vérification automatique par OCR (Tesseract.js)

#### 2.2.2 Fonctionnalités Médecin

1. **Tableau de bord** : Vue synthétique avec rendez-vous du jour, demandes à traiter, patients suivis, statistiques
2. **Agenda** : Vue hebdomadaire avec navigation temporelle, filtre par statut
3. **Gestion des rendez-vous** : Confirmation, annulation (avec motif obligatoire), complétion, reprogrammation
4. **Gestion des disponibilités** : Créneaux hebdomadaires par cabinet, avec jour de la semaine, heure début/fin, durée de consultation, activation/désactivation
5. **Dossier patient** : Consultation de l'historique du patient, création de notes cliniques (avec option de visibilité aux pairs)
6. **Ordonnances numériques** : Création avec liste de médicaments et posologie, génération de PDF professionnel avec QR code de vérification, envoi par email, renvoi, upload de document externe
7. **Gestion du profil** : Modification soumise à validation admin (DoctorChangeRequest), photo de profil, bio, diplômes, langues, tarifs, assurances acceptées
8. **Gestion des cabinets** : Localisation GPS (latitude/longitude), adresse, ville, quartier, photos, téléphone
9. **Documents** : Téléversement et gestion de documents professionnels

#### 2.2.3 Fonctionnalités Administrateur

1. **Vue d'ensemble** : Dashboard avec statistiques globales, métriques de la plateforme, graphiques
2. **Vérification des comptes médecins** : Validation, rejet avec motif
3. **Modération des avis** : Vérification et validation des avis patients
4. **Gestion des demandes de modification** : Approbation/rejet des demandes de changement de profil médecin (PROFILE_UPDATE, PROFILE_PHOTO_UPDATE, LOCATION_CREATE, LOCATION_UPDATE) et patient (PatientChangeRequest)
5. **Création de comptes** : Possibilité de créer des comptes depuis l'espace admin
6. **Gestion des utilisateurs** : Consultation, recherche, filtrage de tous les utilisateurs
7. **Journal d'audit** : Traçabilité complète via AuditLog (actions, ressources, IP, user agent)
8. **Notifications système** : Envoi et gestion des notifications
9. **Gestion des rendez-vous** : Vue globale de tous les rendez-vous de la plateforme
10. **Métriques et signaux** : Consultation des indicateurs de performance de la plateforme

### 2.3 Règles métier essentielles

- **Cycle de vie d'un rendez-vous** : EN_ATTENTE → CONFIRME → COMPLETE (ou ANNULE à tout moment, ou NO_SHOW automatique)
- **Annulation gratuite** : Configurable via `FREE_CANCELLATION_HOURS` (défaut : 2 heures avant le RDV)
- **No-show automatique** : Basculement automatique via cron job après `NO_SHOW_GRACE_MINUTES` (défaut : 30 minutes) de dépassement de l'heure du RDV confirmé
- **Avertissements patient** : Le champ `bookingWarnings` est incrémenté en cas de no-show, permettant un suivi des patients non fiables
- **Rappels automatiques** : Notification envoyée `REMINDER_HOURS_BEFORE` heures avant le rendez-vous (défaut : 24h)
- **Avis uniquement post-consultation** : Un patient ne peut déposer un avis que si le rendez-vous est au statut COMPLETE
- **Modifications sous validation** : Les changements de profil médecin et patient passent par un workflow de demande → revue admin → approbation/rejet
- **Vérification CIN** : Score OCR calculé automatiquement, avec seuil minimum configurable (`CIN_VERIFICATION_MIN_SCORE` = 3)
- **Concurrence optimiste** : Champ `version` sur RendezVous et `bookingVersion` sur Disponibilite pour éviter les conflits de réservation simultanée

---

## 3. ANALYSE ET CONCEPTION

### 3.1 Diagramme de cas d'utilisation (Use Case)

> **INSTRUCTION POUR L'IA** : Génère un diagramme de cas d'utilisation UML avec les trois acteurs (Patient, Médecin, Admin) et les cas d'utilisation suivants :

**Acteur Patient :**
- S'inscrire / Se connecter
- Rechercher un médecin
- Consulter le profil d'un médecin
- Prendre un rendez-vous
- Annuler un rendez-vous
- Consulter l'historique des RDV
- Déposer un avis
- Gérer son profil
- Recevoir des notifications
- Uploader un document CIN

**Acteur Médecin :**
- Se connecter
- Consulter le tableau de bord
- Gérer l'agenda
- Confirmer / Annuler / Compléter un RDV
- Gérer les disponibilités
- Consulter le dossier patient
- Créer des notes cliniques
- Créer / Gérer une ordonnance numérique
- Demander une modification de profil
- Gérer les cabinets

**Acteur Admin :**
- Se connecter
- Consulter le dashboard global
- Vérifier les comptes médecins
- Modérer les avis
- Gérer les demandes de modification
- Créer des comptes
- Consulter le journal d'audit
- Consulter les métriques

**Relations include/extend :**
- « Prendre un rendez-vous » include « Consulter les disponibilités »
- « Prendre un rendez-vous » include « Choisir la méthode de paiement »
- « Déposer un avis » extend « Consulter l'historique des RDV » (condition : RDV complété)
- « Créer une ordonnance » include « Générer un PDF avec QR code »
- « Créer une ordonnance » extend « Envoyer par email »

### 3.2 Diagramme de classes (Class Diagram)

> **INSTRUCTION POUR L'IA** : Génère un diagramme de classes UML complet basé sur le schéma Prisma. Voici toutes les entités et leurs attributs/relations :

**Entité User :**
- id: String (PK, CUID)
- email: String (UNIQUE)
- password: String
- phone: String (UNIQUE)
- role: UserRole (ENUM: PATIENT, DOCTOR, ADMIN)
- isVerified: Boolean
- createdAt: DateTime
- updatedAt: DateTime
- deletedAt: DateTime? (soft delete)
- emailVerificationExpiresAt: DateTime?
- emailVerificationTokenHash: String?
- lastLoginAt: DateTime?
- passwordResetExpiresAt: DateTime?
- passwordResetTokenHash: String?
- refreshTokenExpiresAt: DateTime?
- refreshTokenHash: String?
- **Relations** : 1→0..1 Doctor, 1→0..1 Patient, 1→* Notification, 1→* DoctorChangeRequest (reviewer), 1→* PatientChangeRequest (reviewer)

**Entité Patient :**
- id: String (PK)
- userId: String (FK→User, UNIQUE)
- cin: String (UNIQUE)
- dateOfNaissance: DateTime
- sexe: Sexe (ENUM: HOMME, FEMME)
- adresse: String
- ville: String
- groupeSanguin: GroupeSanguin? (ENUM: O_POS, O_NEG, A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG)
- antecedents: String?
- bookingWarnings: Int (défaut: 0)
- lastNoShowAt: DateTime?
- cinDocumentFileName, cinDocumentFilePath, cinDocumentMimeType, cinDocumentSize, cinDocumentUploadedAt, cinDocumentVerificationStatus (ENUM: PENDING, VERIFIED, REJECTED, NEEDS_REVIEW), cinDocumentVerificationScore, cinDocumentVerificationNote, cinDocumentVerifiedAt, cinDocumentRejectedAt
- **Relations** : 1→1 User, 1→* Avis, 1→* DoctorPatientNote, 1→* PatientChangeRequest, 1→* PatientDocument, 1→* RendezVous, 1→* Ordonnance

**Entité Doctor :**
- id: String (PK)
- userId: String (FK→User, UNIQUE)
- inpe: String (UNIQUE) — Identifiant National du Praticien d'Exercice
- specialite: String
- diplomes: String[]
- languesParlees: String[]
- tarifConsultation: Decimal(10,2)
- accepteAssurance: Boolean
- assurancesAcceptees: String[]
- bio: String?
- experience: Int (en années)
- nomComplet: String?
- Mêmes champs CIN que Patient
- **Relations** : 1→1 User, 1→* Avis, 1→* Disponibilite, 1→* DoctorCabinet, 1→* DoctorChangeRequest, 1→* DoctorDocument, 1→* DoctorPatientNote, 1→* Paiement, 1→* RendezVous, 1→* Ordonnance

**Entité Cabinet :**
- id: String (PK)
- nom: String
- adresse: String
- ville: String
- quartier: String
- latitude: Decimal(9,6)
- longitude: Decimal(9,6)
- phone: String
- photos: String[]
- **Relations** : 1→* Disponibilite, 1→* DoctorCabinet, 1→* RendezVous

**Entité DoctorCabinet (table d'association) :**
- id: String (PK)
- doctorId: String (FK→Doctor)
- cabinetId: String (FK→Cabinet)
- Contrainte UNIQUE sur (doctorId, cabinetId) — un médecin ne peut être lié qu'une fois au même cabinet

**Entité Disponibilite :**
- id: String (PK)
- doctorId: String (FK→Doctor)
- cabinetId: String (FK→Cabinet)
- jourSemaine: JourSemaine (ENUM: LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI, SAMEDI, DIMANCHE)
- heureDebut: String
- heureFin: String
- dureeConsultation: Int (en minutes)
- isActive: Boolean
- bookingVersion: Int (contrôle de concurrence optimiste)
- Contrainte UNIQUE sur (doctorId, cabinetId, jourSemaine, heureDebut, heureFin)
- **Relations** : 1→1 Doctor, 1→1 Cabinet, 1→* RendezVous

**Entité RendezVous :**
- id: String (PK)
- patientId: String (FK→Patient)
- doctorId: String (FK→Doctor)
- cabinetId: String? (FK→Cabinet)
- disponibiliteId: String? (FK→Disponibilite)
- statut: StatutRendezVous (ENUM: EN_ATTENTE, CONFIRME, ANNULE, COMPLETE, NO_SHOW)
- motif: String
- typeConsultation: TypeConsultation (ENUM: PRESENTIEL, TELECONSULTATION)
- notes: String?
- rappelEnvoye: Boolean
- dateHeure: DateTime
- cancellationReason: String?
- cancelledAt, cancelledByRole, completedAt, confirmedAt, noShowAt
- version: Int (concurrence optimiste)
- acceptedCashPolicy, acceptedGeneralTerms: Boolean
- methodePaiement: MethodePaiement (ENUM: CASH, CMI, VIREMENT)
- **Relations** : 1→0..1 Avis, 1→* DoctorPatientNote, 1→0..1 Paiement, 1→0..1 Ordonnance, *→1 Cabinet?, *→1 Disponibilite?, *→1 Doctor, *→1 Patient

**Entité Avis :**
- id, patientId (FK), doctorId (FK), rendezVousId (FK, UNIQUE)
- note: SmallInt (1–5)
- commentaire: String?
- isVerified: Boolean (validé par admin)

**Entité Notification :**
- id, type: NotificationType (ENUM: RAPPEL_RDV, RDV_CONFIRME, RDV_ANNULE, PAIEMENT_RECU, SYSTEME)
- message: String
- metadata: Json?
- isRead: Boolean
- userId (FK→User)

**Entité Paiement :**
- id, rendezVousId (FK, UNIQUE), doctorId (FK)
- montant: Decimal(10,2)
- methode: MethodePaiement
- statut: StatutPaiement (ENUM: EN_ATTENTE, PAYE, ECHOUE, REMBOURSE)
- reference: String (UNIQUE)

**Entité Ordonnance :**
- id, rendezVousId (FK, UNIQUE), doctorId (FK), patientId (FK)
- medicaments: Json (tableau d'objets {medicament, posologie})
- instructions: String?
- renouvelable: Boolean
- qrCode: String (UNIQUE, UUID)
- pdfPath: String?
- uploadedFile: String?

**Entité DoctorPatientNote :**
- id, doctorId (FK), patientId (FK), rendezVousId (FK)
- note: String
- isVisibleToPeers: Boolean

**Entité DoctorChangeRequest :**
- id, doctorId (FK)
- type: DoctorChangeRequestType (ENUM: PROFILE_UPDATE, PROFILE_PHOTO_UPDATE, LOCATION_CREATE, LOCATION_UPDATE)
- status: DoctorChangeRequestStatus (ENUM: PENDING, APPROVED, REJECTED)
- reason, payload (Json), reviewNote, reviewedByUserId (FK→User), reviewedAt

**Entité PatientChangeRequest :**
- id, patientId (FK)
- status: PatientChangeRequestStatus (ENUM: PENDING, APPROVED, REJECTED)
- reason, payload (Json), reviewNote, reviewedByUserId (FK→User), reviewedAt

**Entité DoctorDocument / PatientDocument :**
- id, doctorId/patientId (FK), fileName, filePath, mimeType, size, isProfilePhoto

**Entité AuditLog :**
- id, userId?, action (ex: "USER_LOGIN", "RDV_CANCELLED", "MEDICAL_DATA_VIEWED")
- resource (ex: "Patient:ck..."), payload (Json?), ip, userAgent, createdAt

### 3.3 Diagramme de séquence — Prise de rendez-vous

> **INSTRUCTION POUR L'IA** : Génère un diagramme de séquence UML pour le scénario de prise de rendez-vous :

1. Le **Patient** accède à la page de recherche
2. Le **Frontend** envoie une requête GET `/api/v1/search?q=...` au **Backend**
3. Le **Backend** interroge **PostgreSQL** via **Prisma** (recherche full-text + fuzzy matching + mappage symptôme→spécialité)
4. Le **Backend** retourne la liste paginée des médecins
5. Le **Patient** sélectionne un médecin et consulte son profil (GET `/api/v1/doctors/:id`)
6. Le **Frontend** affiche les disponibilités (GET `/api/v1/doctors/:id/availabilities`)
7. Le **Patient** choisit un créneau et remplit le formulaire de rendez-vous
8. Le **Frontend** récupère un token CSRF (GET `/api/v1/auth/csrf-token`)
9. Le **Frontend** envoie POST `/api/v1/appointments` avec le token CSRF et le JWT
10. Le **Backend** vérifie l'authentification (middleware authenticate), le CSRF (middleware doubleCsrfProtection), et les droits (middleware authorize)
11. Le **Backend** vérifie la disponibilité du créneau (concurrence optimiste via bookingVersion)
12. Le **Backend** crée le RendezVous en statut EN_ATTENTE dans **PostgreSQL**
13. Le **Backend** crée un Paiement associé si nécessaire
14. Le **Backend** crée une Notification pour le médecin
15. Le **Backend** émet un événement Socket.IO `notification:new` vers le canal `user:<doctorUserId>`
16. Le **Frontend** du médecin reçoit la notification en temps réel et invalide les queries React Query

### 3.4 Diagramme de séquence — Cycle de vie complet d'un rendez-vous

> **INSTRUCTION POUR L'IA** : Génère un diagramme de séquence pour le cycle de vie complet :

1. **Patient** → crée RDV (EN_ATTENTE)
2. **Médecin** → confirme (CONFIRME), notification envoyée au patient
3. **[Cron Job rappel]** → 24h avant, notification de rappel envoyée au patient
4. **Médecin** → marque comme COMPLETE après la consultation
5. **Patient** → peut déposer un avis
6. **Médecin** → peut créer une ordonnance numérique
7. **[Scénario alternatif]** : si non honoré, cron job → NO_SHOW (après 30 min de grâce)
8. **[Scénario alternatif]** : annulation par patient ou médecin → ANNULE (avec motif)

### 3.5 Diagramme de séquence — Authentification et gestion de session

> **INSTRUCTION POUR L'IA** : Génère un diagramme de séquence pour l'authentification :

1. **Utilisateur** → POST `/api/v1/auth/register` (inscription)
2. **Backend** → hash du mot de passe (bcrypt, 12 rounds), création user, envoi email de vérification
3. **Utilisateur** → GET `/api/v1/auth/verify-email?token=...`
4. **Utilisateur** → POST `/api/v1/auth/login` (avec rate limiting : 5 requêtes / 15 min)
5. **Backend** → génération JWT access token (15 min) + refresh token (7 jours, stocké en cookie HttpOnly)
6. **Frontend** → stocke l'access token en mémoire (session storage)
7. **[Expiration access token]** → intercepteur Axios détecte 401 → POST `/api/v1/auth/refresh-token` → nouveau access token
8. **[Expiration refresh token]** → déconnexion automatique, nettoyage session + CSRF
9. **[Mutex refresh]** → `refreshPromise` partagée pour éviter les refreshs multiples simultanés

### 3.6 Diagramme d'activité — Processus de vérification CIN par OCR

> **INSTRUCTION POUR L'IA** : Génère un diagramme d'activité pour la vérification CIN :

1. L'utilisateur upload un document CIN (PDF, JPG ou PNG)
2. Le système détecte le type MIME
3. **Si PDF** → extraction du texte via `pdf-parse`
4. **Si image** → OCR via `Tesseract.js` avec langues français + arabe (`fra+ara`)
5. Normalisation du texte extrait (lowercase, suppression accents, caractères spéciaux)
6. Calcul du score de vérification :
   - +3 points si le numéro CIN attendu est trouvé dans le texte
   - +1 point par mot-clé trouvé parmi : "carte", "identite", "nationale", "royaume", "maroc", "cin"
7. **Si score ≥ 3** → statut VERIFIED
8. **Si score < 3 et mode strict** → statut REJECTED
9. **Si score < 3 et mode non-strict** → statut NEEDS_REVIEW (revue admin manuelle)

### 3.7 Diagramme d'activité — Création d'ordonnance numérique

> **INSTRUCTION POUR L'IA** : Génère un diagramme d'activité :

1. Le médecin sélectionne un rendez-vous complété
2. Le médecin saisit la liste des médicaments (nom + posologie) et les instructions
3. Le système vérifie qu'aucune ordonnance n'existe déjà (sinon erreur 409)
4. Le système génère un QR code unique (UUID)
5. Le système génère un PDF professionnel via PDFKit avec :
   - En-tête TabibConnect avec couleur médicale (#1A6B8A)
   - Infos médecin (nom, INPE, spécialité)
   - Infos patient
   - Liste des médicaments avec posologie
   - Instructions générales
   - Statut de renouvellement
   - QR code de vérification
6. Le système enregistre l'ordonnance en base
7. Le système envoie un email au patient avec le PDF en pièce jointe
8. Le système crée une notification pour le patient
9. **Vérification publique** : n'importe qui peut vérifier l'authenticité via `/api/v1/ordonnance/verify/:qrCode`

### 3.8 Diagramme d'états-transitions — Rendez-vous

> **INSTRUCTION POUR L'IA** : Génère un diagramme d'états (state machine) :

```
[*] --> EN_ATTENTE : Création par le patient
EN_ATTENTE --> CONFIRME : Confirmation par le médecin
EN_ATTENTE --> ANNULE : Annulation par patient ou médecin
CONFIRME --> COMPLETE : Complétion par le médecin
CONFIRME --> ANNULE : Annulation par patient ou médecin
CONFIRME --> NO_SHOW : Cron job (après délai de grâce)
COMPLETE --> [*]
ANNULE --> [*]
NO_SHOW --> [*]
```

### 3.9 Diagramme d'états-transitions — Paiement

```
[*] --> EN_ATTENTE : Création à la réservation
EN_ATTENTE --> PAYE : Confirmation de paiement (Stripe webhook ou marquage manuel)
EN_ATTENTE --> ECHOUE : Échec du paiement
PAYE --> REMBOURSE : Remboursement après annulation
ECHOUE --> [*]
PAYE --> [*]
REMBOURSE --> [*]
```

### 3.10 Diagramme d'états-transitions — Demande de modification (ChangeRequest)

```
[*] --> PENDING : Soumission de la demande
PENDING --> APPROVED : Validation par l'admin
PENDING --> REJECTED : Rejet par l'admin
APPROVED --> [*]
REJECTED --> [*]
```

### 3.11 Diagramme d'états-transitions — Vérification de document CIN

```
[*] --> PENDING : Upload du document
PENDING --> VERIFIED : Score OCR ≥ seuil minimum
PENDING --> REJECTED : Score OCR < seuil (mode strict)
PENDING --> NEEDS_REVIEW : Score OCR < seuil (mode non-strict)
NEEDS_REVIEW --> VERIFIED : Validation manuelle par admin
NEEDS_REVIEW --> REJECTED : Rejet manuel par admin
```

---

## 4. ARCHITECTURE TECHNIQUE

### 4.1 Vue d'ensemble de l'architecture

> **INSTRUCTION POUR L'IA** : Génère un diagramme d'architecture technique (style C4 ou architecture en couches) :

L'application suit une architecture **client-serveur en trois tiers** :

```
┌─────────────────────────────────────────────┐
│              COUCHE PRÉSENTATION            │
│  React 19 + Vite 8 + TailwindCSS 3         │
│  React Router v6 + React Query v5           │
│  React Hook Form + Zod + Framer Motion      │
│  i18next (FR/EN) + Leaflet (cartes)         │
│  Socket.IO Client + Recharts                │
│  Lucide React (icônes)                      │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST + WebSocket
┌─────────────────▼───────────────────────────┐
│              COUCHE MÉTIER (API)             │
│  Node.js 22 + Express 5                     │
│  14 fichiers de routes                      │
│  15 contrôleurs                             │
│  21 services métier                         │
│  10 middlewares                             │
│  12 utilitaires/validateurs                 │
│  Prisma 6 ORM                              │
│  Socket.IO Server                           │
│  node-cron (2 jobs planifiés)               │
└─────────────────┬───────────────────────────┘
                  │ SQL via Prisma
┌─────────────────▼───────────────────────────┐
│              COUCHE DONNÉES                 │
│  PostgreSQL 16 (base relationnelle)         │
│  Redis 7 (cache optionnel)                  │
│  Filesystem (uploads, ordonnances PDF)      │
└─────────────────────────────────────────────┘
```

### 4.2 Stack technologique détaillée

#### 4.2.1 Frontend

| Technologie | Version | Rôle |
|------------|---------|------|
| React | 19.2.5 | Bibliothèque UI, composants réactifs |
| Vite | 8.0.9 | Bundler et serveur de développement ultra-rapide |
| Tailwind CSS | 3.4.17 | Framework CSS utilitaire, design responsive |
| React Router | 6.30.3 | Routage SPA côté client |
| React Query (TanStack) | 5.99.2 | Gestion du cache serveur, requêtes asynchrones, invalidation |
| React Hook Form | 7.73.1 | Gestion performante des formulaires |
| Zod | 4.3.6 | Validation de schéma côté client |
| Framer Motion | 12.38.0 | Animations et transitions fluides |
| i18next / react-i18next | 26.0.6 / 17.0.4 | Internationalisation (français par défaut, anglais) |
| Leaflet / React-Leaflet | 1.9.4 / 5.0.0 | Cartes interactives OpenStreetMap |
| Leaflet.MarkerCluster | 1.5.3 | Clustering de marqueurs sur les cartes |
| Recharts | 3.2.1 | Graphiques et visualisations de données (dashboards) |
| Lucide React | 1.8.0 | Bibliothèque d'icônes SVG |
| Axios | 1.15.1 | Client HTTP avec intercepteurs (JWT refresh, CSRF) |
| Socket.IO Client | 4.8.3 | Connexion WebSocket pour notifications temps réel |
| date-fns | 4.1.0 | Manipulation de dates |
| react-hot-toast | 2.6.0 | Notifications toast UI |

#### 4.2.2 Backend

| Technologie | Version | Rôle |
|------------|---------|------|
| Node.js | 22 | Runtime JavaScript serveur |
| Express | 5.2.1 | Framework HTTP (version 5, dernière) |
| Prisma | 6.16.2 | ORM et outil de migration PostgreSQL |
| Socket.IO | 4.8.3 | Serveur WebSocket pour les notifications |
| JSON Web Token (jsonwebtoken) | 9.0.3 | Authentification JWT (access + refresh) |
| bcryptjs | 3.0.3 | Hachage des mots de passe |
| csrf-csrf | 4.0.3 | Double protection CSRF (cookie + header) |
| Helmet | 8.1.0 | Sécurisation des headers HTTP + CSP |
| express-rate-limit | 8.3.2 | Rate limiting (auth : 5 req/15 min) |
| express-validator | 7.3.2 | Validation des entrées côté serveur |
| Multer | 2.1.1 | Upload de fichiers (multipart/form-data) |
| PDFKit | 0.18.0 | Génération de PDF (ordonnances médicales) |
| QRCode | 1.5.4 | Génération de QR codes pour les ordonnances |
| Tesseract.js | 5.1.0 | OCR (reconnaissance de texte) pour vérification CIN |
| pdf-parse | 1.1.1 | Extraction de texte à partir de PDF |
| Nodemailer | 8.0.5 | Envoi d'emails transactionnels (SMTP) |
| Stripe | 22.1.0 | Passerelle de paiement en ligne |
| Twilio | 6.0.0 | Envoi de SMS transactionnels |
| node-cron | 4.2.1 | Planification de tâches (rappels, no-show) |
| Redis | 4.7.0 | Cache optionnel pour certaines données de recherche |
| Morgan | 1.10.1 | Logger HTTP pour le développement |
| cors | 2.8.6 | Gestion CORS |
| cookie-parser | 1.4.7 | Parsing des cookies (refresh token, CSRF) |
| dotenv | 17.4.2 | Gestion des variables d'environnement |

#### 4.2.3 Tests

| Technologie | Version | Rôle |
|------------|---------|------|
| Jest | 29.7.0 | Tests unitaires et d'intégration backend |
| Supertest | 7.1.4 | Tests HTTP des routes Express |
| Vitest | 3.2.4 | Tests unitaires frontend (compatible Vite) |
| Testing Library (React) | 16.3.0 | Tests de composants React |
| Playwright | 1.56.1 | Tests end-to-end navigateur |

#### 4.2.4 Infrastructure et déploiement

| Technologie | Version | Rôle |
|------------|---------|------|
| Docker | - | Containerisation des services |
| Docker Compose | 3.9 | Orchestration multi-conteneurs |
| PostgreSQL | 16-alpine | Base de données relationnelle |
| Redis | 7-alpine | Cache en mémoire |
| Nginx | 1.27-alpine | Reverse proxy et serveur de fichiers statiques |
| Certbot/Let's Encrypt | latest | Certificats SSL/TLS automatiques |

### 4.3 Architecture du backend (détaillée)

> **INSTRUCTION POUR L'IA** : Génère un diagramme de packages/composants UML pour l'architecture backend :

```
backend/
├── server.js               # Point d'entrée : serveur HTTP, Socket.IO, cron jobs
├── src/
│   ├── app.js              # Configuration Express : middlewares, routes, sécurité
│   ├── config/
│   │   ├── env.js          # Chargement et validation des variables d'environnement (44 paramètres)
│   │   ├── prisma.js       # Instance singleton Prisma Client
│   │   ├── redis.js        # Client Redis avec gestion de connexion/déconnexion
│   │   └── socket.js       # Référence globale du serveur Socket.IO
│   ├── controllers/        # 15 contrôleurs (orchestration requête/réponse)
│   │   ├── authController.js           # register, login, logout, refresh, verify, reset
│   │   ├── appointmentController.js    # CRUD rendez-vous
│   │   ├── dashboardController.js      # Dashboards patient, médecin, admin
│   │   ├── searchController.js         # Recherche intelligente + suggestions
│   │   ├── doctorController.js         # Profils médecins publics
│   │   ├── ordonnanceController.js     # Ordonnances numériques
│   │   ├── patientController.js        # Profil patient
│   │   ├── adminFileController.js      # Fichiers admin
│   │   ├── doctorFileController.js     # Fichiers médecin
│   │   ├── patientFileController.js    # Fichiers patient
│   │   └── ...
│   ├── services/           # 21 services (logique métier pure)
│   │   ├── authService.js              # 16 508 octets — logique auth complète
│   │   ├── appointmentService.js       # 36 562 octets — gestion RDV + cron handlers
│   │   ├── adminService.js             # 57 161 octets — toute la logique admin
│   │   ├── doctorService.js            # 43 042 octets — gestion profils/cabinets médecin
│   │   ├── dashboardService.js         # 17 340 octets — agrégation dashboards
│   │   ├── ordonnanceService.js        # 17 569 octets — CRUD ordonnances + PDF + email
│   │   ├── cinVerificationService.js   # OCR et vérification CIN
│   │   ├── emailService.js             # Templates email + envoi SMTP
│   │   ├── smsService.js               # Envoi SMS via Twilio
│   │   ├── paymentService.js           # Logique de paiement
│   │   ├── paymentGatewayService.js    # Intégration Stripe
│   │   ├── notificationService.js      # Création de notifications + push Socket.IO
│   │   ├── availabilityService.js      # Calcul des créneaux disponibles
│   │   ├── homeService.js              # Données de la page d'accueil
│   │   └── ...
│   ├── routes/             # 14 fichiers de routes Express
│   ├── middlewares/        # 10 middlewares
│   │   ├── authenticate.js         # Vérification JWT
│   │   ├── authorize.js            # Contrôle de rôle
│   │   ├── csrfProtection.js       # Double CSRF (cookie + header)
│   │   ├── authRateLimiter.js      # Rate limiting auth (5/15min)
│   │   ├── generalRateLimiter.js   # Rate limiting général
│   │   ├── sanitizeInputs.js       # Nettoyage des entrées utilisateur
│   │   ├── errorHandler.js         # Gestion centralisée des erreurs
│   │   ├── validateRequest.js      # Validation express-validator
│   │   ├── uploadDoctorDocuments.js # Upload Multer pour documents médecin
│   │   └── uploadOrdonnance.js     # Upload Multer pour ordonnances
│   ├── utils/              # 12 utilitaires
│   │   ├── authValidators.js       # Schémas de validation auth
│   │   ├── appointmentValidators.js # Schémas de validation RDV
│   │   ├── doctorValidators.js     # Schémas de validation médecin
│   │   ├── emailTemplates.js       # Templates HTML emails (7 909 octets)
│   │   ├── notificationMapper.js   # Formatage des notifications
│   │   ├── specialtySuggestion.js  # Mapping symptôme → spécialité
│   │   ├── tokenUtils.js          # Utilitaires JWT
│   │   ├── httpError.js           # Classe d'erreur HTTP personnalisée
│   │   ├── asyncHandler.js        # Wrapper try/catch pour contrôleurs
│   │   └── auditLogger.js        # Logger d'audit
│   ├── jobs/
│   │   └── appointmentJobs.js     # 2 cron jobs : rappels 24h + détection no-show
│   ├── data/
│   │   ├── symptomSpecialtyMap.json    # Mapping symptôme→spécialité (12 symptômes)
│   │   └── symptomes-mapping.json     # Mapping arabe/français
│   └── models/             # (vide, Prisma est utilisé directement)
├── prisma/
│   ├── schema.prisma       # 484 lignes, 16 modèles, 14 enums
│   ├── seed.js             # 64 680 octets — données de démonstration réalistes
│   └── migrations/         # 12 migrations (historique du schéma)
└── tests/                  # Tests unitaires et d'intégration
    ├── services/           # 4 fichiers de tests services
    ├── controllers/        # Tests contrôleurs
    ├── routes/             # Tests routes
    └── setup.js            # Configuration des tests
```

### 4.4 Architecture du frontend (détaillée)

> **INSTRUCTION POUR L'IA** : Génère un diagramme de packages/composants UML pour l'architecture frontend :

```
frontend/
├── index.html              # Point d'entrée HTML
├── vite.config.js          # Configuration Vite (proxy API, aliases)
├── tailwind.config.js      # Thème Tailwind personnalisé (couleurs médicales)
├── src/
│   ├── main.jsx            # Bootstrap React + QueryClientProvider
│   ├── App.jsx             # Composant racine + RouterProvider
│   ├── i18n.js             # Configuration internationalisation FR/EN
│   ├── index.css           # Styles globaux + variables CSS
│   ├── App.css             # Styles spécifiques app
│   ├── router/
│   │   └── index.jsx       # Configuration complète des routes (233 lignes)
│   ├── layout/             # 5 layouts
│   │   ├── AppShell.jsx                # Shell principal (header, footer, navigation)
│   │   ├── DashboardShell.jsx          # Shell dashboard (sidebar, topbar, notifications)
│   │   ├── AdminDashboardLayout.jsx    # Layout spécifique admin
│   │   ├── DoctorDashboardLayout.jsx   # Layout spécifique médecin
│   │   └── PatientDashboardLayout.jsx  # Layout spécifique patient
│   ├── pages/              # 33 pages + 1 sous-dossier
│   │   ├── HomePage.jsx               # 51 736 octets — page d'accueil riche
│   │   ├── SearchPage.jsx             # 36 759 octets — recherche + carte + filtres
│   │   ├── DashboardDoctorPage.jsx    # 52 299 octets — dashboard médecin complet
│   │   ├── DashboardAdminPage.jsx     # 49 196 octets — dashboard admin
│   │   ├── DoctorProfilePage.jsx      # 41 488 octets — profil public médecin
│   │   ├── RegisterPage.jsx           # 31 048 octets — inscription multi-étapes
│   │   ├── UserProfilePage.jsx        # 25 108 octets — profil utilisateur admin
│   │   ├── AdminRequestsPage.jsx      # 21 931 octets — gestion demandes admin
│   │   ├── DashboardPatientPage.jsx   # 18 071 octets — dashboard patient
│   │   ├── LoginPage.jsx              # Connexion sécurisée
│   │   └── ... (23 autres pages)
│   ├── components/
│   │   ├── ui/             # 8 composants UI réutilisables
│   │   │   ├── Avatar.jsx, Badge.jsx, Button.jsx, Card.jsx
│   │   │   ├── Input.jsx, Modal.jsx, MotionCard.jsx, Skeleton.jsx
│   │   ├── common/         # 9 composants communs
│   │   │   ├── PrivateRoute.jsx           # Route protégée par rôle
│   │   │   ├── DoctorSearchMap.jsx        # Carte de recherche médecins
│   │   │   ├── HomeCabinetMap.jsx         # Carte page d'accueil
│   │   │   ├── MedicalHeroAnimation.jsx   # Animation héro (11 569 octets)
│   │   │   ├── SafeMapContainer.jsx       # Container carte sécurisé
│   │   │   ├── TeleconsultationVideoPanel.jsx # Panel vidéo
│   │   │   ├── AccessPromptModal.jsx      # Modal d'accès
│   │   │   └── GeneralErrorBoundary.jsx   # Error boundary global
│   │   ├── appointment/    # 2 composants
│   │   │   ├── AppointmentCabinetMap.jsx   # Carte du cabinet
│   │   │   └── OrdonnanceExistingView.jsx  # Vue ordonnance
│   │   ├── notifications/  # 3 composants
│   │   │   ├── NotificationItem.jsx, NotificationDetailModal.jsx
│   │   │   └── NotificationCategoryFilter.jsx
│   │   ├── admin/          # 1 composant
│   │   │   └── AdminDocumentViewer.jsx     # Visionneuse de documents
│   │   └── account/        # 1 composant
│   │       └── AccountSettingsPanel.jsx    # Paramètres du compte
│   ├── hooks/              # 2 hooks personnalisés
│   │   ├── useNotificationSocket.js    # WebSocket notifications temps réel
│   │   └── useRealtimeDashboard.js     # Invalidation dashboard temps réel
│   ├── lib/                # 10 modules utilitaires
│   │   ├── api.js              # Client Axios avec intercepteurs JWT/CSRF
│   │   ├── session.js          # Gestion session (store/clear access token, CSRF)
│   │   ├── auth.js             # Helpers d'authentification
│   │   ├── accountActions.js   # Actions de compte (logout)
│   │   ├── notifications.js    # API notifications
│   │   ├── frenchText.js       # Utilitaires texte français (4 647 octets)
│   │   ├── moroccoCities.js    # Liste des villes marocaines (2 596 octets)
│   │   ├── date.js             # Utilitaires de date
│   │   ├── media.js            # Utilitaires média
│   │   └── reference.js        # Références et constantes
│   ├── styles/              # Fichiers de styles additionnels
│   ├── data/                # Données statiques frontend
│   ├── assets/              # Assets statiques (images, etc.)
│   └── test/                # Configuration des tests frontend
└── tests/
    └── e2e/                 # Tests end-to-end Playwright
```

### 4.5 Diagramme de déploiement

> **INSTRUCTION POUR L'IA** : Génère un diagramme de déploiement UML basé sur le docker-compose.yml :

```
┌─────────────────────── Serveur Production ───────────────────────┐
│                                                                   │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────────┐  │
│  │  Certbot  │     │    Nginx     │     │                      │  │
│  │ (SSL/TLS) │────▶│ :80 / :443   │────▶│    Frontend          │  │
│  └──────────┘     │ reverse proxy│     │  (React/Vite :80)     │  │
│                   │              │     └──────────────────────┘  │
│                   │              │                                │
│                   │              │     ┌──────────────────────┐  │
│                   │              │────▶│    Backend            │  │
│                   └──────────────┘     │  (Express :4000)      │  │
│                                        │  + Socket.IO           │  │
│                                        │  + Cron Jobs           │  │
│                                        └─────┬──────┬──────────┘  │
│                                              │      │              │
│                                   ┌──────────▼┐  ┌──▼───────────┐ │
│                                   │ PostgreSQL │  │    Redis      │ │
│                                   │    :5432   │  │    :6379      │ │
│                                   │ (16-alpine)│  │  (7-alpine)   │ │
│                                   └────────────┘  └──────────────┘ │
│                                                                     │
│  Volumes Docker :                                                   │
│  - postgres_data (données persistantes)                             │
│  - redis_data (cache persistant)                                    │
│  - letsencrypt (certificats SSL)                                    │
│  - ./uploads (ordonnances PDF, documents)                           │
└─────────────────────────────────────────────────────────────────────┘

Domaine cible : tabibconnect.ma
Email Let's Encrypt : admin@tabibconnect.ma
```

### 4.6 Diagramme de communication (composants qui interagissent)

> **INSTRUCTION POUR L'IA** : Génère un diagramme montrant les flux de communication :

```
Navigateur Patient ◄──HTTP/WS──► Nginx ◄──proxy──► Express API ◄──Prisma──► PostgreSQL
                                                     │    │
                                                     │    ├──Redis──► Cache
                                                     │    │
                                                     │    ├──Socket.IO──► Navigateur Médecin
                                                     │    │
                                                     │    ├──Nodemailer──► Serveur SMTP
                                                     │    │
                                                     │    ├──Twilio──► SMS Gateway
                                                     │    │
                                                     │    ├──Stripe──► Paiement en ligne
                                                     │    │
                                                     │    ├──Tesseract.js──► OCR local
                                                     │    │
                                                     │    └──PDFKit──► Génération PDF
```

---

## 5. RÉALISATION ET IMPLÉMENTATION

### 5.1 Chronologie du développement (basée sur le Git log)

Le développement s'est déroulé sur un mois, avec 17 commits répartis comme suit :

| Période | Commits | Contenu principal |
|---------|---------|-------------------|
| 29 avril 2026 | 3 commits (first, second) | Initialisation du projet, structure de base, configuration Prisma, premiers modèles (User, Patient, Doctor, Cabinet) |
| 1er mai 2026 | 1 commit (third) | Système d'authentification complet (JWT, refresh, CSRF), routes auth, middlewares de sécurité |
| 5 mai 2026 | 5 commits (fourth, fifth) | Système de rendez-vous, paiements, disponibilités, avertissements patients, dashboard médecin/patient, recherche intelligente |
| 13-14 mai 2026 | 2 commits (sixth) | Système d'administration complet, modération, vérification CIN par OCR, uploads de documents, demandes de modification |
| 20 mai 2026 | 3 commits (seventh, eighth) | Ordonnances numériques, PDF, QR codes, audit log, soft delete, notifications enrichies, métadonnées |
| 25-26 mai 2026 | 2 commits (ninth) | Polissage final, corrections, amélioration UI/UX, documentation, tests complémentaires |

### 5.2 Étapes de développement détaillées

#### Étape 1 : Fondations (29 avril)
- Initialisation du projet Node.js + React/Vite
- Mise en place de la structure de dossiers (MVC + services)
- Configuration de Prisma avec PostgreSQL
- Création du schéma initial : User, Patient, Doctor, Cabinet, DoctorCabinet
- Première migration : `20260417174600_init`

#### Étape 2 : Authentification et sécurité (1er mai)
- Système JWT complet avec access token (15 min) + refresh token (7 jours en cookie HttpOnly)
- Double protection CSRF via la librairie `csrf-csrf` (cookie + header `x-csrf-token`)
- Hachage des mots de passe avec bcrypt (12 rounds)
- Rate limiting sur les routes d'authentification (5 requêtes / 15 minutes)
- Middlewares : `authenticate`, `authorize`, `csrfProtection`, `authRateLimiter`, `sanitizeInputs`
- Vérification email par token avec expiration configurable
- Réinitialisation de mot de passe par email
- Helmet + Content Security Policy
- Frontend : intercepteur Axios avec refresh automatique et mutex pour éviter les refreshs concurrents
- Migration : `20260420140413_auth_system`

#### Étape 3 : Rendez-vous et recherche (5 mai)
- CRUD complet des rendez-vous avec machine d'états (EN_ATTENTE → CONFIRME → COMPLETE)
- Contrôle de concurrence optimiste (champ `version`)
- Système de disponibilités hebdomadaires par médecin et cabinet
- Système de paiement avec intégration Stripe
- Moteur de recherche intelligent :
  - Mapping symptômes → spécialités (12 symptômes en français/arabe)
  - Fuzzy matching pour tolérer les fautes de frappe
  - Suggestions en temps réel (spécialités, médecins, symptômes)
  - Pagination et tri par pertinence
- Dashboards patient et médecin
- Système de notifications avec Socket.IO
- Cron jobs : rappels 24h + détection automatique no-show
- 5 migrations de cette période

#### Étape 4 : Administration et vérification (13-14 mai)
- Dashboard admin complet avec métriques
- Workflow de validation des comptes médecins
- Système de DoctorChangeRequest et PatientChangeRequest (PENDING → APPROVED/REJECTED)
- Vérification de documents CIN par OCR (Tesseract.js + pdf-parse)
- Score de vérification intelligent avec mots-clés français/arabe
- Upload et gestion des documents (Multer)
- Modération des avis patients
- Journal d'audit (AuditLog) pour la traçabilité

#### Étape 5 : Ordonnances et polissage (20-26 mai)
- Système d'ordonnances numériques complet :
  - Création avec liste de médicaments + posologie + instructions
  - Génération de PDF professionnel avec PDFKit
  - QR code unique de vérification (UUID)
  - Envoi par email avec PDF en pièce jointe
  - Upload de document externe
  - Vérification publique d'authenticité via QR code
  - Renvoi d'ordonnance par email
- Soft delete sur User, Patient, Doctor (champ `deletedAt`)
- Métadonnées enrichies sur les notifications (JSON)
- Amélioration de l'UI/UX
- Tests complémentaires
- Documentation complète (README.md de 405 lignes, INSTALLATION.md)

### 5.3 Sécurité implémentée

> **INSTRUCTION POUR L'IA** : Génère un diagramme ou un tableau des couches de sécurité :

| Couche | Mécanisme | Détail |
|--------|-----------|--------|
| Authentification | JWT double token | Access (15 min) + Refresh (7 jours, cookie HttpOnly) |
| Protection CSRF | Double CSRF | Token en cookie HttpOnly + header `x-csrf-token` sur toutes les mutations |
| Mots de passe | bcrypt | 12 rounds de salage |
| Headers HTTP | Helmet | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc. |
| Rate Limiting | express-rate-limit | Auth : 5 req/15 min, Général : configurable |
| CORS | Whitelist | Origines autorisées par CSV, refus du wildcard en production |
| Validation | express-validator + Zod | Validation côté serveur et client |
| Nettoyage | sanitizeInputs | Middleware de nettoyage des entrées contre XSS/injection |
| Autorisation | Middleware authorize | Contrôle de rôle (PATIENT, DOCTOR, ADMIN) par route |
| Fichiers | Contrôleurs dédiés | Les uploads ne sont jamais servis en exposition brute |
| Secrets | Refus en production | Les secrets par défaut (`change_me_*`) sont interdits en production |
| Concurrence | Optimistic locking | Champs `version` et `bookingVersion` pour prévenir les conflits |
| Audit | AuditLog | Traçabilité de toutes les actions sensibles |
| Timeout | Request timeout | 30 secondes par requête |

### 5.4 Moteur de recherche intelligent

Le moteur de recherche est un élément différenciateur de la plateforme :

1. **Mapping symptôme → spécialité** : Un fichier JSON contient 12 entrées de symptômes courants (douleur thoracique, palpitations, maux de tête, douleur estomac, acné, chute de cheveux, douleur articulation, fatigue chronique, toux persistante, anxiété, grossesse, douleur dentaire) avec les spécialités correspondantes et des mots-clés associés.

2. **Fuzzy matching** : Tolère les fautes de frappe dans les recherches.

3. **Suggestions en temps réel** : L'autocomplétion de la page d'accueil propose trois catégories : spécialités, médecins et symptômes, synchronisées avec la base de données.

4. **Filtres** : Spécialité, ville, disponibilité, tarif, langue, assurance.

5. **Carte interactive** : Leaflet/OpenStreetMap avec clustering de marqueurs pour visualiser la localisation des cabinets.

6. **Villes marocaines** : Liste des villes récupérées depuis les données publiques (fichier `moroccoCities.js`).

### 5.5 Système de notifications temps réel

> **INSTRUCTION POUR L'IA** : Génère un diagramme de séquence pour les notifications temps réel :

1. Un événement métier se produit (ex: confirmation RDV)
2. Le service `notificationService.js` crée une notification en base (PostgreSQL)
3. Le serveur récupère l'instance Socket.IO via `getSocketServer()`
4. Le serveur émet un événement `notification:new` sur le canal `user:<userId>`
5. Le client React reçoit l'événement via le hook `useNotificationSocket`
6. Le hook invalide les queries React Query pertinentes (`notifications-unread-count`, `notifications-list`, etc.)
7. L'UI se met à jour automatiquement (compteur non-lu, liste de notifications, dashboards)

**Types de notifications** : RAPPEL_RDV, RDV_CONFIRME, RDV_ANNULE, PAIEMENT_RECU, SYSTEME

### 5.6 Internationalisation

La plateforme supporte deux langues :
- **Français** (langue par défaut) : traductions complètes pour toute l'interface
- **Anglais** : traductions partielles (navigation, éléments communs)

Le système utilise i18next avec React-i18next, stockant les traductions directement dans `i18n.js` (162 lignes).

### 5.7 Interface utilisateur (UI/UX)

Le design suit une **charte graphique médicale** cohérente :
- **Couleur primaire** : `#1A6B8A` (bleu médical/teal)
- **Couleur secondaire** : Teintes claires médicales
- **Style** : Glassmorphism (backdrop-blur, fond semi-transparent), coins arrondis (2xl), ombres douces
- **Animations** : Framer Motion pour les transitions et micro-animations
- **Icônes** : Lucide React (stéthoscope, cœur, etc.)
- **Typographie** : Polices Google Fonts
- **Responsive** : Tailwind CSS avec breakpoints md, lg, xl
- **Pattern** : Motif médical en arrière-plan (`bg-medical-pattern`)

**Pages principales et leur taille** (indicateur de complexité) :
- DashboardDoctorPage : 52 299 octets (page la plus complexe)
- HomePage : 51 736 octets
- DashboardAdminPage : 49 196 octets
- DoctorProfilePage : 41 488 octets
- SearchPage : 36 759 octets
- RegisterPage : 31 048 octets

---

## 6. MODÈLE DE DONNÉES

### 6.1 Schéma relationnel complet

> **INSTRUCTION POUR L'IA** : Génère un diagramme entité-relation (ERD) à partir des informations suivantes. Le schéma Prisma contient **16 modèles** et **14 enums**.

**Modèles** : User, Patient, Doctor, Cabinet, DoctorCabinet, Disponibilite, RendezVous, Avis, Notification, Paiement, Ordonnance, DoctorPatientNote, DoctorChangeRequest, PatientChangeRequest, DoctorDocument, PatientDocument, AuditLog

**Relations clés :**
- User 1↔0..1 Patient (un utilisateur peut être un patient)
- User 1↔0..1 Doctor (un utilisateur peut être un médecin)
- Doctor *↔* Cabinet (via DoctorCabinet, table d'association)
- Doctor 1→* Disponibilite (un médecin a plusieurs créneaux)
- Cabinet 1→* Disponibilite (un cabinet a plusieurs créneaux)
- Patient 1→* RendezVous
- Doctor 1→* RendezVous
- RendezVous 1↔0..1 Avis
- RendezVous 1↔0..1 Paiement
- RendezVous 1↔0..1 Ordonnance
- RendezVous 1→* DoctorPatientNote
- User 1→* Notification

**Index de performance** (23 index au total) :
- User : role, createdAt, emailVerificationTokenHash, passwordResetTokenHash
- Patient : ville, sexe, createdAt
- Doctor : nomComplet, specialite, accepteAssurance, experience, createdAt
- Cabinet : (ville, quartier), (latitude, longitude), createdAt
- RendezVous : (doctorId, dateHeure), (patientId, dateHeure), (disponibiliteId, dateHeure), (cabinetId, dateHeure), (statut, dateHeure), statut, typeConsultation, rappelEnvoye
- Et d'autres index composites pour les performances des requêtes fréquentes

**Enums** (14) :
- UserRole : PATIENT, DOCTOR, ADMIN
- Sexe : HOMME, FEMME
- GroupeSanguin : O_POS, O_NEG, A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG
- DocumentVerificationStatus : PENDING, VERIFIED, REJECTED, NEEDS_REVIEW
- JourSemaine : LUNDI–DIMANCHE
- StatutRendezVous : EN_ATTENTE, CONFIRME, ANNULE, COMPLETE, NO_SHOW
- TypeConsultation : PRESENTIEL, TELECONSULTATION
- NotificationType : RAPPEL_RDV, RDV_CONFIRME, RDV_ANNULE, PAIEMENT_RECU, SYSTEME
- MethodePaiement : CASH, CMI, VIREMENT
- StatutPaiement : EN_ATTENTE, PAYE, ECHOUE, REMBOURSE
- DoctorChangeRequestType : PROFILE_UPDATE, PROFILE_PHOTO_UPDATE, LOCATION_CREATE, LOCATION_UPDATE
- DoctorChangeRequestStatus : PENDING, APPROVED, REJECTED
- PatientChangeRequestStatus : PENDING, APPROVED, REJECTED

### 6.2 Historique des migrations

| N° | Date | Nom | Description |
|----|------|-----|-------------|
| 1 | 17/04/2026 | init | Création initiale de toutes les tables de base |
| 2 | 20/04/2026 | auth_system | Champs d'authentification (tokens, vérification email, reset) |
| 3 | 21/04/2026 | doctor_name_field | Ajout du champ `nomComplet` sur Doctor |
| 4 | 21/04/2026 | appointment_notifications_step5 | Notifications et rendez-vous avancés |
| 5 | 22/04/2026 | booking_payment_and_patient_warnings | Paiement, avertissements, booking |
| 6 | 27/04/2026 | store_cin_document_reference | Référence document CIN |
| 7 | 28/04/2026 | add_cin_document_verification_fields | Champs de vérification CIN |
| 8 | 28/04/2026 | cin_document_verification | Vérification complète CIN |
| 9 | 05/05/2026 | add_patient_document | Documents patient |
| 10 | 24/05/2026 | baseline_ordonnance_audit_soft_delete | Ordonnances, audit log, soft delete |
| 11 | 24/05/2026 | sanity_check | Vérification de cohérence du schéma |
| 12 | 24/05/2026 | add_notification_metadata | Métadonnées JSON sur les notifications |

---

## 7. API REST — DOCUMENTATION COMPLÈTE

### 7.1 Routes par domaine

Base URL : `http://localhost:4000/api/v1`

#### Authentification (`/auth`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | /auth/register | Inscription (patient ou médecin) | Non |
| POST | /auth/login | Connexion | Non |
| POST | /auth/refresh-token | Renouvellement du token | Cookie |
| POST | /auth/logout | Déconnexion | Oui |
| GET | /auth/verify-email | Vérification email | Token URL |
| POST | /auth/forgot-password | Demande de réinitialisation | Non |
| POST | /auth/reset-password | Réinitialisation du mot de passe | Token |
| GET | /auth/csrf-token | Obtention du token CSRF | Non |

#### Recherche (`/search`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | /search | Recherche de médecins avec filtres | Non |
| GET | /search/suggestions | Suggestions autocomplétion | Non |

#### Médecins (`/doctors`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | /doctors | Liste paginée des médecins | Non |
| GET | /doctors/:id | Profil public d'un médecin | Non |
| GET | /doctors/:id/availabilities | Disponibilités d'un médecin | Non |
| GET | /doctors/:id/reviews | Avis sur un médecin | Non |

#### Rendez-vous (`/appointments`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | /appointments | Créer un rendez-vous | Patient |
| PUT | /appointments/:id/confirm | Confirmer un RDV | Médecin |
| PUT | /appointments/:id/cancel | Annuler un RDV | Patient/Médecin |
| PUT | /appointments/:id/complete | Compléter un RDV | Médecin |
| POST | /appointments/:id/review | Déposer un avis | Patient |
| POST | /appointments/:id/notes | Ajouter une note clinique | Médecin |
| POST | /appointments/:id/ordonnance | Créer une ordonnance | Médecin |
| POST | /appointments/:id/ordonnance/upload | Upload ordonnance | Médecin |
| POST | /appointments/:id/ordonnance/resend | Renvoyer ordonnance | Médecin/Patient |

#### Dashboard (`/dashboard`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | /dashboard/patient | Dashboard patient | Patient |
| GET | /dashboard/doctor | Dashboard médecin | Médecin |
| GET | /dashboard/admin | Dashboard admin | Admin |

#### Admin (`/admin`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET/PUT | /admin/doctors/verify | Vérification comptes médecins | Admin |
| GET/PUT | /admin/reviews | Modération des avis | Admin |
| GET/PUT | /admin/change-requests | Gestion demandes de modification | Admin |
| POST | /admin/users | Création de compte admin | Admin |

#### Notifications (`/notifications`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | /notifications | Liste des notifications | Oui |
| PUT | /notifications/mark-read | Marquer comme lu | Oui |
| GET | /notifications/unread-count | Compteur non-lus | Oui |

#### Ordonnance publique (`/ordonnance`)
| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | /ordonnance/verify/:qrCode | Vérification authenticité | Non |

#### Autres routes
- `/home` : Résumé public de la plateforme
- `/cabinets` : Consultation des cabinets
- `/payments` : Gestion des flux de paiement
- `/users` : Gestion des comptes
- `/patients` : Profil et données patient
- `/health` : État du service (healthcheck)

---

## 8. TESTS ET VALIDATION

### 8.1 Tests backend

4 fichiers de tests de services couvrant les fonctionnalités critiques :

- `authService.test.js` (2 993 octets) : Tests d'inscription, connexion, vérification email, refresh token
- `appointmentService.test.js` (6 866 octets) : Tests de création, confirmation, annulation, complétion, no-show, rappels
- `dashboardService.test.js` (4 182 octets) : Tests des données agrégées des dashboards
- `homeService.test.js` (3 193 octets) : Tests des données de la page d'accueil

**Commandes de test :**
```bash
npm --prefix backend test              # Lancer tous les tests
npm --prefix backend test:watch        # Mode watch
npm --prefix backend test:coverage     # Couverture de code
npm --prefix backend test:etape5:mvp   # Tests critiques MVP
```

### 8.2 Tests frontend

- Tests unitaires avec **Vitest** + **Testing Library**
- Tests end-to-end avec **Playwright**
- Test du composant `TeleconsultationVideoPanel` (852 octets)

**Commandes :**
```bash
npm --prefix frontend test             # Tests unitaires
npm --prefix frontend test:e2e         # Tests end-to-end
npm --prefix frontend run build        # Vérification du build
npm --prefix frontend run lint         # Linting ESLint
```

### 8.3 Données de démonstration

Le fichier `seed.js` (64 680 octets) génère un jeu de données réaliste :
- 3 comptes de test (Admin, Médecin, Patient)
- Cabinets marocains avec coordonnées GPS réelles
- Créneaux de disponibilité
- Documents et photos
- Rendez-vous d'exemple
- Script optionnel `seed-1000-doctors.js` pour générer ~1000 médecins supplémentaires

---

## 9. DÉPLOIEMENT

### 9.1 Architecture Docker

Le `docker-compose.yml` orchestre 5 services (+1 optionnel) :

1. **postgres** : PostgreSQL 16 Alpine, volume persistant, healthcheck
2. **redis** : Redis 7 Alpine, persistance AOF, healthcheck
3. **backend** : Application Express containerisée, dépend de postgres + redis
4. **frontend** : Build Vite + serveur Nginx léger
5. **nginx** : Reverse proxy, terminaison SSL, ports 80/443
6. **certbot** (profil optionnel) : Renouvellement automatique des certificats Let's Encrypt

### 9.2 Domaine et SSL

- Domaine cible : `tabibconnect.ma`
- SSL via Let's Encrypt/Certbot
- Configuration Nginx avec challenge ACME pour le renouvellement automatique

### 9.3 Variables de production

Les variables critiques à configurer pour la production :
- Secrets JWT et CSRF (obligatoires, refus des valeurs par défaut)
- `DATABASE_URL`, `REDIS_URL`
- `APP_BASE_URL`, `FRONTEND_URL`, `CORS_ORIGIN` → `https://tabibconnect.ma`
- Clés Stripe, Twilio, SMTP pour les services tiers
- `NODE_ENV=production`

---

## 10. CAPTURES D'ÉCRAN DISPONIBLES

> **INSTRUCTION POUR L'IA** : Intègre ces captures d'écran dans le rapport final si possible. Elles se trouvent dans `frontend/public/docs/screenshots/` :

| Fichier | Description |
|---------|-------------|
| homepage.png | Page d'accueil avec barre de recherche, hero section, parcours principaux |
| search_results.png | Résultats de recherche paginés avec filtres et regroupement |
| search_map.png | Carte OpenStreetMap avec localisation des cabinets |
| login.png | Page de connexion sécurisée |
| doctor_dashboard.png | Dashboard médecin complet |
| admin_dashboard.png | Dashboard administrateur |
| couverture_tabibconnect.jpeg | Image de couverture du projet |
| medecin_homme.png, medecin_femme.jpg | Photos de médecins pour le seed |
| patient_homme.png, patient_femme.jpg | Photos de patients pour le seed |

---

## 11. BILAN ET PERSPECTIVES

### 11.1 Bilan technique

**Réalisations du stage :**
- Développement complet d'une plateforme full-stack fonctionnelle en 1 mois
- ~29 070 lignes de code produites (backend + frontend)
- 16 modèles de données avec 14 enums et 23 index de performance
- 12 migrations de base de données
- Architecture sécurisée multi-couches (JWT, CSRF, rate limiting, CSP, audit)
- Système de notifications temps réel avec Socket.IO
- Moteur de recherche intelligent avec mapping symptômes→spécialités
- Système d'ordonnances numériques avec PDF et QR code
- Vérification OCR des documents d'identité
- Interface responsive et moderne avec animations
- Internationalisation FR/EN
- Containerisation Docker complète pour le déploiement

### 11.2 Compétences acquises

- Architecture full-stack moderne (React 19 + Express 5 + PostgreSQL)
- Sécurité web avancée (JWT double token, CSRF, Helmet, rate limiting)
- ORM Prisma avec migrations et schéma complexe
- WebSocket avec Socket.IO pour le temps réel
- Intégration de services tiers (Stripe, Twilio, Tesseract.js)
- Containerisation et orchestration Docker
- Génération de documents PDF programmatiquement
- Gestion de projets complexes avec Git

### 11.3 Perspectives d'évolution

- **Intelligence artificielle** : Intégration d'un vrai modèle IA pour les suggestions de spécialités (actuellement basé sur un mapping statique)
- **Application mobile** : Version React Native pour iOS et Android
- **Téléconsultation vidéo** : Intégration WebRTC pour les consultations en ligne (un composant `TeleconsultationVideoPanel` existe déjà comme base)
- **Facturation avancée** : Gestion complète des factures, remboursements assurance
- **Analytics avancés** : Tableaux de bord avec IA prédictive pour les médecins
- **Intégration DMP** : Connexion au Dossier Médical Partagé national
- **Multi-langue étendu** : Ajout de l'arabe (RTL) et de l'amazigh

---

## 12. CONCLUSION

Ce stage d'un mois a permis de concevoir et développer intégralement TabibConnect, une plateforme web complète de prise de rendez-vous médicaux adaptée au contexte marocain. Le projet couvre l'ensemble du cycle de vie d'une application web moderne : de la conception UML à l'implémentation full-stack, en passant par la sécurité, les tests et le déploiement containerisé.

La plateforme répond aux besoins des trois acteurs principaux du système de santé (patients, médecins, administrateurs) et propose des fonctionnalités innovantes comme la recherche intelligente par symptômes, les ordonnances numériques vérifiables par QR code, et la vérification automatisée des documents d'identité par OCR.

L'architecture technique choisie (React + Express + PostgreSQL + Socket.IO + Docker) assure scalabilité, maintenabilité et sécurité, tout en restant conforme aux bonnes pratiques de développement web moderne.

---

## 13. ANNEXES

### Annexe A : Liste complète des fichiers du projet

**Backend (76 fichiers source, ~12 968 lignes) :**
- 1 fichier d'entrée (server.js)
- 1 fichier de configuration Express (app.js)
- 4 fichiers de configuration (env, prisma, redis, socket)
- 15 contrôleurs
- 21 services
- 14 fichiers de routes
- 10 middlewares
- 12 utilitaires/validateurs
- 1 fichier de jobs cron
- 2 fichiers de données (mappings symptômes)
- 1 schéma Prisma (484 lignes)
- 1 fichier de seed (64 680 octets)

**Frontend (82 fichiers source, ~16 102 lignes) :**
- 3 fichiers de configuration (main, App, i18n)
- 1 fichier de routing (233 lignes)
- 5 fichiers de layout
- 33 pages
- 24 composants (UI, communs, spécialisés)
- 2 hooks personnalisés
- 10 modules utilitaires
- 2 fichiers CSS

### Annexe B : Variables d'environnement (44 paramètres)

Le fichier `backend/src/config/env.js` centralise 44 variables d'environnement couvrant : serveur, base de données, authentification, CSRF, emails, SMS, paiement, vérification CIN, uploads, cache Redis et règles métier.

### Annexe C : Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@tabibconnect.ma | TabibConnect@2026 |
| Médecin | dr.amine.fassi@tabibconnect.ma | TabibConnect@2026 |
| Patient | youssef.benali@tabibconnect.ma | TabibConnect@2026 |

### Annexe D : Commandes utiles

```bash
# Installation
npm --prefix backend install && npm --prefix frontend install

# Base de données
cd backend && npx prisma generate && npx prisma migrate dev && npm run prisma:seed

# Développement
npm run dev  # (racine) lance backend + frontend

# Tests
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend test:e2e

# Production Docker
docker compose up -d --build
```

---

## INSTRUCTIONS FINALES POUR L'AGENT IA GÉNÉRATEUR

> Ce document contient **TOUTES les informations** nécessaires pour générer un rapport de stage professionnel complet. Voici les diagrammes à produire :

### Diagrammes UML à générer :

1. **Diagramme de cas d'utilisation** (section 3.1) — 3 acteurs, ~25 cas d'utilisation
2. **Diagramme de classes** (section 3.2) — 16 classes/entités avec tous les attributs et relations
3. **Diagramme de séquence — Prise de RDV** (section 3.3) — 16 étapes
4. **Diagramme de séquence — Cycle de vie RDV** (section 3.4) — 8 étapes
5. **Diagramme de séquence — Authentification** (section 3.5) — 9 étapes avec refresh
6. **Diagramme d'activité — Vérification CIN** (section 3.6) — OCR + scoring
7. **Diagramme d'activité — Ordonnance numérique** (section 3.7) — PDF + QR + email
8. **Diagramme d'états — RendezVous** (section 3.8) — 5 états
9. **Diagramme d'états — Paiement** (section 3.9) — 4 états
10. **Diagramme d'états — ChangeRequest** (section 3.10) — 3 états
11. **Diagramme d'états — Vérification CIN** (section 3.11) — 4 états
12. **Diagramme d'architecture technique** (section 4.1) — 3 tiers
13. **Diagramme de packages backend** (section 4.3) — Structure complète
14. **Diagramme de packages frontend** (section 4.4) — Structure complète
15. **Diagramme de déploiement Docker** (section 4.5) — 5 conteneurs + volumes
16. **Diagramme de communication** (section 4.6) — Flux inter-composants
17. **Diagramme de séquence — Notifications temps réel** (section 5.5) — Socket.IO flow
18. **Diagramme entité-relation (ERD)** (section 6.1) — 16 tables + relations

### Format du rapport final attendu :

- Page de couverture avec logo et informations du stage
- Table des matières
- Chapitres structurés avec numérotation
- Intégration des diagrammes UML
- Intégration des captures d'écran disponibles
- Tableaux récapitulatifs
- Références bibliographiques et webographiques
- Glossaire technique
