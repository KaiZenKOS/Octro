import React, { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';

export interface WalletState {
    connected: boolean;
    address: string | null;
    accountRole: 'borrower' | 'broker_owner';
    network: 'xrpl-devnet';
    balanceXrp: string;
    lastTxHash: string | null;
    lastTxType: string | null;
    explorerUrl: string | null;
    status: 'idle' | 'signing' | 'confirmed' | 'rejected';
    activeLoanId: string | null;
    message: string | null;
}

const ACCOUNTS = {
    borrower: {
        address: 'rnLPWf6dExshk3hdecASNaj5P3yqekCtfJ',
        label: 'Emprunteur Entreprise (rnLPWf...)',
        balance: '1009.99',
    },
    broker_owner: {
        address: 'r3nYksFboCmVM6UGnM7y5Q1hhEiVay25g5',
        label: 'Courtier / Broker Owner (r3nYks...)',
        balance: '988.00',
    },
};

const EXPLORER_PREFIX = 'https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/';

export function WalletModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t } = useSession();
    const [wallet, setWallet] = useState<WalletState>({
        connected: false,
        address: null,
        accountRole: 'borrower',
        network: 'xrpl-devnet',
        balanceXrp: '0',
        lastTxHash: null,
        lastTxType: null,
        explorerUrl: null,
        status: 'idle',
        activeLoanId: null,
        message: null,
    });

    const handleConnect = () => {
        setWallet({
            connected: true,
            address: ACCOUNTS.borrower.address,
            accountRole: 'borrower',
            network: 'xrpl-devnet',
            balanceXrp: ACCOUNTS.borrower.balance,
            lastTxHash: null,
            lastTxType: null,
            explorerUrl: null,
            status: 'idle',
            activeLoanId: null,
            message: t('Compte de test connecté avec succès.', 'Test account connected successfully.'),
        });
    };

    const handleSwitchAccount = (role: 'borrower' | 'broker_owner') => {
        setWallet(prev => ({
            ...prev,
            accountRole: role,
            address: ACCOUNTS[role].address,
            balanceXrp: ACCOUNTS[role].balance,
            message: role === 'borrower' 
                ? t('Basculé sur le compte Emprunteur (rnLPWf...)', 'Switched to Borrower account (rnLPWf...)')
                : t('Basculé sur le compte Courtier (r3nYks...)', 'Switched to Broker Owner account (r3nYks...)'),
        }));
    };

    const handleSignLoanSet = () => {
        setWallet(prev => ({ ...prev, status: 'signing', message: t('Signature coordonnée en cours (Borrower + Broker)...', 'Coordinated signing in progress (Borrower + Broker)...') }));
        setTimeout(() => {
            const hash = '693C846FF98C75E74FDF147E549500101320EDF1A193E95E19592660929B6FE2';
            setWallet(prev => ({
                ...prev,
                status: 'confirmed',
                lastTxHash: hash,
                lastTxType: 'LoanSet',
                activeLoanId: '347DB57FDC13B2B9A9173214DEDC2B5EB2731E68164F5BB321A3E773C0036B35',
                balanceXrp: '1019.99',
                explorerUrl: `${EXPLORER_PREFIX}${hash}`,
                message: t('Prêt accepté (LoanSet validé tesSUCCESS sur ledger 65045). Fonds décaissés (+10 XRP).', 'Loan accepted (LoanSet validated tesSUCCESS on ledger 65045). Funds disbursed (+10 XRP).'),
            }));
        }, 1200);
    };

    const handleSignLoanPay = () => {
        setWallet(prev => ({ ...prev, status: 'signing', message: t('Remboursement in fine en cours (LoanPay)...', 'Bullet repayment in progress (LoanPay)...') }));
        setTimeout(() => {
            const hash = 'EA2B4816AE06E08DA64FD8C6131C0410691951D3350A21A387ED092334A3C1F1';
            setWallet(prev => ({
                ...prev,
                status: 'confirmed',
                lastTxHash: hash,
                lastTxType: 'LoanPay',
                activeLoanId: null,
                balanceXrp: '1009.99',
                explorerUrl: `${EXPLORER_PREFIX}${hash}`,
                message: t('Prêt remboursé avec succès (LoanPay validé tesSUCCESS). Ligne clôturée.', 'Loan repaid successfully (LoanPay validated tesSUCCESS). Facility closed.'),
            }));
        }, 1200);
    };

    const handleRejectSignature = () => {
        setWallet(prev => ({
            ...prev,
            status: 'rejected',
            message: t('Signature refusée par l’utilisateur (ou temBAD_SIGNER simulé). Aucun fonds déplacé.', 'Signature rejected by user (or temBAD_SIGNER simulated). No funds moved.'),
        }));
    };

    const handleDisconnect = () => {
        setWallet({
            connected: false,
            address: null,
            accountRole: 'borrower',
            network: 'xrpl-devnet',
            balanceXrp: '0',
            lastTxHash: null,
            lastTxType: null,
            explorerUrl: null,
            status: 'idle',
            activeLoanId: null,
            message: null,
        });
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={s.scrim}>
                <View style={s.dialog} accessibilityViewIsModal>
                    <View style={{ gap: 16 }}>
                        <View style={s.header}>
                            <View style={s.titleRow}>
                                <Icon name="shield" color={tokens.color.accent} size={24} />
                                <T variant="title" style={{ fontSize: 22 }}>{t('Portefeuille XRPL Devnet', 'XRPL Devnet Wallet')}</T>
                            </View>
                            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer la modale wallet">
                                <T style={{ color: tokens.color.muted, fontSize: 18, padding: 4 }}>✕</T>
                            </Pressable>
                        </View>

                        {wallet.connected ? (
                            <Card warm style={{ gap: 12 }}>
                                <View style={s.between}>
                                    <T variant="muted">{t('Réseau', 'Network')}</T>
                                    <View style={s.tag}><T style={s.tagText}>Custom Devnet (XLS-65 / XLS-66)</T></View>
                                </View>

                                <View style={s.between}>
                                    <T variant="muted">{t('Compte actif', 'Active account')}</T>
                                    <T style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                        {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}
                                    </T>
                                </View>

                                <View style={s.between}>
                                    <T variant="muted">{t('Solde disponible', 'Available balance')}</T>
                                    <T style={{ fontFamily: tokens.font.medium, color: tokens.color.success, fontSize: 16 }}>
                                        {wallet.balanceXrp} XRP
                                    </T>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                    <Button
                                        variant={wallet.accountRole === 'borrower' ? 'primary' : 'secondary'}
                                        onPress={() => handleSwitchAccount('borrower')}
                                    >
                                        {t('Emprunteur', 'Borrower')}
                                    </Button>
                                    <Button
                                        variant={wallet.accountRole === 'broker_owner' ? 'primary' : 'secondary'}
                                        onPress={() => handleSwitchAccount('broker_owner')}
                                    >
                                        {t('Courtier / Owner', 'Broker / Owner')}
                                    </Button>
                                </View>

                                {wallet.message && (
                                    <View style={[s.notice, wallet.status === 'rejected' ? { borderColor: tokens.color.error } : {}]}>
                                        <T style={{ fontSize: 12, color: wallet.status === 'rejected' ? tokens.color.error : tokens.color.text }}>
                                            {wallet.message}
                                        </T>
                                    </View>
                                )}

                                <View style={{ gap: 8, marginTop: 6 }}>
                                    <T style={{ fontFamily: tokens.font.medium, fontSize: 13 }}>
                                        {t('Opérations ledger sur la facilité XLS-66', 'Ledger operations on XLS-66 facility')}
                                    </T>
                                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                        <Button
                                            busy={wallet.status === 'signing' && wallet.lastTxType !== 'LoanPay'}
                                            onPress={handleSignLoanSet}
                                        >
                                            {t('Signer LoanSet (Tirage 10 XRP)', 'Sign LoanSet (Draw 10 XRP)')}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            busy={wallet.status === 'signing' && wallet.lastTxType === 'LoanPay'}
                                            onPress={handleSignLoanPay}
                                        >
                                            {t('Signer LoanPay (Remboursement)', 'Sign LoanPay (Repayment)')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onPress={handleRejectSignature}
                                        >
                                            {t('Refuser signature', 'Reject signature')}
                                        </Button>
                                    </View>
                                </View>

                                {wallet.lastTxHash && (
                                    <View style={s.hashBox}>
                                        <View style={s.between}>
                                            <T variant="muted" style={{ fontSize: 11 }}>
                                                {t('Preuve ledger validée (tesSUCCESS)', 'Validated ledger proof (tesSUCCESS)')}
                                            </T>
                                            <T style={{ fontSize: 11, color: tokens.color.success, fontFamily: tokens.font.medium }}>
                                                {wallet.lastTxType}
                                            </T>
                                        </View>
                                        <T style={{ fontFamily: 'monospace', fontSize: 10, color: tokens.color.accent }}>
                                            {wallet.lastTxHash}
                                        </T>
                                        {wallet.explorerUrl && (
                                            <Pressable
                                                onPress={() => Linking.openURL(wallet.explorerUrl!)}
                                                accessibilityRole="link"
                                                accessibilityLabel="Voir la transaction sur l'explorateur XRPL Devnet"
                                            >
                                                <T style={{ fontSize: 11, color: tokens.color.accent, textDecorationLine: 'underline', marginTop: 4 }}>
                                                    {t('↗ Voir sur l’explorateur custom devnet', '↗ View on custom devnet explorer')}
                                                </T>
                                            </Pressable>
                                        )}
                                    </View>
                                )}

                                <Button variant="secondary" onPress={handleDisconnect}>
                                    {t('Déconnecter le wallet', 'Disconnect wallet')}
                                </Button>
                            </Card>
                        ) : (
                            <Card style={{ gap: 14 }}>
                                <T>
                                    {t(
                                        'Connectez votre compte pour signer les facilités de trésorerie (LoanSet) et les remboursements (LoanPay) sur le ledger XRPL.',
                                        'Connect your account to sign liquidity facilities (LoanSet) and repayments (LoanPay) on the XRPL ledger.'
                                    )}
                                </T>
                                <Button onPress={handleConnect}>
                                    {t('Connecter compte de test XRPL', 'Connect XRPL test account')}
                                </Button>
                                <View style={s.notice}>
                                    <T style={{ fontSize: 12, color: tokens.color.muted }}>
                                        {t(
                                            '🔒 Non-custodial : vos clés privées restent dans votre wallet. Aucun agent ni LLM ne possède de droit de signature.',
                                            '🔒 Non-custodial: private keys stay in your wallet. No agent or LLM has signing permissions.'
                                        )}
                                    </T>
                                </View>
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
    scrim: { flex: 1, backgroundColor: '#000C', padding: 20, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 520, width: '100%', padding: 24, borderRadius: 28, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tag: { backgroundColor: tokens.color.raised, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    tagText: { fontSize: 11, color: tokens.color.accent, fontFamily: tokens.font.medium },
    hashBox: { backgroundColor: '#17141B', padding: 12, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: '#30282E' },
    notice: { backgroundColor: '#252028', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#3E3440' },
});
