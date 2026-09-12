// Chiffrement au repos (SEC-04) pour les secrets qui doivent survivre un
// redemarrage (seed de wallet utilisateur, cle API Odoo BYO) — jamais
// stockes en clair. Le decouplage encrypt/decrypt (plutot qu'un simple
// hash) est deliberement reversible : ces secrets doivent pouvoir etre
// reutilises pour signer/appeler une API, contrairement a un mot de passe.
export interface CryptoPort {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}
