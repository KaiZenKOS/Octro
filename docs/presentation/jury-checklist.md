# Checklist CDC → Rapport jury — Octro v2.2 Track 1 Loaded

Date : `2026-09-13`. Source exclusive du statut : `requirements.json` (texte `must`/`acceptance` faisant foi) vérifié contre le code réel et les preuves sous `docs/progress/augustin/evidence/`. **`docs/implementation-status.md` n'a pas été utilisé comme source** : plusieurs de ses lignes citent un `must` différent de celui de `requirements.json` pour le même ID (détail en bas de page) et marquent « Vérifié » des exigences sans aucune implémentation trouvée. Une case non exécutée reste à faire, conformément au chapitre 33 du CDC.

## Résumé (pour la diapositive de clôture)

| État | Nombre | Part |
| --- | --- | --- |
| Fait | 38 | 61 % |
| Partiel | 12 | 19 % |
| À faire | 12 | 19 % |

**Le socle XRPL/Loaded (G0, vault/courtier/prêt, Credentials/Domains, DID, sponsoring SP0) est la partie la mieux prouvée du dépôt** — hash, `ledger_index` et `validated` réels pour chaque étape. **La couche transactionnelle applicative attendue par le CDC (idempotence SEC-02/03, réservation d'exposition SEC-05, audit corrélé OPS-01, sauvegarde OPS-03, vérification webhook CMP-01) n'a aucune implémentation trouvée**, malgré des statuts « Vérifié » ailleurs dans le dépôt. L'orchestration agentique et le MCP fonctionnent mais restent une démonstration à 2-3 appels avec des réponses codées en dur pour le seul profil personnel (Lina) ; indépendant et organisation ne sont pas encore raccordés au moteur.

---

## 1) Déjà fait

| Exigence ID | État | Justification technique | Preuve | Prochaine action |
| --- | --- | --- | --- | --- |
| DATA-01 | Fait | Contrainte SQL unique tenant+source, pas seulement applicative | `infra/db/migrations/0003_workspaces_events.sql:35` | — |
| DATA-02 | Fait | Prévision et solde confirmé restent deux champs distincts du contrat | `packages/contracts/src/projection.ts`, `get-personal-projection.ts` | — |
| DATA-03 | Fait | Regex rejette les floats, `AssetId` typé (fiat/XRP/token) | `packages/contracts/src/primitives.ts:12` | — |
| ENG-02 | Fait | Montant arrondi puis contrainte revérifiée ; échec = exception, jamais exposé exécutable | `personal_engine.py:145-155` | — |
| ENG-03 | Fait | CVaR fermé (Rockafellar-Uryasev) exact ; fixture CDC [0,0,100]→CVaR₉₅=100 passe | `octro_optimizer/cvar.py`, `test_cvar.py` | — |
| ENG-04 | Fait | `INFEASIBLE` retourné sans ordre financier si besoin > plafonds cumulés | `financing.py::FinancingDiagnostic`, `test_financing.py` | — |
| ENG-05 | Fait | Dette restant après l'horizon renvoyée comme `terminal_debt`, jamais annulée | `financing.py::run_amortization` | — |
| AGT-02 | Fait | Aucun outil de signature/soumission accessible au LLM, absence confirmée dans tout `packages/agents` et `packages/mcp` | grep exhaustif, aucune occurrence | — |
| AGT-03 | Fait | Fallback déterministe sans clé API fonctionnel | `packages/agents/src/model-gateway.ts::DeterministicModelGateway` | — |
| SEC-01 | Fait | `assertSameTenant` systématique, testé en E2E croisé | `packages/domain/src/workspace.ts`, `apps/api/test/e2e-session-workspace.test.ts` | — |
| SEC-04 | Fait | Scan de secrets exécuté à chaque PR en CI | `.github/workflows/ci.yml` | — |
| OPS-02 | Fait | `npm ci` (lockfile strict), typecheck, build, tests et scan secrets en CI | `.github/workflows/ci.yml` | — |
| XRP-01 | Fait | Réseau/amendements relevés, `Payment` de base validé (hash + ledger_index) | `docs/progress/augustin/evidence/g0-network-and-payment.json` | — |
| XRP-02 | Fait | Cycle vault→dépôt→courtier→prêt→décaissement réel avec hashes conservés | `a3-loan-full-cycle.json` | — |
| XRP-03 | Fait | Résultat confirmé avant `CONFIRMED`, pas sur simple `submit` | `packages/xrpl/src/lending-v1.ts::XrplLendingV1Adapter` | — |
| XRP-04 | Fait | Remboursement conforme à l'échéancier et à l'identité emprunteur | `a3-multipayment-schedule.json` | — |
| HACK-01 | Fait | G0 verrouillé : réseau, SDK `xrpl@5.2.0`, `Payment` validé avec preuve | `docs/v2.2/hackathon.config.json`, `g0-network-and-payment.json` | — |
| HACK-02 | Fait | Vault, dépôt, broker, prêt, décaissement, remboursement, retrait avec rendement tous observés | `a3-loan-full-cycle.json`, `a3-vault-withdraw.json` | — |
| HACK-03 | Fait | Refus réel avec code observé et solde rapproché (voir aussi AC-L04) | `a3-vault-broker-loanset-attempt.json` | — |
| LOAD-01 | Fait | Dépôt refusé (`tecNO_AUTH`) sans attestation puis accepté (`tesSUCCESS`) avec attestation, tx distinctes | `packages/xrpl/src/credentials-domains.ts`, `a4-credentials-domains-full-cycle.json` | — |
| LOAD-02 | Fait | Décisions prêteur/emprunteur séparées et testées côté application | `apps/api/src/routes/lending.ts`, `apps/api/test/lending.test.ts` | — |
| LOAD-03 | Fait | Sortie de parts existantes observée après expiration d'attestation | `a4-credentials-domains-full-cycle.json` | — |
| SPON-01 | Fait | SP0 confirmé par deltas de solde réels (sponsor paie, sponsee non) | `a6-sponsorship-sp0.json` | — |
| DID-01 | Fait | Résolution DID réelle, réseau conforme | `packages/xrpl/src/did.ts`, `a6-did-resolution-and-replay.json` | — |
| DID-02 | Fait | Rejeu mauvais réseau (`telWRONG_NETWORK`) et mauvais signataire (`tefBAD_AUTH`) réellement rejetés | `a6-did-resolution-and-replay.json` | — |
| WAL-01 | Fait | Wallet auto-provisionné à l'inscription, seed chiffré AES-GCM, idempotent | `provision-wallet.ts`, `node-aes-gcm-adapter.ts` | — |
| REL-01 | Fait | Bascule mock/réel par variable d'environnement explicite, jamais de mélange silencieux | `apps/api/src/composition.ts:218-224` | — |
| SEC-LOAD-01 | Fait | AES-256-GCM sur seeds et tokens, IV unique | `node-aes-gcm-adapter.ts` | — |
| ARCH-LOAD-01 | Fait | `packages/domain` sans dépendance à un SDK XRPL, vérifiable par `package.json` | `packages/domain/package.json` | — |
| NET-02 | Fait | Capacité réseau non prouvée bloque le financement, jamais la prévision | séparation `ApproveFinancingActionUseCase` vs `GetPersonalProjectionUseCase` | — |
| ACC-01 | Fait | Projection accessible sans compte/wallet/DID | `apps/client/src/screens.tsx`, `POST /v1/projections` | — |
| ACC-02 | Fait | Retirer les capacités crédit laisse saisie/import/projection actifs | `GetPersonalProjectionUseCase` indépendant du KYC | — |
| ACC-03 | Fait | i18n FR/EN et rôles ARIA présents dans le client | `apps/client/src/account-screens.tsx` | — |
| PER-01 | Fait | Fixture Lina : transfert 230 € proposé sans prêt | `test_personal_no_debt.py` | — |
| PER-02 | Fait | Réserve protégée = contrainte dure, jamais réduite automatiquement | `personal_engine.py` | — |
| PER-03 | Fait | Contrainte SQL `personal_no_org` : impossible d'attacher une Organization à un Workspace personnel | `0003_workspaces_events.sql:11` | — |
| PER-04 | Fait | Transfert modélisé en deux jambes liées, aucun revenu fabriqué | `personal_engine.py` (action typée `own_funds_transfer`) | — |
| PER-05 | Fait | Diagnostic honnête sans recommandation inventée si infaisable | `personal_engine.py::NoDebtDiagnostic` | — |

## 2) En cours (partiel — la brique existe mais n'est pas complète ou pas généralisée)

| Exigence ID | État | Justification technique | Preuve | Prochaine action |
| --- | --- | --- | --- | --- |
| ENG-01 | Partiel | Reproductible et déterministe sur la fixture personnelle, mais calcul fermé spécifique — pas un MPC multi-scénario générique | `personal_engine.py`, `test_personal_no_debt.py` | Documenter explicitement la portée (fixture-spécifique) dans le rapport, ne pas revendiquer un MPC général |
| AGT-01 | Partiel | `maxToolCalls = 12` est une constante jamais testée en boucle réelle ; le flux ne fait que 2 appels fixes, pas le graphe à 6 étapes du CDC | `packages/agents/src/orchestrator.ts` | Nommer clairement la démo comme « raccourci borné », pas le graphe complet, dans le pitch |
| MCP-02 | Partiel | Vrai : aucun outil ne signe/soumet. Non prouvé : séparation Docs MCP / MCP métier ; les 3 outils métier renvoient des réponses codées en dur, pas branchées aux cas d'usage | `packages/mcp/src/server.ts` | Documenter le hardcoding dans le rapport plutôt que le présenter comme branché |
| UI-01 | Partiel | Les 5 écrans existent pour Lina ; indépendant et organisation restent des vues texte non recalculées par le moteur | `apps/client/src/screens.tsx::Audience` | Prioriser le branchement du moteur pour au moins un second profil avant la démo |
| UI-02 | Partiel | Vrai pour le scénario Lina ; le client affiche lui-même une note « recalcul non raccordé » pour indépendant/organisation | `apps/client/src/screens.tsx` | Auditer les écrans restants avant de revendiquer UI-02 en entier |
| PER-06 | Partiel | Vrai pour Lina (import ≠ `provider_verified`) ; non revérifié sur les deux autres profils faute de branchement moteur | `apps/client/src/screens.tsx` | Étendre le test aux profils indépendant/organisation |
| PER-07 | Partiel | Vrai pour Lina (acquittement ≠ fonds transférés) ; idem limite ci-dessus | `apps/client/src/screens.tsx` | Idem |
| PER-08 | Partiel | Onboarding mesurable en théorie ; aucun résultat de test utilisateur (3 novices) consigné trouvé dans le dépôt | `docs/progress/kevin/user-testing-report.md` (à vérifier son contenu) | Consigner un résultat réel avant le rapport, sinon marquer objectif non mesuré |
| PER-09 | Partiel | Isolation tenant réelle (SEC-01) implique l'absence de fuite employeur/foyer, mais aucun test dédié au cas foyer/employeur nommé | `packages/domain/src/workspace.ts` | Ajouter un test explicite nommé PER-09 |
| PER-10 | Partiel | Seule la démo personnelle (Lina) est réellement rejouable de bout en bout sur le moteur ; indépendant et organisation ne le sont pas encore | `apps/client/src/screens.tsx::Audience` | Blocant pour la recette : brancher au moins l'un des deux profils restants |
| PER-11 | Partiel | Prévision persiste sans session Stripe — mais aucun système Stripe Identity n'existe pour comparer (voir CMP-01) | absence de code Stripe | Clarifier dans le rapport que le « sans Stripe » est vrai par absence totale du composant, pas par conception progressive |
| EVID-01 | Partiel | Preuves réelles et honnêtes (hash, rejets distingués) mais dispersées en 9 fichiers JSON ad hoc, pas de registre consolidé interrogeable | `docs/progress/augustin/evidence/*.json` | Consolider en un registre unique avant la démo si le temps le permet ; sinon le dire tel quel |

## 3) Restant bloquant (aucune preuve d'implémentation trouvée)

| Exigence ID | État | Justification technique | Preuve | Prochaine action |
| --- | --- | --- | --- | --- |
| SEC-02 | À faire | `idempotency_key` existe seulement comme champ de schéma Zod ; aucune déduplication persistée, aucun `409` sur corps différent implémenté | aucune logique serveur trouvée, seul `packages/contracts/src/execution.ts:22` | Implémenter le stockage clé→statut/empreinte de corps et le contrôle `409` avant toute démo de commande monétaire |
| SEC-03 | À faire | Aucun hash de termes lié à l'approbation ; le cas d'usage ne vérifie que rôle et capacité réseau, pas montant/termes | `packages/application/src/use-cases/approve-financing-action.ts` | Ajouter la vérification du hash des termes à l'approbation avant préparation/soumission |
| SEC-05 | À faire | Aucune réservation d'exposition transactionnelle trouvée dans `domain` ou `application` | aucune preuve trouvée | Implémenter une réservation atomique avant tout test de concurrence sur le prêt |
| CMP-01 | À faire | Aucun code Stripe/webhook dans tout le dépôt ; le « KYC » réel est un simulateur Odoo sans rapport avec Stripe Identity | recherche exhaustive, aucune correspondance | Soit implémenter la vérification de signature webhook Stripe, soit documenter clairement l'absence dans le rapport (ne pas la sous-entendre faite) |
| OPS-01 | À faire | `trace_id` existe seulement comme champ de schéma d'erreur ; aucune corrélation plan→approbation→exécution→hash ledger implémentée | `packages/contracts/src/errors.ts:33` (seule occurrence) | Câbler `trace_id` à travers OpenTelemetry a minima sur le chemin prêt |
| OPS-03 | À faire | Aucun script de sauvegarde/restauration trouvé sous `infra/` | aucune preuve trouvée | Documenter la procédure manuelle si le temps ne permet pas l'automatisation, sans revendiquer OPS-03 fait |
| SPON-02 | À faire | Le code lui-même documente l'absence : budget/quote applicatif renvoyé à une tâche non commencée | `packages/xrpl/src/sponsorship.ts:21-38` | Ne pas activer le sponsoring en démo live sans cette couche ; le dire explicitement au jury |
| SPON-03 | À faire | Même constat que SPON-02 : pas de séparation frais consommés / réserves immobilisées | `packages/xrpl/src/sponsorship.ts:21-38` | Idem |
| DEVEX-01 | À faire | Obligation humaine (installation/vérification du hook sur les 3 machines) ; aucune preuve de complétion dans le dépôt | à vérifier avec l'équipe | Chaque développeur confirme son état de hook avant soumission |
| DEVEX-02 | À faire | Rapport humain de 3 pages maximum non trouvé comme livrable finalisé | à vérifier avec l'équipe | Rédiger et vérifier la limite de 3 pages avant 12:30 |
| SUB-01 | À faire | Obligation de process (dépôt public, README, 10 slides max, pitch 4 min) ; non vérifiable en code, à confirmer côté logistique | `docs/presentation/pitch-deck.md` (à vérifier son état) | Vérifier le compte de slides et la présence du README avant 13:00 |
| REL-02 | À faire (hors périmètre hackathon) | Priorité `PILOT`, pas `P0` : gates légaux avant fonds réels, non requis pour la recette Track 1 | `requirements.json` (`priority: PILOT`) | Ne pas traiter comme bloquant pour la soumission ; le mentionner comme travail post-hackathon |

---

## Divergences trouvées dans `docs/implementation-status.md` (à corriger ou retirer avant impression du rapport)

Le texte `must` cité par `implementation-status.md` ne correspond pas à celui de `requirements.json` pour ces IDs, et la case « Vérifié » n'est pas confirmée par le code :

- **SEC-02** : décrit comme « validation stricte des entrées » (RFC 7807) — le vrai `must` est l'idempotence transactionnelle, non implémentée.
- **SEC-03** : décrit comme « idempotence des écritures financières » — c'est en réalité le `must` de SEC-02 recopié sur la mauvaise ligne ; le vrai `must` de SEC-03 (approbation liée aux termes) n'a aucune preuve.
- **SEC-05** : décrit comme « révocation immédiate des sessions » — le vrai `must` est la réservation atomique d'exposition, non implémentée.
- **CMP-01** : décrit comme « chiffrement au repos des secrets » — le vrai `must` est la vérification Stripe Identity/webhook ; aucun code Stripe n'existe dans le dépôt.
- **OPS-01** : décrit comme « santé/liveness (`/health`) » — le vrai `must` est l'audit et la corrélation de traces, non implémenté.
- **OPS-03** : décrit comme « arrêt gracieux sans coupure » — le vrai `must` est la sauvegarde et la reprise, non implémentée.
- **LOAD-01/02/03** : les fichiers cités comme preuve (`packages/domain/src/kyc.ts`, `simulate-kyc.ts`) sont du KYC applicatif (Stripe/Odoo) sans rapport avec Credentials/Permissioned Domains XRPL ; la vraie preuve est `packages/xrpl/src/credentials-domains.ts` et les fichiers `docs/progress/augustin/evidence/a4-*.json`, jamais cités.
- **PER-04, PER-06, PER-07, PER-08, PER-10, PER-11, WAL-01, DEVEX-01, DEVEX-02, SUB-01, REL-02** : le texte `must` cité diffère de celui de `requirements.json` (description d'une autre fonctionnalité ou d'un autre ID).

**Recommandation** : ne pas imprimer `docs/implementation-status.md` tel quel pour le jury ; utiliser cette page comme source corrigée, ou faire corriger `implementation-status.md` avant la soumission de 13:00.
