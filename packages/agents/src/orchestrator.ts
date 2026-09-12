import {
  ActionPlanPurposeSchema,
  PersonalPlanStatusSchema,
  ProjectionResultSchema,
  ProposedActionSchema,
  type ActionPlan,
  type ProjectionResult,
} from "@octro/contracts";
import { z } from "zod";
import {
  DeterministicModelGateway,
  type ModelGateway,
  type ModelMessage,
} from "./model-gateway.js";

const UuidSchema = z.string().uuid();
const PlanReferenceSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema,
  version: z.number().int().positive(),
  purpose: ActionPlanPurposeSchema,
  status: PersonalPlanStatusSchema,
  plan_hash: z.string().regex(/^[0-9a-f]{64}$/),
  proposed_actions: z.array(ProposedActionSchema).min(1),
}).strict();
/** Minimal server-injected reference: the model never creates a plan. */
export type PlanReference = Pick<
  ActionPlan,
  "id" | "tenant_id" | "version" | "purpose" | "status" | "plan_hash" | "proposed_actions"
>;

const SnapshotSchema = z.object({
  snapshotId: z.string().min(1).max(160),
  tenantId: UuidSchema,
  expectedVersion: z.number().int().positive(),
  asOf: z.string().datetime({ offset: true }),
}).strict();

export interface AgentSnapshot {
  snapshotId: string;
  tenantId: string;
  expectedVersion: number;
  asOf: string;
}

const AnalysisSchema = z.object({
  tenantId: UuidSchema,
  analysisRef: z.string().min(1).max(160),
  policyVersion: z.string().min(1).max(80),
  evidenceRefs: z.array(z.string().min(1).max(240)).max(64),
}).strict();

export interface AgentAnalysis {
  tenantId: string;
  analysisRef: string;
  policyVersion: string;
  evidenceRefs: string[];
}

export type AgentSimulation = ProjectionResult;
const SimulationSchema = ProjectionResultSchema;

export interface OrchestrationTools {
  /** Read-only collection; tenant identity is supplied only by trusted server context. */
  collect(input: { tenantId: string; workspaceId: string; expectedVersion: number }, signal: AbortSignal): Promise<AgentSnapshot>;
  analyze(input: { snapshot: AgentSnapshot }, signal: AbortSignal): Promise<AgentAnalysis>;
  simulate(input: { snapshot: AgentSnapshot; analysis: AgentAnalysis }, signal: AbortSignal): Promise<ProjectionResult>;
  /** Records the user's acknowledgement/dismissal only. It must never execute a financial action. */
  follow(input: {
    tenantId: string;
    workspaceId: string;
    requestId: string;
    planId: string;
    planHash: string;
    decision: "acknowledged" | "dismissed";
  }, signal: AbortSignal): Promise<{ status: "recorded"; decision: "acknowledged" | "dismissed" }>;
}

export type OrchestrationPhase = "collect" | "analyze" | "simulate" | "explain" | "awaiting_decision" | "follow" | "completed" | "paused" | "failed";

export interface OrchestrationContext {
  requestId: string;
  /** Effective tenant from the authenticated API/MCP context, never model/tool arguments. */
  tenantId: string;
  workspaceId: string;
  expectedVersion: number;
}

export interface OrchestrationState extends OrchestrationContext {
  schemaVersion: 1;
  phase: OrchestrationPhase;
  totalToolCalls: number;
  snapshot?: AgentSnapshot;
  analysis?: AgentAnalysis;
  simulation?: AgentSimulation;
  explanation?: { summary: string; riskExplanation: string; order: ExplanationOrder };
  decision?: "acknowledged" | "dismissed";
  failureCode?: string;
  updatedAt: string;
}

export interface OrchestrationStateRepository {
  readonly durability: "durable" | "ephemeral";
  load(tenantId: string, requestId: string): Promise<OrchestrationState | null>;
  save(state: OrchestrationState): Promise<void>;
}

/** Development/test fallback only. Server composition must inject a durable repository. */
export class InMemoryOrchestrationStateRepository implements OrchestrationStateRepository {
  readonly durability = "ephemeral" as const;
  private readonly states = new Map<string, OrchestrationState>();

  async load(tenantId: string, requestId: string): Promise<OrchestrationState | null> {
    const state = this.states.get(`${tenantId}:${requestId}`);
    return state ? structuredClone(state) : null;
  }

