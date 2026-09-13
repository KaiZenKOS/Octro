import { ActionPlanSchema, WorkspaceSchema } from '@octro/contracts';
import type { ActionPlan, EconomicEvent, Execution, Projection, Workspace } from '@octro/contracts';
import fixture from '../../../docs/v2.2/personal.fixture.json';
import proposal from '../../../docs/v2.2/plan.example.json';
import reference from './pencil-reference.json';
// Presentation envelope, not a second definition of C1 domain objects.
export interface ClientSnapshot {
    workspace: Workspace;
    plan: ActionPlan;
    events: EconomicEvent[];
    executions: Execution[];
    projection: Projection | null;
    provenance: {
        synthetic: true;
        fixtureId: string;
        mode: 'fixture';
        asOf: string;
    };
}
export interface ClientDataSource {
    read(signal?: AbortSignal): Promise<ClientSnapshot>;
    acknowledge(plan: ActionPlan): Promise<ActionPlan>;
}
const tenant = 'a1000000-0000-4000-8000-000000000001';
const asOf = '2026-09-12T00:00:00Z'; // Explicit synthetic scenario anchor, never "now".
export const demoFixture = fixture;
export const designReference = reference;
export function createFixtureSource(): ClientDataSource {
    let plan = ActionPlanSchema.parse({
        id: 'a2000000-0000-4000-8000-000000000001', tenant_id: tenant,
        version: 1, purpose: proposal.purpose, status: 'PROPOSED',
        data_quality: proposal.data_quality, proposed_actions: proposal.proposed_actions,
        plan_hash: reference.planHash, created_at: asOf,
    });
    const workspace = WorkspaceSchema.parse({
        id: tenant, tenant_id: tenant, kind: 'personal', display_name: 'Lina',
        owner_user_id: 'a3000000-0000-4000-8000-000000000001', created_at: asOf,
    });
    return {
        async read(signal) {
            if (signal?.aborted)
                throw new Error('Aborted');
            return {
                workspace, plan: { ...plan }, executions: [], projection: null,
                events: fixture.events.map((event, i) => ({
                    id: `a4000000-0000-4000-8000-00000000000${i + 1}`,
                    tenant_id: tenant, source_event_id: `${fixture.id}:${i}`,
                    direction: 'inflow' in event ? 'inflow' : 'outflow',
                    amount: { amount_decimal: ('inflow' in event ? event.inflow : event.outflow)!, asset_id: fixture.asset_id },
                    status: 'expected', verification: 'declared', label: event.label,
                    observed_at: asOf, expected_settlement_at: new Date(Date.parse(asOf) + event.day * 86400000).toISOString(),
                })),
                provenance: { synthetic: true, fixtureId: fixture.id, mode: 'fixture', asOf },
            };
        },
        async acknowledge(expected) {
            if (expected.id !== plan.id || expected.version !== plan.version || expected.plan_hash !== plan.plan_hash)
                throw new Error('VERSION_CONFLICT');
            if (!['PROPOSED', 'ACKNOWLEDGED'].includes(plan.status))
                throw new Error('PLAN_EXPIRED');
            plan = ActionPlanSchema.parse({ ...plan, status: 'ACKNOWLEDGED' });
            return { ...plan }; // Session demo only. No Approval or Execution is created.
        },
    };
}
/** Decimal display only: no floating point conversion, arithmetic or financial recomputation. */
export function euro(decimal: string, language: 'fr' | 'en' = 'fr'): string {
    if (!/^-?\d+(\.\d+)?$/.test(decimal))
        throw new Error('Invalid decimal');
    const negative = decimal.startsWith('-');
    const [whole, fraction] = decimal.replace('-', '').split('.');
    const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, language === 'fr' ? '\u202f' : ',');
    const tail = fraction && /[1-9]/.test(fraction) ? (language === 'fr' ? ',' : '.') + fraction : '';
    return `${negative ? '−' : ''}${grouped}${tail}\u00a0€`;
}
