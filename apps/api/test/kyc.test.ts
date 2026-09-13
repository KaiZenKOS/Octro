import { RecordingMailAdapter } from "@octro/application";
import { describe, expect, it } from "vitest";
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

async function signUpVerifyAndLogIn(client_: ReturnType<typeof client>, email: string) {
  const { app, deps } = client_;
  const password = "correct horse battery staple";
  const mail = deps.mail as RecordingMailAdapter;

  const signup = await app.inject({ method: "POST", url: "/v1/auth/signup", payload: { email, password } });
  const userId = signup.json().id as string;
  const code = extractCode(mail.last!.text);

  await app.inject({ method: "POST", url: "/v1/auth/verify-email", payload: { user_id: userId, code } });
  const login = await app.inject({ method: "POST", url: "/v1/auth/login", payload: { email, password } });
  const token = login.json().token as string;

  return { userId, token };
}

describe("Octro API — KYC simule (Phase B)", () => {
  it("defaults to not_started before anything is simulated", async () => {
    const c = client();
    const { token } = await signUpVerifyAndLogIn(c, "kyc-default@example.com");

    const res = await c.app.inject({
      method: "GET",
      url: "/v1/kyc/status",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "not_started", simulated: true });
  });

  it("simulates a valid decision and reflects it in GET /v1/kyc/status", async () => {
    const c = client();
    const { token } = await signUpVerifyAndLogIn(c, "kyc-valid@example.com");

    const simulate = await c.app.inject({
      method: "POST",
      url: "/v1/kyc/simulate",
      headers: { authorization: `Bearer ${token}` },
      payload: { result: "valid" },
    });
    expect(simulate.statusCode).toBe(201);
    expect(simulate.json()).toMatchObject({ status: "valid", simulated: true });

    const status = await c.app.inject({
      method: "GET",
      url: "/v1/kyc/status",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(status.json()).toMatchObject({ status: "valid" });
  });

  it("simulates an invalid decision just as freely (it is a test double, not a real check)", async () => {
    const c = client();
    const { token } = await signUpVerifyAndLogIn(c, "kyc-invalid@example.com");

    const simulate = await c.app.inject({
      method: "POST",
      url: "/v1/kyc/simulate",
      headers: { authorization: `Bearer ${token}` },
      payload: { result: "invalid" },
    });
    expect(simulate.statusCode).toBe(201);
    expect(simulate.json()).toMatchObject({ status: "invalid", simulated: true });
  });

  it("rejects /v1/kyc/simulate without a session (401)", async () => {
    const { app } = client();
    const res = await app.inject({ method: "POST", url: "/v1/kyc/simulate", payload: { result: "valid" } });
    expect(res.statusCode).toBe(401);
  });
});
