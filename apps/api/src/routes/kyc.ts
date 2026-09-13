import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

const SimulateKycBody = z.object({
  result: z.enum(["valid", "invalid"]),
});

export async function kycRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/kyc/simulate", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = SimulateKycBody.parse(request.body);
      const status = await deps.simulateKyc.execute({ userId, result: body.result });
      return reply.code(201).send(status);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get("/v1/kyc/status", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const status = await deps.getKycStatus.execute({ userId });
      return reply.send(status);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Integration Credentials + Permissioned Domains (LOAD-01) : verifie sur
  // le ledger (pas seulement en base) qu'une attestation on-chain existe —
  // complementaire au statut KYC applicatif ci-dessus, jamais un
  // remplacement. Peut renvoyer allowed=false meme si le KYC est "valid" en
  // base (wallet pas encore finance au moment de la simulation).
  app.get("/v1/kyc/credential", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const status = await deps.getKycCredentialStatus.execute({ userId });
      return reply.send(status);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
