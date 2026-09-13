import { randomUUID } from "node:crypto";
import type { Projection } from "@octro/contracts";
import { Money } from "@octro/domain";
import type { OptimizerPort, PersonalForecastInput } from "../../ports/optimizer-port.js";

const STEP_MS: Record<"day" | "hour", number> = { day: 86_400_000, hour: 3_600_000 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Doublure explicite de calcul (S1/S2). Fait uniquement une marche de solde
// deterministe : accumule les evenements par pas, separe strictement solde
// prevu (tous les evenements non annules) et cash confirme (uniquement les
// evenements "settled", DATA-02). Ne propose et ne classe aucune option :
// la recette CVaR/MPC/min-cost-flow reste le lot A2 d'Augustin. Ne jamais
// citer cette classe comme preuve de calcul financier valide.
export class SimulatedOptimizerAdapter implements OptimizerPort {
  async forecastPersonal(input: PersonalForecastInput): Promise<Projection> {
    const asOf = new Date(input.asOf).getTime();
    const stepMs = STEP_MS[input.horizon.unit];
    const steps = input.horizon.steps;

    const deltaExpected: Money[] = Array.from({ length: steps }, () => Money.zero(input.assetId));
    const deltaConfirmed: Money[] = Array.from({ length: steps }, () => Money.zero(input.assetId));

    for (const event of input.events) {
      if (event.amount.asset_id !== input.assetId || event.status === "cancelled") continue;
      const eventTimeIso = event.status === "settled" ? event.observed_at : (event.expected_settlement_at ?? event.observed_at);
      const eventTime = new Date(eventTimeIso).getTime();
      const idx = clamp(Math.floor((eventTime - asOf) / stepMs), 0, steps - 1);
      const magnitude = Money.of(event.amount.amount_decimal, input.assetId);
      const signed = event.direction === "inflow" ? magnitude : Money.zero(input.assetId).subtract(magnitude);
      deltaExpected[idx] = (deltaExpected[idx] as Money).add(signed);
      // DATA-02 : seul un evenement reellement regle credite le cash confirme.
      if (event.status === "settled") {
        deltaConfirmed[idx] = (deltaConfirmed[idx] as Money).add(signed);
      }
    }

    let expectedRunning = Money.of(input.openingBalance, input.assetId);
    let confirmedRunning = Money.of(input.openingBalance, input.assetId);
    const points: Projection["points"] = [];
    for (let t = 0; t < steps; t++) {
      expectedRunning = expectedRunning.add(deltaExpected[t] as Money);
      confirmedRunning = confirmedRunning.add(deltaConfirmed[t] as Money);
      points.push({
        t,
        asset_id: input.assetId,
        expected_balance: expectedRunning.toDecimalString(),
        confirmed_balance: confirmedRunning.toDecimalString(),
      });
    }

    return {
      id: randomUUID(),
      tenant_id: input.tenantId,
      generated_at: new Date().toISOString(),
      as_of: input.asOf,
      horizon: input.horizon,
      data_quality: input.events.some((e) => e.verification !== "declared") ? "mixed" : "declared",
      points,
    };
  }
}
