import type { Horizon, Projection } from "@octro/contracts";
import { assertSameTenant } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { Clock } from "../ports/clock.js";
import type { EconomicEventRepository } from "../ports/economic-event-repository.js";
import type { OptimizerPort } from "../ports/optimizer-port.js";
import type { WorkspaceRepository } from "../ports/workspace-repository.js";

export interface GetPersonalProjectionQuery {
  requestingTenantId: string;
  workspaceId: string;
  assetId: string;
  openingBalance: string;
  horizon: Horizon;
}

// S2 — ACC-02, PER-11, NET-02 : le calendrier personnel se calcule sans
// wallet, DID, KYC ni session Stripe, et sans jamais consulter une capacite
// reseau ou de financement (voir ApproveFinancingActionUseCase pour le seul
// point ou NET-02 bloque quelque chose).
export class GetPersonalProjectionUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly events: EconomicEventRepository,
    private readonly optimizer: OptimizerPort,
    private readonly clock: Clock,
  ) {}

  async execute(query: GetPersonalProjectionQuery): Promise<Projection> {
    const workspace = await this.workspaces.findById(query.workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace", query.workspaceId);
    }
    assertSameTenant(query.requestingTenantId, workspace.tenant_id);

    const events = await this.events.listByTenant(workspace.tenant_id);
    return this.optimizer.forecastPersonal({
      tenantId: workspace.tenant_id,
      assetId: query.assetId,
      openingBalance: query.openingBalance,
      horizon: query.horizon,
      events,
      asOf: this.clock.now().toISOString(),
    });
  }
}
