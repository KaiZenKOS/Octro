import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { AppDependencies } from "./composition.js";
import { healthRoutes } from "./routes/health.js";
import { projectionRoutes } from "./routes/projections.js";
import { workspaceRoutes } from "./routes/workspaces.js";

export function buildServer(deps: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  void app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Idempotency-Key"],
    credentials: true,
  });

  app.register(healthRoutes);
  app.register((instance) => workspaceRoutes(instance, deps));
  app.register((instance) => projectionRoutes(instance, deps));
  return app;
}
