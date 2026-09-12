import type { KycStatus } from "@octro/contracts";

export interface KycStatusRepository {
  save(status: KycStatus): Promise<void>;
  findByUserId(userId: string): Promise<KycStatus | null>;
}
