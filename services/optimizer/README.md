# Optimiseur Python Octro

Calcul financier déterministe séparé de Fastify, du LLM et du SDK XRPL (`ARCH-LOAD-01`). Les montants manipulés par le moteur sont des chaînes décimales converties en `Decimal`; un `float` est refusé (`DATA-03`). Le transport avec l’API est un processus ponctuel JSON sur stdin/stdout, sans serveur HTTP ni dépendance tierce. Le port Node borne l’exécution à cinq secondes.

## Projection personnelle raccordée

`octro_optimizer.projection` calcule les points quotidiens attendus et confirmés, puis appelle le moteur personnel sans dette. Le contrat partagé avec l’API renvoie l’un des résultats suivants :

- `FEASIBLE` : projection plus `action_plan` structuré, par exemple un transfert de fonds propres après réserve protégée (`PER-01`, `PER-02`).
- `INFEASIBLE` : projection plus diagnostic et contraintes bloquantes, sans action financière (`ENG-04`, `PER-05`).

Ce chemin couvre actuellement le scénario personnel quotidien. Les parcours professionnels à 72 heures, l’allocation multi-prêteurs et un LP/MPC/CVaR complet ne sont pas raccordés à l’API. `financing.py` compare des financements selon ses règles locales ; sa présence ne prouve ni calcul contractuel XLS-66, ni financement XRPL exécuté, ni calcul de production (`ENG-01` à `ENG-05`).

## Modules

- `octro_optimizer/money.py` : coercition, précision et arrondis explicites ; refuse `float`.
- `octro_optimizer/personal_engine.py` : plan personnel sans dette ou diagnostic, sans action inventée.
- `octro_optimizer/projection.py` : projection normalisée et appel au moteur personnel.
- `octro_optimizer/cli.py` : point d’entrée JSON consommé par `PythonOptimizerAdapter` de l’API.
- `octro_optimizer/cvar.py` : calcul déterministe CVaR pour une distribution discrète explicite ; pas encore intégré au parcours API.
- `octro_optimizer/financing.py` : comparaison simplifiée de financement et suivi de dette terminale ; pas un adapter XLS-66.
- `octro_optimizer/schema.py` : construction/validation du contrat historique `proposal_only` de `schema_version: "2.1"` conservé dans le pack v2.2.

Les fixtures officielles se trouvent dans [`docs/v2.2/personal.fixture.json`](../../docs/v2.2/personal.fixture.json) et [`docs/v2.2/plan.example.json`](../../docs/v2.2/plan.example.json). Elles servent aux tests ; elles ne sont pas des observations ledger. Le contrat actif de projection est dans [`packages/contracts`](../../packages/contracts/src/projection-result.ts).

## Tester

Depuis ce répertoire :

```powershell
python -m unittest discover -s tests -v
```

Pour la vérification complète du monorepo, lancer `npm run ci` depuis la racine ; voir l’[état d’implémentation](../../docs/implementation-status.md) pour les raccordements et critères non livrés.
