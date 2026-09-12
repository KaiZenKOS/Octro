import Fastify, { type FastifyInstance } from "fastify";
import type { AppDependencies } from "./composition.js";
import { healthRoutes } from "./routes/health.js";
import { projectionRoutes } from "./routes/projections.js";
import { workspaceRoutes } from "./routes/workspaces.js";

export function buildServer(deps: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(healthRoutes);
  app.register((instance) => workspaceRoutes(instance, deps));
  app.register((instance) => projectionRoutes(instance, deps));
  return app;
}
