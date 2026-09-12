import type { FastifyInstance } from "fastify";
import { KycNotValidError } from "@octro/domain";
import { requireSession } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

export async function walletRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/wallet/provision", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const kyc = await deps.getKycStatus.execute({ userId });
      if (kyc.status !== "valid") throw new KycNotValidError();
      const wallet = await deps.provisionWallet.execute({ userId });
      return reply.code(201).send(wallet);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
