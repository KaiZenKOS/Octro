import { describe, expect, it } from 'vitest';
import { BoundedOrchestrator, DeterministicModelGateway } from '../src/index.js';

describe('BoundedOrchestrator (AGT-01, AGT-02)', () => {
    it('produces deterministic explanation for Lina scenario within bound of 12 calls', async () => {
        const orchestrator = new BoundedOrchestrator();
        const result = await orchestrator.explainCashflow({
            workspaceId: 'ws-lina',
            currentBalanceDecimal: '650.00',
            horizonDays: 30,
            deficitAmountDecimal: '130.00',
            recommendedAction: 'own_funds_transfer: 230 EUR',
        }, 'Expliquer le plan Lina 230 EUR');

        expect(result.summary).toContain('230 €');
        expect(result.summary).toContain('sans souscrire de dette');
        expect(result.callCount).toBeLessThanOrEqual(12);
        expect(result.isSafe).toBe(true);
    });
});
