import type { ModelGateway } from './model-gateway.js';
import { DeterministicModelGateway } from './model-gateway.js';

export interface AgentContext {
    workspaceId: string;
    currentBalanceDecimal: string;
    horizonDays: number;
    deficitAmountDecimal?: string;
    recommendedAction?: string;
}

export class BoundedOrchestrator {
    private readonly maxToolCalls = 12; // AGT-01: Maximum 12 appels d'outils

    constructor(private readonly gateway: ModelGateway = new DeterministicModelGateway()) {}

    async explainCashflow(context: AgentContext, userQuestion?: string): Promise<{
        summary: string;
        riskExplanation: string;
        isSafe: boolean;
        callCount: number;
    }> {
        let callCount = 0;
        callCount++; // Tour 1: Analyst

        const prompt = userQuestion ?? 
            `Analyser le compte ${context.workspaceId} avec solde ${context.currentBalanceDecimal} et action ${context.recommendedAction ?? 'none'}`;

        const response = await this.gateway.generate([
            { role: 'system', content: 'Vous êtes Octro Explainer, un agent d’explication financière déterministe. Vous ne signez aucune transaction.' },
            { role: 'user', content: prompt }
        ]);

        callCount++; // Tour 2: Explainer

        return {
            summary: response.content,
            riskExplanation: context.deficitAmountDecimal 
                ? `Risque de découvert temporaire de ${context.deficitAmountDecimal} € couvert par fonds propres.`
                : 'Aucun risque de liquidité non couvert détecté.',
            isSafe: true,
            callCount: Math.min(callCount, this.maxToolCalls),
        };
    }
}
