# CDC v2.2 — Point 3 : orchestrateur, algorithmes, comparaison Ripple et checklist jury

Date : `2026-09-13`
Branche : `main`
Références actives : `docs/v2.2/Octro_CDC_v2.2.md`, `requirements.json`, `docs/architecture.md`

Ce document remplace la version de travail précédente (prompts à copier). Le contenu ci-dessous est le résultat rédigé, vérifié contre le code et les preuves réelles sous `docs/progress/augustin/evidence/`, pas une reformulation de `docs/implementation-status.md` — voir l'avertissement en fin de document.

---

## 1) Point 3 — Orchestrateur IA et algorithmes de décision

### 1.1 Comment agit l'orchestrateur IA (borné, MCP, sans signature)

Le Coordinator suit un graphe borné (chapitre 15) : collecter → analyser → simuler → expliquer → attendre décision → suivre, avec deux rôles LLM (Analyst, Explainer) qui ne portent aucun calcul financier de référence. Dans le code, `BoundedOrchestrator` (`packages/agents/src/orchestrator.ts`) implémente une version simplifiée : deux appels fixes (analyse puis explication), une constante `maxToolCalls = 12` conforme à AGT-01, et aucun outil de signature ou de soumission accessible au modèle (AGT-02) — confirmé par l'absence de ce type d'outil dans `packages/mcp/src/server.ts`, qui n'expose que trois lectures (résumé de compte, projection, explication de proposition). Une panne du fournisseur LLM bascule sur `DeterministicModelGateway`, qui préserve le parcours manuel (AGT-03). Le protocole MCP ne fait que transporter des appels déjà autorisés par l'API métier (jeton, scope, tenant) : il ne constitue ni un second chemin d'autorisation ni une preuve de confiance en soi (chapitre 15).

### 1.2 Comment le moteur choisit une action (MPC, CVaR, scénarios, contraintes)

Le CDC définit un cycle MPC — figer l'état, produire des scénarios pondérés (0,80 / 0,15 / 0,05), résoudre sous contraintes, revérifier en précision décimale après arrondi, demander validation, observer — et un objectif `min E[coûts] + λ·CVaR_α(L)` avec α = 0,95 (chapitres 13-14). Le code livre trois briques déterministes testées séparément plutôt qu'un solveur généraliste unique :

- `cvar.py` calcule le CVaR par la formule fermée de Rockafellar–Uryasev (moyenne pondérée de la queue de pertes), vérifiée sur la fixture canonique du CDC (pertes [0,0,100], poids [0,80 ; 0,15 ; 0,05] → CVaR₉₅ = 100, ENG-03).
- `personal_engine.py` calcule, sur l'horizon personnel de 30 jours, si un transfert de fonds propres suffit à préserver la réserve protégée ; la réserve et les dépenses essentielles sont des contraintes dures jamais relâchées, et le montant est revérifié après arrondi (ENG-02, PER-02, PER-05).
- `financing.py` alloue un besoin de financement à l'offre la moins chère d'abord (glouton), avec plafonds par offre et dette terminale conservée après l'horizon (ENG-05).

Ce n'est pas encore le solveur LP/MILP généraliste sous HiGHS que le chapitre 14 envisage pour le cas général (frais fixes, multi-actifs, CVaR comme contrainte plutôt que diagnostic séparé) : chaque propriété exigée par le CDC est prouvée sur les scénarios de démonstration, pas sur un plan de flux à variables couplées. Le classement lexicographique (écarter l'interdit, préférer le sans-dette, comparer coût/délai/réserve) est respecté par construction plutôt que par une couche de tri générique séparée.

### 1.3 Où XRPL intervient réellement, où c'est une simulation

Réel, avec preuve horodatée (hash, `ledger_index`, `validated=true`) dans `docs/progress/augustin/evidence/` :

- G0 : réseau, amendements et un `Payment` de base validés (`g0-network-and-payment.json`).
- Cycle complet vault → dépôt → courtier → prêt accepté → décaissement → remboursement → retrait avec rendement (`a3-loan-full-cycle.json`).
- Credentials/Domains : dépôt refusé sans attestation, accepté avec attestation, refusé après expiration (`a4-credentials-domains-full-cycle.json`) — extension Loaded principale.
- Sponsoring SP0 : frais réellement pris en charge par le sponsor, confirmé par les soldes avant/après (`a6-sponsorship-sp0.json`).
- DID : publication, résolution, rejeu refusé sur mauvais réseau et mauvais signataire (`a6-did-resolution-and-replay.json`).

