import { RecordingMailAdapter, StaticNetworkCapabilitiesAdapter, UNVERIFIED_HACKATHON_CAPABILITIES } from "@octro/application";
import { describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

function client(overrides: Parameters<typeof buildDependencies>[0] = {}) {
  const deps = buildDependencies(overrides);
  return { app: buildServer(deps), deps };
}

function extractCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`no 6-digit code found in: ${text}`);
  return match[1]!;
}

async function signUpVerifyLoginAndSimulateKyc(c: ReturnType<typeof client>, email: string) {
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
    payload: { result: "valid" },
  });
  await app.inject({
    method: "POST",
    url: "/v1/wallet/provision",
    headers: { authorization: `Bearer ${token}` },
  });

  return { userId, token };
}

describe("Octro API — lending V1 sur vault/broker partage (Phase E, FakeLendingV1Adapter)", () => {
  it("fails closed before touching lending when the network capability is not verified (NET-02)", async () => {
    const c = client({
      networkCapabilities: new StaticNetworkCapabilitiesAdapter(UNVERIFIED_HACKATHON_CAPABILITIES),
    });
    await c.deps.bootstrapLendingPool.execute({
      ownerAddress: "rPoolOwnerFake",
      ownerSeed: "sPoolOwnerFakeSeed",
      debtMaximumDrops: "1000000000",
      managementFeeRate: 0,
    });
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "network-gated-lender@example.com");

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "50000000" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: "NETWORK_UNSUPPORTED", retryable: false });
  });

  it("rejects a deposit before the shared pool is bootstrapped (404)", async () => {
    const c = client();
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "lender-no-pool@example.com");

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "50000000" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lender deposits into the shared vault once bootstrapped", async () => {
    const c = client();
    await c.deps.bootstrapLendingPool.execute({
      ownerAddress: "rPoolOwnerFake",
      ownerSeed: "sPoolOwnerFakeSeed",
      debtMaximumDrops: "1000000000",
      managementFeeRate: 0,
    });
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "lender@example.com");

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "50000000" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ amount_drops: "50000000", status: "confirmed" });
    expect(body.tx_evidence.tx_type).toBe("VaultDeposit");
  });

  it("rejects a deposit without KYC (403)", async () => {
    const c = client();
    await c.deps.bootstrapLendingPool.execute({
      ownerAddress: "rPoolOwnerFake",
      ownerSeed: "sPoolOwnerFakeSeed",
      debtMaximumDrops: "1000000000",
      managementFeeRate: 0,
    });

    const password = "correct horse battery staple";
    const mail = c.deps.mail as RecordingMailAdapter;
    const signup = await c.app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "no-kyc-lender@example.com", password },
    });
    const userId = signup.json().id as string;
    const code = extractCode(mail.last!.text);
    await c.app.inject({ method: "POST", url: "/v1/auth/verify-email", payload: { user_id: userId, code } });
    const login = await c.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "no-kyc-lender@example.com", password },
    });
    const token = login.json().token as string;

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "50000000" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects a loan request without an approved credit assessment (404)", async () => {
    const c = client();
    await c.deps.bootstrapLendingPool.execute({
      ownerAddress: "rPoolOwnerFake",
      ownerSeed: "sPoolOwnerFakeSeed",
      debtMaximumDrops: "1000000000",
      managementFeeRate: 0,
    });
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "borrower-no-assessment@example.com");

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/loan-request",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });
});
