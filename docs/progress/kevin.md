# Kevin — K1 et préparation du raccordement K2

Mise à jour après intégration S1/C1 : **client K1 sur fixtures implémenté depuis le Pencil de Kevin**, sur `feat/kevin-k1-pencil` basée sur main `9d1ccb6`. Voir [livraison Pencil et demande d'intégration](kevin/pencil-integration.md) et [lancement du client](../../apps/client/README.md). Les cinq écrans existent en React Native/Expo ; K2 réel, le lockfile commun et la recette visuelle restent à compléter. Aucun K3–K6 implémenté.

Le reste de cette note décrit la préparation initiale du 12 septembre avant l'intégration S1/C1 ; son constat de socle absent est historique, remplacé par la mise à jour ci-dessus.

## Livrables

- [Parcours, matrice écran/exigence/acceptation et recette](kevin/client-prep.md) : cinq destinations, trois publics, états, ordre clavier, 390 px, zoom 200 %, provenance et absence de confirmation financière fictive.
- [Libellés FR/EN](kevin/copy.fr-en.json) : contenu réutilisable après raccordement, noms accessibles et distinctions proposé/acquitté/instruction/observé ; aucune définition métier parallèle.
- [Demande précise C1/S1 pour Samet](kevin/contracts-request.md) : champs, motifs, écrans consommateurs, frontières des adaptateurs, demandes de dépendances et séquence de raccordement. Demande préparée dans le dépôt, pas de message envoyé.

Exigences traitées en préparation : UI-01, UI-02, ACC-01, ACC-03, PER-07 et REL-01 ; besoins associés ACC-02, PER-01 à PER-06, PER-09 à PER-11, DATA-02, DATA-03, ENG-04, NET-02 et SEC-03. Leurs critères applicatifs ne sont pas déclarés validés.

## État du dépôt et dépendances observés

Le checkout principal était sur `main` à `1004bce`, avec fichiers locaux non suivis et autres worktrees de publication. Un `git fetch origin` a réussi. Aucune branche Kevin existante ; création de `feat/kevin-k1-client-prep`, dans le worktree isolé `.xrpl-devex/kevin-k1-client-prep`, basée sur `origin/main` à `f23489d`. La branche active du dossier principal n'a pas été changée ; aucun fichier `.pen`, hook, correctif XRPL ou configuration personnelle modifié.

`origin/main` ne contient que `.gitkeep` dans client/ui/contracts/domain/application, sans manifeste racine ni lockfile. La branche `origin/augustin` à `be66cef` contient moteur déterministe et adaptateurs ; ils sont recensés dans la demande de contrats, non copiés ni fusionnés. Les PR ouvertes ont été recherchées via le connecteur GitHub : aucune retournée lors de cette vérification.

| Dépendance | Constat | Déblocage attendu |
| --- | --- | --- |
| S1 — Samet | Aucun bootstrap Expo/TypeScript, workspace de packages ni commandes client intégrés | Socle exécutable et dépendances communes verrouillées par Samet |
| C1 — Samet, revue Augustin/Kevin | Aucun export partagé Workspace/Money/Projection/ActionPlan, port client ou cas d'usage intégré | Tranche de contrats et fixtures validées ; le schéma proposal_only ne suffit pas |
| S2/S3 — Samet | Aucun accès/persistance/import/projection via application intégré | Créer et relire l'espace personnel et ses données, appeler le port de calcul |
| A2 — Augustin + intégration Samet | Code distant existant, sans raccordement applicatif intégré ; tests non relancés par Kevin | Réutiliser le moteur via l'application, fixtures trois publics et diagnostics validés |
| Pencil | Maquettes en cours selon Kevin ; aucun fichier inspecté ou modifié | Appliquer les maquettes aux états/navigation après S1/C1, puis recette visuelle |

Pas de second sous-agent de primitives UI : sa condition de démarrage S1/C1 n'est pas satisfaite. Un vrai sous-agent `audit_k1` a réalisé la matrice en lecture seule ; mission limitée aux références suivies, aucun fichier autorisé en écriture, pas de récursion, pas de push. L'agent principal a rédigé les quatre fichiers et gardé navigation, couche de données prévue, intégration et revue. Une seconde passe de relecture documentaire a été confiée au même sous-agent.

Capture DevEx : aucune configuration personnelle copiée ni consentement repris d'une autre personne. Le worktree contient les références de skills suivies, mais pas de configuration locale de capture identifiée dans ses dossiers `.claude`/`.codex` ; `core.hooksPath` n'est pas configuré dans Git. Cela ne prouve pas l'absence de hooks d'autres outils. Le fonctionnement de la capture pour Kevin dans ce worktree reste non vérifié ; aucun témoignage DevEx ou état « actif » fabriqué.

## Vérifications et limites

Lecture des références demandées et annexes v2.2, inventaire des branches/worktrees et du code distant, audit indépendant de la matrice. Vérifications documentaires avant commit : validité JSON, parité des clés et paramètres FR/EN, existence des IDs et liens relatifs, cohérence fixture/plan pour 230 EUR, diff limité aux quatre fichiers Kevin, absence de modification des originaux du pack.

Aucun test React Native/Expo, navigation réelle, lecteur d'écran, zoom, calcul ou réseau exécuté : l'application n'existe pas dans la base intégrée. Aucun test novice effectué. Le dictionnaire et les scénarios sont préparés, non branchés ; il n'existe ni adaptateur mock actif ni API simulée. Lina reste une fixture synthétique et 230 EUR un résultat fourni, jamais recalculé côté UI. Les preuves réseau d'Augustin n'ont pas été réexécutées dans cette session.

## Reprise

Après intégration S1/C1, relire les exports et adapter les fixtures via le contrat convenu ; implémenter les cinq routes et hooks de données dans apps/client, déléguer les primitives d'accessibilité dans une liste exclusive de fichiers packages/ui. Après S2/S3 et raccordement A2, exécuter la recette K2 réelle avant de la déclarer terminée. À livraison Pencil, appliquer les tokens et composants aux maquettes puis tester les cinq écrans FR/EN à 390 px, au clavier, lecteur d'écran et zoom 200 %. Ne pas modifier les montants ni les transitions pour adapter la présentation.

Livraison Git : branche `feat/kevin-k1-client-prep`, commit ciblé de préparation documentaire ; aucun merge main ni push forcé. L'identifiant du commit et le lien de PR sont fournis dans le compte rendu de livraison.
