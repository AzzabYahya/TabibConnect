# Installation TabibConnect

## Prérequis

- Node.js 18+ recommandé. Node 22 est utilisé dans l’environnement Docker du projet.
- PostgreSQL 16.
- Redis optionnel, utile si tu veux activer le cache localement.
- Git, si tu clones le dépôt.

## 1. Installer les dépendances

Depuis la racine du projet:

```bash
npm --prefix backend install
npm --prefix frontend install
```

## 2. Préparer la base de données

Crée une base PostgreSQL nommée `tabibconnect`:

```bash
psql -U postgres
CREATE DATABASE tabibconnect;
\q
```

Si tu veux repartir d’une base propre avec le schéma du projet, utilise ensuite Prisma:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

## 3. Importer les données

Le projet utilise normalement le seed Prisma pour injecter les données de démonstration:

```bash
cd backend
npm run prisma:seed
```

Si tu disposes d’un fichier `dump.sql` issu d’un autre environnement, tu peux l’importer manuellement, mais ce n’est pas le flux standard de TabibConnect.

## 4. Configurer l’environnement

Copie le fichier d’exemple du backend:

```bash
cd backend
cp .env.example .env
```

Puis ajuste au minimum ces valeurs dans `.env`:

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/tabibconnect"
APP_BASE_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="une_chaine_longue_et_sure"
JWT_REFRESH_SECRET="une_autre_chaine_longue_et_sure"
CSRF_SECRET="une_autre_chaine_longue_et_sure"
```

Notes importantes:

- `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` sont utilisés par le projet.
- `REDIS_URL` est optionnel, mais conseillé si Redis tourne localement.
- Le frontend lit sa base d’API via `VITE_API_URL` si nécessaire.

## 5. Lancer le projet

### Option A: depuis la racine

```bash
npm run dev
```

Ce script lance le backend et le frontend ensemble via `scripts/run-platform.js`.

### Option B: dans deux terminaux séparés

Terminal 1, backend:

```bash
cd backend
npm run dev
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

## 6. Ouvrir dans le navigateur

- Frontend: http://localhost:5173
- API santé: http://localhost:4000/api/v1/health
- API générale: http://localhost:4000/api/v1

## Comptes de test disponibles après seed

Les comptes de démonstration fournis par le seed du projet sont les suivants:

- Admin: admin@tabibconnect.ma / TabibConnect@2026
- Médecin: dr.amine.fassi@tabibconnect.ma / TabibConnect@2026
- Patient: youssef.benali@tabibconnect.ma / TabibConnect@2026

## Si tu veux utiliser Docker

Le projet fournit aussi un `docker-compose.yml` à la racine.

```bash
docker compose up -d --build
```

Ce mode démarre PostgreSQL, Redis, le backend, le frontend et Nginx.

## Résumé rapide

1. Installer les dépendances.
2. Créer la base PostgreSQL.
3. Configurer `backend/.env`.
4. Lancer les migrations Prisma.
5. Lancer le seed.
6. Démarrer backend et frontend.

## Remarques

- Le projet n’utilise pas un `dump.sql` comme source de vérité principale.
- Les données de test et les comptes disponibles viennent du seed Prisma.
- L’endpoint santé correct est `/api/v1/health`, pas `/api/health`.
