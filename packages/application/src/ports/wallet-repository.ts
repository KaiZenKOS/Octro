import type { Wallet } from "@octro/contracts";

// Forme de persistance (jamais exposee telle quelle) : la seed n'est jamais
// stockee en clair (seedCiphertext, voir adapters/crypto) ; le contrat
// public @octro/contracts `Wallet` l'omet deliberement.
export interface WalletRecord {
  id: string;
  userId: string;
  address: string;
  seedCiphertext: string;
  network: string;
  createdAt: Date;
}

export interface WalletRepository {
  save(wallet: WalletRecord): Promise<void>;
  findByUserId(userId: string): Promise<WalletRecord | null>;
}

export function toWalletDTO(record: WalletRecord): Wallet {
  return {
    id: record.id,
    user_id: record.userId,
    address: record.address,
    network: record.network,
    created_at: record.createdAt.toISOString(),
  };
}
