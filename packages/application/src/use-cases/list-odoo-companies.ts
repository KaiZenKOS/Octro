import { assertKycValid } from "@octro/domain";
import { NotFoundError } from "../errors.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import type { OdooConnectionRepository } from "../ports/odoo-connection-repository.js";
import type { OdooCompany, OdooPort } from "../ports/odoo-port.js";

export interface ListOdooCompaniesQuery {
  userId: string;
  odooConnectionId: string;
}

/** Lists only companies visible to the authenticated user's own BYO key. */
export class ListOdooCompaniesUseCase {
  constructor(
    private readonly odooConnections: OdooConnectionRepository,
    private readonly kycStatuses: KycStatusRepository,
    private readonly odoo: OdooPort,
    private readonly crypto: CryptoPort,
  ) {}

  async execute(query: ListOdooCompaniesQuery): Promise<OdooCompany[]> {
    const kyc = await this.kycStatuses.findByUserId(query.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const connection = await this.odooConnections.findById(query.odooConnectionId);
    if (!connection || connection.userId !== query.userId) {
      throw new NotFoundError("OdooConnection", query.odooConnectionId);
    }

    const apiKey = await this.crypto.decrypt(connection.apiKeyCiphertext);
    return this.odoo.listCompanies({
      odooUrl: connection.odooUrl,
      odooDb: connection.odooDb,
      apiKey,
    });
  }
}
