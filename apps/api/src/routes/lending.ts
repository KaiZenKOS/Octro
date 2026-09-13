import { AssetIdSchema, PositiveDecimalStringSchema } from "@octro/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

// Chaine decimale non signee : drops XRP (entiers) ou valeur decimale d'un
// IOU (ex. RLUSD simule, integration xrpl-lending-sim) — jamais un
// flottant. asset_id est optionnel partout : "xrpl:XRP" par defaut, garde
// la compatibilite avec les clients existants qui ne l'envoient pas encore.
const DepositBody = z.object({ amount_drops: PositiveDecimalStringSchema, asset_id: AssetIdSchema.optional() });
// Le borrower choisit desormais explicitement le montant et la duree —
// jamais implicitement le plafond recommande par l'evaluation de credit
// (decision actee) ; l'un et l'autre restent plafonnes cote use-case.
const LoanRequestBody = z.object({
  requested_principal_drops: PositiveDecimalStringSchema,
  requested_term_months: z.number().int().min(1).max(600),
  asset_id: AssetIdSchema.optional(),
});
const RepayBody = z.object({ loan_id: z.string().uuid(), amount_drops: PositiveDecimalStringSchema });
const WithdrawBody = z.object({ amount_drops: PositiveDecimalStringSchema, asset_id: AssetIdSchema.optional() });

export async function lendingRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  // Alimente le selecteur d'actif du client (XRP toujours present ; RLUSD
  // simule des qu'un second pool a ete amorce, integration
  // xrpl-lending-sim). Ne renvoie jamais la seed chiffree du proprietaire.
  app.get("/v1/lending/assets", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const assets = await deps.listLendingAssets.execute();
      return reply.send(assets);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Vue agregee (depots, prets, retraits) de l'utilisateur courant, toute
  // classe d'actif confondue — permet au client de relire ses positions
  // apres un rechargement de page, sans les garder uniquement en memoire.
  app.get("/v1/lending/positions", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const positions = await deps.getLendingPositions.execute({ userId });
      return reply.send(positions);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/lending/deposit", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = DepositBody.parse(request.body);
      const deposit = await deps.lenderDeposit.execute({
        userId,
        amountDrops: body.amount_drops,
        ...(body.asset_id !== undefined ? { assetId: body.asset_id } : {}),
      });
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
        requestedPrincipalDrops: body.requested_principal_drops,
        requestedTermMonths: body.requested_term_months,
        ...(body.asset_id !== undefined ? { assetId: body.asset_id } : {}),
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
      const withdrawal = await deps.withdrawFromVault.execute({
        userId,
        amountDrops: body.amount_drops,
        ...(body.asset_id !== undefined ? { assetId: body.asset_id } : {}),
      });
      return reply.send(withdrawal);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
