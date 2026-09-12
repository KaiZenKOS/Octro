# Documentation Octro

**Version active unique : Octro v2.2 — particuliers, indépendants et entreprises — Track 1 Loaded.** Les archives ne sont pas des instructions de développement.

## Références normatives

- [CDC v2.2](v2.2/Octro_CDC_v2.2.md) : 34 chapitres.
- [Exigences du dépôt](../requirements.json) : les 62 IDs, priorités, propriétaires, critères d'acceptation, invariants et paramètres du pack ; seul le champ `normative_files` utilise les chemins du dépôt.
- [Configuration Track 1 Loaded](v2.2/hackathon.config.json) : cadrage documentaire, capacités non vérifiées, aucune configuration personnelle.
- [Architecture validée](architecture.md) : précision des chapitres 9, 23 et 31, avec couche application et ports distincts du domaine.

Les renvois par nom de fichier dans le CDC et le manifeste original se résolvent dans `docs/v2.2/`. Le manifeste à la racine adapte ces renvois pour les outils du dépôt. Les mentions d'éditions antérieures dans le texte conservé sont historiques ; elles ne constituent aucune instruction active supplémentaire.

## Pack v2.2 conservé à l'identique

| Fichier | Usage |
| --- | --- |
| [Octro_CDC_v2.2.md](v2.2/Octro_CDC_v2.2.md) | Texte du CDC |
| [Octro_CDC_v2.2.pdf](v2.2/Octro_CDC_v2.2.pdf) | Version mise en page, 30 pages |
| [Octro_CDC_v2.2.tex](v2.2/Octro_CDC_v2.2.tex) | Source de composition |
| [README du pack](v2.2/README.md) | Portée et compilation de la source |
| [requirements.json original](v2.2/requirements.json) | Registre fourni, inchangé |
| [hackathon.config.json](v2.2/hackathon.config.json) | Track, réseau prévu et gates non exécutés |
| [plan.schema.json](v2.2/plan.schema.json) | Contrat minimal `proposal_only`, hérité en version 2.1 |
| [plan.example.json](v2.2/plan.example.json) | Exemple personnel conforme à ce contrat |
| [personal.fixture.json](v2.2/personal.fixture.json) | Scénario Lina synthétique ; pas une observation réelle |
| [demo-evidence.template.json](v2.2/demo-evidence.template.json) | Modèle de preuves vide, `template_not_executed` |
| [design.tokens.json](v2.2/design.tokens.json) | Tokens documentaires et d'interface |
| [common-engine.pdf](v2.2/assets/common-engine.pdf) | Figure du moteur commun |
| [lina-cashflow.pdf](v2.2/assets/lina-cashflow.pdf) | Figure de trésorerie synthétique |

La version `2.1` du schéma et de l'exemple est volontairement conservée par la livraison v2.2. Elle décrit une proposition, pas une API complète, une autorisation de transaction ou une ancienne spécification active. Aucun nouveau DOCX v2.2 n'est fourni par le pack.

## Archives et instructions

Les trois fichiers v2.0 ont été déplacés sans modification sous [archive/v2.0/](archive/v2.0/). Voir la [règle d'archivage](archive/README.md). Ne pas charger les archives dans le contexte de développement.

Les instructions de [Codex et des agents](../AGENTS.md) et de [Claude](../CLAUDE.md) partagent exactement les mêmes références actives.
