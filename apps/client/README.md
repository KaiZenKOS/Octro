# Client Octro — Expo Web / React Native

Le client propose cinq écrans communs — accueil, calendrier, sources, proposition et suivi — avec routes secondaires de comparaison, ajout et aperçu d’import. Le sélecteur change le scénario synthétique et les états d’interface ; seule la fixture personnelle Lina est raccordée au cas d’usage de projection actuel. Les variantes indépendant/organisation ne sont pas des Workspaces persistants.

## Lancer

Depuis la racine, installer et construire les workspaces :

```powershell
npm ci
npm run ci
```

Lancer l’API puis le client web dans deux terminaux :

```powershell
npm run dev --workspace @octro/api
npm run start --workspace @octro/client -- --port 8082 --offline
```

L’API écoute par défaut sur le port 3000. Le client utilise `EXPO_PUBLIC_API_URL` si défini, sinon `http://localhost:3000`. Routes : `/`, `/calendar`, `/sources`, `/proposal`, `/tracking`, `/options`, `/add`, `/import`. Le serveur API actuel est une démo à données en mémoire : un redémarrage efface les Workspaces et événements. L’authentification n’est pas livrée ; l’API documente explicitement son en-tête de développement.

## Vérifier

```powershell
npm run typecheck --workspace @octro/client
npm run test --workspace @octro/client
npm run build --workspace @octro/client
```

Le build web produit `apps/client/dist/`. Les tests du client vérifient le contrat structuré, l’acquittement sans exécution, les cas de données modifiées et le formatage décimal. Le scénario XRPL affiché est un replay historique de preuves et ne réalise aucun appel de signature ou de soumission.

## Données et limites

La source initialise un Workspace personnel synthétique et ses événements déclarés, puis utilise l’API pour enregistrer les événements et demander une projection. Le serveur délègue le calcul au processus Python ; les résultats sont des décimaux structurés. `FEASIBLE` transporte projection et plan, `INFEASIBLE` transporte projection et diagnostic sans action. Si l’API ne répond pas ou si les entrées changent, le client marque le résultat périmé/indisponible et ne conserve pas une ancienne proposition comme résultat actuel.

Le client ne contient pas de solveur ou de simulation de plan. Il calcule des chaînes d’affichage, trouve le point bas parmi les points reçus pour le graphique et fait un contrôle exact en décimal qui masque un transfert dépassant l’épargne disponible après réserve protégée. Ce contrôle est un garde-fou d’affichage ; il ne crée ni ne modifie le plan retourné (`UI-02`). L’acquittement est limité à la session client et ne crée ni Approval, ni Execution, ni mouvement financier (`PER-07`).

Le centre « Preuves XRPL » liste des hashes validés présents dans les fichiers de preuve du dépôt et ouvre l’explorateur. Cette vue n’établit pas de connexion wallet et ne vérifie pas à nouveau le ledger. L’interface n’offre ni connexion bancaire, ni import effectif de fichier utilisateur, ni signature, ni soumission. Voir l’[état complet de l’implémentation](../../docs/implementation-status.md) et le [registre XRPL](../../docs/progress/augustin/evidence/demo-evidence.run-2026-09-12.json).

Le style reprend l’intention crème, encre et verts du CDC avec Inter et chiffres tabulaires. Le web utilise des transitions de pression de 180 ms et respecte `prefers-reduced-motion`; les animations restent discrètes. Clavier, contraste et lecteurs d’écran exigent encore une recette interactive dédiée (`ACC-03`), tout comme les largeurs 390/1440 px (`UI-01`). Le nom-logo reste la version de démo en l’absence d’identité finale.
