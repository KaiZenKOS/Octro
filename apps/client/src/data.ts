import { ActionPlanSchema, WorkspaceSchema } from '@octro/contracts';
import type { ActionPlan, EconomicEvent, Execution, Projection, Workspace } from '@octro/contracts';
import fixture from '../../../docs/v2.2/personal.fixture.json';
import proposal from '../../../docs/v2.2/plan.example.json';
import reference from './pencil-reference.json';
import { apiClient, type EconomicEventPayload } from './api';
import { computeProjection, type ProjectionResult } from './projection';

export interface ClientSnapshot {
    workspace: Workspace;
    plan: ActionPlan;
    events: EconomicEvent[];
    executions: Execution[];
    projection: Projection | null;
    computedProjection: ProjectionResult;
    provenance: {
        synthetic: boolean;
        fixtureId: string;
        mode: string;
        asOf: string;
    };
}

export interface ClientDataSource {
    read(signal?: AbortSignal): Promise<ClientSnapshot>;
    acknowledge(plan: ActionPlan): Promise<ActionPlan>;
    addEvent?(event: EconomicEventPayload): Promise<void>;
    removeEvent?(eventId: string): Promise<void>;
    resetEvents?(): Promise<void>;
    updateBalances?(current: number, savings: number, reserve?: number): Promise<void>;
    setHorizon?(days: number): Promise<void>;
}

const tenant = 'a1000000-0000-4000-8000-000000000001';
const asOf = '2026-09-12T00:00:00Z';

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
    
    let openingCurrent = parseFloat(fixture.opening_balances.current);
    let openingSavings = parseFloat(fixture.opening_balances.savings);
    let protectedReserve = parseFloat(fixture.current_reserve);
    let activeHorizon = 30;

    let dynamicEvents = fixture.events.map((event, i) => ({
        id: `a4000000-0000-4000-8000-00000000000${i + 1}`,
        tenant_id: tenant, source_event_id: `${fixture.id}:${i}`,
        direction: ('inflow' in event ? 'inflow' : 'outflow') as 'inflow' | 'outflow',
        amount: { amount_decimal: ('inflow' in event ? event.inflow : event.outflow)!, asset_id: fixture.asset_id },
        status: 'expected' as const, verification: 'declared' as const, label: event.label,
        observed_at: asOf, expected_settlement_at: new Date(Date.parse(asOf) + event.day * 86400000).toISOString(),
    }));

    return {
        async read(signal) {
            if (signal?.aborted) throw new Error('Aborted');
            
            // Tente de synchroniser avec l'API
            try {
                const apiData = await apiClient.getProjection(workspace.id);
                if (apiData?.events?.length > dynamicEvents.length) {
                    dynamicEvents = apiData.events.map((e, i) => ({
                        id: `a4000000-0000-4000-8000-00000000000${i + 1}`,
                        tenant_id: tenant,
                        source_event_id: `api:${i}`,
                        direction: e.direction,
                        amount: { amount_decimal: e.amount.amount_decimal, asset_id: e.amount.asset_id },
                        status: 'expected' as const,
                        verification: 'declared' as const,
                        label: e.label,
                        observed_at: asOf,
                        expected_settlement_at: e.expected_settlement_at ?? asOf,
                    }));
                }
            } catch {
                // Mode autonome
            }

            const projectionEvents = dynamicEvents.map(e => {
                const day = e.expected_settlement_at ? Math.max(0, Math.round((Date.parse(e.expected_settlement_at) - Date.parse(asOf)) / 86400000)) : 0;
                return {
                    id: e.id,
                    label: e.label,
                    amount: parseFloat(e.amount.amount_decimal),
                    day,
                    direction: e.direction,
                };
            });

            const computed = computeProjection(
                openingCurrent,
                openingSavings,
                protectedReserve,
                projectionEvents,
                activeHorizon
            );

            if (computed.deficit > 0) {
                plan.proposed_actions = [{
                    type: 'own_funds_transfer',
                    source_account_ref: 'savings-demo',
                    destination_account_ref: 'current-demo',
                    asset_id: 'fiat:EUR',
                    amount_decimal: computed.recommendedTransfer.toFixed(2),
                }];
            } else {
                plan.proposed_actions = [];
            }

            return {
                workspace,
                plan: { ...plan },
                executions: [],
                projection: null,
                computedProjection: computed,
                events: [...dynamicEvents],
                provenance: { synthetic: true, fixtureId: fixture.id, mode: 'live-reactive', asOf },
            };
        },
        async acknowledge(expected) {
            if (expected.id !== plan.id || expected.version !== plan.version || expected.plan_hash !== plan.plan_hash)
                throw new Error('VERSION_CONFLICT');
            if (!['PROPOSED', 'ACKNOWLEDGED'].includes(plan.status))
                throw new Error('PLAN_EXPIRED');
            plan = ActionPlanSchema.parse({ ...plan, status: 'ACKNOWLEDGED' });
            await apiClient.acknowledgePlan();
            return { ...plan };
        },
        async addEvent(event: EconomicEventPayload) {
            const nextIdx = dynamicEvents.length + 1;
            const newEvt = {
                id: `a4000000-0000-4000-8000-00000000000${nextIdx}`,
                tenant_id: tenant,
                source_event_id: `user:${nextIdx}`,
                direction: event.direction,
                amount: { amount_decimal: event.amount_decimal, asset_id: event.asset_id },
                status: 'expected' as const,
                verification: 'declared' as const,
                label: event.label,
                observed_at: asOf,
                expected_settlement_at: event.expected_settlement_at ?? asOf,
            };
            dynamicEvents.push(newEvt);
            await apiClient.addEvent(event, workspace.id);
        },
        async removeEvent(eventId: string) {
            dynamicEvents = dynamicEvents.filter(e => e.id !== eventId);
        },
        async resetEvents() {
            openingCurrent = parseFloat(fixture.opening_balances.current);
            openingSavings = parseFloat(fixture.opening_balances.savings);
            protectedReserve = parseFloat(fixture.current_reserve);
            activeHorizon = 30;
            dynamicEvents = fixture.events.map((event, i) => ({
                id: `a4000000-0000-4000-8000-00000000000${i + 1}`,
                tenant_id: tenant, source_event_id: `${fixture.id}:${i}`,
                direction: ('inflow' in event ? 'inflow' : 'outflow') as 'inflow' | 'outflow',
                amount: { amount_decimal: ('inflow' in event ? event.inflow : event.outflow)!, asset_id: fixture.asset_id },
                status: 'expected' as const, verification: 'declared' as const, label: event.label,
                observed_at: asOf, expected_settlement_at: new Date(Date.parse(asOf) + event.day * 86400000).toISOString(),
            }));
        },
        async updateBalances(current: number, savings: number, reserve?: number) {
            openingCurrent = current;
            openingSavings = savings;
            if (reserve !== undefined) protectedReserve = reserve;
        },
        async setHorizon(days: number) {
            activeHorizon = days;
        }
    };
}

export function euro(decimal: string, language: 'fr' | 'en' = 'fr'): string {
    if (!/^-?\d+(\.\d+)?$/.test(decimal))
        throw new Error('Invalid decimal');
    const negative = decimal.startsWith('-');
    const [whole, fraction] = decimal.replace('-', '').split('.');
    const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, language === 'fr' ? '\u202f' : ',');
    const tail = fraction && /[1-9]/.test(fraction) ? (language === 'fr' ? ',' : '.') + fraction : '';
    return `${negative ? '−' : ''}${grouped}${tail}\u00a0€`;
}
