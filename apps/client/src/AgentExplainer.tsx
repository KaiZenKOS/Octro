import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useClientData, useSession } from './session';
import { BoundedOrchestrator, LiveModelGateway } from '@octro/agents';

export function AgentExplainerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t, language } = useSession();
    const { data } = useClientData();
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [riskInfo, setRiskInfo] = useState<string | null>(null);
    const [callCount, setCallCount] = useState<number>(0);
    const [deepseekKey, setDeepseekKey] = useState<string>('');
    const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
    const [customQuestion, setCustomQuestion] = useState<string>('');

    const askAgent = async (question: string) => {
        setLoading(true);
        try {
            const proj = data?.computedProjection;
            const curBal = proj ? proj.openingCurrent.toFixed(2) : '650.00';
            const defBal = proj ? Math.max(0, -proj.lowestBalanceWithoutAction).toFixed(2) : '130.00';
            const recAction = proj ? `own_funds_transfer: ${proj.recommendedTransfer.toFixed(2)} EUR` : 'own_funds_transfer: 230.00 EUR';
            const horiz = proj ? proj.horizonDays : 30;

            const gateway = deepseekKey.trim() ? new LiveModelGateway(deepseekKey.trim()) : new LiveModelGateway();
            const orchestrator = new BoundedOrchestrator(gateway);

            const res = await orchestrator.explainCashflow({
                workspaceId: 'ws-personal-lina',
                currentBalanceDecimal: curBal,
                horizonDays: horiz,
                deficitAmountDecimal: defBal,
                recommendedAction: recAction,
            }, question);

            setResponse(res.summary);
            setRiskInfo(res.riskExplanation);
            setCallCount(res.callCount);
        } catch {
            setResponse(t(
                "Impossible de joindre l'agent d'explication. Le parcours manuel de décision reste pleinement accessible.",
                "Could not reach the explainer agent. The manual decision flow remains fully accessible."
            ));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={s.scrim}>
                <View style={s.dialog} accessibilityViewIsModal>
                    <ScrollView contentContainerStyle={{ gap: 16 }}>
                        <View style={s.header}>
                            <View style={s.titleRow}>
                                <Icon name="sparkles" color={tokens.color.accent} size={24} />
                                <T variant="title" style={{ fontSize: 22 }}>
                                    {t('Octro Explainer · Agent borné', 'Octro Explainer · Bounded Agent')}
                                </T>
                            </View>
                            <Pressable onPress={onClose} accessibilityRole="button">
                                <T style={{ color: tokens.color.muted, fontSize: 18 }}>✕</T>
                            </Pressable>
                        </View>

                        <T variant="muted" style={{ fontSize: 13 }}>
                            {t(
                                'L’agent vulgarise le plan calculé déterministement. Il n’a aucune autorité de signature (limite stricte : 12 tours max). Compatible DeepSeek, OpenAI et Gemini.',
                                'The agent explains the deterministically computed plan. It has no signing authority (strict 12-turn bound). Compatible with DeepSeek, OpenAI and Gemini.'
                            )}
                        </T>

                        <View style={{ gap: 8 }}>
                            <View style={[s.between, { flexWrap: 'wrap' }]}>
                                <T style={{ fontFamily: tokens.font.medium, fontSize: 13 }}>
                                    {t('Configuration du modèle :', 'Model configuration:')}
                                </T>
                                <Pressable onPress={() => setShowKeyInput(!showKeyInput)}>
                                    <T style={{ fontSize: 12, color: tokens.color.accent }}>
                                        {showKeyInput ? t('Masquer la clé', 'Hide key') : t('⚙️ Entrer clé DeepSeek / LLM', '⚙️ Enter DeepSeek / LLM key')}
                                    </T>
                                </Pressable>
                            </View>

                            {showKeyInput && (
                                <View style={{ gap: 6, backgroundColor: '#1A171D', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3F353C' }}>
                                    <T style={{ fontSize: 12, color: tokens.color.muted }}>
                                        {t('Clé API DeepSeek (ex. sk-...) ou variable DEEPSEEK_API_KEY :', 'DeepSeek API key (e.g. sk-...) or DEEPSEEK_API_KEY:')}
                                    </T>
                                    <TextInput
                                        value={deepseekKey}
                                        onChangeText={setDeepseekKey}
                                        placeholder="sk-..."
                                        placeholderTextColor="#666"
                                        secureTextEntry
                                        style={s.input}
                                    />
                                    <T style={{ fontSize: 11, color: deepseekKey ? tokens.color.success : tokens.color.muted }}>
                                        {deepseekKey ? t('✓ Clé DeepSeek prête pour les réponses live', '✓ DeepSeek key ready for live queries') : t('Sans clé : moteur déterministe hors-ligne actif', 'Without key: offline deterministic engine active')}
                                    </T>
                                </View>
                            )}
                        </View>

                        <View style={{ gap: 8 }}>
                            <T style={{ fontFamily: tokens.font.medium, fontSize: 14 }}>
                                {t('Questions rapides :', 'Quick questions:')}
                            </T>
                            <Button
                                variant="secondary"
                                onPress={() => askAgent('Expliquer pourquoi 230 € et comment la réserve de 100 € est protégée')}
                                style={s.quickBtn}
                            >
                                <T style={{ fontSize: 13 }}>
                                    {t('Pourquoi 230 € et comment la réserve est préservée ?', 'Why €230 and how is the reserve preserved?')}
                                </T>
                            </Button>
                            <Button
                                variant="secondary"
                                onPress={() => askAgent('Quels sont les risques si mon salaire a 3 jours de retard ?')}
                                style={s.quickBtn}
                            >
                                <T style={{ fontSize: 13 }}>
                                    {t('Que se passe-t-il en cas de retard sur le salaire ?', 'What happens if salary payment is delayed?')}
                                </T>
                            </Button>
                        </View>

                        <View style={{ gap: 8 }}>
                            <T style={{ fontFamily: tokens.font.medium, fontSize: 13 }}>
                                {t('Poser une question libre :', 'Ask a custom question:')}
                            </T>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    value={customQuestion}
                                    onChangeText={setCustomQuestion}
                                    placeholder={t('Ex. Puis-je reporter le loyer ?', 'e.g. Can I postpone rent?')}
                                    placeholderTextColor="#666"
                                    style={[s.input, { flex: 1 }]}
                                />
                                <Button
                                    busy={loading}
                                    disabled={!customQuestion.trim()}
                                    onPress={() => {
                                        if (customQuestion.trim()) {
                                            void askAgent(customQuestion.trim());
                                        }
                                    }}
                                    style={{ minHeight: 44, paddingHorizontal: 16 }}
                                >
                                    {t('Envoyer', 'Send')}
                                </Button>
                            </View>
                        </View>

                        {loading && (
                            <Card style={{ padding: 16 }}>
                                <T>{t('Analyse en cours par l’agent (Orchestrateur borné)…', 'Agent analysis in progress (Bounded orchestrator)…')}</T>
                            </Card>
                        )}

                        {response && !loading && (
                            <Card warm style={{ gap: 12 }}>
                                <View style={s.between}>
                                    <View style={s.badge}>
                                        <T style={{ fontSize: 11, color: tokens.color.accent }}>
                                            {deepseekKey ? 'DEEPSEEK LIVE' : t('ANALYSE DÉTERMINISTE', 'DETERMINISTIC ANALYSIS')}
                                        </T>
                                    </View>
                                    <T style={{ fontSize: 11, color: tokens.color.muted }}>
                                        {callCount}/12 {t('tours utilisés', 'turns used')}
                                    </T>
                                </View>
                                <T style={{ lineHeight: 22 }}>{response}</T>
                                {riskInfo && (
                                    <View style={s.riskBox}>
                                        <T style={{ fontSize: 12, color: tokens.color.warning }}>
                                            {t('Gestion du risque : ', 'Risk management: ')}{riskInfo}
                                        </T>
                                    </View>
                                )}
                            </Card>
                        )}

                        <Button variant="secondary" onPress={onClose}>{t('Fermer', 'Close')}</Button>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    scrim: { flex: 1, backgroundColor: '#000B', padding: 20, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 520, width: '100%', maxHeight: '90%', padding: 24, borderRadius: 28, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quickBtn: { minHeight: 44, paddingVertical: 8, justifyContent: 'flex-start' },
    badge: { backgroundColor: tokens.color.raised, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    riskBox: { backgroundColor: '#211D22', padding: 10, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: tokens.color.warning },
    input: { backgroundColor: '#121015', borderWidth: 1, borderColor: tokens.color.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: tokens.color.text, fontSize: 13 },
});
