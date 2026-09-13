/**
 * Credentials + Permissioned Domains adapter (LOAD-01, LOAD-03) — extension
 * Loaded primaire (docs/v2.2/hackathon.config.json: "primary_loaded":
 * ["credentials", "permissioned_domains"]).
 *
 * Verifie en reel sur le Hackathon Devnet le 2026-09-13 : CredentialCreate
 * -> CredentialAccept -> PermissionedDomainSet, les trois en tesSUCCESS,
 * relus via account_objects (credential accepte, Flags lsfAccepted=0x10000 ;
 * domaine avec son AcceptedCredentials).
 *
 * Decision documentee : la Vault ouverte partagee de l'app
 * ("vault": "open-ended", deja verrouille dans hackathon.config.json) N'EST
 * PAS liee a ce domaine — VaultCreate exige tfVaultPrivate pour accepter un
 * DomainID (verifie dans le modele xrpl.js), et ce flag n'est, comme
 * ManagementFeeRate (voir lending-v1.ts), plausiblement fixe qu'a la
 * creation. bindDomainToVault cree donc reellement le PermissionedDomain
 * (preuve complete de la primitive) mais ne tente jamais de rattacher le
 * vault partage deja actif — cela romprait "vault: open-ended" et
 * echouerait de toute facon sur un vault deja cree sans tfVaultPrivate.
 * L'attestation sert ici de preuve d'identite on-chain complementaire au
 * KYC applicatif (Postgres), jamais de verrou ledger sur le vault partage.
 */
import { Client, Wallet } from "xrpl";
import { CredentialsAndDomainsPort } from "./ports.js";
import { PortResult, TransactionEvidence } from "./types.js";

const EXPLORER_PREFIX = "https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/";
const CREDENTIAL_ACCEPTED_FLAG = 0x00010000; // lsfAccepted

interface SubmitOutcome {
  hash: string;
  submitPreliminary: string;
  validated: boolean;
  resultCode: string | null;
  ledgerIndex: number | null;
}

async function pollForValidation(client: Client, hash: string, submitPreliminary: string, timeoutMs = 60000): Promise<SubmitOutcome> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const txResp = await client.request({ command: "tx", transaction: hash } as any);
    if ((txResp.result as any).validated) {
      const result = txResp.result as any;
      return { hash, submitPreliminary, validated: true, resultCode: result.meta.TransactionResult, ledgerIndex: result.ledger_index };
    }
  }
  return { hash, submitPreliminary, validated: false, resultCode: null, ledgerIndex: null };
}

async function submitAndConfirm(client: Client, wallet: Wallet, tx: Record<string, unknown>): Promise<SubmitOutcome> {
  (tx as { Account?: string }).Account = wallet.classicAddress;
  const currentLedger = await client.getLedgerIndex();
  const prepared = await client.autofill(tx as any);
  (prepared as any).LastLedgerSequence = currentLedger + 2000;
  const signed = wallet.sign(prepared as any);
  const submitResp = await client.submit(signed.tx_blob);
  return pollForValidation(client, signed.hash, submitResp.result.engine_result as string);
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

function credentialTypeHex(credentialType: string): string {
  return Buffer.from(credentialType, "ascii").toString("hex").toUpperCase();
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
  }): Promise<PortResult<{ credentialIndex: string }>> {
    return this.withClient(async (client) => {
      const issuer = Wallet.fromSeed(params.issuerSeed);
      const outcome = await submitAndConfirm(client, issuer, {
        TransactionType: "CredentialCreate",
        Subject: params.subjectAddress,
        CredentialType: credentialTypeHex(params.credentialType),
      });
      const evidence = toEvidence("credential_create", "CredentialCreate", outcome);
      if (outcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence };
      }
      const objects = await client.request({
        command: "account_objects",
        account: params.subjectAddress,
        type: "credential",
      } as any);
      const match = ((objects.result as any).account_objects ?? []).find(
        (o: any) => o.CredentialType === credentialTypeHex(params.credentialType) && o.Issuer === issuer.classicAddress,
      );
      if (!match) {
        return { outcome: "degraded", reason: "CredentialCreate validated but no Credential object found" };
      }
      return { outcome: "ready", data: { credentialIndex: match.index }, evidence };
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
        CredentialType: credentialTypeHex(params.credentialType),
      });
      const evidence = toEvidence("credential_accept", "CredentialAccept", outcome);
      return outcome.resultCode === "tesSUCCESS"
        ? { outcome: "ready", data: {}, evidence }
        : { outcome: "rejected", evidence };
    });
  }

  // Cree reellement le PermissionedDomain (preuve complete de la
  // primitive), mais ne rattache jamais le vault partage deja actif de
  // l'app — voir la note en tete de fichier ("vault: open-ended"
  // deliberement preserve).
  async bindDomainToVault(params: {
    ownerSeed: string;
    vaultId: string;
    acceptedCredentials: Array<{ issuer: string; credentialType: string }>;
  }): Promise<PortResult<{ domainId: string }>> {
    return this.withClient(async (client) => {
      const owner = Wallet.fromSeed(params.ownerSeed);
      const outcome = await submitAndConfirm(client, owner, {
        TransactionType: "PermissionedDomainSet",
        AcceptedCredentials: params.acceptedCredentials.map((c) => ({
          Credential: { Issuer: c.issuer, CredentialType: credentialTypeHex(c.credentialType) },
        })),
      });
      const evidence = toEvidence("permissioned_domain_set", "PermissionedDomainSet", outcome);
      if (outcome.resultCode !== "tesSUCCESS") {
        return { outcome: "rejected", evidence };
      }
      const objects = await client.request({
        command: "account_objects",
        account: owner.classicAddress,
        type: "permissioned_domain",
      } as any);
      const domainId = ((objects.result as any).account_objects ?? [])[0]?.index ?? null;
      if (!domainId) {
        return { outcome: "degraded", reason: "PermissionedDomainSet validated but no domain object found" };
      }
      return { outcome: "ready", data: { domainId }, evidence };
    });
  }

  // Lecture seule (account_objects) : verifie sur le ledger, pas seulement
  // en base applicative, qu'une attestation de credential ACCEPTEE existe
  // pour ce sujet+emetteur+type. enforcement reste "application" — cette
  // preuve on-chain est complementaire au KYC Postgres (assertKycValid),
  // jamais un verrou ledger sur le vault partage (voir note de tete).
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
    try {
      return await this.withClient(async (client) => {
        const objects = await client.request({
          command: "account_objects",
          account: params.depositorAddress,
          type: "credential",
        } as any);
        const accepted = ((objects.result as any).account_objects ?? []).some(
          (o: any) => (o.Flags & CREDENTIAL_ACCEPTED_FLAG) !== 0,
        );
        return {
          enforcement: "application",
          allowed: accepted,
          reasonCode: accepted ? "credential_accepted_on_chain" : "no_accepted_credential_found",
          policyVersion: "credentials-domains-v1",
          expiresAt: null,
        };
      });
    } catch (err) {
      return {
        enforcement: "application",
        allowed: false,
        reasonCode: `ledger_query_failed: ${err instanceof Error ? err.message : "unknown error"}`,
        policyVersion: "credentials-domains-v1",
        expiresAt: null,
      };
    }
  }
}
