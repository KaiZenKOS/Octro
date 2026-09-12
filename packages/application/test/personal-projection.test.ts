import { describe, expect, it } from "vitest";
import {
  CreateWorkspaceUseCase,
  GetPersonalProjectionUseCase,
  InMemoryEconomicEventRepository,
  InMemoryWorkspaceRepository,
  RecordDeclaredEventUseCase,
  SimulatedOptimizerAdapter,
  SystemClock,
  UuidIdGenerator,
} from "../src/index.js";

const AS_OF = "2026-09-12T00:00:00Z";

function wire() {
  const workspaces = new InMemoryWorkspaceRepository();
  const events = new InMemoryEconomicEventRepository();
  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const createWorkspace = new CreateWorkspaceUseCase(workspaces, clock, ids);
  const recordEvent = new RecordDeclaredEventUseCase(workspaces, events, clock, ids);
  const getProjection = new GetPersonalProjectionUseCase(workspaces, events, new SimulatedOptimizerAdapter(), {
    now: () => new Date(AS_OF),
  });
  return { createWorkspace, recordEvent, getProjection };
}

describe("GetPersonalProjectionUseCase (S2 — ACC-02, PER-11, DATA-02)", () => {
  it("computes a projection without any wallet, DID, KYC or Stripe session in the wiring", async () => {
    const { createWorkspace, recordEvent, getProjection } = wire();
    const workspace = await createWorkspace.execute({
      ownerUserId: "22222222-2222-2222-2222-222222222222",
      kind: "personal",
      displayName: "Lina",
    });

    await recordEvent.execute({
      requestingTenantId: workspace.tenant_id,
      workspaceId: workspace.id,
      direction: "outflow",
      amountDecimal: "600.00",
      assetId: "fiat:EUR",
      label: "loyer",
      expectedSettlementAt: "2026-09-14T00:00:00Z", // t = 2 jours
    });
    await recordEvent.execute({
      requestingTenantId: workspace.tenant_id,
      workspaceId: workspace.id,
      direction: "inflow",
      amountDecimal: "1600.00",
      assetId: "fiat:EUR",
      label: "salaire",
      expectedSettlementAt: "2026-09-22T00:00:00Z", // t = 10 jours
    });

    const projection = await getProjection.execute({
      requestingTenantId: workspace.tenant_id,
      workspaceId: workspace.id,
      assetId: "fiat:EUR",
      openingBalance: "650.00",
      horizon: { steps: 30, unit: "day" },
    });

    const day2 = projection.points.find((p) => p.t === 2);
    const day10 = projection.points.find((p) => p.t === 10);
    expect(day2?.expected_balance).toBe("50");
    // DATA-02 : une entree ou sortie attendue ne credite/debite jamais le
    // cash confirme tant qu'elle n'est pas "settled".
    expect(day2?.confirmed_balance).toBe("650");
    expect(day10?.expected_balance).toBe("1650");
    expect(day10?.confirmed_balance).toBe("650");
  });
});
