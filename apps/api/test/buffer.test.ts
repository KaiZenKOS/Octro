import { FakeLendingV1Adapter, RecordingMailAdapter } from "@octro/application";
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

async function bootstrapPool(c: ReturnType<typeof client>) {
  await c.deps.bootstrapLendingPool.execute({
    ownerAddress: "rPoolOwnerFake",
    ownerSeed: "sPoolOwnerFakeSeed",
    debtMaximumDrops: "1000000000",
    managementFeeRate: 0,
  });
}

describe("Octro API — avance de liquidite buffer (Phase F, FakeLendingV1Adapter + FakeBufferDisbursementAdapter)", () => {
  it("withdraws directly from the vault when it has enough liquidity", async () => {
    const c = client();
    await bootstrapPool(c);
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "lender-vault-ok@example.com");

    await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "50000000" },
    });

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/withdraw",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "20000000" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ funded_from: "vault", fulfilled_amount_drops: "20000000", status: "fulfilled" });
  });

  it("falls back to the buffer when the vault reports an illiquid withdrawal", async () => {
    const c = client();
    await bootstrapPool(c);
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "lender-buffer-full@example.com");

    await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "50000000" },
    });

    (c.deps.lending as FakeLendingV1Adapter).forcedWithdrawOutcome = "rejected";

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/withdraw",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "20000000" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ funded_from: "buffer", fulfilled_amount_drops: "20000000", status: "fulfilled" });
  });

  it("partially fills a withdrawal when the buffer balance is smaller than requested", async () => {
    const c = client();
    await bootstrapPool(c);
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "lender-buffer-partial@example.com");

    await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      // Depot volontairement superieur au solde initial du buffer
      // (BUFFER_INITIAL_BALANCE_DROPS par defaut = 1_000_000_000) pour
      // qu'une seule avance epuise le buffer et produise un remplissage
      // partiel plutot qu'un plein.
      payload: { amount_drops: "2000000000" },
    });

    (c.deps.lending as FakeLendingV1Adapter).forcedWithdrawOutcome = "rejected";

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/withdraw",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "2000000000" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.funded_from).toBe("partial");
    expect(body.fulfilled_amount_drops).toBe("1000000000");
    expect(body.status).toBe("partial");
  });

  it("rejects a withdrawal exceeding the lender's entitled balance (403)", async () => {
    const c = client();
    await bootstrapPool(c);
    const { token } = await signUpVerifyLoginAndSimulateKyc(c, "lender-overdraw@example.com");

    await c.app.inject({
      method: "POST",
      url: "/v1/lending/deposit",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "10000000" },
    });

    const res = await c.app.inject({
      method: "POST",
      url: "/v1/lending/withdraw",
      headers: { authorization: `Bearer ${token}` },
      payload: { amount_drops: "20000000" },
    });
    expect(res.statusCode).toBe(403);
  });
});
