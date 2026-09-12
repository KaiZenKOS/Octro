import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useClientData, useSession } from './session';
import { BoundedOrchestrator } from '@octro/agents';

export function AgentExplainerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t, language } = useSession();
    const { data } = useClientData();
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [riskInfo, setRiskInfo] = useState<string | null>(null);
    const [callCount, setCallCount] = useState<number>(0);

    const orchestrator = new BoundedOrchestrator();

    const askAgent = async (question: string) => {
        setLoading(true);
        try {
            const proj = data?.computedProjection;
            const curBal = proj ? proj.openingCurrent.toFixed(2) : '650.00';
            const defBal = proj ? Math.max(0, -proj.lowestBalanceWithoutAction).toFixed(2) : '130.00';
            const recAction = proj ? `own_funds_transfer: ${proj.recommendedTransfer.toFixed(2)} EUR` : 'own_funds_transfer: 230.00 EUR';
            const horiz = proj ? proj.horizonDays : 30;

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
                                <Icon name="shield" color={tokens.color.success} size={24} />
                                <T variant="title" style={{ fontSize: 22 }}>
                                    {t('Octro Explainer · Agent borné', 'Octro Explainer · Bounded Agent')}
                                </T>
                            </View>
                            <Pressable onPress={onClose} accessibilityRole="button">
                                <T style={{ color: tokens.color.muted }}>✕</T>
                            </Pressable>
                        </View>

                        <T variant="muted" style={{ fontSize: 13 }}>
                            {t(
                                'L’agent analyse et vulgarise le plan financier calculé de façon déterministe. Il n’a aucun pouvoir de signature ou de soumission financière (limite stricte de 12 tours).',
                                'The agent analyzes and explains the deterministically computed financial plan. It has no signing or execution authority (strict 12 tool call bound).'
                            )}
                        </T>

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

                        {loading && (
                            <Card style={{ padding: 16 }}>
                                <T>{t('Analyse en cours par l’agent (Analyst & Explainer)…', 'Agent analysis in progress (Analyst & Explainer)…')}</T>
                            </Card>
                        )}

                        {response && !loading && (
                            <Card warm style={{ gap: 12 }}>
                                <View style={s.between}>
                                    <View style={s.badge}>
                                        <T style={{ fontSize: 11, color: tokens.color.accent }}>
                                            {t('ANALYSE DÉTERMINISTE', 'DETERMINISTIC ANALYSIS')}
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
});