Simulation ou non couvert :

- Le parcours personnel (transfert de fonds propres) ne touche jamais XRPL, par construction (chapitre 6) — voulu, pas une lacune.
- La politique applicative du sponsoring — budget, bénéficiaires autorisés, réservation/libération, anti-double-consommation (SPON-02/SPON-03) — n'est pas implémentée ; seule la primitive réseau (SP0) est prouvée. `packages/xrpl/src/sponsorship.ts` le documente lui-même explicitement.
- Les tests utilisent `FakeLendingV1Adapter` en CI ; seul `XrplLendingV1Adapter` (`packages/xrpl/src/lending-v1.ts`) parle au réseau réel, et `docs/architecture.md` isole ce choix du domaine et de l'optimiseur.

### 1.4 Mini-schéma texte

```
Client / Agents bornés (MCP lecture seule)
        │
        ▼
   API + Application (autorisation, idempotence, version attendue)
        │                                   │
        ▼                                   ▼
  Domaine (règles métier,           Calcul Python isolé
  aucun SDK ledger/LLM)             (CVaR, no-debt, financing)
        │
        ▼
  Approbation → Signature (hors LLM/MCP) → Adaptateur XRPL → Ledger → Réconciliation
                                                   │
                                  (chemin organisation/prêt uniquement ;
                                   le chemin personnel s'arrête à "Approbation")
```

### 1.5 Limites et risques restants

