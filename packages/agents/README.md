# Agents — intégration v2.2

Périmètre : `AGT-01` (12 outils maximum et exécution ≤ 30 s), `AGT-02` (aucune autorité de signature), `AGT-03` (parcours sans LLM), `UI-02` (faits financiers issus du plan), `SEC-04` (secrets isolés) et `ARCH-LOAD-01` (aucun SDK ledger dans le moteur ou l’agent). Référence : CDC v2.2, chapitres 9, 15, 21, 22, 31 et 32.

`BoundedOrchestrator.run()` utilise les ports injectés `collect → analyze → simulate → explain → awaiting_decision`. `resume()` ne fait qu’enregistrer une décision humaine d’acquittement ou de rejet contre l’identifiant et le hash du plan; il ne prépare, signe ni soumet une opération. Le résultat `INFEASIBLE` reste un diagnostic sans action. L’orchestrateur vérifie le tenant des snapshots, projections et plans avant de les conserver.

Le service de composition API doit injecter les cas d’usage de l’application derrière `OrchestrationTools`, avec le tenant issu de la session authentifiée, et un `OrchestrationStateRepository` réellement durable. `InMemoryOrchestrationStateRepository` est uniquement destiné au développement et aux tests; son résultat expose `persisted: false`. La projection et le `PlanReference` viennent du résultat structuré de l’application/moteur, jamais du texte du modèle.

`ModelGateway` n’expose aucun outil au modèle. `LiveModelGateway` accepte un secret injecté depuis la composition serveur, ne lit aucune variable d’environnement, refuse le navigateur et ne consomme qu’un JSON strict indiquant l’ordre de présentation. Tous les libellés, montants, statuts, actions et diagnostics sont rendus par le code déterministe depuis les objets structurés. Une panne ou une sortie LLM inattendue utilise le même rendu déterministe. Les questions libres et les libellés bruts ne sont pas envoyés au fournisseur.

À ce stade, les cas d’usage `analyze`, `simulate`, `getActionPlan` et la persistance PostgreSQL de l’état agent doivent être raccordés par la composition applicative; aucun adaptateur XRPL n’est exposé ici. Le package conserve une compatibilité de lecture pour l’ancien appel UI, mais sans `ActionPlan` structuré il renvoie un état neutre et ignore les montants locaux (`UI-02`).
