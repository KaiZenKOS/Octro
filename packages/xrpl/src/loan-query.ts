import { Client } from "xrpl";
import type { LoanOutstanding, LoanQueryPort, QueryResult } from "./ports.js";

// 2000-01-01T00:00:00Z en secondes Unix — offset de l'epoque ripple
// (StartDate/NextPaymentDueDate d'un Loan ledger entry, pas de champ ISO
// pratique fourni comme sur account_tx#close_time_iso).
const RIPPLE_EPOCH_OFFSET_SECONDS = 946684800;

function rippleTimeToIso(rippleTime: number | undefined): string | null {
  if (rippleTime === undefined) return null;
  return new Date((rippleTime + RIPPLE_EPOCH_OFFSET_SECONDS) * 1000).toISOString();
}

const LOAN_DEFAULT_FLAG = 0x00010000; // lsfLoanDefault

// Lecture seule (ledger_entry) : jamais de signature, jamais de
// soumission. Le solde reel d'un Loan (TotalValueOutstanding) accroit
// continuement avec les interets — seul le ledger fait foi.
export class XrplLoanQueryAdapter implements LoanQueryPort {
  constructor(private readonly wssUrl: string) {}

  async getOutstanding(loanId: string): Promise<QueryResult<LoanOutstanding>> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const { result } = await client.request({ command: "ledger_entry", index: loanId } as any);
      const node = (result as any).node;
      return {
        outcome: "ready",
        data: {
          totalValueOutstanding: String(node.TotalValueOutstanding),
          principalOutstanding: String(node.PrincipalOutstanding),
          paymentRemaining: node.PaymentRemaining,
          nextPaymentDueDate: rippleTimeToIso(node.NextPaymentDueDate),
          defaulted: (node.Flags & LOAN_DEFAULT_FLAG) !== 0,
        },
      };
    } catch (err) {
      return { outcome: "unavailable", reason: err instanceof Error ? err.message : "unknown error" };
    } finally {
      await client.disconnect();
    }
  }
}