  async save(state: OrchestrationState): Promise<void> {
    this.states.set(`${state.tenantId}:${state.requestId}`, structuredClone(state));
  }
}

export type ExplanationOrder = "action_first" | "status_first";
const ExplanationOrderSchema = z.object({ order: z.enum(["action_first", "status_first"]) }).strict();

export interface OrchestrationResult {
  status: "awaiting_decision" | "completed" | "paused" | "unavailable" | "failed";
  summary: string;
  riskExplanation: string;
  callCount: number;
  totalToolCalls: number;
  modelCalls: number;
  persisted: boolean;
  state: OrchestrationState;
}

export interface BoundedOrchestratorOptions {
  tools?: OrchestrationTools;
  gateway?: ModelGateway;
  stateRepository?: OrchestrationStateRepository;
  maxToolCalls?: number;
  timeoutMs?: number;
}

export interface LegacyExplanationContext {
  /** @deprecated Use run() with an authenticated server context and injected application tools. */
  workspaceId: string;
  tenantId?: string;
  currentBalanceDecimal?: string;
  horizonDays?: number;
  deficitAmountDecimal?: string;
  recommendedAction?: string;
  actionPlan?: PlanReference;
}

class ToolBudgetExceededError extends Error {}
class DeadlineExceededError extends Error {}
class MissingToolConfigurationError extends Error {}

const NO_PLAN_EXPLANATION = "Aucun plan structuré n’est fourni. Consultez votre projection et ses hypothèses avant de prendre une décision.";
const NO_ACTION_EXPLANATION = "Le plan indique qu’aucune action n’est proposée. Cela ne constitue ni une garantie de liquidité ni une exécution.";
const PROPOSAL_STATUS_EXPLANATION = "Une proposition ne déplace pas d’argent. La décision reste à l’utilisateur.";

function makeInitialState(context: OrchestrationContext): OrchestrationState {
  return {
    ...context,
    schemaVersion: 1,
    phase: "collect",
    totalToolCalls: 0,
    updatedAt: new Date().toISOString(),
  };
}

function actionSummary(plan: PlanReference): string {
  const action = plan.proposed_actions[0];
  if (!action) return NO_PLAN_EXPLANATION;
  switch (action.type) {
    case "own_funds_transfer": {
      const asset = action.asset_id.split(":").at(-1) ?? action.asset_id;
      return `Le plan propose un transfert interne de ${action.amount_decimal} ${asset}, du compte ${action.source_account_ref} vers ${action.destination_account_ref}.`;
    }
    case "no_action":
      return NO_ACTION_EXPLANATION;
    case "optional_expense_adjustment":
      return `Le plan propose d’examiner l’ajustement de la dépense facultative ${action.budget_item_ref}.`;
    case "due_date_change_request":
      return `Le plan propose de demander un changement de date pour l’obligation ${action.obligation_ref}. Cette date n’est pas modifiée tant que l’autre partie ne l’a pas acceptée.`;
    case "financing_comparison":
      return `Le plan référence une comparaison de financement ${action.comparison_ref}. Ce résultat ne vaut ni décision d’éligibilité ni autorisation d’emprunt.`;
  }
}

function asPlanReference(plan: ActionPlan): PlanReference {
  return {
    id: plan.id,
    tenant_id: plan.tenant_id,
    version: plan.version,
    purpose: plan.purpose,
    status: plan.status,
    plan_hash: plan.plan_hash,
    proposed_actions: plan.proposed_actions,
  };
}

/** Facts and amounts are always rendered from the structured plan. */
export function renderPlanExplanation(planInput: unknown, order: ExplanationOrder = "action_first"): {
  summary: string;
  riskExplanation: string;
} {
  const parsed = PlanReferenceSchema.safeParse(planInput);
  if (!parsed.success) {
    return { summary: NO_PLAN_EXPLANATION, riskExplanation: PROPOSAL_STATUS_EXPLANATION };
  }
  const plan = parsed.data;
  const action = actionSummary(plan);
  const status = `Statut du plan : ${plan.status} (version ${plan.version}).`;
  return {
    summary: order === "status_first" ? `${status} ${action}` : `${action} ${status}`,
    riskExplanation: PROPOSAL_STATUS_EXPLANATION,
  };
}

