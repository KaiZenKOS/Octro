import { MongoClient } from "mongodb";

export interface MongoConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  authSource: string;
  tls: boolean;
  tlsAllowInvalidCertificates: boolean;
  tlsAllowInvalidHostnames: boolean;
}

// Point unique de creation du client Mongo — meme discipline que
// create-pg-pool.ts (apps/api ne connait que @octro/application, jamais le
// driver directement). L'URI encode l'utilisateur/mot de passe (jamais dans
// une log) — voir .env : "Node --env-file ne substitue pas ${VARIABLE}".
export function createMongoClient(config: MongoConnectionConfig): MongoClient {
  const user = encodeURIComponent(config.username);
  const password = encodeURIComponent(config.password);
  const uri = `mongodb://${user}:${password}@${config.host}:${config.port}/?authSource=${config.authSource}&tls=${config.tls}`;
  return new MongoClient(uri, {
    tlsAllowInvalidCertificates: config.tlsAllowInvalidCertificates,
    tlsAllowInvalidHostnames: config.tlsAllowInvalidHostnames,
  });
}
