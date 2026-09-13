# CDC v2.2 — Implémentation observabilité IA et status « Point 3 »

Date : `2026-09-13`
Branche : `main`
Références actives : `docs/v2.2/Octro_CDC_v2.2.md`, `docs/v2.2/requirements.json`, `docs/architecture.md`

## 1) Ce qui est prêt (conforme aux exigences)

- **Backend / persistance** : PostgreSQL opérationnel (workspace, événements, sessions, KYC, prêts), endpoints et tests P0 passants.
- **Security / isolation / idempotence** : tenant isolation, session, signature liée aux termes, contrôle des accès et secrets non persistés dans le dépôt.
- **Forecast + moteur financier** : prévision séparée cash attendu/réel, contraintes de réserve/essentiel, horizon personal/pro, tests Python CVaR/financement + scenario no-debt.
- **Orchestration IA “safe”** : `/v1/agent/explain` bornée, sans outil de signature, génération déterministe en fallback.
- **XRPL Track 1 Loaded** : endpoints de dépôt/demande/remboursement/retrait disponibles, preuve/gate G0 et capacités Loaded intégrées.
- **Tests automatisés** : suite TS + Python verte (déjà vérifiée à l’appel `npm test`).
- **Observabilité Orchestrateur & MCP Tools** : endpoints d’administration dédiés et écran `/admin/ops` intégrés.

## 2) Implémentation point 3 — Observabilité Orchestrateur IA & MCP (CDC v2.2)

### 2.1 `GET /v1/admin/agent/orchestration`

- Auth requise : header `x-admin-key` = `ADMIN_INSIGHTS_KEY`.
- Garde-fou : désactivé tant que `ENABLE_ADMIN_DEBUG !== "true"` (HTTP 404).
- Réponses 200 uniquement si autorisé, sans fuite de secrets (`SEC-04`).
- Expose : version orchestrateur, policy (`maxToolCalls`, `policyTimeoutMs`, `budget`) et statut/diagnostic d’exécutions (`agentOpsService`).

### 2.2 `GET /v1/admin/mcp/tools` (et alias `/v2/admin/mcp/tools`)

- Exposition en lecture seule des outils MCP issus de `@octro/mcp`.
- Répond aux exigences `MCP-02` : introspection contrôlée et sécurisée.

### 2.3 Front admin

- Routes : `/admin/ops` et `/admin/observability`.
- Composant : `apps/client/src/admin-observability.tsx`.
- Affiche : statut debug, politique LLM/agent, tampons d’exécution récents, liste des outils MCP, messages d’erreur 401/404.

## 3) Spécification détaillée (référence rapide)

- Endpoint admin orchestrateur : `GET /v1/admin/agent/orchestration`
- Endpoint tools MCP : `GET /v1/admin/mcp/tools` ou `GET /v2/admin/mcp/tools`
- Front : `/admin/ops`, `/admin/observability`

Exemple d’appel :

```bash
curl -H "x-admin-key: octro-admin-dev-secret" http://localhost:3000/v1/admin/agent/orchestration
curl -H "x-admin-key: octro-admin-dev-secret" http://localhost:3000/v1/admin/mcp/tools
```

## 4) Reste à faire (avant rapport jury)

- **AGT-01 / AGT-03 (niveau complet)** : rendre la chaîne agentique visible “collecter → analyser → simuler → expliquer → attendre décision → suivre” avec journal de dégradation non-LLM et reprise propre.
- **SPON-02 / SPON-03** : finaliser le cas de sponsoring en état “non vérifié” proprement affiché dans le flux de preuve.
- **EVID-01 / OPS-03** : consolider le registre preuve “live” (fixtures vs exécutions réelles) avec liens de reproduction par scénario.
- **UI-02 (UX réelle)** : prouver que chaque valeur affichée est strictement dérivée du plan structuré (audit des écrans restants, hors “synthetic fixture view”).
- **Trace XRP / réseau** : distinguer refus API/SDK, refus ledger, validation confirmée et rollback de résultat inconnu.

## 5) Référence exacte des preuves à citer (rapide)

- Orchestrateur IA : `packages/agents/src/orchestrator.ts`, `packages/agents/src/model-gateway.ts`, `apps/api/src/routes/agent.ts`, `apps/api/test/agent.test.ts`, `apps/api/src/services/agent-ops.ts`
- Résolution / calcul : `services/optimizer/*`, `packages/application/src/adapters/in-memory/simulated-optimizer-adapter.ts`, `packages/application/src/use-cases/get-personal-projection.ts`
- Trace ledger / XRPL : `packages/xrpl/*`, `docs/progress/augustin/evidence/*`, `docs/v2.2/hackathon.config.json`
- Gestion P0/P1 + isolation : `apps/api/src/composition.ts`, `docs/implementation-status.md`, `requirements.json`

## 6) Prompts réutilisables pour le rapport (CDC)

### Prompt A — Synthèse technique

Tu dois produire un bloc “Point 3” en FR (1 page) pour le rapport CDC Octro v2.2 en te limitant aux refs : `docs/v2.2/Octro_CDC_v2.2.md`, `requirements.json`, `architecture.md`.
Inclure 1 schéma texte, 1 liste “limites/risk checks”, et la distinction déterministe vs IA.

### Prompt B — Comparatif technique vs autres solutions XRPL

Produis une section objective (12-15 lignes) avec :
- ce qui est réalisé de façon provable,
- ce qui reste simulation,
- séparation déterministe / interprétation LLM,
- qualité de preuve (`hash`, `network_id`, preuve de ledger),
- 3 forces / 3 fragilités / 2 prochaines actions.

### Prompt C — Check-list CDC (3 colonnes)

Table de clôture :
1) ID d’exigence, 2) statut (Fait/Partiel/Restant), 3) preuve (fichier/test/preuve manquante).  
P0 d’abord, puis P1. Mentionner explicitement AGT-01, AGT-03, SPON-02, SPON-03, EVID-01, UI-02.
