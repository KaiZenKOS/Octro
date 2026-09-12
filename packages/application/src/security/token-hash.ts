import { createHash } from "node:crypto";

// Hachage deterministe (SHA-256), sans sel : sert a indexer des secrets a
// haute entropie generes par le serveur (jeton de session opaque) ou a duree
// de vie courte et tentatives limitees (code de verification email a 6
// chiffres) — jamais des mots de passe choisis par un utilisateur, voir
// password-hash.ts pour ceux-la.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
