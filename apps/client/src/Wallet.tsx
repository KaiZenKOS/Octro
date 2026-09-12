import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';

export interface WalletState {
    connected: boolean;
    address: string | null;
    network: 'xrpl-devnet' | 'xrpl-testnet';
    balanceXrp: string;
    lastTxHash: string | null;
    status: 'idle' | 'signing' | 'confirmed' | 'rejected';
}

const DEMO_WALLET: WalletState = {
    connected: true,
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    network: 'xrpl-devnet',
    balanceXrp: '1000.00',
    lastTxHash: '693C846FE2B91A4E5C0D72FA84B592E86D82F5A3719C6FE2',
    status: 'confirmed',
};

export function WalletModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t } = useSession();
    const [wallet, setWallet] = useState<WalletState>({
        connected: false,
        address: null,
        network: 'xrpl-devnet',
        balanceXrp: '0',
        lastTxHash: null,
        status: 'idle',
    });

    const handleConnect = () => {
        setWallet(DEMO_WALLET);
    };

    const handleDisconnect = () => {
        setWallet({
            connected: false,
            address: null,
            network: 'xrpl-devnet',
            balanceXrp: '0',
            lastTxHash: null,
            status: 'idle',
        });
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={s.scrim}>
                <View style={s.dialog} accessibilityViewIsModal>
                    <View style={{ gap: 20 }}>
                        <View style={s.header}>
                            <View style={s.titleRow}>
                                <Icon name="shield" color={tokens.color.accent} size={24} />
                                <T variant="title" style={{ fontSize: 24 }}>{t('Portefeuille XRPL', 'XRPL Wallet')}</T>
                            </View>
                            <Pressable onPress={onClose} accessibilityRole="button">
                                <T style={{ color: tokens.color.muted }}>✕</T>
                            </Pressable>
                        </View>

                        {wallet.connected ? (
                            <Card warm style={{ gap: 14 }}>
                                <View style={s.between}>
                                    <T variant="muted">{t('Réseau', 'Network')}</T>
                                    <View style={s.tag}><T style={s.tagText}>XRPL Devnet (XLS-65/66)</T></View>
                                </View>
                                <View style={s.between}>
                                    <T variant="muted">{t('Compte signataire', 'Signer account')}</T>
                                    <T style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                        {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
                                    </T>
                                </View>
                                <View style={s.between}>
                                    <T variant="muted">{t('Solde disponible', 'Available balance')}</T>
                                    <T style={{ fontFamily: tokens.font.medium, color: tokens.color.success }}>
                                        {wallet.balanceXrp} XRP
                                    </T>
                                </View>
                                {wallet.lastTxHash && (
                                    <View style={s.hashBox}>
                                        <T variant="muted" style={{ fontSize: 11 }}>{t('Dernière preuve ledger validée', 'Last validated ledger proof')}</T>
                                        <T style={{ fontFamily: 'monospace', fontSize: 11, color: tokens.color.accent }}>
                                            {wallet.lastTxHash.slice(0, 18)}... (tesSUCCESS)
                                        </T>
                                    </View>
                                )}
                                <Button variant="secondary" onPress={handleDisconnect}>
                                    {t('Déconnecter le wallet', 'Disconnect wallet')}
                                </Button>
                            </Card>
                        ) : (
                            <Card style={{ gap: 16 }}>
                                <T>
                                    {t(
                                        'Connectez votre compte pour signer les facilités de trésorerie (LoanSet) et les remboursements (LoanPay) sur le ledger XRPL.',
                                        'Connect your account to sign liquidity facilities (LoanSet) and repayments (LoanPay) on the XRPL ledger.'
                                    )}
                                </T>
                                <Button onPress={handleConnect}>
                                    {t('Connecter compte de test XRPL', 'Connect XRPL test account')}
                                </Button>
                                <T variant="muted" style={{ fontSize: 12 }}>
                                    {t(
                                        'Non-custodial : les clés privées restent dans votre wallet. Les agents n’ont aucun droit de signature.',
                                        'Non-custodial: private keys remain in your wallet. Agents have no signing permissions.'
                                    )}
                                </T>
                            </Card>
                        )}

                        <Button variant="ghost" onPress={onClose}>{t('Fermer', 'Close')}</Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    scrim: { flex: 1, backgroundColor: '#000B', padding: 24, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 480, width: '100%', padding: 24, borderRadius: 28, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tag: { backgroundColor: tokens.color.raised, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    tagText: { fontSize: 11, color: tokens.color.accent, fontFamily: tokens.font.medium },
    hashBox: { backgroundColor: '#17141B', padding: 12, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: '#30282E' },
});