function resultFor(
  status: OrchestrationResult["status"],
  state: OrchestrationState,
  callsThisRun: number,
  modelCalls: number,
  persisted: boolean,
  order: ExplanationOrder = "action_first",
): OrchestrationResult {
  let rendered = state.simulation?.status === "FEASIBLE"
    ? renderPlanExplanation(asPlanReference(state.simulation.action_plan), order)
    : state.simulation?.status === "INFEASIBLE"
      ? {
          summary: `Aucune solution admissible n’est proposée (${state.simulation.diagnostic.code}). Vérifiez les contraintes : ${state.simulation.diagnostic.binding_constraints.join(", ") || "diagnostic disponible"}.`,
          riskExplanation: "Le moteur a retourné un diagnostic sans action financière. Aucune action n’a été exécutée.",
        }
      : { summary: NO_PLAN_EXPLANATION, riskExplanation: PROPOSAL_STATUS_EXPLANATION };
  if (state.explanation) rendered = state.explanation;
  return {
    status,
    ...rendered,
    callCount: callsThisRun,
    totalToolCalls: state.totalToolCalls,
    modelCalls,
    persisted,
    state,
  };
}

function validateContext(input: unknown): OrchestrationContext {
  return z.object({
    requestId: UuidSchema,
    tenantId: UuidSchema,
    workspaceId: UuidSchema,
    expectedVersion: z.number().int().positive(),
  }).strict().parse(input);
}

function withDeadline<T>(promise: Promise<T>, milliseconds: number, onTimeout: () => void): Promise<T> {
  if (milliseconds <= 0) {
    onTimeout();
    return Promise.reject(new DeadlineExceededError("orchestration deadline exceeded"));
  }
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      onTimeout();
      reject(new DeadlineExceededError("orchestration deadline exceeded"));
    }, milliseconds);
    promise.then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

async function bestEffortCheckpoint(repository: OrchestrationStateRepository, state: OrchestrationState): Promise<boolean> {
  let saved = false;
  const save = repository.save(state).then(() => { saved = true; });
  await Promise.race([save, new Promise<void>((resolve) => setTimeout(resolve, 100))]);
  return saved && repository.durability === "durable";
}

export class BoundedOrchestrator {
  private readonly tools: OrchestrationTools | undefined;
  private readonly gateway: ModelGateway;
  private readonly stateRepository: OrchestrationStateRepository;
  private readonly maxToolCalls: number;
  private readonly timeoutMs: number;

  constructor(options: BoundedOrchestratorOptions = {}) {
    this.tools = options.tools;
    this.gateway = options.gateway ?? new DeterministicModelGateway();
    this.stateRepository = options.stateRepository ?? new InMemoryOrchestrationStateRepository();
    this.maxToolCalls = Math.max(1, Math.min(12, Math.floor(options.maxToolCalls ?? 12)));
    this.timeoutMs = Math.max(1, Math.min(30_000, Math.floor(options.timeoutMs ?? 30_000)));
  }

