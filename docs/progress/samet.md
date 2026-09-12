# Progres Samet — Octro v2.2

Statut au 2026-09-12, branche `feat/samet-s1-s2-foundation`. Reference : [docs/TEAM_TASKS.md](../TEAM_TASKS.md) section 4.

## Fait et verifie

**S1 — Socle et contrats**
- Monorepo npm workspaces (`packages/*`, `apps/*`), TypeScript strict avec project references (`tsc -b`), Node >=18. Commandes reellement executables : `npm run build`, `npm run typecheck`, `npm run test`.
- `packages/contracts` : les neuf contrats C1 (Workspace, EconomicEvent, Projection, ActionPlan, Approval, Execution, EligibilityDecision, NetworkCapabilities, Error) en zod, avec les primitives Money/AssetId decimales (DATA-03 : refuse un float et un actif ambigu).
- `packages/application` : ports (WorkspaceRepository, EconomicEventRepository, NetworkCapabilitiesPort, OptimizerPort, Clock, IdGenerator) et cas d'usage S2 ci-dessous, avec des doublures en memoire explicitement nommees (`adapters/in-memory/*`) — pas des adaptateurs PostgreSQL/XRPL.
- CI GitHub Actions (`.github/workflows/ci.yml`) : `npm ci` (lockfile only), scan de secrets maison (`scripts/scan-secrets.sh`), typecheck, build, tests. Tout est vert.
- `infra/docker-compose.dev.yml` : PostgreSQL seul, pour brancher l'adaptateur reel en S3. Ce n'est pas le Compose complet du chapitre 10 (reste S6).

**S2 — Workspace et acces (part P0 realisee)**
- `CreateWorkspaceUseCase` / `GetWorkspaceUseCase` : un Workspace personnel se cree et se lit sans Organization (PER-03), avec isolation tenant stricte (SEC-01 — un tenant different se voit refuser l'acces, `AccessDeniedError`/HTTP 403).
- `RecordDeclaredEventUseCase` : saisie manuelle d'un evenement declare (ACC-01/ACC-02), pas d'import CSV/dedoublonnage (S3).
- `GetPersonalProjectionUseCase` + `SimulatedOptimizerAdapter` : calendrier personnel calculable sans wallet, DID, KYC ni session Stripe (ACC-02, PER-11), avec separation stricte solde prevu / cash confirme (DATA-02). L'adaptateur est une marche de solde deterministe, explicitement pas le moteur CVaR/MPC d'Augustin (A2) : ne jamais le citer comme preuve financiere.
- `ApproveFinancingActionUseCase` : NET-02 — une capacite reseau non verifiee (etat par defaut de `hackathon.config.json`) bloque l'approbation d'une action de financement, jamais la projection. SEC-01 — un role `analyst` ne peut pas approuver.
- `apps/api` (Fastify) expose `POST /v1/workspaces`, `GET /v1/workspaces/:id`, `POST /v1/workspaces/:id/events`, `POST /v1/projections`, `GET /health`. Verifie a la main (`curl`) en plus des tests d'integration.

**Tests executes** : `npm run test --workspaces --if-present` → 4 fichiers de suite, 38 tests, tous verts (contracts 14, domain 12, application 7, api 5).

## Dependances encore simulees, assumees comme telles

- Persistance : en memoire (`InMemoryWorkspaceRepository`, `InMemoryEconomicEventRepository`), pas PostgreSQL. Aucune donnee ne survit a un redemarrage.
- Reseau : `StaticNetworkCapabilitiesAdapter` renvoie l'etat non verifie de `hackathon.config.json`. Pas d'appel XRPL reel — attend G0 (Augustin, A1).
- Calcul : `SimulatedOptimizerAdapter` fait une marche de solde, pas la recette CVaR/MPC (Augustin, A2). Ne resout pas le transfert de 230 EUR de la fixture Lina — ce choix appartient a l'optimiseur reel.
- Authentification : header de developpement `x-dev-tenant-id`, pas d'OIDC/session reelle (nomme sans ambiguite pour ne jamais etre pris pour une session verifiee).

## Pas encore commence

- **S3** — persistance PostgreSQL reelle, import CSV avec apercu/dedoublonnage (DATA-01), transferts a deux jambes.
- **S4** — approbations liees aux conditions avec idempotence reelle (Idempotency-Key, 409 sur meme cle/autre corps), jobs/outbox, audit.
- **S5** — Stripe Identity (mode test), emetteur de Credentials de demonstration, eligibilites prêteur/emprunteur.
- **S6** — Compose complet (reverse proxy, S3, SMTP, Stripe Identity), sauvegarde/restauration, reconciliation verifiee.
- **S7** — extensions P1 (sponsoring, distinction DID), non commencees par choix (P0 d'abord).

## Prochain lot

S3 (evenements/import/projection persistants), en parallelisant avec un sous-agent une fois la CI confirmee stable par l'equipe. Contrats et ports sont stables pour que Kevin (K1/K2) et Augustin (A2) puissent deja consommer `@octro/contracts` sans attendre S3.

## Branche

`feat/samet-s1-s2-foundation`, non fusionnee, non poussee sans confirmation (voir note de session). Pas de sous-agent lance pour ce lot : le perimetre S1+S2 est reste dans une seule session de travail continue plutot que d'etre scinde en fichiers exclusifs pour deux agents, pour eviter le cout de coordination sur un socle encore instable (section 8 du plan : "un seul suffit pendant un bootstrap dependant").
