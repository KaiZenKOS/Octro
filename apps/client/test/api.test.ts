import { describe, expect, it } from 'vitest';
import { ApiAuthenticationRequiredError, OctroApiClient } from '../src/api';

describe('authenticated API client — SEC-01, PER-03', () => {
    it('does not send any request without a session token', async () => {
        let calls = 0;
        const fetcher: typeof fetch = async () => {
            calls += 1;
            return new Response('{}');
        };
        const client = new OctroApiClient(fetcher, () => null);

        await expect(client.createPersonalWorkspace('Personal')).rejects.toBeInstanceOf(ApiAuthenticationRequiredError);
        expect(calls).toBe(0);
    });

    it('sends the real bearer session and never uses a tenant header or owner identity payload', async () => {
        let capturedUrl = '';
        let capturedInit: RequestInit | undefined;
        const fetcher: typeof fetch = async (input, init) => {
            capturedUrl = String(input);
            capturedInit = init;
            return new Response(JSON.stringify({
                id: 'a1000000-0000-4000-8000-000000000001',
                tenant_id: 'a1000000-0000-4000-8000-000000000001',
                kind: 'personal',
                display_name: 'Personal',
                owner_user_id: 'a3000000-0000-4000-8000-000000000001',
                created_at: '2026-09-12T00:00:00Z',
            }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        };
        const client = new OctroApiClient(fetcher, () => 'actual-session-token');

        await client.createPersonalWorkspace('Personal');
        const headers = new Headers(capturedInit?.headers);
        const payload = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
        expect(capturedUrl).toContain('/v1/workspaces');
        expect(headers.get('authorization')).toBe('Bearer actual-session-token');
        expect(headers.has('x-dev-tenant-id')).toBe(false);
        expect(payload).toEqual({ kind: 'personal', display_name: 'Personal' });
    });

    it('treats both unauthorized and forbidden responses as authentication failures', async () => {
        for (const status of [401, 403]) {
            const client = new OctroApiClient(async () => new Response('{}', { status }), () => 'expired-token');
            await expect(client.createPersonalWorkspace('Personal')).rejects.toMatchObject({ status });
        }
    });
});
