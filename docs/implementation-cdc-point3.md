# CDC v2.2 — Etat « point 3 » (version de travail)

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

## 2) Reste à faire (avant rapport jury)

- **AGT-01 / AGT-03 (niveau complet)** : rendre la chaîne agentique visible “collecter → analyser → simuler → expliquer → attendre décision → suivre” avec journal de degradation non-LLM et reprise propre.
- **SPON-02 / SPON-03** : finaliser le cas de sponsoring en état “non vérifié” proprement affiché dans le flux de preuve.
- **EVID-01 / OPS-03** : consolider le registre preuve “live” (fixtures vs exécutions réelles) avec liens de reproduction par scénario.
- **UI-02 (UX réelle)** : prouver que chaque valeur affichée est strictement dérivée du plan structuré (audit des écrans restants, hors “synthetic fixture view”).
- **Trace XPR / réseau** : distinguer explicitement refuser API/SDK/léger succès, refus ledger, validation confirmée, et rollback de résultat inconnu.

## 3) Point 3 — Prompts prêts à copier (SolAstra / Spark / autre)

### Prompt A — Synthèse technique « orchestrateur IA + moteur + XRPL »

```text
Tu dois produire un bloc “Point 3” pour le rapport CDC Octro v2.2.
Contraintes :
- Référence uniquement : CDC v2.2, requirements.json, architecture.md.
- Expliquer précisément :
  1) orchestration IA bornée (max 12 appels / garde-fou sans exécution),
  2) moteur OPT (MPC + CVaR + contraintes) et rôle du moteur Python isolé,
  3) quoi fait le code côté XRPL vs ce qui reste simulation.
- Sortie attendue : 1 page (FR), ton clair concours, avec 1 mini schéma texte et 1 liste de limites/risk checks.
```

### Prompt B — Comparatif technique et différenciation vs Ripple

```text
Prépare une section comparative objective (12-15 lignes) pour jury :
- Ce qu’OCTRO fait réellement vs ce qui est revendiquable sans exagération,
- Séparation calcul déterministe / interprétation LLM,
- qualité de preuve (hash/network_id/ledger evidence),
- limites résiduelles.
Format : 4 critères mesurables, 3 forces, 3 fragilités, 2 prochaines actions concrètes.
```

### Prompt C — Check-list CDC (3 colonnes pour slide de clôture)

```text
Crée une table pour la clôture :
- Col 1 : ID exigence,
- Col 2 : statut (Fait / Partiel / Restant),
- Col 3 : preuve (fichier, test, ou preuve manquante).

Contraintes :
- Utilise les IDs de requirements.json en clair.
- Inclure les items P0 d'abord, puis P1.
- Mentionner explicitement les points restants : AGT-01, AGT-03, SPON-02, SPON-03, EVID-01, UI-02.
```

### Prompt D — Résumé version “pitch jury” (si besoin)

```text
Écris une version de 6-8 lignes orientée juge/jury :
- ce qui a été livré,
- ce qui est robuste sans XRPL,
- ce qui est activé XRPL/Loaded,
- pourquoi la preuve est plus importante que la perfection visuelle.
```

## 4) Référence exacte des preuves à citer (rapide)

- Orchestrateur IA : `packages/agents/src/orchestrator.ts`, `packages/agents/src/model-gateway.ts`, `apps/api/src/routes/agent.ts`, `apps/api/test/agent.test.ts`
- Résolution / calcul : `services/optimizer/*`, `packages/application/src/adapters/in-memory/simulated-optimizer-adapter.ts`, `packages/application/src/use-cases/get-personal-projection.ts`
- Trace ledger / XRPL : `packages/xrpl/*`, `docs/progress/augustin/evidence/*`, `docs/v2.2/hackathon.config.json`
- Gestion P0/P1 + isolation : `apps/api/src/composition.ts`, `docs/implementation-status.md`, `requirements.json`