  /** Runs collect → analyze → simulate → explain → wait for a user decision. */
  async run(input: OrchestrationContext): Promise<OrchestrationResult> {
    const context = validateContext(input);
    const deadlineAt = Date.now() + this.timeoutMs;
    const abortController = new AbortController();
    let state = makeInitialState(context);
    let loaded = false;
    let persisted = false;
    let callsThisRun = 0;
    let modelCalls = 0;
    let order: ExplanationOrder = "action_first";

    const bounded = <T>(promise: Promise<T>): Promise<T> => withDeadline(
      promise,
      deadlineAt - Date.now(),
      () => abortController.abort(),
    );
    const checkpoint = async (): Promise<void> => {
      state.updatedAt = new Date().toISOString();
      await bounded(this.stateRepository.save(state));
      persisted = this.stateRepository.durability === "durable";
    };
    const callTool = async <T>(tool: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      if (!this.tools) throw new MissingToolConfigurationError("application orchestration tools are not configured");
      if (callsThisRun >= this.maxToolCalls) throw new ToolBudgetExceededError("tool budget exhausted");
      callsThisRun += 1;
      state.totalToolCalls += 1;
      return bounded(tool(abortController.signal));
    };

    try {
      const stored = await bounded(this.stateRepository.load(context.tenantId, context.requestId));
      loaded = true;
      if (stored) {
        if (stored.workspaceId !== context.workspaceId || stored.expectedVersion !== context.expectedVersion) {
          return resultFor("failed", { ...state, phase: "failed", failureCode: "REQUEST_CONTEXT_CONFLICT" }, 0, 0, false);
        }
        state = stored;
      }

      if (state.phase === "awaiting_decision") return resultFor("awaiting_decision", state, 0, 0, this.stateRepository.durability === "durable");
      if (state.phase === "completed") return resultFor("completed", state, 0, 0, this.stateRepository.durability === "durable");

      if (state.phase === "collect") {
        const collected = SnapshotSchema.parse(await callTool((signal) => this.tools!.collect(context, signal)));
        if (collected.tenantId !== context.tenantId) throw new Error("tenant isolation check failed");
        state.snapshot = collected;
        state.phase = "analyze";
        await checkpoint();
      }
      if (state.phase === "analyze") {
        if (!state.snapshot) throw new Error("missing snapshot checkpoint");
        const analyzed = AnalysisSchema.parse(await callTool((signal) => this.tools!.analyze({ snapshot: state.snapshot! }, signal)));
        if (analyzed.tenantId !== context.tenantId) throw new Error("analysis tenant isolation check failed");
        state.analysis = analyzed;
        state.phase = "simulate";
        await checkpoint();
      }
      if (state.phase === "simulate") {
        if (!state.snapshot || !state.analysis) throw new Error("missing analysis checkpoint");
        const simulation = SimulationSchema.parse(await callTool((signal) => this.tools!.simulate({ snapshot: state.snapshot!, analysis: state.analysis! }, signal)));
        if (simulation.projection.tenant_id !== context.tenantId) throw new Error("projection tenant isolation check failed");
        if (simulation.status === "FEASIBLE" && simulation.action_plan.tenant_id !== context.tenantId) {
          throw new Error("action plan tenant isolation check failed");
        }
        state.simulation = simulation;
        state.phase = "explain";
        await checkpoint();
      }
      if (state.phase === "explain") {
        if (!state.simulation) throw new Error("missing simulation checkpoint");
        if (state.simulation.status === "FEASIBLE") {
          modelCalls += 1;
          try {
            const messages = this.explanationMessages(asPlanReference(state.simulation.action_plan));
            const modelBudget = Math.min(5_000, deadlineAt - Date.now());
            const modelAbort = new AbortController();
            const response = await withDeadline(
              this.gateway.generate(messages, { signal: modelAbort.signal }),
              modelBudget,
              () => modelAbort.abort(),
            );
            const choice = ExplanationOrderSchema.safeParse(JSON.parse(response.content));
            if (choice.success) order = choice.data.order;
          } catch {
            // Provider failures and unrecognized output fall through to deterministic rendering.
          }
          state.explanation = { ...renderPlanExplanation(asPlanReference(state.simulation.action_plan), order), order };
        }
        state.phase = "awaiting_decision";
        await checkpoint();
      }
      if (state.phase === "awaiting_decision") return resultFor("awaiting_decision", state, callsThisRun, modelCalls, persisted, order);
      return resultFor("paused", { ...state, phase: "paused", failureCode: "NO_PROGRESS" }, callsThisRun, modelCalls, persisted, order);
    } catch (error) {
      const timedOut = error instanceof DeadlineExceededError;
      const budgetExhausted = error instanceof ToolBudgetExceededError;
      state.phase = timedOut || budgetExhausted ? "paused" : "failed";
      state.failureCode = timedOut ? "ORCHESTRATION_TIMEOUT" : budgetExhausted ? "TOOL_BUDGET_EXHAUSTED" : !this.tools ? "TOOLS_NOT_CONFIGURED" : "ORCHESTRATION_STEP_FAILED";
      if (loaded) {
        try {
          persisted = await bestEffortCheckpoint(this.stateRepository, state);
        } catch {
          persisted = false;
        }
      }
      const status = !this.tools ? "unavailable" : timedOut || budgetExhausted ? "paused" : "failed";
      return resultFor(status, state, callsThisRun, modelCalls, persisted, order);
    } finally {
      abortController.abort();
    }
  }

