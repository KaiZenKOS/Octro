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
const RepayBody = z.object({ loan_id: z.string().uuid() });
const LoanIdQuery = z.object({ loan_id: z.string().uuid() });
const WithdrawBody = z.object({ amount_drops: PositiveDecimalStringSchema, asset_id: AssetIdSchema.optional() });

export async function lendingRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  // Publique (pas de session requise) : solde reel et historique des
  // avances du wallet buffer — transparence affichee sur la page Info,
  // aucune donnee personnelle (jamais l'identite du lender avance).
  app.get("/v1/lending/buffer", async (_request, reply) => {
    try {
      const status = await deps.getBufferStatus.execute();
      return reply.send(status);
    } catch (err) {
      return sendError(reply, err);
    }
  });

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

  // Solde reel a rembourser (TotalValueOutstanding, accroit avec les
  // interets) — le client l'affiche avant de valider, plutot que de
  // demander un montant que le borrower ne peut pas connaitre lui-meme.
  app.get("/v1/lending/loans/outstanding", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const query = LoanIdQuery.parse(request.query);
      const outstanding = await deps.getLoanOutstanding.execute({ userId, loanId: query.loan_id });
      // snake_case, comme le reste de l'API — le port @octro/xrpl renvoie
      // du camelCase (vocabulaire ledger), jamais expose tel quel au client.
      return reply.send({
        total_value_outstanding: outstanding.totalValueOutstanding,
        principal_outstanding: outstanding.principalOutstanding,
        payment_remaining: outstanding.paymentRemaining,
        next_payment_due_date: outstanding.nextPaymentDueDate,
        defaulted: outstanding.defaulted,
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Aucun montant fourni par l'appelant : le pret reste un remboursement
  // en une fois, et TotalValueOutstanding est relu juste avant de
  // soumettre (RepayLoanUseCase) — elimine tout risque de montant errone
  // ou perime.
  app.post("/v1/lending/repay", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = RepayBody.parse(request.body);
      const loan = await deps.repayLoan.execute({ userId, loanId: body.loan_id });
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
