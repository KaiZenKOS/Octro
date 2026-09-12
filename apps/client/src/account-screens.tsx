import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useAuth } from './auth';
import {
  assetSymbol,
  formatAmount,
  formatHumanAmount,
  isNativeXrp,
  NATIVE_ASSET_ID,
  toLedgerAmount,
  useLendingApi,
} from './lending-data';
import type {
  AccountTransaction,
  CreditAssessment,
  KycStatus,
  LendingAsset,
  LendingPositions,
  OdooCompany,
  OdooConnection,
  WalletActivity,
} from './lending-data';

const c = tokens.color;

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <T accessibilityRole="alert" style={{ color: c.error }}>
      {message}
    </T>
  );
}

// Etape 1 — inscription ou connexion (le code de verification n'est jamais
// renvoye par l'API : il n'apparait ici que parce qu'il a ete envoye par
// l'Octro Mailing System a l'adresse saisie).
function SignUpOrLogIn() {
  const { signUp, login } = useAuth();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await signUp(email.trim(), password);
      else await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 480, gap: 16 }}>
      <T variant="title">{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</T>
      <T variant="muted">
        Un wallet XRPL est provisionné automatiquement à l'inscription (keypair seul, non fondé pour l'instant).
      </T>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={!email || password.length < 8} onPress={submit}>
        {mode === 'signup' ? "S'inscrire" : 'Se connecter'}
      </Button>
      <Button variant="ghost" onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
        {mode === 'signup' ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S’inscrire'}
      </Button>
    </Card>
  );
}

function VerifyEmail() {
  const { user, verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await verifyEmail(user.id, code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 480, gap: 16 }}>
      <T variant="title">Vérifiez votre email</T>
      <T variant="muted">Un code à 6 chiffres a été envoyé à {user?.email}. Il expire dans 10 minutes.</T>
      <Field label="Code de vérification" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={code.length !== 6} onPress={submit}>
        Vérifier
      </Button>
      <T variant="muted">Une fois vérifié, reconnectez-vous avec votre mot de passe.</T>
    </Card>
  );
}

