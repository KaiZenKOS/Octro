# Instructions de développement — Octro v2.2

## Références actives et portée

La **v2.2 est la seule référence active**. Lire ensemble avant toute tâche :

1. [CDC v2.2, 34 chapitres](docs/v2.2/Octro_CDC_v2.2.md).
2. [requirements.json, 62 exigences](requirements.json).
3. [Configuration Track 1 Loaded](docs/v2.2/hackathon.config.json).
4. [Architecture validée](docs/architecture.md) et [index des annexes](docs/README.md).

Les archives sous `docs/archive/` sont historiques, **jamais des instructions de développement**. Ne pas les importer dans les prompts, règles Claude ou contexte normatif d'une tâche. Le contrat de proposition `schema_version: "2.1"` est une annexe explicitement conservée par le pack v2.2 ; il ne réactive pas le CDC v2.1.

Le périmètre est décidé : particuliers, indépendants et entreprises sont P0 ; Track 1 Loaded, Lending Protocol V1, vault ouvert. Ne pas réduire le produit au B2B, changer de track ou étendre les mouvements de fonds pour satisfaire une démonstration. Documenter les conflits et décisions dans un ADR au lieu d'inventer une règle ; conserver le contenu original du pack.

## Exigences incontournables

- `PER-03`, `ACC-01` : un Workspace personnel ne requiert aucune Organization.
- `ACC-01`, `ACC-02`, `PER-11`, `NET-02` : saisie, import, calendrier et prévisions restent disponibles sans wallet, DID, KYC ni crédit. Une capacité réseau inconnue bloque la finance, pas la prévision.
- `PER-01`, `PER-02`, `PER-05` : comparer les options sans dette ; ne pas sacrifier silencieusement dépenses essentielles ou réserves protégées ; accepter un diagnostic sans solution.
- `LOAD-01`, `LOAD-02`, `LOAD-03` : Credentials et Permissioned Domains constituent l'extension Loaded principale ; distinguer droits du déposant, décision de crédit et contrôle ledger.
- `SPON-01`, `SPON-02`, `SPON-03` : sponsoring P1 soumis à SP0 et aux capacités effectives du réseau ; aucune activation sur une hypothèse.
- `DID-01`, `DID-02` : DID facultatif P1, jamais preuve suffisante de solvabilité ou d'éligibilité.
- `AGT-02`, `MCP-02`, `UI-02` : aucun outil LLM ne signe ou ne soumet ; les montants affichés proviennent du plan structuré.

## Frontières d'architecture

`packages/domain/` porte objets et règles métier. `packages/application/` porte cas d'usage et ports et dépend du domaine. Les entrées API, workers et MCP appellent ces mêmes cas d'usage, avec les mêmes autorisations, idempotence et transitions. PostgreSQL, S3, Stripe Identity et XRPL sont des adaptateurs qui implémentent les ports ; le domaine ne dépend pas de leurs SDK ni d'un framework de transport.

Le calcul dans `services/optimizer/` reste indépendant de FastAPI, du LLM et du SDK XRPL. Il reçoit des données et capacités normalisées ; FastAPI peut adapter son transport. Ni UI ni agent ne duplique le moteur financier. Les adaptateurs Loaded restent isolés (`ARCH-LOAD-01`). Les détails et responsabilités sont dans [docs/architecture.md](docs/architecture.md).

## Traçabilité et vérification

Pour chaque tâche, citer un ou plusieurs IDs existants du manifeste et leur critère d'acceptation ; ne pas renuméroter les exigences. Conserver priorités, propriétaires, invariants et paramètres du pack. Si les exigences évoluent, mettre à jour explicitement les références actives et documenter la décision ; ne pas laisser diverger silencieusement le manifeste racine et le pack conservé.

Adapter les vérifications au changement. Pour la documentation : liens relatifs, IDs, JSON, cohérence des références actives, différences de contenu et liste exacte des fichiers. Pour du code ultérieur : critères d'acceptation concernés, invariants financiers, isolation des espaces, idempotence et reprise ; séparer tests déterministes et tests Devnet.

G0 a été exécuté le 12 septembre 2026 : le registre actif fixe le NetworkID 4001, `xrpl` 5.2.0 et renvoie aux preuves observées (`HACK-01`, `XRP-01`). Cette observation ne remplace pas la confirmation mentor V1 encore ouverte et une configuration absente ou invalide doit rester fail-closed. Ne jamais remplir le registre de preuves avec les fixtures ; distinguer refus SDK/API, refus pré-inclusion, refus ledger validé, transactions validées, mocks et tests non exécutés (`EVID-01`, `REL-01`). Respecter `SEC-04` et `SEC-LOAD-01` : aucun secret, identité de capture, code d'invitation, accès Wi-Fi ou configuration personnelle dans Git.

Préserver les installations locales de capture et leurs correctifs. Les hooks de développement ne sont ni des agents produit ni des primitives ledger. Le rapport DevEx repose sur les observations personnelles réelles des développeurs (`DEVEX-01`, `DEVEX-02`) ; ne pas en fabriquer.
