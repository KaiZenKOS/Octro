import type { OdooConnection } from "@octro/contracts";
import { assertKycValid } from "@octro/domain";
import type { Clock } from "../ports/clock.js";
import type { CryptoPort } from "../ports/crypto-port.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { KycStatusRepository } from "../ports/kyc-status-repository.js";
import { toOdooConnectionDTO, type OdooConnectionRepository } from "../ports/odoo-connection-repository.js";

export interface SaveOdooConnectionCommand {
  userId: string;
  odooUrl: string;
  odooDb?: string | null;
  odooApiKey: string;
}

// PER-11 / decision actee : la connexion Odoo (porte d'entree du credit) est
// un instrument financier — KYC valide requis avant meme de l'enregistrer.
// La cle API n'est jamais retournee : seul son chiffrement est persiste.
export class SaveOdooConnectionUseCase {
  constructor(
    private readonly odooConnections: OdooConnectionRepository,
    private readonly kycStatuses: KycStatusRepository,
    private readonly crypto: CryptoPort,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: SaveOdooConnectionCommand): Promise<OdooConnection> {
    const kyc = await this.kycStatuses.findByUserId(command.userId);
    assertKycValid(kyc?.status ?? "not_started");

    const record = {
      id: this.ids.newId(),
      userId: command.userId,
      provider: "odoo" as const,
      odooUrl: command.odooUrl,
      odooDb: command.odooDb ?? null,
      apiKeyCiphertext: await this.crypto.encrypt(command.odooApiKey),
      createdAt: this.clock.now(),
      lastUsedAt: null,
    };
    await this.odooConnections.save(record);
    return toOdooConnectionDTO(record);
  }
}
