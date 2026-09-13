import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { CryptoPort } from "../../ports/crypto-port.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

// AES-256-GCM (node:crypto). Format stocke : "<iv hex>:<authTag hex>:<ciphertext hex>".
// La cle (32 octets, base64) vient de l'environnement (WALLET_SEED_ENCRYPTION_KEY
// ou ODOO_API_KEY_ENCRYPTION_KEY — deux cles distinctes, jamais partagees
// entre wallet et Odoo, pour isoler le rayon d'impact d'une fuite) ; jamais
// en dur ni en Git (SEC-04).
export class NodeAesGcmAdapter implements CryptoPort {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    const key = Buffer.from(base64Key, "base64");
    if (key.length !== 32) {
      throw new Error("encryption key must decode to exactly 32 bytes (AES-256)");
    }
    this.key = key;
  }

  async encrypt(plaintext: string): Promise<string> {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  async decrypt(ciphertext: string): Promise<string> {
    const [ivHex, authTagHex, dataHex] = ciphertext.split(":");
    if (!ivHex || !authTagHex || !dataHex) {
      throw new Error("malformed ciphertext");
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  }
}
