# services/optimizer — A2 moteur financier (Augustin)

Calcul deterministe pur Python, sans FastAPI, sans LLM, sans SDK XRPL
(voir `docs/architecture.md`). Zero dependance tierce : `Decimal` de la
stdlib pour tous les montants (`DATA-03`), `unittest` pour les tests.

## Modules

- `octro_optimizer/money.py` — arrondi decimal explicite, jamais de float.
- `octro_optimizer/personal_engine.py` — `ENG-01`, `ENG-02`, `PER-01`,
  `PER-02`, `PER-05` : plan personnel sans dette sur 30 jours a partir
  d'un snapshot type `docs/v2.2/personal.fixture.json`. Retourne soit un
  `NoDebtPlan` (transfert de fonds propres ou `no_action`), soit un
  `NoDebtDiagnostic` quand la reserve protegee ne peut pas etre honoree
  sans dette — jamais les deux, jamais une action inventee.
- `octro_optimizer/cvar.py` — `ENG-03` : CVaR_alpha sur un ensemble de
  scenarios explicites (formulation de Rockafellar-Uryasev, forme
  fermee pour un ensemble discret).
- `octro_optimizer/financing.py` — `ENG-04`, `ENG-05` : comparaison de
  financement (allocation au cout marginal croissant, borne par plafond)
  et suivi de dette terminale apres l'horizon (aucune dette n'est
  supprimee a l'issue de l'horizon).
- `octro_optimizer/schema.py` — construit/valide un
  `OctroActionPlanProposal` (`docs/v2.2/plan.schema.json`,
  `schema_version: "2.1"`, `execution_mode: "proposal_only"`) sans
  dependance a `jsonschema`.

## Lancer les tests

```sh
cd services/optimizer
python3 -m unittest discover -s tests -v
```

Les tests chargent directement `docs/v2.2/personal.fixture.json` et
`docs/v2.2/plan.example.json` : ce sont les fixtures et le schema du
pack, jamais une copie divergente.

## Ce qui reste hors de ce lot

- Le raccordement transport (FastAPI) et son integration a
  `packages/application/` restent a S1/S3 (Samet).
- Les horizons professionnels (72h, evenements ordonnes multi-preteurs)
  et l'appel reel au port de calcul depuis l'application ne sont pas
  couverts par ces tests ; voir `docs/progress/augustin.md`.
