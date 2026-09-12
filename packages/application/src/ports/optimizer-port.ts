import type { EconomicEvent, Horizon, Projection } from "@octro/contracts";

export interface PersonalForecastInput {
  tenantId: string;
  assetId: string;
  openingBalance: string;
  horizon: Horizon;
  events: EconomicEvent[];
  asOf: string;
}

// Port de calcul (S1). L'adaptateur reel appelle services/optimizer/ (Python,
// Augustin, A2). SimulatedOptimizerAdapter ci-dessous est la doublure
// explicite mentionnee dans docs/TEAM_TASKS.md ("adaptateur de calcul simule
// explicitement identifie") : elle ne depend d'aucun reseau ni LLM, mais elle
// ne remplace pas la recette CVaR/MPC d'A2 et ne doit jamais etre comptee
// comme preuve financiere.
export interface OptimizerPort {
  forecastPersonal(input: PersonalForecastInput): Promise<Projection>;
}
