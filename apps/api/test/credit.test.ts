import { RecordingMailAdapter } from "@octro/application";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

function client() {
  const deps = buildDependencies();
  return { app: buildServer(deps), deps };
}

function extractCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`no 6-digit code found in: ${text}`);
  return match[1]!;
}

async function signUpVerifyLoginAndSimulateKyc(c: ReturnType<typeof client>, email: string, kycResult: "valid" | "invalid") {
  const { app, deps } = c;
  const password = "correct horse battery staple";
  const mail = deps.mail as RecordingMailAdapter;

  const signup = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: { email, password } });
  const userId = signup.json().id as string;
  const code = extractCode(mail.last!.text);
  await app.inject({ method: "POST", url: "/v1/auth/verify-email", payload: { user_id: userId, code } });
  const login = await app.inject({ method: "POST", url: "/v1/auth/login", payload: { email, password } });
  const token = login.json().token as string;

  await app.inject({
    method: "POST",
    url: "/v1/kyc/simulate",
    headers: { authorization: `Bearer ${token}` },
    payload: { result: kycResult },
  });

  return { userId, token };
}

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) } as Response;
}

// Simule les appels External JSON-2 d'Odoo (voir
// packages/application/src/adapters/http/odoo-http-adapter.ts) avec des
// jeux de donnees vides : suffisant pour exercer le trajet HTTP complet
// (connexion Odoo -> demande d'evaluation -> persistance -> lecture) sans
// dependre d'une vraie instance Odoo (BYO, aucune instance CI partagee).
function mockOdooFetch() {
  return vi.fn(async (input: string | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/json/2/res.users/context_get")) return jsonResponse({ uid: 42 });
    if (url.endsWith("/json/2/res.users/read")) return jsonResponse([{ company_id: [1, "Acme"], company_ids: [1] }]);
    if (url.endsWith("/json/2/res.company/read")) return jsonResponse([{ name: "Acme Test", currency_id: [1, "EUR"] }]);
    if (url.endsWith("/json/2/sale.order/search_read")) return jsonResponse([]);
    if (url.endsWith("/json/2/account.move/search_read")) return jsonResponse([]);
    if (url.endsWith("/json/2/account.account/search_read")) return jsonResponse([]);
    if (url.endsWith("/json/2/account.move.line/search_read")) return jsonResponse([]);
    throw new Error(`unexpected Odoo call in test: ${url}`);
  });
}

describe("Octro API — credit Odoo BYO (Phase D)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an Odoo connection before KYC is valid (403)", async () => {
    const c = client();
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "credit-no-kyc@example.com", "invalid");

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/credit/odoo-connection",
      headers: { authorization: `Bearer ${token}` },
      payload: { odoo_url: "https://odoo.example.com", odoo_db: "acme", odoo_api_key: "secret-key" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("COMPLIANCE_REQUIRED");
  });

  it("connects Odoo then requests and reads back a credit assessment once KYC is valid", async () => {
    vi.stubGlobal("fetch", mockOdooFetch());
    const c = client();
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "credit-valid@example.com", "valid");

    const connection = await c.app.inject({
      method: "POST",
      url: "/v1/credit/odoo-connection",
      headers: { authorization: `Bearer ${token}` },
      payload: { odoo_url: "https://odoo.example.com", odoo_db: "acme", odoo_api_key: "secret-key" },
    });
    expect(connection.statusCode).toBe(201);
    const connectionBody = connection.json();
    expect(connectionBody.odoo_api_key).toBeUndefined();

    const assessment = await c.app.inject({
      method: "POST",
      url: "/v1/credit/assessment",
      headers: { authorization: `Bearer ${token}` },
      payload: { odoo_connection_id: connectionBody.id },
    });
    expect(assessment.statusCode).toBe(201);
    const assessmentBody = assessment.json();
    expect(["A", "B", "C", "D", "E"]).toContain(assessmentBody.grade);
    expect(["approve", "approve_with_conditions", "decline"]).toContain(assessmentBody.decision);
    expect(assessmentBody.max_recommended_credit_line.asset_id).toBe("fiat:EUR");

    const latest = await c.app.inject({
      method: "GET",
      url: "/v1/credit/assessment",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(latest.statusCode).toBe(200);
    expect(latest.json().id).toBe(assessmentBody.id);
  });

  it("refuses to assess someone else's Odoo connection (404, no existence leak)", async () => {
    vi.stubGlobal("fetch", mockOdooFetch());
    const c = client();
    const owner = await signUpVerifyLoginAndSimulateKyc(c, "credit-owner@example.com", "valid");
    const intruder = await signUpVerifyLoginAndSimulateKyc(c, "credit-intruder@example.com", "valid");

    const connection = await c.app.inject({
      method: "POST",
      url: "/v1/credit/odoo-connection",
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { odoo_url: "https://odoo.example.com", odoo_db: "acme", odoo_api_key: "secret-key" },
    });
    const connectionId = connection.json().id as string;

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/credit/assessment",
      headers: { authorization: `Bearer ${intruder.token}` },
      payload: { odoo_connection_id: connectionId },
    });
    expect(res.statusCode).toBe(404);
  });
});
