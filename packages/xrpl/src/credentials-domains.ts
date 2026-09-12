/**
 * Credentials + Permissioned Domains adapter (LOAD-01, LOAD-03).
 *
 * Verified for real against the Custom Hackathon Devnet on 2026-09-12
 * (docs/progress/augustin.md, docs/progress/augustin/evidence/
 * a4-credentials-domains-full-cycle.json). Full real cycle, each step
 * with a validated tx hash and a genuine, distinct result code:
 *
 *   PermissionedDomainSet (new domain, AcceptedCredentials=[{issuer,type}])
 *     -> tesSUCCESS
 *   VaultCreate (tfVaultPrivate, DomainID = that domain)
 *     -> tesSUCCESS
 *   VaultDeposit from a subject with NO credential
 *     -> tecNO_AUTH (real refusal, LOAD-01's "dépôt refusé sans attestation")
 *   CredentialCreate (issuer -> subject, with a short Expiration)
 *     -> tesSUCCESS
 *   CredentialAccept (subject accepts)
 *     -> tesSUCCESS
 *   VaultDeposit retried by the now-credentialed subject
 *     -> tesSUCCESS ("puis accepté avec attestation reconnue")
 *   A NEW VaultDeposit attempted after the credential's Expiration passed
 *     -> tecEXPIRED (entry is re-checked live, not just at accept time)
 *   VaultWithdraw of the EXISTING shares (from the successful deposit
 *   above), attempted after expiration
 *     -> tesSUCCESS (exit rights survive credential expiration, chapter 29:
 *        "Ne pas bloquer arbitrairement la sortie")
 *
 * One important, verified-not-assumed field mapping: VaultCreate's
 * DomainID does NOT end up on the Vault ledger entry itself. It ends up
 * on the vault's SHARE MPTokenIssuance (visible via the `vault_info` RPC
 * method's `shares.DomainID`, confirmed by ledger_entry lookups both
 * ways). Domain-gating a vault is really domain-gating who may hold its
 * share MPT, which is what a VaultDeposit ultimately requires. Treat
 * this as the current build's real wiring, not a normative field name
 * (AGENTS.md: "Les noms de champs non vérifiés ne sont pas des contrats
 * normatifs.").
 *
 * bindDomainToVault below targets an EXISTING vault via VaultSet's own
 * DomainID field (present in xrpl.js 5.2.0's model) rather than
 * VaultCreate's — that specific combination (VaultSet on an
 * already-created vault) was not re-run this session; the create-time
 * path above is what was actually exercised end to end.
 */
import { Client, Wallet } from "xrpl";
import { CredentialsAndDomainsPort } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";

const EXPLORER_PREFIX =
  "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";

interface SubmitOutcome {
  hash: string;
  submitPreliminary: string;
  validated: boolean;
  resultCode: string | null;
  ledgerIndex: number | null;
}

async function submitAndConfirm(
  client: Client,
  wallet: Wallet,
  tx: Record<string, unknown>,
  timeoutMs = 60000
): Promise<SubmitOutcome> {
  (tx as { Account?: string }).Account = wallet.classicAddress;
  const currentLedger = await client.getLedgerIndex();
  const prepared = await client.autofill(tx as any);
  (prepared as any).LastLedgerSequence = currentLedger + 2000;
  const signed = wallet.sign(prepared as any);
  const submitResp = await client.submit(signed.tx_blob);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResp = await client.request({ command: "tx", transaction: signed.hash } as any);
    if ((txResp.result as any).validated) {
      const result = txResp.result as any;
      return {
        hash: signed.hash,
        submitPreliminary: submitResp.result.engine_result as string,
        validated: true,
        resultCode: result.meta.TransactionResult,
        ledgerIndex: result.ledger_index,
      };
    }
  }
  return {
    hash: signed.hash,
    submitPreliminary: submitResp.result.engine_result as string,
    validated: false,
    resultCode: null,
    ledgerIndex: null,
  };
}

