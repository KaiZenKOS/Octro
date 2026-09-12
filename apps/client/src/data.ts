import {
    EconomicEventSchema,
    ProjectionRequestSchema,
    WorkspaceSchema,
} from '@octro/contracts';
import type {
    ActionPlan,
    EconomicEvent,
    Execution,
    ProjectionRequest,
    ProjectionResult,
    Workspace,
} from '@octro/contracts';
import fixture from '../../../docs/v2.2/personal.fixture.json';
import { apiClient, type EconomicEventPayload, type OctroApiClient, type ProjectionInputs } from './api';

export type ClientSourceState = 'ready' | 'stale' | 'unavailable';

export interface ClientSnapshot {
    workspace: Workspace;
    request: ProjectionRequest;
    result: ProjectionResult | null;
    plan: ActionPlan | null;
    events: EconomicEvent[];
    executions: Execution[];
    sourceState: ClientSourceState;
    sourceMessage?: string;
    provenance: {
        synthetic: boolean;
        fixtureId: string;
        mode: 'server' | 'local-draft';
        asOf: string;
    };
}

export interface ClientDataSource {
    read(signal?: AbortSignal): Promise<ClientSnapshot>;
    acknowledge(plan: ActionPlan): Promise<ActionPlan>;
    addEvent?(event: EconomicEventPayload): Promise<void>;
    removeEvent?(eventId: string): Promise<void>;
    resetEvents?(): Promise<void>;
    updateBalances?(current: string, savings: string, reserve?: string, protectedSavings?: string): Promise<void>;
    setHorizon?(days: number): Promise<void>;
}

const workspaceId = 'a1000000-0000-4000-8000-000000000001';
const ownerId = 'a3000000-0000-4000-8000-000000000001';
const asOf = '2026-09-12T00:00:00Z';
const defaultInputs: ProjectionInputs = ProjectionRequestSchema.omit({ workspace_id: true }).parse({
    asset_id: fixture.asset_id,
    opening_balances: fixture.opening_balances,
    current_reserve: fixture.current_reserve,
    savings_protected_reserve: '0.00',
    horizon: { steps: 30, unit: 'day' },
});

export const demoFixture = fixture;

function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
        const random = Math.floor(Math.random() * 16);
        return (token === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
}

function createFixtureWorkspace(id = workspaceId): Workspace {
    return WorkspaceSchema.parse({
        id,
        tenant_id: id,
        kind: 'personal',
        display_name: 'Lina',
        owner_user_id: ownerId,
        created_at: asOf,
    });
}

