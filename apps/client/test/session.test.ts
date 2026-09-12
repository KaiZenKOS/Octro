import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { workspaceQueryKey } from '../src/session';

describe('workspace query identity isolation — SEC-01', () => {
    it('does not reuse cached workspace data across account changes or logout', () => {
        const client = new QueryClient();
        const aliceKey = workspaceQueryKey('user-alice', true);
        const bobKey = workspaceQueryKey('user-bob', true);
        const anonymousKey = workspaceQueryKey(null, false);
        client.setQueryData(aliceKey, { owner: 'alice' });

        expect(client.getQueryData(aliceKey)).toEqual({ owner: 'alice' });
        expect(client.getQueryData(bobKey)).toBeUndefined();
        expect(client.getQueryData(anonymousKey)).toBeUndefined();
        client.clear();
    });
});
