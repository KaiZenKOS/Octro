// Extension Lending/KYC/Credit — Phase B. PER-11 : ce garde n'est invoque
// que depuis les cas d'usage a la frontiere credit/lending (demande de
// connexion Odoo, evaluation de credit, depot/pret/retrait) — jamais depuis
// GetPersonalProjectionUseCase, RecordDeclaredEventUseCase ou
// CreateWorkspaceUseCase : la prevision reste accessible sans KYC (ACC-01,
// ACC-02, PER-11).
import type { KycStatusValue } from "@octro/contracts";

export class KycNotValidError extends Error {
  constructor(message = "KYC status is not valid (PER-11)") {
    super(message);
    this.name = "KycNotValidError";
  }
}

export function assertKycValid(status: KycStatusValue): void {
  if (status !== "valid") {
    throw new KycNotValidError();
  }
}
