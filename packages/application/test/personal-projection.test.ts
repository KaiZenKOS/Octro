import { describe, expect, it } from "vitest";
import type { PersonalOptimizerInput, PersonalOptimizerResult } from "@octro/contracts";
import {
  CreateWorkspaceUseCase,
  GetPersonalProjectionUseCase,
  InMemoryEconomicEventRepository,
  InMemoryWorkspaceRepository,
  RecordDeclaredEventUseCase,
  SystemClock,
  UuidIdGenerator,
  type OptimizerPort,
} from "../src/index.js";

const AS_OF = "2026-09-12T00:00:00Z";

describe("GetPersonalProjectionUseCase (ACC-02, PER-11, NET-02, DATA-02)", () => {
  it("passes a personal snapshot to the optimizer port without wallet, KYC or network dependencies", async () => {
    const workspaces = new InMemoryWorkspaceRepository();
    const events = new InMemoryEconomicEventRepository();
    const clock = new SystemClock();
    const ids = new UuidIdGenerator();
    const createWorkspace = new CreateWorkspaceUseCase(workspaces, clock, ids);
    const recordEvent = new RecordDeclaredEventUseCase(workspaces, events, {
      now: () => new Date(AS_OF),
    }, ids);
    let optimizerInput: PersonalOptimizerInput | undefined;
    const optimizer: OptimizerPort = {
      async optimizePersonal(input) {
        optimizerInput = input;
        const result: PersonalOptimizerResult = {
          engine_version: "test-only",
          status: "FEASIBLE",
          trace: [{ t: 0, expected_balance_decimal: "650", confirmed_balance_decimal: "650" }],
          action_trace: [{ t: 0, current_balance_decimal: "650", savings_balance_decimal: "300" }],
          proposed_actions: [{ type: "no_action" }],
          savings_remaining_decimal: "300",
          diagnostic: null,
        };
        return result;
      },
    };
    const getProjection = new GetPersonalProjectionUseCase(workspaces, events, optimizer, {
      now: () => new Date(AS_OF),
    });
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
      expectedSettlementAt: "2026-09-14T00:00:00Z",
    });

    const result = await getProjection.execute({
      requestingTenantId: workspace.tenant_id,
      workspaceId: workspace.id,
      assetId: "fiat:EUR",
      openingBalances: { current: "650.00", savings: "300.00" },
      currentReserve: "100.00",
      savingsProtectedReserve: "0.00",
      horizon: { steps: 30, unit: "day" },
    });

    expect(result.status).toBe("FEASIBLE");
    expect(optimizerInput?.events).toHaveLength(1);
    expect(optimizerInput?.tenant_id).toBe(workspace.id);
    expect(optimizerInput?.opening_balances).toEqual({ current: "650.00", savings: "300.00" });
    expect(result.projection.points[0]?.confirmed_balance).toBe("650");
  });
});
