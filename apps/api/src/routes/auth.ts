import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../auth.js";
import type { AppDependencies } from "../composition.js";
import { sendError } from "../http-errors.js";

const SignUpBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const VerifyEmailBody = z.object({
  user_id: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function authRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.post("/v1/auth/signup", async (request, reply) => {
    try {
      const body = SignUpBody.parse(request.body);
      const user = await deps.signUp.execute({ email: body.email, password: body.password });
      return reply.code(201).send(user);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/auth/verify-email", async (request, reply) => {
    try {
      const body = VerifyEmailBody.parse(request.body);
      const user = await deps.confirmEmail.execute({ userId: body.user_id, code: body.code });
      return reply.send(user);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post("/v1/auth/login", async (request, reply) => {
    try {
      const body = LoginBody.parse(request.body);
      const result = await deps.login.execute({ email: body.email, password: body.password });
      return reply.send({ token: result.token, expires_at: result.expiresAt });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get("/v1/auth/me", async (request, reply) => {
    const userId = await requireSession(request, reply, deps);
    if (!userId) return reply;
    try {
      const user = await deps.getCurrentUser.execute({ userId });
      return reply.send(user);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
