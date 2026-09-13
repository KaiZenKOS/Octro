import type { CredentialsAndDomainsPort } from "@octro/xrpl";

// Doublure de test/dev : jamais un vrai appel reseau. Utilisee tant que
// LENDING_V1_ENABLED n'est pas "true" (voir composition.ts), meme principe
// que FakeLendingV1Adapter/FakeIouSetupAdapter.
export class FakeCredentialsAndDomainsAdapter implements CredentialsAndDomainsPort {
  private counter = 0;

  private evidence(stepId: string, txType: string) {
    this.counter += 1;
    return {
      scenario_id: "fake-credentials-domains",
      step_id: stepId,
      tx_type: txType,
      tx_hash: `FAKE-CRED-${this.counter}`,
      result_code: "tesSUCCESS",
      validated: true,
      ledger_index: this.counter,
    };
  }

  async issueCredential(): ReturnType<CredentialsAndDomainsPort["issueCredential"]> {
    return { outcome: "ready", data: { credentialIndex: `fake-credential-${this.counter}` }, evidence: this.evidence("credential_create", "CredentialCreate") };
  }

  async acceptCredential(): ReturnType<CredentialsAndDomainsPort["acceptCredential"]> {
    return { outcome: "ready", data: {}, evidence: this.evidence("credential_accept", "CredentialAccept") };
  }

  async bindDomainToVault(): ReturnType<CredentialsAndDomainsPort["bindDomainToVault"]> {
    return { outcome: "ready", data: { domainId: `fake-domain-${this.counter}` }, evidence: this.evidence("permissioned_domain_set", "PermissionedDomainSet") };
  }

  async evaluateDepositEligibility(): ReturnType<CredentialsAndDomainsPort["evaluateDepositEligibility"]> {
    return {
      enforcement: "application",
      allowed: true,
      reasonCode: "fake_credential_accepted",
      policyVersion: "fake",
      expiresAt: null,
    };
  }
}
