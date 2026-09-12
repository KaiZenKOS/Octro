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

// One public endpoint setting is shared with auth, KYC, credit and lending.
// The URL is configuration, never a credential.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export class ApiResponseError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = 'ApiResponseError';
    }
}

export class ApiAuthenticationRequiredError extends ApiResponseError {
    constructor(status = 401) {
        super('Your session is missing or expired. Sign in again to save and calculate this workspace.', status);
        this.name = 'ApiAuthenticationRequiredError';
    }
}

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
    constructor(
        private readonly fetcher: typeof fetch = fetch,
        private readonly getSessionToken: () => string | null = () => null,
    ) {}

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const token = this.getSessionToken();
        if (!token) throw new ApiAuthenticationRequiredError();
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        const response = await this.fetcher(`${API_BASE_URL}${path}`, {
            ...init,
            headers,
        });
        const body: unknown = await response.json().catch(() => undefined);
        if (!response.ok) {
            const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
                ? body.message
                : `API request failed (${response.status})`;
            if (response.status === 401 || response.status === 403) {
                throw new ApiAuthenticationRequiredError(response.status);
            }
            throw new ApiResponseError(message, response.status);
        }
        return body as T;
    }

    async createPersonalWorkspace(displayName: string): Promise<Workspace> {
        const result = await this.request<unknown>('/v1/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind: 'personal', display_name: displayName }),
        });
        return WorkspaceSchema.parse(result);
    }

    async recordEvent(workspaceId: string, event: EconomicEventPayload, options?: EventRecordOptions): Promise<EconomicEvent> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
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
            },
            body: JSON.stringify(body),
        });
        return ProjectionResultSchema.parse(result);
    }
}
