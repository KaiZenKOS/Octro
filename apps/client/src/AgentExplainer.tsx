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
    const [customQuestion, setCustomQuestion] = useState<string>('');

    const askAgent = async (question: string) => {
        setLoading(true);
        try {
            const proj = data?.computedProjection;
            const curBal = proj ? proj.openingCurrent.toFixed(2) : '650.00';
            const defBal = proj ? Math.max(0, -proj.lowestBalanceWithoutAction).toFixed(2) : '130.00';
            const recAction = proj ? `own_funds_transfer: ${proj.recommendedTransfer.toFixed(2)} EUR` : 'own_funds_transfer: 230.00 EUR';
            const horiz = proj ? proj.horizonDays : 30;

            const apiBase = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || 'http://localhost:3000';
            let res: { summary: string; riskExplanation: string };

            try {
                const response = await fetch(`${apiBase}/v1/agent/explain`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        workspace_id: 'ws-personal-lina',
                        current_balance_decimal: curBal,
                        horizon_days: horiz,
                        deficit_amount_decimal: defBal,
                        recommended_action: recAction,
                        question,
                    }),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                res = await response.json();
            } catch {
                // Offline fallback (PER-11, NET-02): deterministic in-client orchestrator
                const orchestrator = new BoundedOrchestrator();
                res = await orchestrator.explainCashflow({
                    workspaceId: 'ws-personal-lina',
                    currentBalanceDecimal: curBal,
                    horizonDays: horiz,
                    deficitAmountDecimal: defBal,
                    recommendedAction: recAction,
                }, question);
            }

            setResponse(res.summary);
            setRiskInfo(res.riskExplanation);
        } catch {
            setResponse(t(
                "Impossible d'analyser cette question pour le moment. Vos prévisions et votre calendrier restent pleinement accessibles.",
                "Could not analyze this question at the moment. Your forecast and calendar remain fully accessible."
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
                                    {t('Comprendre mes prévisions', 'Understand my forecast')}
                                </T>
                            </View>
                            <Pressable onPress={onClose} accessibilityRole="button">
                                <T style={{ color: tokens.color.muted, fontSize: 18 }}>✕</T>
                            </Pressable>
                        </View>

                        <T variant="muted" style={{ fontSize: 13 }}>
                            {t(
                                'Des explications simples et bienveillantes sur vos chiffres, pour garder l’esprit tranquille.',
                                'Clear and friendly explanations of your numbers, giving you complete peace of mind.'
                            )}
                        </T>

                        <View style={{ gap: 8 }}>
                            <T style={{ fontFamily: tokens.font.medium, fontSize: 14 }}>
                                {t('Exemples de questions :', 'Example questions:')}
                            </T>
                            <Button
                                variant="secondary"
                                onPress={() => askAgent('Expliquer pourquoi 230 € et comment la réserve de 100 € est protégée')}
                                style={s.quickBtn}
                            >
                                <T style={{ fontSize: 13 }}>
                                    {t('Pourquoi transférer 230 € de l’épargne ?', 'Why transfer €230 from savings?')}
                                </T>
                            </Button>
                            <Button
                                variant="secondary"
                                onPress={() => askAgent('Quels sont les risques si mon salaire a 3 jours de retard ?')}
                                style={s.quickBtn}
                            >
                                <T style={{ fontSize: 13 }}>
                                    {t('Que se passe-t-il si mon salaire a 3 jours de retard ?', 'What happens if my salary is 3 days late?')}
                                </T>
                            </Button>
                            <Button
                                variant="secondary"
                                onPress={() => askAgent('Est-ce que ma réserve de sécurité de 100 € est bien préservée ?')}
                                style={s.quickBtn}
                            >
                                <T style={{ fontSize: 13 }}>
                                    {t('Ma réserve de sécurité de 100 € est-elle garantie ?', 'Is my €100 safety reserve guaranteed?')}
                                </T>
                            </Button>
                        </View>

                        <View style={{ gap: 8 }}>
                            <T style={{ fontFamily: tokens.font.medium, fontSize: 13 }}>
                                {t('Ou posez votre question librement :', 'Or ask your own question:')}
                            </T>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    value={customQuestion}
                                    onChangeText={setCustomQuestion}
                                    placeholder={t('Ex. Puis-je décaler une dépense ?', 'e.g. Can I delay an expense?')}
                                    placeholderTextColor="#777"
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
                                    {t('Demander', 'Ask')}
                                </Button>
                            </View>
                        </View>

                        {loading && (
                            <Card style={{ padding: 16 }}>
                                <T>{t('Analyse de votre situation en cours…', 'Analyzing your situation…')}</T>
                            </Card>
                        )}

                        {response && !loading && (
                            <Card warm style={{ gap: 12 }}>
                                <View style={s.between}>
                                    <View style={s.badge}>
                                        <T style={{ fontSize: 11, color: tokens.color.accent, fontFamily: tokens.font.medium }}>
                                            {t('CONSEIL PERSONNALISÉ', 'PERSONALIZED ADVICE')}
                                        </T>
                                    </View>
                                </View>
                                <T style={{ lineHeight: 22 }}>{response}</T>
                                {riskInfo && (
                                    <View style={s.riskBox}>
                                        <T style={{ fontSize: 12, color: tokens.color.warning }}>
                                            {t('Point d’attention : ', 'Note on risk: ')}{riskInfo}
                                        </T>
                                    </View>
                                )}
                            </Card>
                        )}

                        <T style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: tokens.color.muted }}>
                            {t(
                                'L’assistant vous conseille en toute transparence. Il n’a aucun accès direct à votre banque et ne déplace jamais votre argent.',
                                'The assistant provides transparent guidance. It has no direct access to your bank and never moves your money.'
                            )}
                        </T>

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
