import { afterEach, describe, expect, it } from "vitest";
import { buildDependencies } from "../src/composition.js";
import { buildServer } from "../src/server.js";

describe("health and dependency readiness (OPS-02)", () => {
  const apps: Array<Awaited<ReturnType<typeof buildServer>>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("keeps liveness separate from a failed database readiness check", async () => {
    const app = buildServer(buildDependencies({
      databaseReadiness: async () => { throw new Error("private database detail"); },
    }));
    apps.push(app);

    const health = await app.inject({ method: "GET", url: "/health" });
    const ready = await app.inject({ method: "GET", url: "/ready" });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });
    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toEqual({ status: "not_ready", code: "DEPENDENCY_UNAVAILABLE" });
    expect(ready.body).not.toContain("private database detail");
  });

  it("reports ready only after the dependency probe succeeds", async () => {
    const app = buildServer(buildDependencies({ databaseReadiness: async () => undefined }));
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
  });
});
