/**
 * Sponsorship adapter (SPON-01, P1). Gate SP0 has not been run: the
 * "Sponsor" amendment is confirmed enabled by G0, but no sponsored
 * transaction has been submitted or validated yet. This stays
 * unavailable until a real SP0 test succeeds (chapter 30: "Les
 * capacités restent désactivées tant qu'un test réel n'a pas réussi.").
 */
import { SponsorshipPort } from "./ports";
import { PortResult } from "./types";

export class XrplSponsorshipAdapter implements SponsorshipPort {
  async quoteSponsoredOperation(): Promise<PortResult<{ maxAmountDrops: string; expiresAt: string }>> {
    return {
      outcome: "unavailable",
      reason: "SP0 not executed yet; Sponsor amendment enabled per G0 but no sponsored tx validated.",
    };
  }
}
