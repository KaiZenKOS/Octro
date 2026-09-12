import {
  ActionPlanSchema,
  ProjectionResultSchema,
  WorkspaceSchema,
  type ActionPlan,
  type ProjectionResult,
  type Workspace,
} from "@octro/contracts";
import { z } from "zod";

const UuidSchema = z.string().uuid();
const ToolRequestBaseSchema = z.object({
  requestId: UuidSchema,
  workspaceId: UuidSchema,
  expectedVersion: z.number().int().positive(),
}).strict();

const WorkspaceSummaryArgsSchema = ToolRequestBaseSchema;
const ProjectionArgsSchema = ToolRequestBaseSchema;
const ActionPlanArgsSchema = ToolRequestBaseSchema.extend({ planId: UuidSchema }).strict();

export interface McpToolDefinition {
  name: string;
  description: string;
  /** MCP-compatible JSON Schema; strictness is enforced again by the Zod parser. */
  inputSchema: Record<string, unknown>;
}

export interface McpCallResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface McpRequestContext {
  /** Effective tenant derived by the authenticated MCP/API transport. */
  effectiveTenantId: string;
  actorId: string;
  scopes: readonly string[];
  traceId: string;
}

const McpRequestContextSchema = z.object({
  effectiveTenantId: UuidSchema,
  actorId: UuidSchema,
  scopes: z.array(z.string().min(1).max(80)).max(32),
  traceId: z.string().min(1).max(160),
}).strict();

export type McpProjectionResponse = ProjectionResult;

/**
 * Narrow adapters over application use cases. The MCP layer cannot open
 * repositories or calculate/authorize financial actions itself.
 */
export interface OctroMcpUseCases {
  getWorkspace(input: {
    requestingTenantId: string;
    actorId: string;
    requestId: string;
    workspaceId: string;
    expectedVersion: number;
    traceId: string;
  }): Promise<Workspace>;
  getProjection(input: {
    requestingTenantId: string;
    actorId: string;
    requestId: string;
    workspaceId: string;
    expectedVersion: number;
    traceId: string;
  }): Promise<ProjectionResult>;
  getActionPlan(input: {
    requestingTenantId: string;
    actorId: string;
    requestId: string;
    workspaceId: string;
    planId: string;
    expectedVersion: number;
    traceId: string;
  }): Promise<ActionPlan>;
}

const WORKSPACE_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    requestId: { type: "string", format: "uuid" },
    workspaceId: { type: "string", format: "uuid" },
    expectedVersion: { type: "integer", minimum: 1 },
  },
  required: ["requestId", "workspaceId", "expectedVersion"],
};

const ACTION_PLAN_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    requestId: { type: "string", format: "uuid" },
    workspaceId: { type: "string", format: "uuid" },
    planId: { type: "string", format: "uuid" },
    expectedVersion: { type: "integer", minimum: 1 },
  },
  required: ["requestId", "workspaceId", "planId", "expectedVersion"],
};

function errorResult(code: string): McpCallResult {
  return { content: [{ type: "text", text: JSON.stringify({ status: "error", code }) }], isError: true };
}

function result(value: unknown): McpCallResult {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}

export class OctroMcpServer {
  constructor(private readonly useCases: OctroMcpUseCases) {}

  getTools(): McpToolDefinition[] {
    return [
      {
        name: "octro_get_workspace_summary",
        description: "Lit le résumé d’un espace autorisé. L’identité et le tenant viennent de la session MCP.",
        inputSchema: WORKSPACE_INPUT_SCHEMA,
      },
      {
        name: "octro_get_projection",
        description: "Lit la projection issue du cas d’usage applicatif, sans saisie libre de soldes ou d’actions.",
        inputSchema: WORKSPACE_INPUT_SCHEMA,
      },
      {
        name: "octro_get_action_plan",
        description: "Lit un ActionPlan existant par référence et version attendue.",
        inputSchema: ACTION_PLAN_INPUT_SCHEMA,
      },
    ];
  }

  async callTool(name: string, args: unknown, requestContext: unknown): Promise<McpCallResult> {
    const parsedContext = McpRequestContextSchema.safeParse(requestContext);
    if (!parsedContext.success) return errorResult("UNAUTHENTICATED_CONTEXT");
    const context = parsedContext.data;

    if (name === "octro_get_workspace_summary") {
      if (!context.scopes.includes("data:read")) return errorResult("SCOPE_REQUIRED");
      const parsedArgs = WorkspaceSummaryArgsSchema.safeParse(args);
      if (!parsedArgs.success) return errorResult("INVALID_ARGUMENTS");
      try {
        const workspace = WorkspaceSchema.parse(await this.useCases.getWorkspace({
          requestingTenantId: context.effectiveTenantId,
          actorId: context.actorId,
          traceId: context.traceId,
          ...parsedArgs.data,
        }));
        if (workspace.tenant_id !== context.effectiveTenantId) return errorResult("TENANT_ISOLATION_DENIED");
        return result(workspace);
      } catch {
        return errorResult("WORKSPACE_UNAVAILABLE");
      }
    }

    if (name === "octro_get_projection") {
      if (!context.scopes.includes("engine:forecast")) return errorResult("SCOPE_REQUIRED");
      const parsedArgs = ProjectionArgsSchema.safeParse(args);
      if (!parsedArgs.success) return errorResult("INVALID_ARGUMENTS");
      try {
        const projection = ProjectionResultSchema.parse(await this.useCases.getProjection({
          requestingTenantId: context.effectiveTenantId,
          actorId: context.actorId,
          traceId: context.traceId,
          ...parsedArgs.data,
        }));
        if (projection.projection.tenant_id !== context.effectiveTenantId) return errorResult("TENANT_ISOLATION_DENIED");
        if (projection.status === "FEASIBLE" && projection.action_plan.tenant_id !== context.effectiveTenantId) return errorResult("TENANT_ISOLATION_DENIED");
        return result(projection);
      } catch {
        return errorResult("PROJECTION_UNAVAILABLE");
      }
    }

    if (name === "octro_get_action_plan") {
      if (!context.scopes.includes("plans:read")) return errorResult("SCOPE_REQUIRED");
      const parsedArgs = ActionPlanArgsSchema.safeParse(args);
      if (!parsedArgs.success) return errorResult("INVALID_ARGUMENTS");
      try {
        const actionPlan = ActionPlanSchema.parse(await this.useCases.getActionPlan({
          requestingTenantId: context.effectiveTenantId,
          actorId: context.actorId,
          traceId: context.traceId,
          ...parsedArgs.data,
        }));
        if (actionPlan.tenant_id !== context.effectiveTenantId) return errorResult("TENANT_ISOLATION_DENIED");
        return result(actionPlan);
      } catch {
        return errorResult("ACTION_PLAN_UNAVAILABLE");
      }
    }

    return errorResult("UNKNOWN_TOOL");
  }
}