function toEvidence(stepId: string, txType: string, outcome: SubmitOutcome): TransactionEvidence {
  return {
    scenario_id: "credentials-domains",
    step_id: stepId,
    tx_type: txType,
    tx_hash: outcome.hash,
    submit_preliminary_result: outcome.submitPreliminary,
    result_code: outcome.resultCode,
    validated: outcome.validated,
    ledger_index: outcome.ledgerIndex,
    explorer_url: EXPLORER_PREFIX + outcome.hash,
  };
}

// Credential type strings must be hex-encoded (max 64 bytes) per the
// SDK's own validateCredentialType.
function toCredentialTypeHex(credentialType: string): string {
  if (/^[0-9A-Fa-f]+$/.test(credentialType) && credentialType.length % 2 === 0) {
    return credentialType.toUpperCase();
  }
  return Buffer.from(credentialType, "utf8").toString("hex").toUpperCase();
}

export class XrplCredentialsAndDomainsAdapter implements CredentialsAndDomainsPort {
  constructor(private readonly wssUrl: string) {}

  private async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.disconnect();
    }
  }

  async issueCredential(params: {
    issuerSeed: string;
    subjectAddress: string;
    credentialType: string;
    expirationRippleTime?: number;
  }): Promise<PortResult<{ credentialIndex: string }>> {
    return this.withClient(async (client) => {
      const issuer = Wallet.fromSeed(params.issuerSeed);
      const credentialTypeHex = toCredentialTypeHex(params.credentialType);
      const outcome = await submitAndConfirm(client, issuer, {
        TransactionType: "CredentialCreate",
        Subject: params.subjectAddress,
        CredentialType: credentialTypeHex,
        ...(params.expirationRippleTime ? { Expiration: params.expirationRippleTime } : {}),
      });
      const evidence = toEvidence("credential_create", "CredentialCreate", outcome);
      if (outcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence };
      }
      // Fetched immediately after creation, before any possible
      // expiration, since an expired Credential can be pruned by the
      // next transaction that touches it (observed this session: both
      // the issuer's and subject's account_objects were empty again
      // once the credential used in A4's real run had expired).
      const objects = await client.request({
        command: "account_objects",
        account: issuer.classicAddress,
        type: "credential",
      } as any);
      const credentialIndex = (objects.result as any).account_objects[0]?.index ?? null;
      if (!credentialIndex) {
        return { outcome: "degraded", reason: "CredentialCreate validated but no credential object found" };
      }
      return { outcome: "ready", data: { credentialIndex }, evidence };
    });
  }

  async acceptCredential(params: {
    subjectSeed: string;
    issuerAddress: string;
    credentialType: string;
  }): Promise<PortResult<{}>> {
    return this.withClient(async (client) => {
      const subject = Wallet.fromSeed(params.subjectSeed);
      const outcome = await submitAndConfirm(client, subject, {
        TransactionType: "CredentialAccept",
        Issuer: params.issuerAddress,
        CredentialType: toCredentialTypeHex(params.credentialType),
      });
      const evidence = toEvidence("credential_accept", "CredentialAccept", outcome);
      return outcome.resultCode === "tesSUCCESS"
        ? { outcome: "ready", data: {}, evidence }
        : { outcome: "rejected", evidence };
    });
  }

  /**
   * Creates a new PermissionedDomain and binds it to an existing vault
   * via VaultSet. Verified end to end this session bound the domain at
   * VaultCreate time instead (see file header); this method uses
   * VaultSet's own DomainID field, present in the same SDK build, for
   * the "existing vault" shape this port's signature commits to.
   */
  async bindDomainToVault(params: {
    ownerSeed: string;
    vaultId: string;
    acceptedCredentials: Array<{ issuer: string; credentialType: string }>;
  }): Promise<PortResult<{ domainId: string }>> {
    return this.withClient(async (client) => {
      const owner = Wallet.fromSeed(params.ownerSeed);
      const domainOutcome = await submitAndConfirm(client, owner, {
        TransactionType: "PermissionedDomainSet",
        AcceptedCredentials: params.acceptedCredentials.map((c) => ({
          Credential: { Issuer: c.issuer, CredentialType: toCredentialTypeHex(c.credentialType) },
        })),
      });
      const domainEvidence = toEvidence("domain_set", "PermissionedDomainSet", domainOutcome);
      if (domainOutcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence: domainEvidence };
      }
      const domainObjects = await client.request({
        command: "account_objects",
        account: owner.classicAddress,
        type: "permissioned_domain",
      } as any);
      const domainId = (domainObjects.result as any).account_objects[0]?.index ?? null;
      if (!domainId) {
        return { outcome: "degraded", reason: "PermissionedDomainSet validated but no domain object found" };
      }

      const vaultSetOutcome = await submitAndConfirm(client, owner, {
        TransactionType: "VaultSet",
        VaultID: params.vaultId,
        DomainID: domainId,
      });
      const vaultSetEvidence = toEvidence("vault_set_domain", "VaultSet", vaultSetOutcome);
      if (vaultSetOutcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence: vaultSetEvidence };
      }
      return { outcome: "ready", data: { domainId }, evidence: vaultSetEvidence };
    });
  }

  /**
   * Read-only pre-check: does the depositor hold a currently-accepted,
   * unexpired credential matching one the vault's domain lists? This
   * mirrors chapter 29's "enforcement = application" decision, kept
   * separate from the ledger's own tecNO_AUTH/tecEXPIRED enforcement,
   * which VaultDeposit itself applies regardless of what this returns.
   */
  async evaluateDepositEligibility(params: {
    depositorAddress: string;
    vaultId: string;
  }): Promise<{
    enforcement: "application" | "ledger";
    allowed: boolean;
    reasonCode: string;
    policyVersion: string;
    expiresAt: string | null;
  }> {
    const client = new Client(this.wssUrl);
    await client.connect();
    try {
      const vaultInfo = await client.request({ command: "vault_info", vault_id: params.vaultId } as any);
      const domainId = (vaultInfo.result as any).vault?.shares?.DomainID ?? null;
      if (!domainId) {
        // No domain restriction on this vault's shares: nothing to check.
        return {
          enforcement: "application",
          allowed: true,
          reasonCode: "no_domain_restriction",
          policyVersion: "credentials-domains-v1",
          expiresAt: null,
        };
      }
      const domain = await client.request({ command: "ledger_entry", index: domainId } as any);
      const acceptedCredentials = ((domain.result as any).node?.AcceptedCredentials ?? []) as Array<{
        Credential: { Issuer: string; CredentialType: string };
      }>;
      const depositorObjects = await client.request({
        command: "account_objects",
        account: params.depositorAddress,
        type: "credential",
      } as any);
      const nowRippleTime = Math.floor(Date.now() / 1000) - 946684800;
      for (const obj of (depositorObjects.result as any).account_objects as any[]) {
        const matches = acceptedCredentials.some(
          (ac) => ac.Credential.Issuer === obj.Issuer && ac.Credential.CredentialType === obj.CredentialType
        );
        const accepted = Boolean(obj.Flags & 0x00010000); // lsfAccepted
        const notExpired = obj.Expiration == null || obj.Expiration > nowRippleTime;
        if (matches && accepted && notExpired) {
          return {
            enforcement: "application",
            allowed: true,
            reasonCode: "matching_accepted_credential",
            policyVersion: "credentials-domains-v1",
            expiresAt: obj.Expiration ? new Date((obj.Expiration + 946684800) * 1000).toISOString() : null,
          };
        }
      }
      return {
        enforcement: "application",
        allowed: false,
        reasonCode: "no_matching_unexpired_accepted_credential",
        policyVersion: "credentials-domains-v1",
        expiresAt: null,
      };
    } finally {
      await client.disconnect();
    }
  }
}
