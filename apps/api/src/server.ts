import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { AppDependencies } from "./composition.js";
import { healthRoutes } from "./routes/health.js";
import { networkCapabilitiesRoutes } from "./routes/network-capabilities.js";
import { projectionRoutes } from "./routes/projections.js";
import { workspaceRoutes } from "./routes/workspaces.js";

export function buildServer(deps: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  const allowedOrigins = new Set(
    (process.env["APP_ORIGINS"] ?? "http://localhost:8081,http://localhost:8082,http://localhost:8099,http://127.0.0.1:8099")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  void app.register(cors, {
    origin(origin, callback) {
      // Requests without an Origin are server-to-server. Browser origins are
      // explicitly allow-listed; never reflect an arbitrary credentialed origin.
      callback(null, origin === undefined || allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Idempotency-Key", "X-Dev-Tenant-Id"],
    credentials: true,
  });

  app.register(healthRoutes);
  app.register((instance) => networkCapabilitiesRoutes(instance, deps));
  app.register((instance) => workspaceRoutes(instance, deps));
  app.register((instance) => projectionRoutes(instance, deps));
  return app;
}
