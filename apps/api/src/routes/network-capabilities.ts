import { NetworkCapabilitiesSchema } from "@octro/contracts";
import type { FastifyInstance } from "fastify";
import type { AppDependencies } from "../composition.js";

// Read-only capability snapshot from the injected application port. This API
// layer intentionally has no direct XRPL SDK or adapter dependency.
export async function networkCapabilitiesRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.get("/v1/network-capabilities", async (_request, reply) => {
    const snapshot = await deps.getNetworkCapabilities.execute();
    return reply.send(NetworkCapabilitiesSchema.parse(snapshot));
  });
}
