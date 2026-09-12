import {
    EconomicEventSchema,
    ProjectionRequestSchema,
    ProjectionResultSchema,
    WorkspaceSchema,
} from '@octro/contracts';
import type {
    EconomicEvent,
    ProjectionRequest,
    ProjectionResult,
    Workspace,
} from '@octro/contracts';

// Expo only substitutes EXPO_PUBLIC variables when accessed with this exact
// static dot notation. This value is a public endpoint, never a credential.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '/api';

const DEMO_OWNER_ID = 'a3000000-0000-4000-8000-000000000001';

export interface EconomicEventPayload {
    direction: 'inflow' | 'outflow';
    amount_decimal: string;
    asset_id: string;
    label: string;
    expected_settlement_at?: string;
}

export type EventRecordOptions = {
    idempotencyKey?: string;
};

export interface ProjectionInputs extends Omit<ProjectionRequest, 'workspace_id'> {}

export class OctroApiClient {
    constructor(private readonly fetcher: typeof fetch = fetch) {}

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await this.fetcher(`${API_BASE_URL}${path}`, init);
        const body: unknown = await response.json().catch(() => undefined);
        if (!response.ok) {
            const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
                ? body.message
                : `API request failed (${response.status})`;
            throw new Error(message);
        }
        return body as T;
    }

    async createPersonalWorkspace(displayName: string): Promise<Workspace> {
        const result = await this.request<unknown>('/v1/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_user_id: DEMO_OWNER_ID, kind: 'personal', display_name: displayName }),
        });
        return WorkspaceSchema.parse(result);
    }

    async recordEvent(workspaceId: string, event: EconomicEventPayload, options?: EventRecordOptions): Promise<EconomicEvent> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "x-dev-tenant-id": workspaceId,
        };
        if (options?.idempotencyKey) {
            headers["idempotency-key"] = options.idempotencyKey;
        }
        const result = await this.request<unknown>(`/v1/workspaces/${workspaceId}/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(event),
        });
        return EconomicEventSchema.parse(result);
    }

    async getProjection(workspaceId: string, inputs: ProjectionInputs): Promise<ProjectionResult> {
        const body = ProjectionRequestSchema.parse({ workspace_id: workspaceId, ...inputs });
        const result = await this.request<unknown>('/v1/projections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-dev-tenant-id': workspaceId,
            },
            body: JSON.stringify(body),
        });
        return ProjectionResultSchema.parse(result);
    }
}

export const apiClient = new OctroApiClient();
