import { describe, expect, it } from 'vitest';
import { OctroMcpServer } from '../src/index.js';

describe('OctroMcpServer (MCP-02)', () => {
    it('exposes read-only financial tools and executes correctly', async () => {
        const server = new OctroMcpServer();
        const tools = server.getTools();
        
        expect(tools.length).toBe(3);
        expect(tools.map(t => t.name)).toContain('octro_get_projection');

        const res = await server.callTool('octro_get_projection', { workspaceId: 'ws-1' });
        expect(res.isError).toBeUndefined();
        expect(res.content[0]?.text).toContain('230.00 EUR');
    });
});