function createFixtureEvents(tenantId: string): EconomicEvent[] {
    return fixture.events.map((event, index) => {
        const date = new Date(Date.parse(asOf) + event.day * 86_400_000).toISOString();
        const direction = 'inflow' in event ? 'inflow' : 'outflow';
        return EconomicEventSchema.parse({
            id: `a4000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            tenant_id: tenantId,
            source_event_id: `${fixture.id}:${index}`,
            direction,
            amount: { amount_decimal: 'inflow' in event ? event.inflow : event.outflow, asset_id: fixture.asset_id },
            status: 'expected',
            verification: 'declared',
            label: event.label,
            observed_at: asOf,
            expected_settlement_at: date,
        });
    });
}

function toEventPayload(event: EconomicEvent): EconomicEventPayload {
    return {
        direction: event.direction,
        amount_decimal: event.amount.amount_decimal,
        asset_id: event.amount.asset_id,
        label: event.label,
        ...(event.expected_settlement_at ? { expected_settlement_at: event.expected_settlement_at } : {}),
    };
}

export function createFixtureSource(api: Pick<OctroApiClient, 'createPersonalWorkspace' | 'recordEvent' | 'getProjection'> = apiClient): ClientDataSource {
    let workspace = createFixtureWorkspace();
    let remoteWorkspace: Workspace | null = null;
    let remoteNeedsBootstrap = true;
    let requestInputs = defaultInputs;
    let events = createFixtureEvents(workspace.tenant_id);
    let sourceState: ClientSourceState = 'ready';
    let sourceMessage: string | undefined;
    let acknowledgedHash: string | null = null;

    const projectionRequest = (): ProjectionRequest => ProjectionRequestSchema.parse({
        workspace_id: workspace.id,
        ...requestInputs,
    });

    async function ensureRemoteWorkspace(): Promise<void> {
        if (remoteWorkspace && !remoteNeedsBootstrap) return;
        const created = await api.createPersonalWorkspace(workspace.display_name);
        try {
            const seeded = await Promise.all(events.map(event => api.recordEvent(created.id, toEventPayload(event))));
            remoteWorkspace = created;
            workspace = created;
            events = seeded;
            remoteNeedsBootstrap = false;
        } catch (error) {
            remoteWorkspace = null;
            remoteNeedsBootstrap = true;
            throw error;
        }
    }

    function localSnapshot(result: ProjectionResult | null): ClientSnapshot {
        const validResult = result && result.status === 'FEASIBLE' && acknowledgedHash === result.action_plan.plan_hash
            ? { ...result, action_plan: { ...result.action_plan, status: 'ACKNOWLEDGED' as const } }
            : result;
        return {
            workspace,
            request: projectionRequest(),
            result: validResult,
            plan: validResult?.status === 'FEASIBLE' ? validResult.action_plan : null,
            events: [...events],
            executions: [],
            sourceState,
            ...(sourceMessage ? { sourceMessage } : {}),
            provenance: {
                synthetic: result ? result.provenance.source === 'synthetic' : true,
                fixtureId: result?.provenance.fixture_id ?? fixture.id,
                mode: result ? 'server' : 'local-draft',
                asOf: result?.provenance.as_of ?? asOf,
            },
        };
    }

    return {
        async read(signal) {
            if (signal?.aborted) throw new Error('Aborted');
            try {
                await ensureRemoteWorkspace();
                const result = await api.getProjection(remoteWorkspace!.id, requestInputs);
                sourceState = 'ready';
                sourceMessage = undefined;
                return localSnapshot(result);
            } catch (error) {
                sourceState = events.length ? 'stale' : 'unavailable';
                sourceMessage = error instanceof Error ? error.message : 'Projection indisponible';
                return localSnapshot(null);
            }
        },

        async acknowledge(expected) {
            if (!remoteWorkspace || expected.tenant_id !== remoteWorkspace.tenant_id)
                throw new Error('VERSION_CONFLICT');
            if (expected.plan_hash.length !== 64 || expected.status !== 'PROPOSED')
                throw new Error('PLAN_EXPIRED');
            acknowledgedHash = expected.plan_hash;
            return { ...expected, status: 'ACKNOWLEDGED' };
        },

        async addEvent(event) {
            const payload = { ...event };
            const localEvent = EconomicEventSchema.parse({
                id: newId(),
                tenant_id: workspace.tenant_id,
                source_event_id: `local:${newId()}`,
                direction: payload.direction,
                amount: { amount_decimal: payload.amount_decimal, asset_id: payload.asset_id },
                status: 'expected',
                verification: 'declared',
                label: payload.label,
                observed_at: new Date().toISOString(),
                ...(payload.expected_settlement_at ? { expected_settlement_at: payload.expected_settlement_at } : {}),
            });
            events = [...events, localEvent];
            acknowledgedHash = null;
            sourceState = 'stale';
            sourceMessage = 'Les données ont changé. La projection attend un nouveau calcul serveur.';
            try {
                const addToExistingRemote = remoteWorkspace !== null && !remoteNeedsBootstrap;
                await ensureRemoteWorkspace();
                if (addToExistingRemote) {
                    const recorded = await api.recordEvent(remoteWorkspace!.id, payload);
                    events = events.map(item => item.id === localEvent.id ? recorded : item);
                }
                sourceState = 'ready';
                sourceMessage = undefined;
            } catch (error) {
                sourceState = 'stale';
                sourceMessage = error instanceof Error ? error.message : 'Projection indisponible';
            }
        },

        async removeEvent(eventId) {
            events = events.filter(event => event.id !== eventId);
            acknowledgedHash = null;
            remoteWorkspace = null;
            remoteNeedsBootstrap = true;
            workspace = createFixtureWorkspace();
            events = events.map(event => EconomicEventSchema.parse({ ...event, tenant_id: workspace.tenant_id }));
            sourceState = 'stale';
            sourceMessage = 'Les données ont changé. La projection attend un nouveau calcul serveur.';
        },

        async resetEvents() {
            requestInputs = defaultInputs;
            workspace = createFixtureWorkspace();
            remoteWorkspace = null;
            remoteNeedsBootstrap = true;
            events = createFixtureEvents(workspace.tenant_id);
            acknowledgedHash = null;
            sourceState = 'ready';
            sourceMessage = undefined;
        },

        async updateBalances(current, savings, reserve, protectedSavings) {
            requestInputs = ProjectionRequestSchema.omit({ workspace_id: true }).parse({
                ...requestInputs,
                opening_balances: { current, savings },
                ...(reserve !== undefined ? { current_reserve: reserve } : {}),
                ...(protectedSavings !== undefined ? { savings_protected_reserve: protectedSavings } : {}),
            });
            acknowledgedHash = null;
        },

        async setHorizon(days) {
            requestInputs = ProjectionRequestSchema.omit({ workspace_id: true }).parse({
                ...requestInputs,
                horizon: { steps: days, unit: 'day' },
            });
            acknowledgedHash = null;
        },
    };
}

export function euro(decimal: string, language: 'fr' | 'en' = 'fr'): string {
    if (!/^-?\d+(\.\d+)?$/.test(decimal)) throw new Error('Invalid decimal');
    const negative = decimal.startsWith('-');
    const [whole, fraction] = decimal.replace('-', '').split('.');
    const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, language === 'fr' ? '\u202f' : ',');
    const tail = fraction && /[1-9]/.test(fraction) ? (language === 'fr' ? ',' : '.') + fraction : '';
    return `${negative ? '−' : ''}${grouped}${tail}\u00a0€`;
}
