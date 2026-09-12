import { describe, expect, it } from 'vitest';
import { ActionPlanSchema, EconomicEventSchema, WorkspaceSchema } from '@octro/contracts';
import { createFixtureSource, euro } from '../src/data';
describe('K1 fixture boundary — UI-02, ACC-01, PER-07, REL-01', () => {
    it('uses shared C1 schemas and leaves every fixture event declared and expected', async () => {
        const data = await createFixtureSource().read();
        expect(WorkspaceSchema.parse(data.workspace).kind).toBe('personal');
        expect(data.workspace.organization_id).toBeUndefined();
        expect(ActionPlanSchema.parse(data.plan).proposed_actions[0]).toMatchObject({ type: 'own_funds_transfer', amount_decimal: '230.00' });
        for (const event of data.events)
            expect(EconomicEventSchema.parse(event)).toMatchObject({ verification: 'declared', status: 'expected' });
        expect(data.provenance.synthetic).toBe(true);
        expect(data.projection).toBeNull(); // A Pencil curve is not an application projection.
    });
    it('repeated acknowledgement changes neither events nor balances and creates no execution', async () => {
        const source = createFixtureSource();
        const before = await source.read();
        await source.acknowledge(before.plan);
        await source.acknowledge(before.plan);
        const after = await source.read();
        expect(after.plan.status).toBe('ACKNOWLEDGED');
        expect(after.events).toEqual(before.events);
        expect(after.executions).toEqual([]);
        expect(after.plan.proposed_actions).toEqual(before.plan.proposed_actions);
        expect(after.provenance).toEqual(before.provenance);
    });
    it('refuses stale terms without recording a decision', async () => {
        const source = createFixtureSource();
        const { plan } = await source.read();
        await expect(source.acknowledge({ ...plan, version: 2 })).rejects.toThrow('VERSION_CONFLICT');
        await expect(source.acknowledge({ ...plan, plan_hash: '0'.repeat(64) })).rejects.toThrow('VERSION_CONFLICT');
        expect((await source.read()).plan.status).toBe('PROPOSED');
    });
    it('a new demo session never invents a previously saved plan', async () => {
        const source = createFixtureSource();
        await source.acknowledge((await source.read()).plan);
        expect((await createFixtureSource().read()).plan.status).toBe('PROPOSED');
    });
    it('formats decimal strings without losing precision to binary floats', () => {
        expect(euro('9007199254740993.12', 'en')).toBe('9,007,199,254,740,993.12\u00a0€');
        expect(euro('-130.00', 'fr')).toBe('−130\u00a0€');
        expect(euro('230.00', 'fr')).toBe('230\u00a0€');
        expect(() => euro('1e3')).toThrow();
    });
});
