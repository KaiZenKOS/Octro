/**
 * Sponsorship adapter (SPON-01, P1).
 *
 * SP0 passed for real on 2026-09-12 against the Custom Hackathon Devnet
 * (docs/progress/augustin.md, docs/progress/augustin/evidence/
 * a6-sponsorship-sp0.json): a sponsee's plain XRP Payment had its fee
 * paid entirely by a separate sponsor account, confirmed by balance
 * deltas, not just a validated submit:
 *   - sponsor balance decreased by exactly the network fee (12 drops)
 *   - sponsee balance decreased by exactly the payment amount, with
 *     ZERO fee deducted from it
 *
 * Flow: the sponsee's transaction is built and autofilled normally,
 * then xrpl.js's addPreFundedSponsor() attaches Sponsor/SponsorFlags,
 * the sponsee signs (covering those fields), and the sponsor co-signs
 * with signAsSponsor() before submission. No prior SponsorshipSet/
 * SponsorshipTransfer ledger object was needed for this per-transaction
 * fee sponsorship (chapter 30's "opération admissible sponsorisée").
 *
 * quoteSponsoredOperation stays unavailable: it names an applicative
 * budget/policy reservation (SPON-02, SPON-03) that lives in Postgres
 * under Samet's S7, not in this adapter.
 */
import { Client, Wallet, addPreFundedSponsor, signAsSponsor, SponsorFlags } from "xrpl";
import { SponsorshipPort, SponsorshipReservation } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";
import { buildPaymentTransaction } from "./transaction-builders.js";

const EXPLORER_PREFIX =
  "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

export class XrplSponsorshipAdapter implements SponsorshipPort {
  constructor(private readonly wssUrl: string) {}

  async quoteSponsoredOperation(_params: {
    beneficiaryAddress: string;
    transactionType: string;
  }): Promise<PortResult<{ maxAmountDrops: string; expiresAt: string }>> {
    return {
      outcome: "unavailable",
      reason:
        "Applicative sponsorship budget/quote (SPON-02, SPON-03) lives in Postgres under Samet's S7; " +
        "not implemented in this adapter. Native fee sponsorship itself is verified (sponsorPaymentFee).",
    };
  }

  async sponsorPaymentFee(params: {
    sponsorSeed: string;
    sponseeSeed: string;
    destinationAddress: string;
    amountDrops: string;
    reservation: SponsorshipReservation;
  }): Promise<PortResult<{ txHash: string; feeDrops: string }>> {
    const sponsor = Wallet.fromSeed(params.sponsorSeed);
    const sponsee = Wallet.fromSeed(params.sponseeSeed);
    const reservation = params.reservation;
    const expiry = Date.parse(reservation.expiresAt);
    if (
      !reservation.reservationId.trim() ||
      !reservation.policyVersion.trim() ||
      reservation.transactionType !== "Payment" ||
      reservation.sponsorAddress !== sponsor.classicAddress ||
      reservation.beneficiaryAddress !== sponsee.classicAddress ||
      !Number.isFinite(expiry) ||
      expiry <= Date.now() ||
      !/^(0|[1-9][0-9]*)$/.test(reservation.maxFeeDrops)
    ) {
      return { outcome: "unavailable", reason: "A current, matching sponsorship policy reservation is required (SPON-02/03)." };
    }

    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const currentLedger = await client.getLedgerIndex();
      const prepared = await client.autofill(buildPaymentTransaction({
        account: sponsee.classicAddress,
        destination: params.destinationAddress,
        amountDrops: params.amountDrops,
      }));
      (prepared as any).LastLedgerSequence = currentLedger + 2000;
      const feeDrops = (prepared as any).Fee as string;
      if (!/^(0|[1-9][0-9]*)$/.test(feeDrops) || BigInt(feeDrops) > BigInt(reservation.maxFeeDrops)) {
        return { outcome: "unavailable", reason: "The prepared network fee exceeds the reserved sponsorship limit." };
      }

      const withSponsorFields = addPreFundedSponsor(prepared as any, sponsor.classicAddress, SponsorFlags.spfSponsorFee);
      const sponseeSigned = sponsee.sign(withSponsorFields as any);
      const fullySigned = signAsSponsor(sponsor, sponseeSigned.tx_blob);

      const submitResp = await client.submit(fullySigned.tx_blob);

      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const txResp = await client.request({ command: "tx", transaction: fullySigned.hash } as any);
        if ((txResp.result as any).validated) {
          const result = txResp.result as any;
          const evidence: TransactionEvidence = {
            scenario_id: "sponsorship",
            step_id: "sponsorship_success",
            tx_type: "Payment",
            tx_hash: fullySigned.hash,
            submit_preliminary_result: submitResp.result.engine_result as string,
            result_code: result.meta.TransactionResult,
            validated: true,
            ledger_index: result.ledger_index,
            explorer_url: EXPLORER_PREFIX + fullySigned.hash,
          };
          return result.meta.TransactionResult === "tesSUCCESS"
            ? { outcome: "ready", data: { txHash: fullySigned.hash, feeDrops }, evidence }
            : { outcome: "rejected", evidence };
        }
      }
      return { outcome: "degraded", reason: `Sponsored payment ${fullySigned.hash} was not validated within the timeout` };
    } finally {
      await client.disconnect();
    }
  }
}
