import type { FastifyInstance } from "fastify";
import type { AppDependencies } from "../composition.js";

export async function healthRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await deps.checkReadiness();
      return reply.send({ status: "ready" });
    } catch {
      return reply.code(503).send({ status: "not_ready", code: "DEPENDENCY_UNAVAILABLE" });
    }
  });
}
