import type { EconomicEvent } from "@octro/contracts";
import { assertSameTenant } from "@octro/domain";
import type { Clock } from "../ports/clock.js";
import type { EconomicEventRepository } from "../ports/economic-event-repository.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { WorkspaceRepository } from "../ports/workspace-repository.js";
import { NotFoundError } from "../errors.js";

export interface RecordDeclaredEventCommand {
  requestingTenantId: string;
  workspaceId: string;
  direction: EconomicEvent["direction"];
  amountDecimal: string;
  assetId: string;
  label: string;
  expectedSettlementAt?: string;
}

// S2 — ACC-01/ACC-02 : saisie manuelle d'un evenement declare, disponible
// sans wallet, DID, KYC ni credit. L'import CSV avec apercu/dedoublonnage
// (DATA-01) est le lot S3 ; cette saisie couvre seulement l'entree directe.
export class RecordDeclaredEventUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly events: EconomicEventRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: RecordDeclaredEventCommand): Promise<EconomicEvent> {
    const workspace = await this.workspaces.findById(command.workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace", command.workspaceId);
    }
    assertSameTenant(command.requestingTenantId, workspace.tenant_id);

    const now = this.clock.now().toISOString();
    const event: EconomicEvent = {
      id: this.ids.newId(),
      tenant_id: workspace.tenant_id,
      source_event_id: this.ids.newId(),
      direction: command.direction,
      amount: { amount_decimal: command.amountDecimal, asset_id: command.assetId },
      status: "expected",
      verification: "declared",
      label: command.label,
      observed_at: now,
      ...(command.expectedSettlementAt !== undefined
        ? { expected_settlement_at: command.expectedSettlementAt }
        : {}),
    };
    await this.events.save(event);
    return event;
  }
}
