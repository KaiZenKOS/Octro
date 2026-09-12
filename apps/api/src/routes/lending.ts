import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

const DropsString = z.string().regex(/^[0-9]+$/, "expected an unsigned integer string of drops");

const DepositBody = z.object({ amount_drops: DropsString });
const LoanRequestBody = z.object({ requested_principal_drops: DropsString.optional() });
const RepayBody = z.object({ loan_id: z.string().uuid(), amount_drops: DropsString });
const WithdrawBody = z.object({ amount_drops: DropsString });

export async function lendingRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/lending/deposit", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = DepositBody.parse(request.body);
      const deposit = await deps.lenderDeposit.execute({ userId, amountDrops: body.amount_drops });
      return reply.code(201).send(deposit);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/lending/loan-request", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = LoanRequestBody.parse(request.body);
      const loan = await deps.borrowerLoanRequest.execute({
        userId,
        ...(body.requested_principal_drops !== undefined ? { requestedPrincipalDrops: body.requested_principal_drops } : {}),
      });
      return reply.code(201).send(loan);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/lending/repay", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = RepayBody.parse(request.body);
      const loan = await deps.repayLoan.execute({ userId, loanId: body.loan_id, amountDrops: body.amount_drops });
      return reply.send(loan);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/lending/withdraw", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = WithdrawBody.parse(request.body);
      const withdrawal = await deps.withdrawFromVault.execute({ userId, amountDrops: body.amount_drops });
      return reply.send(withdrawal);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
