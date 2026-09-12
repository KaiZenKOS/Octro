// @octro/application — cas d'usage et ports. Depend du domaine ; les
// adaptateurs reels (PostgreSQL, XRPL, optimiseur Python) arrivent avec
// S3/S4/S5. adapters/in-memory est une doublure de developpement et de test,
// jamais une preuve d'integration (docs/TEAM_TASKS.md section 8).
export * from "./errors.js";

export * from "./ports/clock.js";
export * from "./ports/id-generator.js";
export * from "./ports/workspace-repository.js";
export * from "./ports/economic-event-repository.js";
export * from "./ports/network-capabilities-port.js";
export * from "./ports/optimizer-port.js";

export * from "./use-cases/create-workspace.js";
export * from "./use-cases/get-workspace.js";
export * from "./use-cases/record-declared-event.js";
export * from "./use-cases/get-personal-projection.js";
export * from "./use-cases/approve-financing-action.js";

export * from "./adapters/in-memory/system-clock.js";
export * from "./adapters/in-memory/uuid-id-generator.js";
export * from "./adapters/in-memory/in-memory-workspace-repository.js";
export * from "./adapters/in-memory/in-memory-economic-event-repository.js";
export * from "./adapters/in-memory/simulated-optimizer-adapter.js";
export * from "./adapters/in-memory/static-network-capabilities-adapter.js";
