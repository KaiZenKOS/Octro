import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

export interface PgConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslMode: string;
  // Chemin (relatif au repertoire de travail) vers un certificat auto-signe
  // a epingler comme CA de confiance — verifie ce certificat exact, jamais
  // "n'importe quel certificat" (rejectUnauthorized reste true). Plus sur
  // que de desactiver la verification TLS quand le serveur n'a pas de
  // certificat chaine a une autorite publique.
  sslRootCertPath?: string;
}

// Point unique de creation du pool pg — apps/api n'importe jamais "pg"
// directement (composition.ts ne connait que @octro/application), coherent
// avec le reste de l'architecture (docs/architecture.md).
export function createPgPool(config: PgConnectionConfig): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: buildSslConfig(config),
  });
}

function buildSslConfig(config: PgConnectionConfig): Record<string, unknown> | undefined {
  if (config.sslMode !== "verify-full") return undefined;
  if (config.sslRootCertPath) {
    const resolved = resolve(config.sslRootCertPath);
    if (existsSync(resolved)) {
      // Le certificat epingle est verifie mot pour mot (ca) ; son CN/SAN est
      // le nom d'hote assigne par le fournisseur cloud, pas le nom DNS
      // public utilise pour joindre le serveur (PGHOST) — desactiver
      // uniquement la verification du nom d'hote reste sur ici puisque le
      // certificat exact (pas "n'importe quel certificat") est deja pinne.
      return { rejectUnauthorized: true, ca: readFileSync(resolved, "utf-8"), checkServerIdentity: () => undefined };
    }
  }
  return { rejectUnauthorized: true };
}
