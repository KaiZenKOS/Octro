import { describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

function client() {
  const deps = buildDependencies();
  return { app: buildServer(deps), deps };
}

describe("E2E Session & Workspace Isolation (SEC-01, ACC-01, PER-03, DATA-01)", () => {
  it("full flow: signup -> login -> authenticated workspace -> event -> projection -> cross-tenant denial", async () => {
    const { app, deps } = client();

    // 1. User Alice signs up
    const signupRes = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "alice@example.com", password: "Password123!" },
    });
    expect(signupRes.statusCode).toBe(201);
    const aliceUser = signupRes.json();
    expect(aliceUser.email).toBe("alice@example.com");

    // Fetch email verification code
    const lastMail = (deps.mail as { sent?: Array<{ to: string; subject: string; text: string }> }).sent?.slice(-1)[0];
    expect(lastMail).toBeDefined();
    const codeMatch = lastMail?.text.match(/\b(\d{6})\b/);
    expect(codeMatch).not.toBeNull();
    const code = codeMatch![1];

    // Verify email
    const verifyRes = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email",
      payload: { user_id: aliceUser.id, code },
    });
    expect(verifyRes.statusCode).toBe(200);

    // Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "alice@example.com", password: "Password123!" },
    });
    expect(loginRes.statusCode).toBe(200);
    const aliceToken = loginRes.json().token;
    expect(aliceToken).toBeTruthy();

    // 2. Alice creates a personal workspace with Bearer auth (no owner_user_id required)
    const wsRes = await app.inject({
      method: "POST",
      url: "/v1/workspaces",
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { kind: "personal", display_name: "Alice Personal" },
    });
    expect(wsRes.statusCode).toBe(201);
    const workspace = wsRes.json();
    expect(workspace.owner_user_id).toBe(aliceUser.id);
    expect(workspace.kind).toBe("personal");

    // Alice reads workspace with Bearer auth
    const getWsRes = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(getWsRes.statusCode).toBe(200);
    expect(getWsRes.json().display_name).toBe("Alice Personal");

    // 3. Alice records an economic event with Bearer auth
    const eventRes = await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace.id}/events`,
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        direction: "inflow",
        amount_decimal: "1500.00",
        asset_id: "fiat:EUR",
        label: "Salary",
        expected_settlement_at: "2026-09-15T12:00:00.000Z",
      },
    });
    expect(eventRes.statusCode).toBe(201);
    const event = eventRes.json();
    expect(event.amount.amount_decimal).toBe("1500.00");
    expect(event.amount.asset_id).toBe("fiat:EUR");

    // 4. Alice calculates projection with Bearer auth
    const projRes = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        workspace_id: workspace.id,
        asset_id: "fiat:EUR",
        opening_balance: "500.00",
        horizon: { steps: 30, unit: "day" },
      },
    });
    expect(projRes.statusCode).toBe(200);
    const projection = projRes.json();
    expect(projection.points).toHaveLength(30);
    expect(projection.points[0].asset_id).toBe("fiat:EUR");

    // 5. User Bob signs up, verifies and logs in
    const bobSignup = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "bob@example.com", password: "Password456!" },
    });
    expect(bobSignup.statusCode).toBe(201);
    const bobUser = bobSignup.json();
    const bobMail = (deps.mail as { sent?: Array<{ to: string; subject: string; text: string }> }).sent?.slice(-1)[0];
    const bobCode = bobMail?.text.match(/\b(\d{6})\b/)?.[1];
    await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email",
      payload: { user_id: bobUser.id, code: bobCode },
    });
    const bobLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "bob@example.com", password: "Password456!" },
    });
    const bobToken = bobLogin.json().token;

    // Bob attempts to access Alice's workspace -> MUST be 403 Forbidden (SEC-01)
    const bobAccessWs = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
      headers: { authorization: `Bearer ${bobToken}` },
    });
    expect(bobAccessWs.statusCode).toBe(403);

    // Bob attempts to add event to Alice's workspace -> 403 Forbidden
    const bobAddEvent = await app.inject({
      method: "POST",
      url: `/v1/workspaces/${workspace.id}/events`,
      headers: { authorization: `Bearer ${bobToken}` },
      payload: {
        direction: "inflow",
        amount_decimal: "100.00",
        asset_id: "EUR",
        label: "Hacked event",
      },
    });
    expect(bobAddEvent.statusCode).toBe(403);

    // Bob attempts to get projection for Alice's workspace -> 403 Forbidden
    const bobGetProj = await app.inject({
      method: "POST",
      url: "/v1/projections",
      headers: { authorization: `Bearer ${bobToken}` },
      payload: {
        workspace_id: workspace.id,
        asset_id: "EUR",
        opening_balance: "500.00",
        horizon: { steps: 30, unit: "day" },
      },
    });
    expect(bobGetProj.statusCode).toBe(403);

    // 6. Unauthenticated request -> 401 Unauthenticated
    const unauthGetWs = await app.inject({
      method: "GET",
      url: `/v1/workspaces/${workspace.id}`,
    });
    expect(unauthGetWs.statusCode).toBe(401);
  });
});
