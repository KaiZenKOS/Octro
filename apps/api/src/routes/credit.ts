import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

const SaveOdooConnectionBody = z.object({
  odoo_url: z.string().url(),
  odoo_api_key: z.string().min(1),
});

const ListCompaniesQuery = z.object({
  odoo_connection_id: z.string().uuid(),
});

const RequestAssessmentBody = z.object({
  odoo_connection_id: z.string().uuid(),
  company_id: z.number().int().optional(),
});

export async function creditRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/credit/odoo-connection", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = SaveOdooConnectionBody.parse(request.body);
      const connection = await deps.saveOdooConnection.execute({
        userId,
        odooUrl: body.odoo_url,
        odooApiKey: body.odoo_api_key,
      });
      return reply.code(201).send(connection);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Selecteur d'entreprise cote client des qu'il y en a plus d'une
  // accessible a la cle API (decision actee) — jamais un choix implicite.
  app.get("/v1/credit/odoo-companies", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const query = ListCompaniesQuery.parse(request.query);
      const companies = await deps.listOdooCompanies.execute({ userId, odooConnectionId: query.odoo_connection_id });
      return reply.send(companies);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/credit/assessment", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const body = RequestAssessmentBody.parse(request.body);
      const assessment = await deps.requestCreditAssessment.execute({
        userId,
        odooConnectionId: body.odoo_connection_id,
        ...(body.company_id !== undefined ? { companyId: body.company_id } : {}),
      });
      return reply.code(201).send(assessment);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get("/v1/credit/assessment", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const assessment = await deps.getLatestCreditAssessment.execute({ userId });
      return reply.send(assessment);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
