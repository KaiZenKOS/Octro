import type { EmailVerificationPurpose } from "@octro/contracts";

// Forme de persistance uniquement : le code lui-meme n'est jamais stocke en
// clair (codeHash, voir security/token-hash.ts), et n'a pas de contrat public.
export interface EmailVerificationRecord {
  id: string;
  userId: string;
  purpose: EmailVerificationPurpose;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
}

export interface EmailVerificationRepository {
  save(record: EmailVerificationRecord): Promise<void>;
  // Le plus recent enregistrement non consomme pour ce user+purpose ; le
  // use-case verifie lui-meme l'expiration et le compteur de tentatives.
  findLatestActiveForUser(userId: string, purpose: EmailVerificationPurpose): Promise<EmailVerificationRecord | null>;
}