// KYC simule (decision actee) : popup bloquant l'acces a tout instrument
// financier tant que le statut n'est pas "valid" — deux boutons simulent la
// decision, aucun vrai fournisseur d'identite n'est appele (Didit reste
// dormant).
function KycGateModal({ onDecided }: { onDecided: (status: KycStatus) => void }) {
  const api = useLendingApi();
  const [busy, setBusy] = useState<'valid' | 'invalid' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = async (result: 'valid' | 'invalid') => {
    setBusy(result);
    setError(null);
    try {
      const status = await api.simulateKyc(result);
      onDecided(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible transparent animationType="none">
      <View style={{ flex: 1, backgroundColor: '#000B', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Card style={{ maxWidth: 480, width: '100%', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="shield" size={22} color={c.text} />
            <T variant="title">Vérification d'identité (KYC)</T>
          </View>
          <T variant="muted">
            Simulation pour le hackathon — aucun vrai fournisseur d'identité n'est appelé. Cette décision détermine
            l'accès aux instruments financiers (dépôt, prêt, retrait).
          </T>
          <ErrorNote message={error} />
          <Button busy={busy === 'valid'} onPress={() => simulate('valid')}>
            Simuler KYC valide
          </Button>
          <Button variant="secondary" busy={busy === 'invalid'} onPress={() => simulate('invalid')}>
            Simuler KYC invalide
          </Button>
        </Card>
      </View>
    </Modal>
  );
}

function OdooConnectForm({ onConnected }: { onConnected: (connection: OdooConnection) => void }) {
  const api = useLendingApi();
  const [odooUrl, setOdooUrl] = useState('');
  const [odooApiKey, setOdooApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const connection = await api.saveOdooConnection(odooUrl.trim(), odooApiKey.trim());
      onConnected(connection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">Connecter votre Odoo</T>
      <T variant="muted">
        Le score de crédit est calculé depuis vos propres données Odoo (Ventes, Facturation, Comptabilité) — un seul
        fournisseur pour l'instant. Votre clé API n'est jamais réaffichée. Odoo on-premise : pas besoin du nom de la
        base de données.
      </T>
      <Field label="URL Odoo" value={odooUrl} onChangeText={setOdooUrl} placeholder="https://mon-entreprise.example.com" autoCapitalize="none" />
      <Field label="Clé API Odoo" value={odooApiKey} onChangeText={setOdooApiKey} secureTextEntry />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={!odooUrl || !odooApiKey} onPress={submit}>
        Connecter
      </Button>
    </Card>
  );
}

// Selecteur d'entreprise : affiche des qu'il y en a plus d'une accessible a
// la cle API (decision actee) — jamais un choix implicite silencieux.
function CompanySelector({
  connection,
  onSelected,
}: {
  connection: OdooConnection;
  onSelected: (companyId: number) => void;
}) {
  const api = useLendingApi();
  const [companies, setCompanies] = useState<OdooCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listOdooCompanies(connection.id)
      .then((list) => {
        setCompanies(list);
        if (list.length <= 1) onSelected(list[0]?.id ?? 0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unexpected error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id]);

  if (error) return <Card style={{ gap: 8 }}><ErrorNote message={error} /></Card>;
  if (!companies || companies.length <= 1) return <T variant="muted">Chargement des entreprises…</T>;

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">Choisir l'entreprise</T>
      <T variant="muted">Plusieurs entreprises sont accessibles à cette clé API Odoo.</T>
      {companies.map((company) => (
        <Button key={company.id} variant="secondary" onPress={() => onSelected(company.id)}>
          {company.name}
        </Button>
      ))}
    </Card>
  );
}

function CreditAssessmentPanel({
  connection,
  companyId,
  assessment,
  onAssessed,
}: {
  connection: OdooConnection;
  companyId: number;
  assessment: CreditAssessment | null;
  onAssessed: (assessment: CreditAssessment) => void;
}) {
  const api = useLendingApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decisionTone = (decision: CreditAssessment['decision']) =>
    decision === 'approve' ? 'success' : decision === 'approve_with_conditions' ? 'warning' : 'error';
  const decisionLabel = (decision: CreditAssessment['decision']) =>
    decision === 'approve' ? 'Approuvé' : decision === 'approve_with_conditions' ? 'Approuvé sous conditions' : 'Refusé';

  const requestAssessment = async () => {
    setBusy(true);
    setError(null);
    try {
      onAssessed(await api.requestCreditAssessment(connection.id, companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">Évaluation de crédit</T>
      <T variant="muted">Odoo connecté : {connection.odoo_url}</T>
      <ErrorNote message={error} />
      <Button busy={busy} onPress={requestAssessment}>
        {assessment ? 'Réévaluer' : "Demander l'évaluation"}
      </Button>
      {assessment && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={decisionTone(assessment.decision)}>Grade {assessment.grade}</Badge>
            <Badge tone={decisionTone(assessment.decision)}>{decisionLabel(assessment.decision)}</Badge>
          </View>
          <T>Score composite : {assessment.composite_score}/100</T>
          <T>
            Ligne de crédit recommandée : {assessment.max_recommended_credit_line.amount_decimal}{' '}
            {assessment.max_recommended_credit_line.asset_id}
          </T>
          <T>
            Durée suggérée : {assessment.term_months} mois · taux indicatif :{' '}
            {assessment.indicative_annual_rate_pct}%
          </T>
          {assessment.risk_notes.map((note, i) => (
            <T key={i} variant="muted">
              • {note}
            </T>
          ))}
        </View>
      )}
    </Card>
  );
}

// Selecteur d'actif (integration xrpl-lending-sim) : n'affiche des boutons
// que s'il existe reellement plus d'un pool amorce — jamais un choix
// factice quand un seul actif (XRP) est disponible.
function AssetSelector({
  assets,
  selected,
  onSelect,
}: {
  assets: LendingAsset[];
  selected: string;
  onSelect: (assetId: string) => void;
}) {
  if (assets.length <= 1) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {assets.map((asset) => (
        <Button
          key={asset.asset_id}
          variant={selected === asset.asset_id ? 'primary' : 'secondary'}
          onPress={() => onSelect(asset.asset_id)}
          style={{ minHeight: 40, paddingVertical: 8, paddingHorizontal: 16 }}
        >
          {assetSymbol(asset.asset_id)}
        </Button>
      ))}
    </View>
  );
}

function depositStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'error' {
  return status === 'confirmed' ? 'success' : status === 'rejected' ? 'error' : 'neutral';
}
function loanStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'error' {
  return status === 'active' ? 'success' : status === 'defaulted' ? 'error' : status === 'repaid' ? 'success' : 'neutral';
}
function withdrawalStatusTone(status: string, fundedFrom: string): 'neutral' | 'success' | 'warning' | 'error' {
  if (status === 'failed') return 'error';
  return fundedFrom === 'vault' ? 'success' : 'warning';
}
function fundedFromLabel(fundedFrom: string): string {
  return fundedFrom === 'vault' ? 'depuis le vault' : fundedFrom === 'buffer' ? 'avancé par le buffer' : 'partiellement avancé';
}

// Vue agregee (depots, prets, retraits) — persiste au refresh via
// GET /v1/lending/positions, plutot que de ne montrer que le dernier
// resultat d'action dans la session courante.
function PositionsSection({ positions }: { positions: LendingPositions | null }) {
  if (!positions) return null;
  const { deposits, loans, withdrawals } = positions;
  if (deposits.length === 0 && loans.length === 0 && withdrawals.length === 0) {
    return <T variant="muted">Aucune position pour l'instant — déposez, empruntez ou retirez ci-dessus.</T>;
  }
  return (
    <View style={{ gap: 16 }}>
      {deposits.length > 0 && (
        <View style={{ gap: 8 }}>
          <T variant="label">Dépôts</T>
          {deposits.map((d) => (
            <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T>{formatAmount(d.asset_id, d.amount_drops)}</T>
              <Badge tone={depositStatusTone(d.status)}>{d.status}</Badge>
            </View>
          ))}
        </View>
      )}
      {loans.length > 0 && (
        <View style={{ gap: 8 }}>
          <T variant="label">Prêts</T>
          {loans.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T>
                {formatAmount(l.asset_id, l.principal_drops)} · {(l.interest_rate_hundred_thousandths / 1000).toFixed(2)}%
              </T>
              <Badge tone={loanStatusTone(l.status)}>{l.status}</Badge>
            </View>
          ))}
        </View>
      )}
      {withdrawals.length > 0 && (
        <View style={{ gap: 8 }}>
          <T variant="label">Retraits</T>
          {withdrawals.map((w) => (
            <View key={w.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T>
                {formatAmount(w.asset_id, w.fulfilled_amount_drops)} / {formatAmount(w.asset_id, w.requested_amount_drops)} demandés
              </T>
              <Badge tone={withdrawalStatusTone(w.status, w.funded_from)}>{fundedFromLabel(w.funded_from)}</Badge>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LendingPanel({ assessment }: { assessment: CreditAssessment | null }) {
  const api = useLendingApi();
  const [assets, setAssets] = useState<LendingAsset[]>([{ asset_id: NATIVE_ASSET_ID, vault_id: '' }]);
  const [asset, setAsset] = useState(NATIVE_ASSET_ID);
  const [positions, setPositions] = useState<LendingPositions | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.listLendingAssets().then((list) => list.length > 0 && setAssets(list)).catch(() => {});
    api.getLendingPositions().then(setPositions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(refresh, [refresh]);

  const canBorrow = assessment && (assessment.decision === 'approve' || assessment.decision === 'approve_with_conditions');

  const run = async (label: string, action: () => Promise<unknown>, onDone: () => void) => {
    setBusy(label);
    setError(null);
    setLastMessage(null);
    try {
      await action();
      onDone();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(null);
    }
  };

  const unit = assetSymbol(asset);

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="coins" size={22} color={c.text} />
        <T variant="title">Lending V1 — vault ouvert partagé</T>
      </View>
      <T variant="muted">
        Dépôts et prêts passent par le vault et le loan broker partagés de l'actif choisi (adaptateur XRPL déjà
        vérifié en réel). Le retrait avance depuis le buffer de liquidité si le vault n'est pas encore liquide.
      </T>

      <AssetSelector assets={assets} selected={asset} onSelect={setAsset} />

      <View style={{ gap: 8 }}>
        <T variant="label">Lender — déposer dans le vault</T>
        <Field
          label={`Montant (${unit})`}
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="decimal-pad"
          placeholder={isNativeXrp(asset) ? '10' : '10.00'}
        />
        <Button
          busy={busy === 'deposit'}
          disabled={!depositAmount}
          onPress={() =>
            run(
              'deposit',
              () => api.deposit(asset, toLedgerAmount(asset, depositAmount)),
              () => {
                setLastMessage(`Dépôt confirmé : ${depositAmount} ${unit}`);
                setDepositAmount('');
              },
            )
          }
        >
          Déposer
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Lender — retirer</T>
        <Field
          label={`Montant (${unit})`}
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          keyboardType="decimal-pad"
          placeholder={isNativeXrp(asset) ? '10' : '10.00'}
        />
        <Button
          busy={busy === 'withdraw'}
          disabled={!withdrawAmount}
          onPress={() =>
            run(
              'withdraw',
              () => api.withdraw(asset, toLedgerAmount(asset, withdrawAmount)),
              () => {
                setLastMessage(`Retrait demandé : ${withdrawAmount} ${unit}`);
                setWithdrawAmount('');
              },
            )
          }
        >
          Retirer
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Borrower — emprunter jusqu'au plafond recommandé</T>
        <Button
          busy={busy === 'loan-request'}
          disabled={!canBorrow}
          onPress={() =>
            run(
              'loan-request',
              () => api.requestLoan(asset),
              () => setLastMessage('Prêt accordé.'),
            )
          }
        >
          Demander un prêt
        </Button>
        {!assessment && <T variant="muted">Demandez d'abord une évaluation de crédit approuvée.</T>}
        {assessment && !canBorrow && <T variant="muted">Votre dernière évaluation de crédit a été refusée.</T>}
      </View>

      <ErrorNote message={error} />
      {lastMessage && <Badge tone="success">{lastMessage}</Badge>}

      <View style={{ height: 1, backgroundColor: c.border }} />
      <T variant="label">Vos positions</T>
      <PositionsSection positions={positions} />
    </Card>
  );
}

function transactionStatusTone(resultCode: string, validated: boolean): 'neutral' | 'success' | 'warning' | 'error' {
  if (!validated) return 'warning';
  return resultCode === 'tesSUCCESS' ? 'success' : 'error';
}
function directionLabel(direction: AccountTransaction['direction']): string {
  return direction === 'incoming' ? 'Reçu' : direction === 'outgoing' ? 'Envoyé' : 'Interne';
}
function formatOccurredAt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Une ligne = une transaction on-chain reelle (pas seulement une action
// applicative deja loguee) — ouvre l'explorateur XRPL au tap.
function TransactionRow({ tx }: { tx: AccountTransaction }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(tx.explorer_url)}
      accessibilityRole="link"
      accessibilityLabel={`${directionLabel(tx.direction)} · ${tx.tx_type} · voir sur l'explorateur`}
      style={({ pressed }) => [
        { gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
        pressed && { opacity: 0.65 },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={tx.direction === 'incoming' ? 'success' : 'neutral'}>{directionLabel(tx.direction)}</Badge>
          <T variant="label">{tx.tx_type}</T>
        </View>
        <Badge tone={transactionStatusTone(tx.result_code, tx.validated)}>{tx.result_code}</Badge>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <T variant="muted" style={{ fontSize: 13 }}>
          {formatOccurredAt(tx.occurred_at)}
          {tx.counterparty ? ` · ${tx.direction === 'incoming' ? 'de' : 'vers'} ${tx.counterparty}` : ''}
        </T>
        {tx.delivered_amount && <T>{formatHumanAmount(tx.delivered_amount.asset_id, tx.delivered_amount.value)}</T>}
      </View>
    </Pressable>
  );
}

// Section "compte" (correction UX explicite) : adresse complete (jamais
// tronquee), soldes reels par actif, historique de transactions on-chain —
// remplace l'ancien badge d'adresse abregee qui ne montrait rien d'autre.
function WalletOverview() {
  const api = useLendingApi();
  const [activity, setActivity] = useState<WalletActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .getWalletActivity()
      .then((a) => {
        setActivity(a);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unexpected error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="wallet" size={22} color={c.text} />
          <T variant="title">Votre wallet XRPL</T>
        </View>
        <Button busy={loading} variant="ghost" onPress={refresh} style={{ minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 }}>
          Actualiser
        </Button>
      </View>

      <ErrorNote message={error} />
      {!activity && loading && <T variant="muted">Chargement du solde et de l'historique…</T>}

      {activity && (
        <>
          <View style={{ gap: 4 }}>
            <T variant="label">Adresse</T>
            <T selectable style={{ fontSize: 15 }}>
              {activity.address}
            </T>
            <T variant="muted" style={{ fontSize: 12 }}>
              {activity.network}
            </T>
          </View>

          <View style={{ gap: 8 }}>
            <T variant="label">Solde</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {activity.balances.length === 0 ? (
                <T variant="muted">Compte pas encore financé sur le ledger.</T>
              ) : (
                activity.balances.map((b) => <Badge key={b.asset_id}>{formatHumanAmount(b.asset_id, b.value)}</Badge>)
              )}
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <T variant="label">Transactions récentes</T>
            {activity.transactions.length === 0 ? (
              <T variant="muted">Aucune transaction sur ce compte pour l'instant.</T>
            ) : (
              <View>
                {activity.transactions.map((tx) => (
                  <TransactionRow key={tx.tx_hash} tx={tx} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </Card>
  );
}

// Ecran compose (Phase G) : compte reel -> KYC simule -> Odoo BYO -> credit
// -> lending. Distinct des ecrans de fixture Lina (src/screens.tsx),
// composes a cote via une route separee (app/account.tsx), sans passer par
// le commutateur d'etats de demo existant (SessionProvider).
export function AccountScreen() {
  const { user, token, ready, logout } = useAuth();
  const api = useLendingApi();
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [odooConnection, setOdooConnection] = useState<OdooConnection | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<CreditAssessment | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getKycStatus()
      .then(setKyc)
      .catch(() => setKyc({ status: 'not_started', simulated: true, decided_at: null }));
    api
      .getLatestCreditAssessment()
      .then(setAssessment)
      .catch(() => setAssessment(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!ready) return <T>Chargement…</T>;
  if (!user) return <SignUpOrLogIn />;
  if (!user.email_verified_at) return <VerifyEmail />;
  if (!token) return <SignUpOrLogIn />;
  if (!kyc) return <T>Chargement…</T>;

  return (
    <View style={{ gap: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <T variant="title">Bonjour, {user.email}</T>
        <Button variant="ghost" onPress={logout} style={{ minHeight: 40, paddingVertical: 8, paddingHorizontal: 12 }}>
          Se déconnecter
        </Button>
      </View>
      <WalletOverview />
      {kyc.status !== 'valid' && (
        <KycGateModal
          onDecided={(status) => {
            setKyc(status);
          }}
        />
      )}
      {kyc.status === 'invalid' && (
        <Card style={{ gap: 8 }}>
          <T style={{ color: c.error }}>KYC simulé invalide : aucun instrument financier accessible.</T>
        </Card>
      )}
      {kyc.status === 'valid' && (
        <>
          <Badge tone="success">KYC simulé : valide</Badge>
          {!odooConnection ? (
            <OdooConnectForm onConnected={setOdooConnection} />
          ) : companyId === null ? (
            <CompanySelector connection={odooConnection} onSelected={setCompanyId} />
          ) : (
            <CreditAssessmentPanel connection={odooConnection} companyId={companyId} assessment={assessment} onAssessed={setAssessment} />
          )}
          <LendingPanel assessment={assessment} />
        </>
      )}
    </View>
  );
}
