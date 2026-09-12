/**
 * DID adapter (DID-01, optional P1).
 *
 * Verified for real on 2026-09-12 against the Custom Hackathon Devnet
 * (docs/progress/augustin.md, docs/progress/augustin/evidence/
 * a6-did-resolution-and-replay.json):
 *   - DIDSet (publish)                          -> tesSUCCESS
 *   - resolution (ledger_entry by did:address)   -> matches the published document exactly
 *   - replay with a wrong NetworkID              -> telWRONG_NETWORK (rejected)
 *   - replay signed by the wrong account's keys  -> tefBAD_AUTH (rejected)
 *   - the DID entry was confirmed still present and unaffected after
 *     both rejected attempts
 *
 * A DIDDocument/URI kept short: a first attempt with a full W3C-style
 * document (with a verificationMethod block) was rejected client-side-
 * adjacent with temMALFORMED — these are ledger-enforced Blob fields
 * with a small real max length on this build, not documented in the
 * SDK's own type declarations (AGENTS.md: field limits not verified
 * are not a normative contract).
 *
 * A DID never proves solvency, legal identity, or loan eligibility by
 * itself (chapter 17); this adapter only publishes/resolves.
 */
import { Client, Wallet } from "xrpl";
import { DidPort } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";

const EXPLORER_PREFIX =
  "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

export class XrplDidAdapter implements DidPort {
  constructor(private readonly wssUrl: string) {}

  async publishDid(params: {
    subjectSeed: string;
    didDocumentUtf8: string;
    uri?: string;
  }): Promise<PortResult<{ didLedgerIndex: string }>> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const subject = Wallet.fromSeed(params.subjectSeed);
      const currentLedger = await client.getLedgerIndex();
      const prepared = await client.autofill({
        TransactionType: "DIDSet",
        Account: subject.classicAddress,
        DIDDocument: Buffer.from(params.didDocumentUtf8, "utf8").toString("hex").toUpperCase(),
        ...(params.uri ? { URI: Buffer.from(params.uri, "utf8").toString("hex").toUpperCase() } : {}),
      } as any);
      (prepared as any).LastLedgerSequence = currentLedger + 2000;
      const signed = subject.sign(prepared as any);
      const submitResp = await client.submit(signed.tx_blob);

      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const txResp = await client.request({ command: "tx", transaction: signed.hash } as any);
        if ((txResp.result as any).validated) {
          const result = txResp.result as any;
          const evidence: TransactionEvidence = {
            scenario_id: "did",
            step_id: "did_set",
            tx_type: "DIDSet",
            tx_hash: signed.hash,
            submit_preliminary_result: submitResp.result.engine_result as string,
            result_code: result.meta.TransactionResult,
            validated: true,
            ledger_index: result.ledger_index,
            explorer_url: EXPLORER_PREFIX + signed.hash,
          };
          if (result.meta.TransactionResult !== "tesSUCCESS") {
            return { outcome: "rejected", evidence };
          }
          const didEntry = await client.request({ command: "ledger_entry", did: subject.classicAddress } as any);
          return {
            outcome: "ready",
            data: { didLedgerIndex: (didEntry.result as any).node.index },
            evidence,
          };
        }
      }
      return { outcome: "degraded", reason: `DIDSet ${signed.hash} was not validated within the timeout` };
    } finally {
      await client.disconnect();
    }
  }

  async resolveDid(params: { subjectAddress: string }): Promise<
    | { found: true; didDocumentUtf8: string; ledgerIndex: string }
    | { found: false }
  > {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const didEntry = await client
        .request({ command: "ledger_entry", did: params.subjectAddress } as any)
        .catch(() => null);
      if (!didEntry) {
        return { found: false };
      }
      const node = (didEntry.result as any).node;
      return {
        found: true,
        didDocumentUtf8: Buffer.from(node.DIDDocument, "hex").toString("utf8"),
        ledgerIndex: node.index,
      };
    } finally {
      await client.disconnect();
    }
  }
}
