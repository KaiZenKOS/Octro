import { describe, expect, it } from 'vitest';
import { OctroMcpServer } from '../src/index.js';

describe('OctroMcpServer (MCP-02)', () => {
    it('exposes read-only financial tools and executes correctly', async () => {
        const server = new OctroMcpServer();
        const tools = server.getTools();
        
        expect(tools.length).toBe(3);
        const names = tools.map(t => t.name);
        expect(names).toEqual([
            'octro_get_workspace_summary',
            'octro_get_projection',
            'octro_explain_proposal',
        ]);

        for (const tool of tools) {
            expect(typeof tool.name).toBe('string');
            expect(typeof tool.description).toBe('string');
            expect(tool.parameters).toBeDefined();
            expect(tool.parameters.type).toBe('object');
        }

        const res = await server.callTool('octro_get_projection', { workspaceId: 'ws-1' });
        expect(res.isError).toBeUndefined();
        expect(res.content[0]?.text).toContain('230.00 EUR');

        const unknown = await server.callTool('unknown_tool', {});
        expect(unknown.isError).toBe(true);
        expect(unknown.content[0]?.text).toContain('Outil inconnu');
    });
});
