# Octro v2.2 — Pitch Deck (4 minutes / 10 slides maximum)

## Slide 1 — Octro : anticiper, protéger, choisir

**Octro aide à voir les décalages de trésorerie avant l’échéance.**

Prototype de prévision personnelle sans dette, accompagné de preuves XRPL observées séparément sur le Custom Hackathon Devnet.

- Présentateurs : Kevin (produit/client), Samet (API/infra), Augustin (moteur/XRPL).
- Track 1 Loaded — Lending Protocol V1 ; Credentials et Permissioned Domains comme extension principale.

## Slide 2 — Le problème : l’argent arrive au mauvais moment

- Un loyer, une facture ou une charge peut arriver avant le salaire ou le règlement attendu.
- Une somme attendue est une prévision, pas de l’argent disponible.
- Les particuliers comme les indépendants et les organisations ont besoin de comprendre le manque avant de choisir une action.

## Slide 3 — Commencer par les options sans dette

- La démonstration Lina utilise des données synthétiques : 650 € sur le compte courant, 300 € d’épargne, puis 780 € de dépenses avant un salaire attendu.
- Le moteur personnel propose un transfert de 230 € depuis les fonds propres disponibles, tout en conservant la réserve courante de 100 €.
- Le résultat est une proposition ; l’application ne déplace pas l’argent.

## Slide 4 — Ce qui calcule, explique et prouve

- Le client appelle l’API pour la projection personnelle ; le calcul Python utilise des montants décimaux et renvoie un résultat structuré `FEASIBLE` ou `INFEASIBLE`.
- Le texte d’explication ne remplace pas le résultat structuré. Les composants agents/MCP existent, mais ne sont pas raccordés au parcours produit présenté ici.
- L’interface ne signe ni ne soumet de transaction XRPL. Elle affiche un registre de preuves historiques en lecture seule.

## Slide 5 — Démonstration de la prévision personnelle

1. Accueil et calendrier de Lina : événements synthétiques datés et passage sous la réserve choisie.
2. Proposition : transfert de 230 € issu du plan structuré, avec l’épargne restante visible.
3. Ajout d’une dépense déclarée de 150 € : le recalcul peut retourner un diagnostic sans solution sans dette plutôt que d’inventer une action.

La démonstration porte sur la projection ; aucune connexion bancaire, import effectif de fichier ou exécution de transfert n’est revendiquée.

## Slide 6 — Cycle Lending V1 observé sur le Devnet

- Les transactions validées du vault ouvert, dépôt, configuration du broker, LoanSet, LoanPay et retrait sont consignées dans le registre de preuves.
- Le décaissement est rapproché par les variations de soldes de la LoanSet validée ; il n’existe pas de transaction `Drawdown` distincte dans cette preuve.
- Le retrait après remboursement inclut 1 370 drops d’intérêt constaté.

Ces opérations ont été exécutées séparément de l’interface Octro. L’écran produit rejoue les preuves enregistrées et ouvre leurs liens d’explorateur ; il n’effectue pas le cycle en direct.

## Slide 7 — Loaded : contrôler le dépôt dans un vault privé

- Sur le Devnet, un dépôt dans un vault privé est refusé sans Credential reconnue puis accepté avec l’attestation correspondante.
- Après expiration, un nouveau dépôt est refusé tandis que le retrait des parts déjà détenues reste possible dans le scénario observé.
- Ce contrôle de dépôt n’est pas une décision de solvabilité ou d’éligibilité au prêt ; cette décision applicative distincte reste à livrer.

## Slide 8 — Trois publics, un périmètre encore en construction

- Le parcours relié au moteur présenté aujourd’hui est le scénario personnel quotidien.
- Les vues indépendant et organisation sont des scénarios de démonstration, pas des Workspaces professionnels persistants.
- La projection professionnelle à 72 heures et la recette complète des trois publics restent ouvertes.

## Slide 9 — Modèle économique à valider

- Hypothèse de travail : socle personnel gratuit, options d’automatisation et offre d’équipe/API.
- Tarifs, frais et intérêt utilisateur restent à tester ; aucun pilote commercial ni corridor multi-devises n’est revendiqué.

## Slide 10 — État du prototype et prochaine étape

- Présent : cinq écrans web, projection personnelle structurée, diagnostic sans solution, et preuves XRPL historiques consultables.
- À raccorder : persistance et authentification durables, parcours professionnels, décision de crédit applicative et exécution Loaded depuis le produit.
- À mesurer avant toute revendication : accessibilité complète, tests utilisateurs et feedback personnel de chaque développeur (`DEVEX-01`, `DEVEX-02`).

**Octro rend le manque visible avant de transformer une prévision en action.**
