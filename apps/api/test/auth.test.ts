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

describe("Octro API — auth (Phase A: signup, email verification, login)", () => {
  it("signs up, blocks login before verification, then verifies and logs in", async () => {
    const { app, deps } = client();
    const mail = deps.mail as RecordingMailAdapter;

    const signup = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "lina@example.com", password: "correct horse battery staple" },
    });
    expect(signup.statusCode).toBe(201);
    const user = signup.json();
    expect(user.email_verified_at).toBeNull();
    expect(user.password_hash).toBeUndefined();

    expect(mail.sent).toHaveLength(1);
    expect(mail.last?.to).toBe("lina@example.com");
    const code = extractCode(mail.last!.text);

    const loginBeforeVerify = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "lina@example.com", password: "correct horse battery staple" },
    });
    expect(loginBeforeVerify.statusCode).toBe(403);

    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email",
      payload: { user_id: user.id, code },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json().email_verified_at).not.toBeNull();

    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "lina@example.com", password: "correct horse battery staple" },
    });
    expect(login.statusCode).toBe(200);
    expect(typeof login.json().token).toBe("string");

    const me = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: { authorization: `Bearer ${login.json().token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ id: user.id, email: "lina@example.com" });
  });

  it("rejects signup with an already-registered email (409)", async () => {
    const { app } = client();
    await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "dup@example.com", password: "correct horse battery staple" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "dup@example.com", password: "another password entirely" },
    });
    expect(second.statusCode).toBe(409);
  });

  it("rejects an invalid verification code (400)", async () => {
    const { app, deps } = client();
    const mail = deps.mail as RecordingMailAdapter;
    const signup = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "wrongcode@example.com", password: "correct horse battery staple" },
    });
    const user = signup.json();
    const realCode = extractCode(mail.last!.text);
    const wrongCode = String((Number(realCode) + 1) % 1_000_000).padStart(6, "0");

    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/verify-email",
      payload: { user_id: user.id, code: wrongCode },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects wrong login credentials (401)", async () => {
    const { app } = client();
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "nobody@example.com", password: "whatever-password" },
    });
    expect(res.statusCode).toBe(401);
  });
});
