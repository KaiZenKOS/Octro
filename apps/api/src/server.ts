import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { AppDependencies } from "./composition.js";
import { adminRoutes } from "./routes/admin.js";
import { agentRoutes } from "./routes/agent.js";
import { authRoutes } from "./routes/auth.js";
import { creditRoutes } from "./routes/credit.js";
import { healthRoutes } from "./routes/health.js";
import { kycRoutes } from "./routes/kyc.js";
import { lendingRoutes } from "./routes/lending.js";
import { projectionRoutes } from "./routes/projections.js";
import { workspaceRoutes } from "./routes/workspaces.js";

// APP_ORIGINS (production, HTTPS uniquement — voir infra/config/environment.mjs)
// plus les origines de dev local habituelles (client Expo web) : ces
// dernieres ne peuvent pas passer par APP_ORIGINS (le validateur exige
// HTTPS), donc elles sont ajoutees ici, jamais dans .env.
const LOCAL_DEV_ORIGINS = ["http://localhost:8082", "http://localhost:19006", "http://localhost:8081"];

function buildAllowedOrigins(): string[] {
  const configured = (process.env["APP_ORIGINS"] ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...configured, ...LOCAL_DEV_ORIGINS];
}

export function buildServer(deps: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  // Le client (Expo web) et l'API sont servis sur des origines differentes
  // (ports distincts en dev, sous-domaines distincts en production) : sans
  // CORS, le navigateur bloque tout appel cross-origin ("Failed to fetch").
  void app.register(cors, {
    origin: buildAllowedOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Idempotency-Key",
      "x-dev-tenant-id",
      "x-admin-key",
    ],
    credentials: true,
  });
  app.register(healthRoutes);
  app.register((instance) => workspaceRoutes(instance, deps));
  app.register((instance) => projectionRoutes(instance, deps));
  app.register((instance) => authRoutes(instance, deps));
  app.register((instance) => kycRoutes(instance, deps));
  app.register((instance) => creditRoutes(instance, deps));
  app.register((instance) => lendingRoutes(instance, deps));
  app.register(agentRoutes);
  app.register(adminRoutes);
  return app;
}
