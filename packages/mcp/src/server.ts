export interface McpToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export interface McpCallResult {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
}

export class OctroMcpServer {
    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'octro_get_workspace_summary',
                description: 'Lit le résumé du compte et les soldes actuels (Lecture seule, sans clé privée)',
                parameters: {
                    type: 'object',
                    properties: {
                        workspaceId: { type: 'string', description: 'ID du workspace' },
                    },
                    required: ['workspaceId'],
                },
            },
            {
                name: 'octro_get_projection',
                description: 'Calcule le calendrier de trésorerie sur un horizon donné (ex. 30 jours)',
                parameters: {
                    type: 'object',
                    properties: {
                        workspaceId: { type: 'string' },
                        horizonDays: { type: 'number', default: 30 },
                    },
                    required: ['workspaceId'],
                },
            },
            {
                name: 'octro_explain_proposal',
                description: 'Explique le plan d action proposé et les options sans dette',
                parameters: {
                    type: 'object',
                    properties: {
                        workspaceId: { type: 'string' },
                        actionType: { type: 'string' },
                    },
                    required: ['workspaceId'],
                },
            },
        ];
    }

    async callTool(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
        if (name === 'octro_get_workspace_summary') {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        workspaceId: args.workspaceId,
                        owner: 'Lina',
                        balances: { current: '650.00 EUR', savings: '300.00 EUR' },
                        status: 'ACTIVE',
                    }, null, 2),
                }],
            };
        }

        if (name === 'octro_get_projection') {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        workspaceId: args.workspaceId,
                        horizonDays: args.horizonDays ?? 30,
                        deficitLowDay: 'J+6',
                        deficitAmount: '130.00 EUR',
                        recommendedTransfer: '230.00 EUR',
                        protectedReserve: '100.00 EUR',
                    }, null, 2),
                }],
            };
        }

        if (name === 'octro_explain_proposal') {
            return {
                content: [{
                    type: 'text',
                    text: "Recommandation : Transfert interne de 230 € sans création de dette. Le loyer de 600 € à J+2 est honoré, la réserve de 100 € reste préservée jusqu'au salaire de 1600 € à J+10.",
                }],
            };
        }

        return {
            content: [{ type: 'text', text: `Outil inconnu : ${name}` }],
            isError: true,
        };
    }
}
