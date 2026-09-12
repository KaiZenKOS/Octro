# Octro v2.2 — Track 1 Loaded

Octro est un produit de prévision et de coordination financière pour les **particuliers, indépendants et entreprises**, tous publics P0. Une application React Native et un moteur commun permettent de comprendre les échéances, préserver l'essentiel et comparer les actions possibles, y compris sans dette.

**La v2.2 est la seule référence active de développement.** Ce dépôt contient actuellement la documentation et l'arborescence ; cet alignement ne livre aucun code applicatif ni résultat de test réseau.

## Références actives

Lire ensemble le [CDC v2.2](docs/v2.2/Octro_CDC_v2.2.md), les [62 exigences](requirements.json) et la [configuration Track 1 Loaded](docs/v2.2/hackathon.config.json). L'[index documentaire](docs/README.md) décrit toutes les annexes et leur statut. Le [PDF v2.2](docs/v2.2/Octro_CDC_v2.2.pdf) et sa [source LaTeX](docs/v2.2/Octro_CDC_v2.2.tex) sont conservés à l'identique du pack fourni.

L'[architecture validée](docs/architecture.md) précise les frontières du monorepo, notamment `packages/application/`. Les instructions de développement sont dans [AGENTS.md](AGENTS.md) ; [CLAUDE.md](CLAUDE.md) renvoie aux mêmes références.

Les [archives v2.0](docs/archive/v2.0/) servent uniquement à l'historique. **Les archives ne sont pas des instructions de développement** et ne doivent pas être chargées comme sources actives. Les mentions historiques v2.0/v2.1 conservées dans le pack ne réactivent pas ces versions.

## Périmètre décidé

| Décision | Exigences du pack |
| --- | --- |
| Workspace personnel sans `Organization` obligatoire | PER-03, ACC-01 |
| Saisie, import et prévisions accessibles sans wallet, DID, KYC ni crédit | ACC-01, ACC-02, PER-11, NET-02 |
| Options sans dette, dépenses essentielles et réserves protégées | PER-01, PER-02, PER-05 |
| Trois parcours : personnel, indépendant, organisation | UI-01, PER-10 |
| Track 1 Loaded, Lending Protocol V1, vault ouvert | HACK-01, HACK-02, HACK-03 |
| Credentials et Permissioned Domains : extension Loaded principale P0 | LOAD-01, LOAD-02, LOAD-03 |
| Sponsoring P1, désactivé jusqu'à vérification des capacités réseau et réussite de SP0 | SPON-01, SPON-02, SPON-03 |
| DID facultatif P1, distinct de l'éligibilité | DID-01, DID-02 |

Une capacité financière indisponible ne bloque pas les prévisions. L'IA explique des résultats structurés ; elle ne calcule pas les montants de référence, ne signe pas et ne soumet pas de transactions (UI-02, AGT-02, AGT-03, MCP-02).

## Architecture et arborescence

| Emplacement | Responsabilité |
| --- | --- |
| `apps/client/` | Application React Native/Expo, priorité web responsive |
| `packages/domain/` | Objets et règles métier indépendants des infrastructures |
| `packages/application/` | Cas d'usage et ports ; orchestration et autorisations communes |
| `apps/api/`, `apps/worker/`, `packages/mcp/` | Entrées vers les mêmes cas d'usage applicatifs |
| `packages/contracts/` | Contrats de données et interfaces partagés |
| `packages/xrpl/` | Adaptateurs ledger : Lending V1, Credentials, Domains, sponsoring et interface wallet |
| `services/optimizer/` | Calcul Python déterministe, indépendant de FastAPI, du SDK XRPL et du LLM |
| `packages/agents/` | Orchestration bornée et explications via outils autorisés |
| `packages/ui/` | Composants et tokens d'interface |
| `infra/`, `fixtures/`, `tests/`, `docs/` | Déploiement, données synthétiques, vérifications et documentation |

PostgreSQL, S3, Stripe Identity et XRPL sont des adaptateurs derrière les ports applicatifs. API, workers et MCP n'implémentent pas de chemins métier ou d'autorisation parallèles. FastAPI est une enveloppe de transport éventuelle du calcul Python, pas le moteur de calcul. Voir les [dépendances autorisées](docs/architecture.md).

## État réseau et preuves

Le pack fixe le Custom Hackathon Devnet pour le Track 1 V1. Les adresses publiques et les capacités attendues sont dans [hackathon.config.json](docs/v2.2/hackathon.config.json). `network_id` et la version exacte du SDK restent `null`, `ledger_verified` reste `false` et les capacités restent `unverified` : cet alignement documentaire ne réalise ni G0, ni SP0, ni transaction.

Le chapitre 16 du CDC énumère les transactions candidates du parcours : `VaultCreate`, `VaultDeposit`, `LoanBrokerSet`, `LoanBrokerCoverDeposit` si applicable, `LoanSet`, `LoanPay`, `VaultWithdraw`. Le mapping exact doit être observé sur la V1 et la version SDK stable verrouillée après smoke test. La liste n'est pas une déclaration d'intégration réussie. Ne pas inventer une transaction `Drawdown` ; constater le décaissement dans les effets ledger.

Le [registre de preuves](docs/v2.2/demo-evidence.template.json) reste un modèle non exécuté. Les [données personnelles d'exemple](docs/v2.2/personal.fixture.json) sont synthétiques et ne constituent pas des preuves réseau. Les rapports DevEx doivent provenir des observations réelles des développeurs (DEVEX-01, DEVEX-02, EVID-01).

## Contrats et préparation du développement

Le [schéma de proposition](docs/v2.2/plan.schema.json) et son [exemple](docs/v2.2/plan.example.json) conservent `schema_version: "2.1"` conformément au pack v2.2. Il s'agit d'un contrat hérité, limité à `proposal_only`, et non d'une seconde version active du CDC, d'une API complète ou d'une autorisation financière.

Chaque tâche doit citer les identifiants existants de [requirements.json](requirements.json), leur priorité, propriétaire et critère d'acceptation. Les invariants, paramètres et exigences proviennent du pack ; seuls les chemins `normative_files` du manifeste racine sont adaptés au dépôt. Sa [copie originale](docs/v2.2/requirements.json) reste inchangée.

Il n'existe pas encore de commande de lancement applicatif ni de lockfile validé à annoncer. Les versions exactes, contrats OpenAPI et procédures de lancement seront ajoutés lors de leur implémentation et vérification. Aucun secret, seed, identité de capture, code d'invitation ou réglage personnel ne doit entrer dans le dépôt.
