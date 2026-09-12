import {
  VaultCreateFlags,
  type CredentialAccept,
  type CredentialCreate,
  type DIDSet,
  type LoanBrokerSet,
  type LoanPay,
  type LoanSet,
  type Payment,
  type PermissionedDomainSet,
  type VaultCreate,
  type VaultDeposit,
  type VaultSet,
  type VaultWithdraw,
} from "xrpl";

export const TRACK1_NETWORK_ID = 4001 as const;

/** Bind every adapter payload to the only authorised submission network. */
export function withTrack1NetworkId<T extends object>(
  transaction: T,
): T & { NetworkID: typeof TRACK1_NETWORK_ID } {
  const existingNetworkId = (transaction as { NetworkID?: unknown }).NetworkID;
  if (existingNetworkId !== undefined && existingNetworkId !== TRACK1_NETWORK_ID) {
    throw new TypeError("XRPL transaction targets a network other than Track 1 Devnet (NetworkID 4001)");
  }
  return { ...transaction, NetworkID: TRACK1_NETWORK_ID };
}

/** Omitting AssetsMaximum is the V1 open-ended vault shape. */
export function buildVaultCreateTransaction(params: {
  account: string;
  asset: VaultCreate["Asset"];
  domainId?: string;
}): VaultCreate {
  return withTrack1NetworkId({
    TransactionType: "VaultCreate",
    Account: params.account,
    Asset: params.asset,
    ...(params.domainId === undefined
      ? {}
      : { Flags: VaultCreateFlags.tfVaultPrivate, DomainID: params.domainId }),
  });
}

export function buildVaultDepositTransaction(params: {
  account: string;
  vaultId: string;
  amountDrops: string;
}): VaultDeposit {
  return withTrack1NetworkId({
    TransactionType: "VaultDeposit",
    Account: params.account,
    VaultID: params.vaultId,
    Amount: params.amountDrops,
  });
}

export function buildLoanBrokerSetTransaction(params: {
  account: string;
  vaultId: string;
  debtMaximumDrops: string;
  managementFeeRate: number;
}): LoanBrokerSet {
  return withTrack1NetworkId({
    TransactionType: "LoanBrokerSet",
    Account: params.account,
    VaultID: params.vaultId,
    DebtMaximum: params.debtMaximumDrops,
    ManagementFeeRate: params.managementFeeRate,
  });
}

export function buildLoanSetTransaction(params: {
  borrowerAddress: string;
  brokerOwnerAddress: string;
  loanBrokerId: string;
  principalDrops: string;
  interestRateHundredThousandths: number;
  paymentIntervalSeconds: number;
  paymentTotal: number;
  gracePeriodSeconds: number;
}): LoanSet {
  return withTrack1NetworkId({
    TransactionType: "LoanSet",
    Account: params.borrowerAddress,
    LoanBrokerID: params.loanBrokerId,
    Counterparty: params.brokerOwnerAddress,
    PrincipalRequested: params.principalDrops,
    InterestRate: params.interestRateHundredThousandths,
    PaymentInterval: params.paymentIntervalSeconds,
    PaymentTotal: params.paymentTotal,
    GracePeriod: params.gracePeriodSeconds,
  });
}

export function buildLoanPayTransaction(params: { account: string; loanId: string; amountDrops: string }): LoanPay {
  return withTrack1NetworkId({
    TransactionType: "LoanPay",
    Account: params.account,
    LoanID: params.loanId,
    Amount: params.amountDrops,
    Flags: 0,
  });
}

export function buildVaultWithdrawTransaction(params: {
  account: string;
  vaultId: string;
  amountDrops: string;
}): VaultWithdraw {
  return withTrack1NetworkId({
    TransactionType: "VaultWithdraw",
    Account: params.account,
    VaultID: params.vaultId,
    Amount: params.amountDrops,
  });
}

/**
 * Credential types are UTF-8 by default. An even-length hexadecimal value is
 * accepted as pre-encoded input, matching XRPL's CredentialType field.
 */
export function encodeCredentialType(credentialType: string): string {
  const encoded = /^[0-9A-Fa-f]+$/.test(credentialType) && credentialType.length % 2 === 0
    ? credentialType.toUpperCase()
    : Buffer.from(credentialType, "utf8").toString("hex").toUpperCase();
  if (encoded.length === 0 || encoded.length > 128) {
    throw new RangeError("CredentialType must encode between 1 and 64 bytes");
  }
  return encoded;
}

export function buildCredentialCreateTransaction(params: {
  account: string;
  subjectAddress: string;
  credentialType: string;
  expirationRippleTime?: number;
}): CredentialCreate {
  return withTrack1NetworkId({
    TransactionType: "CredentialCreate",
    Account: params.account,
    Subject: params.subjectAddress,
    CredentialType: encodeCredentialType(params.credentialType),
    ...(params.expirationRippleTime === undefined ? {} : { Expiration: params.expirationRippleTime }),
  });
}

export function buildCredentialAcceptTransaction(params: {
  account: string;
  issuerAddress: string;
  credentialType: string;
}): CredentialAccept {
  return withTrack1NetworkId({
    TransactionType: "CredentialAccept",
    Account: params.account,
    Issuer: params.issuerAddress,
    CredentialType: encodeCredentialType(params.credentialType),
  });
}

export function buildPermissionedDomainSetTransaction(params: {
  account: string;
  domainId?: string;
  acceptedCredentials: Array<{ issuer: string; credentialType: string }>;
}): PermissionedDomainSet {
  return withTrack1NetworkId({
    TransactionType: "PermissionedDomainSet",
    Account: params.account,
    ...(params.domainId === undefined ? {} : { DomainID: params.domainId }),
    AcceptedCredentials: params.acceptedCredentials.map((credential) => ({
      Credential: {
        Issuer: credential.issuer,
        CredentialType: encodeCredentialType(credential.credentialType),
      },
    })),
  });
}

export function buildVaultSetDomainTransaction(params: { account: string; vaultId: string; domainId: string }): VaultSet {
  return withTrack1NetworkId({
    TransactionType: "VaultSet",
    Account: params.account,
    VaultID: params.vaultId,
    DomainID: params.domainId,
  });
}

export function buildPaymentTransaction(params: {
  account: string;
  destination: string;
  amountDrops: string;
}): Payment {
  return withTrack1NetworkId({
    TransactionType: "Payment",
    Account: params.account,
    Destination: params.destination,
    Amount: params.amountDrops,
  });
}

export function buildDidSetTransaction(params: { account: string; didDocumentUtf8: string; uri?: string }): DIDSet {
  return withTrack1NetworkId({
    TransactionType: "DIDSet",
    Account: params.account,
    DIDDocument: Buffer.from(params.didDocumentUtf8, "utf8").toString("hex").toUpperCase(),
    ...(params.uri === undefined ? {} : { URI: Buffer.from(params.uri, "utf8").toString("hex").toUpperCase() }),
  });
}
