# Octro — client Pencil K1

Client Expo Web / React Native / TypeScript issu de `untitled.pen`, avec cinq écrans : accueil, calendrier, sources, proposition et suivi. Écrans secondaires : comparaison, brouillon d'échéance, aperçu d'import. Navigation bureau/mobile, langue FR/EN et sélecteur de scénarios/états via le nom de l'espace ou « Données synthétiques ».

## Lancer

Depuis la racine du monorepo, après installation des dépendances :

```powershell
npm run build
npm run start --workspace @octro/client -- --port 8082 --offline
```

Ouvrir `http://localhost:8082`. Routes : `/`, `/calendar`, `/sources`, `/proposal`, `/tracking`, `/options`, `/add`, `/import`. Le bouton FR/EN change la langue ; le sélecteur de démonstration donne accès aux états chargement, vide, erreur, ancienneté, finance indisponible et absence de solution.

Le lockfile commun appartient à Samet et **n'a pas été modifié**. Les manifestes client/ui sont proposés dans ce lot ; Samet doit intégrer leurs dépendances dans `package-lock.json` avant que `npm ci` soit reproductible sur un checkout propre. Pour la vérification locale de ce lot, l'installation a utilisé `npm install --package-lock=false --ignore-scripts` ; ne pas considérer cette installation comme un lockfile de livraison. Voir la [demande d'intégration](../../docs/progress/kevin/pencil-integration.md).

## Vérifier

```powershell
npm run typecheck --workspace @octro/client
npm run test --workspace @octro/client
npm run build --workspace @octro/client
```

Le build web produit `apps/client/dist/`. Les cinq tests vérifient C1, les événements déclarés/prévus, l'acquittement répété sans exécution, le refus d'une mauvaise version/hash, la nouvelle session sans décision fictive et la précision du formatage décimal. Les tests réseau restent séparés et ne sont pas exécutés ici.

## Données et limites

`src/data.ts` consomme `@octro/contracts` et les annexes Lina officielles sans les copier. La source expose un plan conforme C1, un Workspace personnel sans Organization et les événements attendus. Acquitter change uniquement l'état de la source de démonstration en mémoire ; il ne crée ni Approval ni Execution, ne modifie pas les soldes et disparaît après rechargement complet. Le bouton l'explique.

Les graphiques et comparaisons détaillés sont des **illustrations synthétiques fournies par Pencil**, enregistrées dans `src/pencil-reference.json` avec l'empreinte SHA-256 du fichier source. Ce ne sont pas des résultats calculés par le client ni des projections applicatives : `projection` reste `null`. La référence officielle fournit le transfert de 230 EUR. Aucun calcul financier n'est implémenté dans l'interface.

Ce client est un rendu de fixture, pas un raccordement K2 terminé. Les effets illustratifs lisent encore explicitement les données de démonstration ; le remplacement de `ClientDataSource` ne suffit pas à afficher une projection réelle. Le raccordement attend la projection et les métriques de comparaison via l'application. Les scénarios indépendant/organisation sont des diagnostics de démonstration, pas des Workspaces professionnels persistants. Le formulaire conserve seulement un brouillon dans son écran ; l'import valide un exemple visuel sans lire ni importer un fichier utilisateur. Aucune connexion wallet, banque, signature ou soumission.

La palette sombre demandée provient du Pencil, avec Inter, dégradés chauds, barre latérale bureau de 208 px et rail de 360 px. Le logo officiel n'étant pas livré dans la maquette, le mot-symbole `octro` est provisoire. Les différences intentionnelles et les limites de recette sont dans la note d'intégration.
