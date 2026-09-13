export interface AgentExecutionRecord {
  traceId: string;
  timestamp: string;
  workspaceId: string;
  requestShape: string;
  callCount: number;
  callCountCap: number;
  fallbackUsed: boolean;
  durationMs: number;
  riskTag: string;
}

export interface OrchestrationPolicy {
  maxToolCalls: number;
  policyTimeoutMs: number;
  budget: string;
}

export interface OrchestrationStatus {
  orchestratorVersion: string;
  policy: OrchestrationPolicy;
  providerMode: "live" | "deterministic";
  configuredProviders: {
    deepseek: boolean;
    gemini: boolean;
    openai: boolean;
  };
  dernieres_executions: AgentExecutionRecord[];
}

// Service d'observabilité en mémoire (RAM) pour l'orchestrateur IA (CDC v2.2, AGT-01, AGT-02).
// Ring buffer borné à 20 éléments, aucune persistance de secret ou token LLM (SEC-04).
export class AgentOpsService {
  private readonly maxHistory = 20;
  private readonly executions: AgentExecutionRecord[] = [];

  recordExecution(record: AgentExecutionRecord): void {
    this.executions.unshift(record);
    if (this.executions.length > this.maxHistory) {
      this.executions.length = this.maxHistory;
    }
  }

  getOrchestrationStatus(): OrchestrationStatus {
    const deepseek = Boolean(
      process.env["DEEPSEEK_API_KEY"] ||
      process.env["EXPO_PUBLIC_DEEPSEEK_API_KEY"] ||
      process.env["OCTRO_LLM_API_KEY"],
    );
    const gemini = Boolean(
      process.env["GEMINI_API_KEY"] ||
      process.env["EXPO_PUBLIC_GEMINI_API_KEY"],
    );
    const openai = Boolean(
      process.env["OPENAI_API_KEY"] ||
      process.env["EXPO_PUBLIC_OPENAI_API_KEY"],
    );

    const isLive = deepseek || gemini || openai;

    return {
      orchestratorVersion: "2.2.0",
      policy: {
        maxToolCalls: 12,
        policyTimeoutMs: 15000,
        budget: "bounded",
      },
      providerMode: isLive ? "live" : "deterministic",
      configuredProviders: {
        deepseek,
        gemini,
        openai,
      },
      dernieres_executions: [...this.executions],
    };
  }

  clearHistory(): void {
    this.executions.length = 0;
  }
}

export const agentOpsService = new AgentOpsService();
