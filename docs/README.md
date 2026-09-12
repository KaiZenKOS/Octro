# Documentation Octro

La [préparation de l'infrastructure](infra/backend-configuration.md) décrit les services fournis, les variables sans secrets et les raccordements encore à réaliser ; voir aussi l'[ADR des adaptateurs](adr/0001-provided-infrastructure.md). L'[état d’implémentation](implementation-status.md) distingue le code présent, les adaptateurs raccordés, les preuves réseau observées et les parcours encore non livrés.

**Version active unique : Octro v2.2 — particuliers, indépendants et entreprises — Track 1 Loaded.** Les archives ne sont pas des instructions de développement.

## Références normatives

- [CDC v2.2](v2.2/Octro_CDC_v2.2.md) : 34 chapitres.
- [Exigences du dépôt](../requirements.json) : les 62 IDs, priorités, propriétaires, critères d'acceptation, invariants et paramètres du pack ; seul le champ `normative_files` utilise les chemins du dépôt.
- [Configuration Track 1 Loaded](v2.2/hackathon.config.json) : Track 1 / Loaded / V1, vault ouvert, snapshot G0 `network_id: 4001` et SDK `xrpl` `5.2.0`, avec références de preuves ; la confirmation mentor V1 reste à obtenir dans le registre consolidé.
- [Architecture validée](architecture.md) : précision des chapitres 9, 23 et 31, avec couche application et ports distincts du domaine.

Les renvois par nom de fichier dans le CDC et le manifeste original se résolvent dans `docs/v2.2/`. Le manifeste à la racine adapte ces renvois pour les outils du dépôt. Les mentions d'éditions antérieures dans le texte conservé sont historiques ; elles ne constituent aucune instruction active supplémentaire.

## Annexes normatives et preuves d'exécution

Le contenu normatif du pack v2.2 reste la référence. Le registre de configuration documente maintenant des observations de test datées ; les statuts des preuves sont conservés dans des fichiers séparés et ne transforment pas les exigences en recette entièrement satisfaite.

| Fichier | Usage |
| --- | --- |
| [Octro_CDC_v2.2.md](v2.2/Octro_CDC_v2.2.md) | Texte du CDC |
| [Octro_CDC_v2.2.pdf](v2.2/Octro_CDC_v2.2.pdf) | Version mise en page, 30 pages |
| [Octro_CDC_v2.2.tex](v2.2/Octro_CDC_v2.2.tex) | Source de composition |
| [README du pack](v2.2/README.md) | Portée et compilation de la source |
| [requirements.json original](v2.2/requirements.json) | Registre fourni, inchangé |
| [hackathon.config.json](v2.2/hackathon.config.json) | Track 1 Loaded, network_id 4001, SDK 5.2.0, capacités observées et liens de preuves |
| [plan.schema.json](v2.2/plan.schema.json) | Contrat minimal `proposal_only`, hérité en version 2.1 |
| [plan.example.json](v2.2/plan.example.json) | Exemple personnel conforme à ce contrat |
| [personal.fixture.json](v2.2/personal.fixture.json) | Scénario Lina synthétique ; pas une observation réelle |
| [demo-evidence.template.json](v2.2/demo-evidence.template.json) | Modèle de preuves vide, `template_not_executed` |
| [design.tokens.json](v2.2/design.tokens.json) | Tokens documentaires et d'interface |
| [common-engine.pdf](v2.2/assets/common-engine.pdf) | Figure du moteur commun |
| [lina-cashflow.pdf](v2.2/assets/lina-cashflow.pdf) | Figure de trésorerie synthétique |

Les fichiers d'observation pertinents : [G0 et Payment](progress/augustin/evidence/g0-network-and-payment.json), [cycle Lending V1](progress/augustin/evidence/a3-loan-full-cycle.json), [Credentials/Domains](progress/augustin/evidence/a4-credentials-domains-full-cycle.json), [sponsoring SP0](progress/augustin/evidence/a6-sponsorship-sp0.json), [DID et replay](progress/augustin/evidence/a6-did-resolution-and-replay.json) et [registre consolidé de démo](progress/augustin/evidence/demo-evidence.run-2026-09-12.json). Le registre [template](v2.2/demo-evidence.template.json) reste vide. Le client affiche un replay de certaines preuves en lecture seule ; il n'interroge ni ne signe sur le ledger.

La version `2.1` du schéma et de l'exemple est volontairement conservée par la livraison v2.2. Elle décrit une proposition, pas une API complète, une autorisation de transaction ou une ancienne spécification active. Aucun nouveau DOCX v2.2 n'est fourni par le pack.

## Archives et instructions

Les trois fichiers v2.0 ont été déplacés sans modification sous [archive/v2.0/](archive/v2.0/). Voir la [règle d'archivage](archive/README.md). Ne pas charger les archives dans le contexte de développement.

Les instructions de [Codex et des agents](../AGENTS.md) et de [Claude](../CLAUDE.md) partagent exactement les mêmes références actives.
