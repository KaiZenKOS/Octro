import fixture from '../../../docs/v2.2/personal.fixture.json';
import proposal from '../../../docs/v2.2/plan.example.json';
import type { OctroActionPlanProposal } from '@octro/contracts';

const API_BASE_URL = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL 
    ? process.env.EXPO_PUBLIC_API_URL 
    : 'http://localhost:3000';

const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000002';

export interface EconomicEventPayload {
    direction: 'inflow' | 'outflow';
    amount_decimal: string;
    asset_id: string;
    label: string;
    expected_settlement_at?: string;
}

export interface WorkspaceSummary {
    id: string;
    displayName: string;
    kind: 'personal' | 'organization';
    ownerUserId: string;
}

export interface ProjectionData {
    workspace: WorkspaceSummary;
    provenance: { asOf: string; version: string };
    events: Array<{
        id: string;
        label: string;
        direction: 'inflow' | 'outflow';
        amount: { amount_decimal: string; asset_id: string };
        expected_settlement_at?: string;
    }>;
    plan: OctroActionPlanProposal;
}

class OctroApiClient {
    private inMemoryEvents = fixture.events.map((e, idx) => ({
        id: `evt-${idx + 1}`,
        label: e.label,
        direction: ('inflow' in e ? 'inflow' : 'outflow') as 'inflow' | 'outflow',
        amount_decimal: ('inflow' in e ? e.inflow : e.outflow) ?? '0',
        asset_id: fixture.asset_id,
        expected_settlement_at: new Date(Date.parse('2026-09-12T00:00:00Z') + e.day * 86400000).toISOString(),
    }));
    private planStatus: 'PROPOSED' | 'ACKNOWLEDGED' = 'PROPOSED';

    async getProjection(workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<ProjectionData> {
        try {
            const res = await fetch(`${API_BASE_URL}/v1/projections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-dev-tenant-id': DEV_TENANT_ID,
                },
                body: JSON.stringify({
                    requesting_tenant_id: DEV_TENANT_ID,
                    workspace_id: workspaceId,
                    horizon_days: 30,
                    opening_balance_decimal: fixture.opening_balances.current,
                    asset_id: 'EUR',
                }),
            });

            if (res.ok) {
                const data = await res.json();
                return {
                    workspace: {
                        id: workspaceId,
                        displayName: 'Lina',
                        kind: 'personal',
                        ownerUserId: DEV_TENANT_ID,
                    },
                    provenance: {
                        asOf: data.asOf ?? '2026-09-12T10:00:00Z',
                        version: data.planVersion ?? '2.2',
                    },
                    events: this.inMemoryEvents.map((e, idx) => ({
                        id: `evt-${idx + 1}`,
                        label: e.label,
                        direction: e.direction,
                        amount: { amount_decimal: e.amount_decimal, asset_id: 'EUR' },
                        expected_settlement_at: e.expected_settlement_at,
                    })),
                    plan: {
                        ...(proposal as unknown as OctroActionPlanProposal),
                        status: this.planStatus,
                    },
                };
            }
        } catch {
            // Fallback déterministe hors ligne
        }

        return {
            workspace: {
                id: workspaceId,
                displayName: 'Lina',
                kind: 'personal',
                ownerUserId: DEV_TENANT_ID,
            },
            provenance: { asOf: '2026-09-12T10:00:00Z', version: '2.2' },
            events: this.inMemoryEvents.map((e, idx) => ({
                id: `evt-${idx + 1}`,
                label: e.label,
                direction: e.direction,
                amount: { amount_decimal: e.amount_decimal, asset_id: 'EUR' },
                expected_settlement_at: e.expected_settlement_at,
            })),
            plan: {
                ...(proposal as unknown as OctroActionPlanProposal),
                status: this.planStatus,
            },
        };
    }

    async addEvent(event: EconomicEventPayload, workspaceId: string = DEFAULT_WORKSPACE_ID): Promise<void> {
        this.inMemoryEvents.push({
            id: `evt-${Date.now()}`,
            label: event.label,
            direction: event.direction,
            amount_decimal: event.amount_decimal,
            asset_id: event.asset_id,
            expected_settlement_at: event.expected_settlement_at,
        });

        try {
            await fetch(`${API_BASE_URL}/v1/workspaces/${workspaceId}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-dev-tenant-id': DEV_TENANT_ID,
                },
                body: JSON.stringify({
                    direction: event.direction,
                    amount_decimal: event.amount_decimal,
                    asset_id: event.asset_id,
                    label: event.label,
                    expected_settlement_at: event.expected_settlement_at,
                }),
            });
        } catch {
            // Fallback déterministe
        }
    }

    async acknowledgePlan(): Promise<void> {
        this.planStatus = 'ACKNOWLEDGED';
    }
}

export const apiClient = new OctroApiClient();
