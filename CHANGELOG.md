# Changelog

## 1.0.1 - 2026-04-29

### Changed

- Documentation Markdown rationalisee pour ne garder que les fichiers essentiels.
- `README.md` remplace par une version operationnelle et concise.
- Ajout de captures d'ecran plateforme dans `docs/screenshots/`.

## 1.0.0 - 2026-04-22

### Added

- Dashboard patient, medecin et admin complets.
- Recherche avancee medecins et profils detaillees.
- API rendez-vous avec concurrence optimiste et notifications.
- Documentation des fonctionnalites avancees: teleconsultation, paiement, ordonnances.
- Socle de tests backend Jest/Supertest et frontend Vitest/Playwright.
- Dockerfiles, docker-compose et reverse proxy Nginx avec SSL.
- SEO de base avec meta tags, robots.txt et sitemap.xml.

### Changed

- README finalise pour la livraison et la mise en ligne.
- Variables de production centralisees dans `.env.production.example`.

### Verified

- `cd backend && npm test`
- `cd frontend && npm test`
- `cd frontend && npm run build`