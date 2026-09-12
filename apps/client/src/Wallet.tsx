import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';

// Curated from the checked-in developer evidence records; this is a replay index,
// not a live ledger query or a claim that the current session is connected.
const EXPLORER = 'https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/';
const EVIDENCE = [
    {
        title: 'LoanSet · cycle de prêt',
        hash: '693C846FF98C75E74FDF147E549500101320EDF1A193E95E19592660929B6FE2',
        ledger: '65045',
        result: 'tesSUCCESS',
        source: 'a3-loan-full-cycle.json',
    },
    {
        title: 'LoanPay · remboursement',
        hash: 'EA2B4816AE06E08DA64FD8C6131C0410691951D3350A21A387ED092334A3C1F1',
        ledger: null,
        result: 'tesSUCCESS',
        source: 'a3-loan-full-cycle.json',
    },
    {
        title: 'VaultWithdraw · retrait avec rendement',
        hash: '9522A975D39FA516FACCD8E376E86E02447A83A3744C415B7FB47A9C88EE173B',
        ledger: null,
        result: 'tesSUCCESS',
        source: 'a3-loan-full-cycle.json',
    },
];

export function WalletModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t } = useSession();
    return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={s.scrim}>
            <View style={s.dialog} accessibilityViewIsModal>
                <View style={s.header}>
                    <View style={s.titleRow}>
                        <Icon name="file" color={tokens.color.accent} size={22} />
                        <T variant="title" style={{ fontSize: 23 }}>{t('Centre de preuves XRPL', 'XRPL evidence center')}</T>
                    </View>
                    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Fermer', 'Close')} style={s.close}>
                        <T style={{ color: tokens.color.muted }}>×</T>
                    </Pressable>
                </View>
                <T variant="muted">{t('Replay de transactions déjà validées sur le Custom Devnet. Ces preuves sont historiques et distinctes de la prévision courante.', 'Replay of previously validated Custom Devnet transactions. These are historical proofs, separate from the current forecast.')}</T>
                <Card warm style={s.boundary}>
                    <T variant="label">{t('Lecture seule · aucune connexion wallet', 'Read-only · no wallet connection')}</T>
                    <T style={{ fontSize: 14 }}>{t('Cette interface ne signe et ne soumet rien. Les empreintes ouvrent l’explorateur pour vérification indépendante.', 'This interface does not sign or submit anything. Each hash opens the explorer for independent verification.')}</T>
                </Card>
                <ScrollView contentContainerStyle={{ gap: 10 }}>
                    {EVIDENCE.map(item => <Card key={item.hash} style={s.evidence}>
                        <View style={s.row}>
                            <T variant="label" style={{ flex: 1 }}>{item.title}</T>
                            <T style={s.result}>{item.result}</T>
                        </View>
                        <T variant="muted" style={{ fontSize: 13 }}>{item.ledger
                            ? t(`Ledger validé ${item.ledger}`, `Validated ledger ${item.ledger}`)
                            : t('Transaction validée · index non consigné dans la preuve', 'Validated transaction · ledger index not recorded in evidence')}</T>
                        <T selectable style={s.hash}>{item.hash}</T>
                        <Pressable onPress={() => void Linking.openURL(`${EXPLORER}${item.hash}`)} accessibilityRole="link" accessibilityLabel={t(`Vérifier ${item.title} dans l’explorateur`, `Verify ${item.title} in explorer`)} style={s.link}>
                            <T style={{ color: tokens.color.accent, fontFamily: tokens.font.medium }}>{t('Vérifier sur l’explorateur', 'Verify on explorer')} →</T>
                        </Pressable>
                        <T variant="muted" style={s.source}>{item.source}</T>
                    </Card>)}
                </ScrollView>
                <Button variant="secondary" onPress={onClose}>{t('Fermer', 'Close')}</Button>
            </View>
        </View>
    </Modal>;
}

const s = StyleSheet.create({
    scrim: { flex: 1, backgroundColor: '#20271F99', padding: 16, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 600, width: '100%', maxHeight: '92%', padding: 22, gap: 14, borderRadius: 22, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    boundary: { padding: 16, gap: 6 },
    evidence: { padding: 16, gap: 9 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    result: { color: tokens.color.success, fontFamily: tokens.font.medium, fontSize: 12 },
    hash: { fontFamily: 'monospace', fontSize: 11, lineHeight: 18, color: tokens.color.text },
    link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    source: { fontSize: 11 },
});
