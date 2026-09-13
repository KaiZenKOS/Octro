import type { KycStatus } from "@octro/contracts";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";

export interface GetKycStatusQuery {
  userId: string;
}

export class GetKycStatusUseCase {
  constructor(private readonly kycStatuses: KycStatusRepository) {}

  async execute(query: GetKycStatusQuery): Promise<KycStatus> {
    const existing = await this.kycStatuses.findByUserId(query.userId);
    if (existing) return existing;
    // Valeur par defaut synthetique, jamais persistee : un utilisateur qui
    // n'a encore rien simule est "not_started", pas une erreur 404.
    return { id: query.userId, user_id: query.userId, status: "not_started", decided_at: null, simulated: true };
  }
}
