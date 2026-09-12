export interface ModelMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ModelGatewayResponse {
    content: string;
    toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
}

export interface ModelGateway {
    generate(messages: ModelMessage[]): Promise<ModelGatewayResponse>;
}

export class DeterministicModelGateway implements ModelGateway {
    async generate(messages: ModelMessage[]): Promise<ModelGatewayResponse> {
        const last = messages[messages.length - 1]?.content ?? '';
        
        if (last.toLowerCase().includes('lina') || last.toLowerCase().includes('230')) {
            return {
                content: "Analyse : Un décalage de trésorerie survient à J+6 avant la rentrée du salaire à J+10. La recommandation optimale est un transfert interne de 230 € depuis l'épargne vers le compte courant, sans souscrire de dette, préservant votre réserve de sécurité de 100 €.",
            };
        }

        return {
            content: "Octro a analysé votre calendrier de trésorerie. Aucune anomalie critique n'a été détectée sur votre horizon de prévision.",
        };
    }
}
