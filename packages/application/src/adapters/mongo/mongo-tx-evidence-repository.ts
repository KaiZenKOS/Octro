import type { MongoClient } from "mongodb";
import type { TxEvidenceEntry, TxEvidenceRepository } from "../../ports/tx-evidence-repository.js";

export class MongoTxEvidenceRepository implements TxEvidenceRepository {
  constructor(
    private readonly client: MongoClient,
    private readonly databaseName: string,
  ) {}

  async record(entry: TxEvidenceEntry): Promise<void> {
    // connect() est idempotent (le driver ne rouvre pas une connexion deja
    // etablie) : garde la racine de composition synchrone (buildDependencies)
    // sans jamais bloquer le demarrage sur Mongo.
    await this.client.connect();
    await this.client
      .db(this.databaseName)
      .collection("tx_evidence")
      .insertOne({ ...entry });
  }
}
