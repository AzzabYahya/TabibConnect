# TabibConnect — Master Documentation (Source de Vérité)

> **Plateforme web de prise de rendez-vous médicaux** (Patient, Médecin, Admin) — Maroc  
> **Dernière mise à jour :** 20 mai 2026 (Documentation alignée sur le code)  
> **Objectif :** Ce document centralise TOUTES les informations nécessaires pour une IA ou un développeur.

---

## 📷 Visuels de la Plateforme (UI/UX)

### 1. Page d'Accueil & Navigation
![Home Page](frontend/public/docs/screenshots/homepage.png)
*Une interface moderne et épurée utilisant un design "Glassmorphism". La navigation est intuitive avec un accès rapide à la recherche et aux espaces dédiés.*

### 2. Recherche & Pagination intelligente
![Search Results](frontend/public/docs/screenshots/search_results.png)
*Le moteur de recherche affiche désormais une **pagination de 8 docteurs maximum par page**. Le nombre total de médecins trouvés est dynamiquement mis à jour pour garantir une transparence totale.*

### 3. Carte interactive — Localisation des médecins
![Search Map](frontend/public/docs/screenshots/search_map.png)
*La carte interactive affiche les cabinets des médecins sur une carte OpenStreetMap avec des **marqueurs clusterisés**. Un clic sur un cluster zoome pour révéler les cabinets individuels avec les informations du praticien.*

### 4. Connexion Sécurisée
![Login Page](frontend/public/docs/screenshots/login.png)
*Interface de connexion optimisée avec gestion précise des erreurs (ex: "Identifiants incorrects" vs "Erreurs techniques").*

#### 🔑 Comptes de Test
| Rôle | Email | Mot de passe |
| :--- | :--- | :--- |
| **Admin** | `admin@tabibconnect.ma` | `TabibConnect@2026` |
| **Docteur** | `dr.amine.fassi@tabibconnect.ma` | `TabibConnect@2026` |
| **Patient** | `youssef.benali@tabibconnect.ma` | `TabibConnect@2026` |

### 5. Dashboard Médecin (Vue Agenda)
![Doctor Dashboard](frontend/public/docs/screenshots/doctor_dashboard.png)
*Espace de travail complet pour le praticien. Les icônes et menus sont rendus de manière fluide, et les alertes administratives sont clairement identifiées.*

### 6. Dashboard Administration
![Admin Dashboard](frontend/public/docs/screenshots/admin_dashboard.png)
*Tour de contrôle pour la validation des nouveaux inscrits et la surveillance de l'activité globale de la plateforme.*

---

## 🏗️ Architecture Technique

### Stack Technologique
| Couche | Technologie |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, React Query, React Router v6, i18next |
| **Backend** | Node.js (Docker Node 22), Express 5, Prisma 6 |
| **Base de données** | PostgreSQL 16 |
| **Temps Réel** | Socket.IO (notifications temps reel) |
| **Securite** | JWT (Access/Refresh), Double CSRF, Helmet + CSP, Rate Limiting |
| **Jobs** | node-cron (rappels + no-show) |
| **Paiements** | Stripe (serveur) |
| **OCR** | tesseract.js (verification CIN) |
| **Tests** | Jest + Supertest, Vitest, Playwright |
| **Infra** | Docker, Docker Compose, Nginx |

### Structure des Dossiers
- `backend/` : API Express, routes `/api/v1`, services metier, Prisma.
- `frontend/` : App React (Vite), hooks temps reel, UI.
- `docs/screenshots/` : Captures d'ecran UI (garder intact).
- `uploads/` : Documents (CIN, photos) isoles et servis via controleurs.

---

## ⚙️ Demarrage rapide (developpement local)

### Option 1 — Lancer tout depuis la racine
```bash
npm --prefix backend install
npm --prefix frontend install
npm run dev
```
Ce script lance `npm run dev` dans `backend/` et `frontend/` en parallele.

