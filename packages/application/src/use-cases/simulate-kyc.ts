import type { KycStatus } from "@octro/contracts";
import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";

export interface SimulateKycCommand {
  userId: string;
  result: "valid" | "invalid";
}

// Phase B — KYC simule (decision actee) : popup valide/invalide cote client,
// aucun appel a un vrai fournisseur d'identite (CMP-01, "aucun KYC reel dans
// fixture"). `simulated: true` est un litteral, jamais autre chose.
export class SimulateKycUseCase {
  constructor(
    private readonly kycStatuses: KycStatusRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: SimulateKycCommand): Promise<KycStatus> {
    const status: KycStatus = {
      id: this.ids.newId(),
      user_id: command.userId,
      status: command.result,
      decided_at: this.clock.now().toISOString(),
      simulated: true,
    };
    await this.kycStatuses.save(status);
    return status;
  }
}
