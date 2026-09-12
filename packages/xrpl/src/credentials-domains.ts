/**
 * Credentials + Permissioned Domains adapter (LOAD-01, LOAD-03).
 *
 * NOT executed against the network yet. G0 (docs/progress/augustin.md)
 * confirmed the Credentials, PermissionedDomains and SingleAssetVault
 * amendments are enabled, and xrpl.js 5.2.0 exposes CredentialCreate,
 * CredentialAccept and PermissionedDomainSet models — so the primitives
 * exist, but the issuer/subject flow (CredentialCreate -> accept ->
 * PermissionedDomainSet -> bind to the private vault -> refused deposit
 * -> accepted deposit -> expiration/withdrawal) has not been run.
 *
 * Every method below returns "unavailable" honestly instead of a
 * fabricated "ready"/"tesSUCCESS": chapter 29's recette (refus sans
 * attestation, puis accepté) is the next real step for this file, and
 * it needs a dedicated issuer test account plus coordination with
 * Samet's applicative eligibility (S5) per TEAM_TASKS.md section 5.
 */
import { CredentialsAndDomainsPort } from "./ports";
import { PortResult } from "./types";

const NOT_RUN_REASON =
  "Credentials/Domains cycle not executed against the Custom Hackathon Devnet yet " +
  "(amendments confirmed enabled by G0; issuer test account and CredentialCreate/" +
  "CredentialAccept/PermissionedDomainSet payloads still to be run and recorded).";

export class XrplCredentialsAndDomainsAdapter implements CredentialsAndDomainsPort {
  async issueCredential(): Promise<PortResult<{ credentialIndex: string }>> {
    return { outcome: "unavailable", reason: NOT_RUN_REASON };
  }

  async acceptCredential(): Promise<PortResult<{}>> {
    return { outcome: "unavailable", reason: NOT_RUN_REASON };
  }

  async bindDomainToVault(): Promise<PortResult<{ domainId: string }>> {
    return { outcome: "unavailable", reason: NOT_RUN_REASON };
  }

  async evaluateDepositEligibility(): Promise<{
    enforcement: "application" | "ledger";
    allowed: boolean;
    reasonCode: string;
    policyVersion: string;
    expiresAt: string | null;
  }> {
    // Fails closed: no eligibility is ever granted by a stub.
    return {
      enforcement: "application",
      allowed: false,
      reasonCode: "credentials_domains_not_verified",
      policyVersion: "unset",
      expiresAt: null,
    };
  }
}
