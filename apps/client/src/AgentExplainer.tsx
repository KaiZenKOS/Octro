import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Typography as T, tokens } from '@octro/ui';
import { euro } from './data';
import { Icon } from './Icon';
import { useClientData, useSession } from './session';

/** Deterministic explanation of the validated API result; no LLM or extra math. */
export function AgentExplainerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t, language } = useSession();
    const { data } = useClientData();
    const result = data?.result;
    const feasible = result?.status === 'FEASIBLE' ? result : null;
    const infeasible = result?.status === 'INFEASIBLE' ? result : null;
    const action = feasible?.action_plan.proposed_actions.find(item => item.type !== 'no_action');
    const balance = result?.projection.points[0]?.confirmed_balance;
    const future = result?.projection.points.at(-1)?.expected_balance;

    return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={s.scrim}>
            <View style={s.dialog} accessibilityViewIsModal>
                <View style={s.header}>
                    <View style={s.titleRow}>
                        <Icon name="file" color={tokens.color.accent} size={22} />
                        <T variant="title" style={{ fontSize: 23 }}>{t('Comprendre le résultat', 'Understand the result')}</T>
                    </View>
                    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Fermer', 'Close')} style={s.close}><T style={{ color: tokens.color.muted }}>×</T></Pressable>
                </View>
                <T variant="muted">{t('Explication déterministe des données et de la décision retournées par le moteur. Aucun conseil généré ni action automatique.', 'A deterministic explanation of the data and decision returned by the engine. No generated advice or automatic action.')}</T>
                <ScrollView contentContainerStyle={{ gap: 14 }}>
                    {!result && <Card style={s.card}>
                        <T variant="label">{t('Résultat indisponible', 'Result unavailable')}</T>
                        <T>{data?.sessionRequired
                            ? t('Reconnectez-vous pour retrouver votre espace et recalculer. Aucune donnée de démonstration ne remplace vos hypothèses.', 'Sign in again to access your workspace and recalculate. Demo data is not shown as a substitute for your assumptions.')
                            : t('Les hypothèses restent visibles, mais aucune proposition précédente n’est présentée comme actuelle. Réessayez le calcul lorsque le service sera disponible.', 'Your assumptions remain available, but no previous proposal is presented as current. Retry the calculation when the service is available.')}</T>
                    </Card>}
                    {result && <Card warm style={s.card}>
                        <View style={s.row}><T variant="label">{t('Statut', 'Status')}</T><T style={{ color: feasible ? tokens.color.success : tokens.color.error, fontFamily: tokens.font.medium }}>{feasible ? t('Action faisable', 'Feasible action') : t('Aucune action sûre', 'No safe action')}</T></View>
                        {balance !== undefined && <View style={s.row}><T style={{ flex: 1 }}>{t('Solde confirmé au départ', 'Confirmed opening balance')}</T><T style={s.amount}>{euro(balance, language)}</T></View>}
                        {future !== undefined && <View style={s.row}><T style={{ flex: 1 }}>{t('Solde attendu à l’horizon', 'Expected balance at horizon')}</T><T style={s.amount}>{euro(future, language)}</T></View>}
                        {action?.type === 'own_funds_transfer' && <View style={s.row}><T style={{ flex: 1 }}>{t('Transfert de fonds propres proposé', 'Proposed own-funds transfer')}</T><T style={s.amount}>{euro(action.amount_decimal, language)}</T></View>}
                        {action && action.type !== 'own_funds_transfer' && <T>{t(`Action structurée : ${action.type}`, `Structured action: ${action.type}`)}</T>}
                        {infeasible && <>
                            <View style={s.rule} />
                            <T style={{ color: tokens.color.error, fontFamily: tokens.font.medium }}>{t('Diagnostic', 'Diagnostic')}</T>
                            <T>{infeasible.diagnostic.reason}</T>
                            <View style={s.row}><T style={{ flex: 1 }}>{t('Déficit identifié', 'Identified deficit')}</T><T style={s.amount}>{euro(infeasible.diagnostic.deficit.amount_decimal, language)}</T></View>
                            <T variant="muted" style={{ fontSize: 13 }}>{infeasible.diagnostic.binding_constraints.join(' · ')}</T>
                        </>}
                    </Card>}
                    {result && <Card style={s.card}>
                        <T variant="label">{t('Provenance', 'Provenance')}</T>
                        <T>{result.provenance.source === 'synthetic' ? t('Jeu de démonstration synthétique', 'Synthetic demo dataset') : t('Événements déclarés', 'Declared events')}{result.provenance.fixture_id ? ` · ${result.provenance.fixture_id}` : ''}</T>
                        <T variant="muted" style={{ fontSize: 13 }}>{t('Calculé le', 'Calculated at')} {result.provenance.as_of}</T>
                    </Card>}
                </ScrollView>
                <T variant="muted" style={{ fontSize: 13 }}>{t('Lire ou acquitter une proposition ne déplace pas d’argent.', 'Reading or acknowledging a proposal does not move money.')}</T>
                <Button variant="secondary" onPress={onClose}>{t('Fermer', 'Close')}</Button>
            </View>
        </View>
    </Modal>;
}

const s = StyleSheet.create({
    scrim: { flex: 1, backgroundColor: '#20271F99', padding: 16, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 580, width: '100%', maxHeight: '92%', padding: 22, gap: 14, borderRadius: 22, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    card: { padding: 17, gap: 12 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    amount: { fontVariant: ['tabular-nums'], fontFamily: tokens.font.medium, textAlign: 'right' },
    rule: { height: 1, backgroundColor: tokens.color.border },
});