- Orchestrateur : raccourci à 2 appels, pas encore la machine d'état à 6 étapes normative du chapitre 15.
- Outils MCP : réponses câblées en dur (fixture Lina), pas reliées aux cas d'usage réels ni aux namespaces `data.*`/`engine.*` du chapitre 15.
- Moteur : pas de solveur LP/MILP unifié ; garanties prouvées localement, pas sur un plan combiné multi-actifs/multi-scénarios.
- Sponsoring : primitive réseau prouvée (SP0), couche budget/révocation (SPON-02/03) manquante — risque de double consommation si activée sans elle.
- Registre de preuves : fichiers JSON par scénario, pas encore un registre consolidé interrogeable (EVID-01 partiel).
- Couche transactionnelle applicative (idempotence SEC-02/03, réservation d'exposition SEC-05, audit corrélé OPS-01, sauvegarde OPS-03) : aucune implémentation trouvée — voir checklist section 3.

---

## 2) Comparaison technique Octro vs Ripple

Les publications Ripple (S1-S4) présentent déjà XLS-65/66 comme une infrastructure de crédit avec décision/risque hors chaîne et exécution sur ledger : la séparation calcul/exécution qu'Octro utilise n'est donc pas une invention d'Octro. Le 10 septembre 2026, Ripple a étendu GSmart dans Ripple Treasury en revendiquant explicitement cette même séparation entre calcul déterministe et interprétation IA, au niveau institutionnel. La différence observable ne tient donc pas à l'architecture mais à la preuve : Octro publie, pour chaque primitive Track 1 Loaded revendiquée, une évidence JSON par étape (hash, `ledger_index`, `validated`, soldes avant/après) plutôt qu'une affirmation narrative — G0, cycle vault/courtier/prêt, gating Credentials/Domains, sponsoring SP0, rejeu DID refusé. Ripple cible la trésorerie institutionnelle ; Octro démontre en plus un accès personnel sans société, sans wallet et sans crédit sur le même moteur, un périmètre que les communications Ripple ne couvrent pas. Le risque opérationnel diffère par surface d'exposition : le sponsoring d'Octro ne prouve que la primitive réseau (SP0), sa couche applicative de budget et de révocation (SPON-02/03) n'existe pas encore et doit rester désactivée en démonstration live plutôt que présumée sûre. La spécification d'Octro refuse elle-même de présupposer un succès réseau avant preuve d'exécution (`requirements.json: network_verification = not_performed_in_document_delivery`), posture plus falsifiable qu'une promesse de gouvernance IA. Octro reste distinct sur Track 1 Loaded précisément parce qu'il montre un contrôle d'accès Credentials/Domains bout en bout sur un vault privé (refus→acceptation→refus après expiration) avec effets ledger réels : une revendication plus étroite et plus vérifiable qu'un récit d'infrastructure institutionnelle générale.

**4 critères objectifs**

1. Preuve par transaction (hash + `ledger_index` + `validated`) disponible pour chaque primitive revendiquée — taux de couverture mesurable.
2. Séparation vérifiable calcul déterministe / interprétation LLM — absence d'outil de signature accessible au modèle, vérifiable par inspection du code.
3. Portée d'audience démontrée sans compte entreprise ni wallet (workspace personnel) — présente ou absente dans le code.
4. Couverture des cas d'échec protocolaires (refus réel, expiration, résultat inconnu réconcilié) — nombre de cas AC-L01 à AC-L13 couverts avec preuve vs attendus.

**3 forces**

1. Chaîne de preuve horodatée et falsifiable par scénario, distincte de toute affirmation marketing.
2. Accès personnel sans levier construit sur le même moteur que le cas organisation, élargissant le public au-delà de la trésorerie institutionnelle.
3. Frontière architecturale stricte entre agents (MCP lecture seule) et calcul/exécution, vérifiable par simple absence d'outil de signature.

**3 limites**

1. Moteur d'optimisation spécialisé par scénario, pas un solveur LP/CVaR généralisé comme envisagé pour le cas général.
2. Couche applicative de sponsoring (budget, révocation, anti-double-consommation) non implémentée.
3. Orchestrateur agentique réduit à deux appels, pas la machine d'état à six étapes normative.

**2 améliorations réalistes**

1. Unifier CVaR/no-debt/financing derrière un solveur LP (scipy/HiGHS) partagé, pour des scénarios combinés sans multiplier les modules ad hoc.
2. Implémenter SPON-02/03 (réservation atomique, révocation) avec tests de concurrence avant toute exposition du sponsoring en démonstration live.

---

## 3) Checklist CDC-to-report pour le jury

La checklist complète (62 exigences, colonnes ID / État / Justification technique / Preuve / Prochaine action, organisée en trois sections déjà fait / en cours / restant bloquant) est dans **[docs/presentation/jury-checklist.md](presentation/jury-checklist.md)**.

Résumé : **38 Fait, 12 Partiel, 12 À faire** sur 62. Le socle XRPL/Loaded est la partie la mieux prouvée du dépôt. La couche transactionnelle applicative (SEC-02, SEC-03, SEC-05, CMP-01, OPS-01, OPS-03) n'a aucune implémentation trouvée malgré des statuts « Vérifié » dans `docs/implementation-status.md`. Seul le profil personnel (Lina) est réellement rejoué de bout en bout sur le moteur ; indépendant et organisation restent des écrans texte non recalculés (PER-10 partiel).

---

## 4) Avertissement — divergences dans `docs/implementation-status.md`

Une vérification systématique des 62 IDs de `requirements.json` contre le code (pas contre `docs/implementation-status.md`) a trouvé que ce dernier fichier :

- décrit un `must` différent de celui de `requirements.json` pour plusieurs IDs (SEC-02, SEC-03, SEC-05, CMP-01, OPS-01, OPS-03, PER-04, PER-06, PER-07, PER-08, PER-10, PER-11, WAL-01, DEVEX-01, DEVEX-02, SUB-01, REL-02) ;
- marque « Vérifié » des exigences pour lesquelles aucune implémentation n'a été trouvée dans le code (notamment SEC-02, SEC-03, SEC-05, CMP-01, OPS-01, OPS-03) ;
- cite pour LOAD-01/02/03 des fichiers KYC/Odoo (`packages/domain/src/kyc.ts`, `simulate-kyc.ts`) sans rapport avec Credentials/Permissioned Domains XRPL, alors que la vraie preuve (`packages/xrpl/src/credentials-domains.ts`, `docs/progress/augustin/evidence/a4-*.json`) existe et n'est jamais citée.

Détail complet des divergences en fin de [jury-checklist.md](presentation/jury-checklist.md). Recommandation : ne pas imprimer `docs/implementation-status.md` tel quel pour le jury ; utiliser la checklist ci-dessus comme source corrigée, ou faire corriger `implementation-status.md` avant la soumission de 13:00.

## 5) Référence exacte des preuves à citer

- Orchestrateur IA : `packages/agents/src/orchestrator.ts`, `packages/agents/src/model-gateway.ts`, `apps/api/src/routes/agent.ts`
- MCP métier : `packages/mcp/src/server.ts` (3 outils lecture seule, réponses codées en dur)
- Moteur de calcul : `services/optimizer/octro_optimizer/{cvar,personal_engine,financing}.py` et leurs tests
- Trace ledger / XRPL : `packages/xrpl/src/{lending-v1,credentials-domains,sponsorship,did}.ts`, `docs/progress/augustin/evidence/*.json`, `docs/v2.2/hackathon.config.json`
- Checklist jury : `docs/presentation/jury-checklist.md`