  /** Records a human decision against the exact immutable plan hash; no money moves here. */
  async resume(
    input: OrchestrationContext,
    decision: { planId: string; planHash: string; value: "acknowledged" | "dismissed" },
  ): Promise<OrchestrationResult> {
    const context = validateContext(input);
    const parsedDecision = z.object({ planId: UuidSchema, planHash: z.string().regex(/^[0-9a-f]{64}$/), value: z.enum(["acknowledged", "dismissed"]) }).strict().parse(decision);
    const deadlineAt = Date.now() + this.timeoutMs;
    const controller = new AbortController();
    let callsThisRun = 0;
    let persisted = false;
    const bounded = <T>(promise: Promise<T>): Promise<T> => withDeadline(promise, deadlineAt - Date.now(), () => controller.abort());
    let state = makeInitialState(context);
    try {
      const stored = await bounded(this.stateRepository.load(context.tenantId, context.requestId));
      if (!stored || stored.phase !== "awaiting_decision" || stored.workspaceId !== context.workspaceId || stored.expectedVersion !== context.expectedVersion) {
        return resultFor("failed", { ...state, phase: "failed", failureCode: "NO_MATCHING_PENDING_DECISION" }, 0, 0, false);
      }
      state = stored;
      const plan = state.simulation?.status === "FEASIBLE" ? state.simulation.action_plan : undefined;
      if (!plan || plan.id !== parsedDecision.planId || plan.plan_hash !== parsedDecision.planHash) {
        return resultFor("failed", { ...state, phase: "failed", failureCode: "PLAN_VERSION_CONFLICT" }, 0, 0, this.stateRepository.durability === "durable");
      }
      if (!this.tools) throw new MissingToolConfigurationError("follow use case is not configured");
      if (callsThisRun >= this.maxToolCalls) throw new ToolBudgetExceededError("tool budget exhausted");
      callsThisRun += 1;
      state.totalToolCalls += 1;
      state.phase = "follow";
      const result = await bounded(this.tools.follow({
        tenantId: context.tenantId,
        workspaceId: context.workspaceId,
        requestId: context.requestId,
        planId: plan.id,
        planHash: plan.plan_hash,
        decision: parsedDecision.value,
      }, controller.signal));
      if (result.status !== "recorded" || result.decision !== parsedDecision.value) throw new Error("decision record mismatch");
      state.decision = parsedDecision.value;
      state.phase = "completed";
      state.updatedAt = new Date().toISOString();
      await bounded(this.stateRepository.save(state));
      persisted = this.stateRepository.durability === "durable";
      return resultFor("completed", state, callsThisRun, 0, persisted);
    } catch (error) {
      const timedOut = error instanceof DeadlineExceededError;
      const budgetExhausted = error instanceof ToolBudgetExceededError;
      state.phase = timedOut || budgetExhausted ? "paused" : "failed";
      state.failureCode = timedOut ? "ORCHESTRATION_TIMEOUT" : budgetExhausted ? "TOOL_BUDGET_EXHAUSTED" : !this.tools ? "TOOLS_NOT_CONFIGURED" : "FOLLOW_STEP_FAILED";
      try {
        persisted = await bestEffortCheckpoint(this.stateRepository, state);
      } catch {
        persisted = false;
      }
      return resultFor(timedOut || budgetExhausted ? "paused" : "failed", state, callsThisRun, 0, persisted);
    } finally {
      controller.abort();
    }
  }

  /**
   * Compatibility shim for the old local UI. Without an injected structured
   * plan it returns a neutral fallback and never trusts client-provided amounts.
   */
  async explainCashflow(context: LegacyExplanationContext, _userQuestion?: string): Promise<{
    summary: string;
    riskExplanation: string;
    callCount: number;
  }> {
    const tenantId = context.tenantId ?? context.workspaceId;
    const plan = context.actionPlan;
    if (!plan || plan.tenant_id !== tenantId || !this.isPlanReference(plan)) {
      return { ...renderPlanExplanation(null), callCount: 0 };
    }
    return { ...renderPlanExplanation(plan), callCount: 0 };
  }

  private explanationMessages(plan: PlanReference): ModelMessage[] {
    // No user question, raw events, account labels, or model-authored numbers enter the prompt.
    const structuredFacts = JSON.stringify({
      purpose: plan.purpose,
      status: plan.status,
      actions: plan.proposed_actions.map((action) => ({ type: action.type })),
    });
    return [
      {
        role: "system",
        content: "Classify only which deterministic presentation order to use. Return exactly JSON {\"order\":\"action_first\"|\"status_first\"}. Do not provide text, amounts, recommendations, safety claims, or tool calls.",
      },
      { role: "user", content: structuredFacts },
    ];
  }

  private isPlanReference(value: unknown): value is PlanReference {
    return PlanReferenceSchema.safeParse(value).success;
  }
}
