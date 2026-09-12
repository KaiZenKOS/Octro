# Décision et intégration du front Pencil — Kevin

Références actives : [CDC v2.2](../../v2.2/Octro_CDC_v2.2.md), [TEAM_TASKS](../../TEAM_TASKS.md), [architecture](../../architecture.md), [exigences](../../../requirements.json). Lot K1 et préparation K2 ; UI-01, UI-02, ACC-01, ACC-03, PER-07, REL-01.

## Décision visuelle demandée par Kevin

Kevin a demandé la reproduction du fichier local `untitled.pen`. Celui-ci contient une direction sombre qui diffère de la palette crème/forest du pack. Cette demande est retenue comme déclinaison visuelle du client : fond #0D0C12, surfaces #211D22/#30282E, texte #FBFAFC, accent #E7DEDA, Inter et dégradés chauds. Les annexes `docs/v2.2/design.tokens.json` et le CDC restent intacts ; aucun invariant métier n'est modifié. Le fichier `.pen` reste en lecture seule.

Écrans source mobile : E5906, x9supR, eGNMO, PHI4n, q3LMrv. Bureau : L5bxkt, ULYGB, KnktN, fik7f, xoV1p. La navigation reproduit les quatre entrées Pencil, avec proposition et options accessibles depuis le calendrier et par URL. Elle ne supprime aucun des cinq écrans du CDC.

Différences intentionnelles :

- Le loyer « Confirmé » de Pencil devient « Déclaré » : la fixture ne prouve aucun débit bancaire.
- Les horaires illustratifs « aujourd'hui 09:41/09:45 » sont remplacés par une référence synthétique ou la mention de session, sans fausse observation récente.
- Le suivi démarre en proposition à lire. « Enregistré » apparaît seulement après acquittement dans la session et ne confirme pas un mouvement financier.
- La mention synthétique et le choix de langue sont visibles sur les écrans. Les textes peuvent s'allonger pour préserver l'accessibilité et la précision des états.
- Les périodes autres que 30 jours sont des repères visuels explicitement non calculés. Les états réseau avancés de K3 et le logo définitif ne sont pas implémentés.

## Socle réutilisé

Base de branche : `origin/main` à `9d1ccb6`, contenant S1/S2 de Samet, les contrats C1 et les travaux Augustin. Aucun contrat concurrent ni modification des ports applicatifs. `Workspace`, `EconomicEvent`, `ActionPlan`, `Projection`, `Execution` et les schémas partagés sont importés depuis `@octro/contracts`.

Les cinq écrans communs affichent le scénario Lina. La source de données utilise TanStack Query ; l'acquittement est une mutation sans succès financier optimiste et sans retry automatique. Les montants affichés sont des chaînes décimales, sans conversion comptable en float. `pencil-reference.json` porte seulement les illustrations fournies et la provenance du design. K2 reste incomplet : ni persistance réelle, ni calcul par l'application, ni import effectif, ni contrats professionnels complets consommés dans le parcours.

## Demande précise à Samet

Intégrer les dépendances exactes de `apps/client/package.json` et le package `packages/ui/package.json` dans le lockfile commun. Leur installation locale a été vérifiée sans régénérer ce lockfile. Ajouter à la CI `npm run typecheck --workspace @octro/client` et `npm run build --workspace @octro/client` ; la configuration Expo noEmit est séparée des références TypeScript serveur. Aucun changement du manifeste racine ou de la CI n'est fait par Kevin.

Choix Expo SDK 55 fondé sur la [documentation Expo](https://docs.expo.dev/versions/v55.0.0/) et les métadonnées du package installé : React Native 0.83.10, Expo 55.0.31, Router 55.0.18. React/React DOM 19.2.4 satisfont les pairs installés ; ils sont plus récents que le repère 19.2.0 du SDK. L'installation npm signale 17 vulnérabilités modérées dans l'arbre ; la revue des dépendances commune reste à Samet, sans `audit fix --force` automatique. Versions complètes dans les manifestes proposés.

Pour K2 : fournir les métriques projetées et de comparaison (soldes avant/après, réserve, dates et source), le diagnostic sans solution, la provenance synthétique commune, les contrats d'import et l'acquittement persistant. Les composants de chiffres illustratifs devront être raccordés à ces sorties, et non à une marche de solde locale. Les vues actuelles restent explicitement en mode fixture.

## Délégation et recette

Deux vrais sous-agents, sans récursion ni push : `pencil_audit` en lecture seule sur les spécifications puis le code ; `ui_primitives` sur les seuls `packages/ui/src/tokens.ts`, `primitives.tsx`, `index.ts`. L'agent principal conserve navigation, source de données, écrans, intégration et revue. Les suggestions critiques de l'audit sur acquittement, dates, absence d'action et cibles tactiles ont été intégrées.

Vérifications exécutées : build TypeScript du socle réussi ; `npm run typecheck --workspace @octro/client` réussi ; `npm run test --workspace @octro/client` : 5 tests réussis ; `npm run build --workspace @octro/client` : export web réussi, 11 routes générées ; requêtes HTTP sur `/`, `/calendar`, `/sources`, `/proposal`, `/tracking` : toutes 200. Dix liens documentaires relatifs sont valides, le hash du Pencil est inchangé, le diff des manifestes racine/lockfile/annexes et des lots Samet/Augustin est vide. Ces lectures HTTP ne prouvent pas une navigation interactive.

L'outil de contrôle UI a été essayé, mais `cua.getState()` renvoie `apps: []` et `browsers: []` : aucune comparaison par captures, navigation réelle au clavier, lecture d'écran ou recette à 390/1440 px n'a été exécutée. Une reproduction « parfaite » n'est donc pas certifiée. Les contrôles de layout sont issus de la lecture du fichier Pencil et du code. La recherche automatisée complémentaire du skill UI/UX était indisponible (lancement Python refusé) ; ses règles textuelles d'accessibilité ont été lues et appliquées.

À réception d'un navigateur de contrôle : comparer chacun des cinq écrans à 390 et 1440 px ; vérifier 360 px et zoom 200 %, FR/EN, focus et dialogues, scénario → acquittement → suivi, états d'erreur/ancienneté et absence de confirmation financière. Puis raccorder K2 avec Samet/Augustin avant toute déclaration de parcours réel terminé.
