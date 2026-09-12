# Octro v2.2 — Track 1 Loaded

Octro est un produit de prévision et de coordination financière pour les **particuliers, indépendants et entreprises**, tous publics P0. Une application React Native et un moteur commun permettent de comprendre les échéances, préserver l'essentiel et comparer les actions possibles, y compris sans dette.

**La v2.2 est la seule référence active de développement.** Le dépôt contient maintenant un client, une API, un moteur Python, des packages métier/agents/MCP/XRPL, des tests et des preuves réseau de test. Le degré de raccordement et les limites vérifiées sont résumés dans l'[état d’implémentation](docs/implementation-status.md) ; les preuves réseau ne signifient pas que l’interface soumet des transactions.

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
| SP0 de sponsoring natif observé ; politique et budgets applicatifs encore à livrer | SPON-01, SPON-02, SPON-03 |
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

L’API et l’interface sont raccordées au moteur Python pour la projection personnelle. Les données API sont encore en mémoire ; les utilitaires PostgreSQL existent mais ne sont pas injectés dans la composition API observée. S3, Stripe Identity et l’exécution XRPL ne sont pas des raccordements produit livrés. Fastify transporte les cas d’usage TypeScript ; le processus d’optimisation Python reste distinct. Voir les [frontières et l’état réel](docs/architecture.md) et la [note d’implémentation](docs/implementation-status.md).

## État réseau et preuves

Le registre de configuration relève le Custom Hackathon Devnet Track 1, `network_id: 4001`, SDK `xrpl` `5.2.0`, ledger observé et capacités indiquées vérifiées. G0 et un Payment validé sont documentés dans [g0-network-and-payment.json](docs/progress/augustin/evidence/g0-network-and-payment.json). La confirmation mentor de V1 est encore marquée manquante dans le registre de démo. Les pièces prouvent des essais XRPL de test, pas un raccordement d’exécution dans l’application.

Le chapitre 16 du CDC énumère les transactions candidates du parcours : `VaultCreate`, `VaultDeposit`, `LoanBrokerSet`, `LoanBrokerCoverDeposit` si applicable, `LoanSet`, `LoanPay`, `VaultWithdraw`. Le mapping exact doit être observé sur la V1 et la version SDK stable verrouillée après smoke test. La liste n'est pas une déclaration d'intégration réussie. Ne pas inventer une transaction `Drawdown` ; constater le décaissement dans les effets ledger.

Le [cycle de prêt et le retrait avec rendement](docs/progress/augustin/evidence/a3-loan-full-cycle.json), le [cycle Credentials/Domains](docs/progress/augustin/evidence/a4-credentials-domains-full-cycle.json), le [SP0 sponsoring](docs/progress/augustin/evidence/a6-sponsorship-sp0.json) et le [test DID](docs/progress/augustin/evidence/a6-did-resolution-and-replay.json) ont des fichiers d’observation distincts. Le [registre template](docs/v2.2/demo-evidence.template.json) reste un modèle vierge ; les [données Lina](docs/v2.2/personal.fixture.json) restent synthétiques. Les rapports DevEx doivent provenir des observations réelles des développeurs (DEVEX-01, DEVEX-02, EVID-01).

## Contrats et préparation du développement

Le [schéma de proposition](docs/v2.2/plan.schema.json) et son [exemple](docs/v2.2/plan.example.json) conservent `schema_version: "2.1"` conformément au pack v2.2. Il s'agit d'un contrat hérité, limité à `proposal_only`, et non d'une seconde version active du CDC, d'une API complète ou d'une autorisation financière.

Chaque tâche doit citer les identifiants existants de [requirements.json](requirements.json), leur priorité, propriétaire et critère d'acceptation. Les invariants, paramètres et exigences proviennent du pack ; seuls les chemins `normative_files` du manifeste racine sont adaptés au dépôt. Sa [copie originale](docs/v2.2/requirements.json) reste inchangée.

## Installation et vérifications

Avec Node.js et Python installés, depuis la racine :

```powershell
npm ci
npm run ci
```

Pour la démo web, lancer d’abord l’API dans un terminal, puis Expo dans un autre :

```powershell
npm run dev --workspace @octro/api
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:3000"
npm run start --workspace @octro/client -- --port 8082 --offline
```

Ou lancer les deux images vérifiées ensemble ; Nginx relaie alors `/api` vers le service API sans figer une adresse `localhost` dans le bundle :

```powershell
docker compose up --build
```

Les projections actuelles portent sur des données déclarées/synthétiques et le client présente les transactions XRPL en replay lecture seule. Les détails d’exécution et les critères ouverts sont dans [docs/implementation-status.md](docs/implementation-status.md). Aucun secret, seed, identité de capture, code d’invitation ou réglage personnel ne doit entrer dans le dépôt.
