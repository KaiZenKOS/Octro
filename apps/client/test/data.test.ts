import { describe, expect, it } from 'vitest';
import { EconomicEventSchema, ProjectionResultSchema, WorkspaceSchema } from '@octro/contracts';
import type { ProjectionResult } from '@octro/contracts';
import { createFixtureSource, euro } from '../src/data';
import type { EconomicEventPayload } from '../src/api';

const workspaceId = 'a1000000-0000-4000-8000-000000000001';
const asOf = '2026-09-12T00:00:00Z';

function response(status: 'FEASIBLE' | 'INFEASIBLE'): ProjectionResult {
    const base = {
        projection: {
            id: 'a5000000-0000-4000-8000-000000000001', tenant_id: workspaceId,
            generated_at: asOf, as_of: asOf, horizon: { steps: 30, unit: 'day' }, data_quality: 'declared',
            points: [{ t: 0, asset_id: 'fiat:EUR', expected_balance: '650.00', confirmed_balance: '650.00' },
                { t: 30, asset_id: 'fiat:EUR', expected_balance: '520.00', confirmed_balance: '470.00' }],
        },
        provenance: { source: 'synthetic', fixture_id: 'lina-fixture-v1', as_of: asOf },
    };
    if (status === 'FEASIBLE') return ProjectionResultSchema.parse({
        status, ...base,
        action_plan: {
            id: 'a6000000-0000-4000-8000-000000000001', tenant_id: workspaceId, version: 1,
            purpose: 'no_debt_plan', status: 'PROPOSED', data_quality: 'declared',
            proposed_actions: [{ type: 'own_funds_transfer', source_account_ref: 'savings', destination_account_ref: 'current', asset_id: 'fiat:EUR', amount_decimal: '230.00' }],
            proposed_projection: [{ t: 0, asset_id: 'fiat:EUR', current_balance: '880.00', savings_balance: '420.00' }],
            plan_hash: 'a'.repeat(64), created_at: asOf,
        },
    });
    return ProjectionResultSchema.parse({
        status, ...base,
        diagnostic: {
            id: 'a7000000-0000-4000-8000-000000000001', tenant_id: workspaceId, version: 1,
            status: 'INFEASIBLE', code: 'INFEASIBLE', purpose: 'no_debt_plan',
            deficit: { amount_decimal: '380.00', asset_id: 'fiat:EUR' },
            binding_constraints: ['savings_protected_reserve'], reason: 'Protected savings cannot cover the deficit.',
            proposed_actions: [], plan_hash: 'b'.repeat(64), created_at: asOf,
        },
    });
}

function mockApi() {
    let projections = 0;
    let events = 0;
    return {
        async createPersonalWorkspace(display_name: string) {
            return WorkspaceSchema.parse({ id: workspaceId, tenant_id: workspaceId, kind: 'personal', display_name, owner_user_id: 'a3000000-0000-4000-8000-000000000001', created_at: asOf });
        },
        async recordEvent(_id: string, payload: EconomicEventPayload) {
            events += 1;
            return EconomicEventSchema.parse({
                id: `a4000000-0000-4000-8000-${String(events).padStart(12, '0')}`, tenant_id: workspaceId,
                source_event_id: `test:${events}`, direction: payload.direction,
                amount: { amount_decimal: payload.amount_decimal, asset_id: payload.asset_id },
                status: 'expected', verification: 'declared', label: payload.label,
                observed_at: asOf, ...(payload.expected_settlement_at ? { expected_settlement_at: payload.expected_settlement_at } : {}),
            });
        },
        async getProjection() { projections += 1; return response(projections === 1 ? 'FEASIBLE' : 'INFEASIBLE'); },
    };
}

describe('structured projection boundary — UI-02, ACC-01, PER-02/05/07, REL-01', () => {
    it('uses the shared personal workspace and declared fixture events', async () => {
        const data = await createFixtureSource(mockApi()).read();
        expect(WorkspaceSchema.parse(data.workspace).kind).toBe('personal');
        expect(data.workspace.organization_id).toBeUndefined();
        expect(data.result?.status).toBe('FEASIBLE');
        expect(data.plan?.proposed_actions[0]).toMatchObject({ type: 'own_funds_transfer', amount_decimal: '230.00' });
        expect(data.events.length).toBeGreaterThan(0);
        expect(data.events.every(event => event.verification === 'declared' && event.status === 'expected')).toBe(true);
        expect(data.provenance.synthetic).toBe(true);
    });

    it('reprojects after a declared event and carries an infeasible diagnostic with no action', async () => {
        const source = createFixtureSource(mockApi());
        await source.read();
        await source.addEvent?.({ direction: 'outflow', amount_decimal: '150.00', asset_id: 'fiat:EUR', label: 'Imprévu' });
        const after = await source.read();
        expect(after.result?.status).toBe('INFEASIBLE');
        if (after.result?.status === 'INFEASIBLE') expect(after.result.diagnostic.proposed_actions).toEqual([]);
        expect(after.plan).toBeNull();
    });

    it('keeps acknowledgement distinct from execution', async () => {
        const source = createFixtureSource(mockApi());
        const before = await source.read();
        const acknowledged = await source.acknowledge(before.plan!);
        expect(acknowledged.status).toBe('ACKNOWLEDGED');
        expect(before.executions).toEqual([]);
        expect((await source.read()).events).toEqual(before.events);
    });

    it('formats decimal strings without binary-float loss', () => {
        expect(euro('9007199254740993.12', 'en')).toBe('9,007,199,254,740,993.12\u00a0€');
        expect(euro('-130.00', 'fr')).toBe('−130\u00a0€');
        expect(euro('230.00', 'fr')).toBe('230\u00a0€');
        expect(() => euro('1e3')).toThrow();
    });
});