### Option 2 — Lancer chaque service
**Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev # Port 4000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev # Port 5173
```

---

## 🧰 Configuration (variables d'environnement)

### Fichiers sources
- `backend/.env.example` : configuration locale.
- `.env.production.example` : configuration Docker Compose (prod).

### Variables principales (backend)
- `DATABASE_URL` : chaine PostgreSQL.
- `APP_BASE_URL` / `FRONTEND_URL` : URLs publiques.
- `CORS_ORIGIN` : origines autorisees (liste CSV).
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` : secrets JWT (bloquants en prod si valeurs par defaut).
- `CSRF_SECRET`, `CSRF_COOKIE_NAME`, `CSRF_HEADER_NAME` : double CSRF.
- `REFRESH_TOKEN_COOKIE_NAME` : nom du cookie refresh.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` : paiements.
- `SMTP_*` : emails transactionnels.
- `TWILIO_*` : SMS (optionnel).
- `FREE_CANCELLATION_HOURS`, `REMINDER_HOURS_BEFORE`, `REMINDER_WINDOW_MINUTES`, `NO_SHOW_GRACE_MINUTES` : politique RDV.
- `CIN_VERIFICATION_*` : regles OCR CIN (score, mots-cles, langue).

### Variables principales (frontend)
- `VITE_API_URL` : base API (doit pointer vers `/api/v1`).

---

## 🌐 API & Temps reel

### Base URL
- Dev: `http://localhost:4000/api/v1`
- Prod: `https://votre-domaine/api/v1`

### Routes API (prefixe `/api/v1`)
- `/auth` : inscription, login, refresh, csrf-token.
- `/home` : donnees publiques homepage.
- `/appointments` : creation, annulation, statut, avis.
- `/dashboard` : aggregats patient/medecin/admin.
- `/admin` : validation docs, moderation, actions sensibles.
- `/doctors` : recherche, profil, disponibilites.
- `/cabinets` : gestion des cabinets.
- `/notifications` : listing et marquage.
- `/payments` : flux de paiement.
- `/users` : gestion utilisateur.
- `/patients` : profil patient.
- `/health` : check API (retourne status + version).

### CSRF + Auth
- Le frontend recupere `GET /auth/csrf-token` puis envoie `x-csrf-token` sur les mutations.
- Les appels utilisent `withCredentials` pour les cookies (refresh).

### Temps reel (Socket.IO)
- Authentification via access token dans le handshake.
- Abonnement automatique au canal `user:<id>`.
- Evenement principal: `notification:new`.

---

## 📊 Base de Donnees — Schéma Prisma

### Modeles principaux (15)
- **User** : compte central (role, verification).
- **Patient** : profil medical, CIN + verifications.
- **Doctor** : profil medecin, tarif, langues, documents.
- **Cabinet** : localisation, coordonnees, photos.
- **Disponibilite** : creneaux hebdomadaires.
- **RendezVous** : noyau RDV + statut + politique.
- **Paiement** : statut et methode.
- **Notification** : events temps reel.
- **Avis** : notes et commentaires verifies.
- **DoctorCabinet** : lien N-N.
- **DoctorPatientNote** : notes medecin-patient.
- **DoctorDocument** : documents medecin.
- **PatientDocument** : documents patient.
- **DoctorChangeRequest** : demandes de modification medecin.
- **PatientChangeRequest** : demandes de modification patient.

---

## 🔐 Securite & Hardening (Audit 05/05/2026)

- Double CSRF global sur toutes les mutations.
- Secrets par defaut refuses en production.
- CSP active via Helmet (scripts/styles/fonts/images controles).
- CORS strict selon `CORS_ORIGIN`.
- Rate limiting sur l'authentification.
- Sanitisation d'entree via middleware.
- Logs d'audit cote admin et suivi des documents.

---

## 🧪 Tests

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
```

---

## 🐳 Docker & Production

1. Copier `.env.production.example` en `.env.production`.
2. Ajuster secrets, URLs et `VITE_API_URL`.
3. Lancer:
```bash
docker compose up -d --build
```

Services: Postgres, Redis, Backend (4000), Frontend (Nginx), Nginx reverse proxy + Certbot (optionnel).

---

## 🤖 Guide IA — Patterns & Logique Metier

- **Services Layer** : logique metier dans `backend/src/services/`.
- **Transactions** : creation RDV + paiement dans une transaction Prisma.
- **File Serving** : documents servis par controleur (pas de static direct).
- **Realtime** : notifications Socket.IO pour dashboards.

---

## 📋 Historique & Contribution

- **v1.0.3 (Mai 2026)** : Documentation re-sync + details config.
- **v1.0.2 (Mai 2026)** : Audit de securite complet, pagination de 8, hardening global.
- **v1.0.1 (Avril 2026)** : Documentation et captures d'ecran.
- **v1.0.0 (Avril 2026)** : Lancement initial (MVP).

**Regles de contribution :**
- Secrets jamais commites.
- Tests obligatoires pour tout changement metier.
- Utiliser `resolveImageUrl` pour tout affichage d image venant du backend.
