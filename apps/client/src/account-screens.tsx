import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Linking, Modal, Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useAuth } from './auth';
import { useSession } from './session';
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
  LoanOutstanding,
  LoanPosition,
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
  const { t } = useSession();
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
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 480, gap: 16 }}>
      <T variant="title">{mode === 'signup' ? t('Créer un compte', 'Create an account') : t('Se connecter', 'Log in')}</T>
      <T variant="muted">
        {t(
          "Un wallet XRPL est provisionné automatiquement à l'inscription (keypair seul, non fondé pour l'instant).",
          'An XRPL wallet is provisioned automatically at sign-up (keypair only, not funded yet).',
        )}
      </T>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label={t('Mot de passe', 'Password')} value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={!email || password.length < 8} onPress={submit}>
        {mode === 'signup' ? t("S'inscrire", 'Sign up') : t('Se connecter', 'Log in')}
      </Button>
      <Button variant="ghost" onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
        {mode === 'signup'
          ? t('Déjà un compte ? Se connecter', 'Already have an account? Log in')
          : t("Pas encore de compte ? S'inscrire", "Don't have an account yet? Sign up")}
      </Button>
    </Card>
  );
}

function VerifyEmail() {
  const { t } = useSession();
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
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ maxWidth: 480, gap: 16 }}>
      <T variant="title">{t('Vérifiez votre email', 'Verify your email')}</T>
      <T variant="muted">
        {t(
          `Un code à 6 chiffres a été envoyé à ${user?.email}. Il expire dans 10 minutes.`,
          `A 6-digit code was sent to ${user?.email}. It expires in 10 minutes.`,
        )}
      </T>
      <Field
        label={t('Code de vérification', 'Verification code')}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={code.length !== 6} onPress={submit}>
        {t('Vérifier', 'Verify')}
      </Button>
      <T variant="muted">{t('Une fois vérifié, reconnectez-vous avec votre mot de passe.', 'Once verified, log back in with your password.')}</T>
    </Card>
  );
}

// KYC simule (decision actee) : popup bloquant l'acces a tout instrument
// financier tant que le statut n'est pas "valid" — deux boutons simulent la
// decision, aucun vrai fournisseur d'identite n'est appele (Didit reste
// dormant).
function KycGateModal({ onDecided }: { onDecided: (status: KycStatus) => void }) {
  const { t } = useSession();
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
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
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
            <T variant="title">{t("Vérification d'identité (KYC)", 'Identity verification (KYC)')}</T>
          </View>
          <T variant="muted">
            {t(
              "Simulation pour le hackathon — aucun vrai fournisseur d'identité n'est appelé. Cette décision détermine l'accès aux instruments financiers (dépôt, prêt, retrait).",
              'Simulation for the hackathon — no real identity provider is called. This decision determines access to financial instruments (deposit, loan, withdrawal).',
            )}
          </T>
          <ErrorNote message={error} />
          <Button busy={busy === 'valid'} onPress={() => simulate('valid')}>
            {t('Simuler KYC valide', 'Simulate valid KYC')}
          </Button>
          <Button variant="secondary" busy={busy === 'invalid'} onPress={() => simulate('invalid')}>
            {t('Simuler KYC invalide', 'Simulate invalid KYC')}
          </Button>
        </Card>
      </View>
    </Modal>
  );
}

function OdooConnectForm({ onConnected }: { onConnected: (connection: OdooConnection) => void }) {
  const { t } = useSession();
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
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">{t('Connecter votre Odoo', 'Connect your Odoo')}</T>
      <T variant="muted">
        {t(
          "Le score de crédit est calculé depuis vos propres données Odoo (Ventes, Facturation, Comptabilité) — un seul fournisseur pour l'instant. Votre clé API n'est jamais réaffichée. Odoo on-premise : pas besoin du nom de la base de données.",
          "Your credit score is computed from your own Odoo data (Sales, Invoicing, Accounting) — only one provider for now. Your API key is never shown again. On-premise Odoo: no database name needed.",
        )}
      </T>
      <Field
        label={t('URL Odoo', 'Odoo URL')}
        value={odooUrl}
        onChangeText={setOdooUrl}
        placeholder="https://my-company.example.com"
        autoCapitalize="none"
      />
      <Field label={t('Clé API Odoo', 'Odoo API key')} value={odooApiKey} onChangeText={setOdooApiKey} secureTextEntry />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={!odooUrl || !odooApiKey} onPress={submit}>
        {t('Connecter', 'Connect')}
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
  const { t } = useSession();
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
      .catch((err) => setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id]);

  if (error) return <Card style={{ gap: 8 }}><ErrorNote message={error} /></Card>;
  if (!companies || companies.length <= 1) return <T variant="muted">{t('Chargement des entreprises…', 'Loading companies…')}</T>;

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">{t("Choisir l'entreprise", 'Choose the company')}</T>
      <T variant="muted">{t('Plusieurs entreprises sont accessibles à cette clé API Odoo.', 'Multiple companies are accessible with this Odoo API key.')}</T>
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
  const { t } = useSession();
  const api = useLendingApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decisionTone = (decision: CreditAssessment['decision']) =>
    decision === 'approve' ? 'success' : decision === 'approve_with_conditions' ? 'warning' : 'error';
  const decisionLabel = (decision: CreditAssessment['decision']) =>
    decision === 'approve'
      ? t('Approuvé', 'Approved')
      : decision === 'approve_with_conditions'
        ? t('Approuvé sous conditions', 'Approved with conditions')
        : t('Refusé', 'Declined');

  const requestAssessment = async () => {
    setBusy(true);
    setError(null);
    try {
      onAssessed(await api.requestCreditAssessment(connection.id, companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">{t('Évaluation de crédit', 'Credit assessment')}</T>
      <T variant="muted">{t(`Odoo connecté : ${connection.odoo_url}`, `Odoo connected: ${connection.odoo_url}`)}</T>
      <ErrorNote message={error} />
      <Button busy={busy} onPress={requestAssessment}>
        {assessment ? t('Réévaluer', 'Reassess') : t("Demander l'évaluation", 'Request assessment')}
      </Button>
      {assessment && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={decisionTone(assessment.decision)}>{t(`Grade ${assessment.grade}`, `Grade ${assessment.grade}`)}</Badge>
            <Badge tone={decisionTone(assessment.decision)}>{decisionLabel(assessment.decision)}</Badge>
          </View>
          <T>{t(`Score composite : ${assessment.composite_score}/100`, `Composite score: ${assessment.composite_score}/100`)}</T>
          <T>
            {t(
              `Ligne de crédit recommandée : ${assessment.max_recommended_credit_line.amount_decimal} ${assessment.max_recommended_credit_line.asset_id}`,
              `Recommended credit line: ${assessment.max_recommended_credit_line.amount_decimal} ${assessment.max_recommended_credit_line.asset_id}`,
            )}
          </T>
          <T>
            {t(
              `Durée suggérée : ${assessment.term_months} mois · taux indicatif : ${assessment.indicative_annual_rate_pct}%`,
              `Suggested term: ${assessment.term_months} months · indicative rate: ${assessment.indicative_annual_rate_pct}%`,
            )}
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

function creditDecisionTone(decision: CreditAssessment['decision']): 'success' | 'warning' | 'error' {
  return decision === 'approve' ? 'success' : decision === 'approve_with_conditions' ? 'warning' : 'error';
}
function creditDecisionLabel(t: (fr: string, en: string) => string, decision: CreditAssessment['decision']): string {
  return decision === 'approve'
    ? t('Approuvé', 'Approved')
    : decision === 'approve_with_conditions'
      ? t('Approuvé sous conditions', 'Approved with conditions')
      : t('Refusé', 'Declined');
}

// Une fois une evaluation obtenue, le bloc de connexion Odoo se reduit a un
// resume compact (decision explicite : il n'a plus de raison d'occuper
// toute la page une fois le score valide) — "Réévaluer" le rouvre sans
// perdre la connexion Odoo deja etablie.
function CreditSetupSection({
  assessment,
  onAssessed,
}: {
  assessment: CreditAssessment | null;
  onAssessed: (assessment: CreditAssessment) => void;
}) {
  const { t } = useSession();
  const [odooConnection, setOdooConnection] = useState<OdooConnection | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(!assessment);

  if (!expanded && assessment) {
    return (
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone={creditDecisionTone(assessment.decision)}>{t(`Grade ${assessment.grade}`, `Grade ${assessment.grade}`)}</Badge>
            <Badge tone={creditDecisionTone(assessment.decision)}>{creditDecisionLabel(t, assessment.decision)}</Badge>
            <T variant="muted">
              {t(
                `Plafond : ${assessment.max_recommended_credit_line.amount_decimal} ${assessment.max_recommended_credit_line.asset_id} sur ${assessment.term_months} mois max`,
                `Cap: ${assessment.max_recommended_credit_line.amount_decimal} ${assessment.max_recommended_credit_line.asset_id} over ${assessment.term_months} months max`,
              )}
            </T>
          </View>
          <Button variant="ghost" onPress={() => setExpanded(true)} style={{ minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 }}>
            {t('Réévaluer', 'Reassess')}
          </Button>
        </View>
      </Card>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {!odooConnection ? (
        <OdooConnectForm onConnected={setOdooConnection} />
      ) : companyId === null ? (
        <CompanySelector connection={odooConnection} onSelected={setCompanyId} />
      ) : (
        <>
          <CreditAssessmentPanel
            connection={odooConnection}
            companyId={companyId}
            assessment={assessment}
            onAssessed={(a) => {
              onAssessed(a);
              setExpanded(false);
            }}
          />
          <Button
            variant="ghost"
            onPress={() => {
              setOdooConnection(null);
              setCompanyId(null);
            }}
          >
            {t('Changer de connexion Odoo', 'Change Odoo connection')}
          </Button>
        </>
      )}
      {assessment && (
        <Button variant="ghost" onPress={() => setExpanded(false)}>
          {t('Annuler', 'Cancel')}
        </Button>
      )}
    </View>
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
function fundedFromLabel(t: (fr: string, en: string) => string, fundedFrom: string): string {
  return fundedFrom === 'vault'
    ? t('depuis le vault', 'from the vault')
    : fundedFrom === 'buffer'
      ? t('avancé par le buffer', 'advanced by the buffer')
      : t('partiellement avancé', 'partially advanced');
}

// Vue agregee (depots, prets, retraits) — persiste au refresh via
// GET /v1/lending/positions, plutot que de ne montrer que le dernier
// resultat d'action dans la session courante.
function PositionsSection({ positions }: { positions: LendingPositions | null }) {
  const { t } = useSession();
  if (!positions) return null;
  const { deposits, loans, withdrawals } = positions;
  if (deposits.length === 0 && loans.length === 0 && withdrawals.length === 0) {
    return (
      <T variant="muted">
        {t("Aucune position pour l'instant — déposez, empruntez ou retirez ci-dessus.", 'No positions yet — deposit, borrow, or withdraw above.')}
      </T>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      {deposits.length > 0 && (
        <View style={{ gap: 8 }}>
          <T variant="label">{t('Dépôts', 'Deposits')}</T>
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
          <T variant="label">{t('Prêts', 'Loans')}</T>
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
          <T variant="label">{t('Retraits', 'Withdrawals')}</T>
          {withdrawals.map((w) => (
            <View key={w.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T>
                {t(
                  `${formatAmount(w.asset_id, w.fulfilled_amount_drops)} / ${formatAmount(w.asset_id, w.requested_amount_drops)} demandés`,
                  `${formatAmount(w.asset_id, w.fulfilled_amount_drops)} / ${formatAmount(w.asset_id, w.requested_amount_drops)} requested`,
                )}
              </T>
              <Badge tone={withdrawalStatusTone(w.status, w.funded_from)}>{fundedFromLabel(t, w.funded_from)}</Badge>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Une ligne = un pret actif du borrower. Le montant a rembourser n'est
// jamais saisi : c'est TotalValueOutstanding, qui accroit continuement
// avec les interets — on le relit a la demande, jamais calcule cote
// client, puis on rembourse ce montant exact (le seul qui fonctionne pour
// clore le pret, voir packages/xrpl/src/lending-v1.ts).
function LoanRepayRow({ loan, onRepaid }: { loan: LoanPosition; onRepaid: () => void }) {
  const { t, language } = useSession();
  const api = useLendingApi();
  const [outstanding, setOutstanding] = useState<LoanOutstanding | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOutstanding = () => {
    setLoading(true);
    setError(null);
    api
      .getLoanOutstanding(loan.id)
      .then(setOutstanding)
      .catch((err) => setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error')))
      .finally(() => setLoading(false));
  };

  const repay = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.repay(loan.id);
      onRepaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <T>{t(`${formatAmount(loan.asset_id, loan.principal_drops)} emprunté`, `${formatAmount(loan.asset_id, loan.principal_drops)} borrowed`)}</T>
        <Badge tone="success">{t('actif', 'active')}</Badge>
      </View>
      {!outstanding ? (
        <Button variant="secondary" busy={loading} onPress={fetchOutstanding} style={{ minHeight: 40 }}>
          {t('Voir le montant dû', 'View amount due')}
        </Button>
      ) : (
        <>
          <T variant="muted">
            {t(
              `Montant dû : ${formatAmount(loan.asset_id, outstanding.total_value_outstanding)}`,
              `Amount due: ${formatAmount(loan.asset_id, outstanding.total_value_outstanding)}`,
            )}
            {outstanding.next_payment_due_date
              ? t(
                  ` · échéance ${new Date(outstanding.next_payment_due_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}`,
                  ` · due ${new Date(outstanding.next_payment_due_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}`,
                )
              : ''}
          </T>
          <Button busy={busy} onPress={repay}>
            {t(
              `Rembourser ${formatAmount(loan.asset_id, outstanding.total_value_outstanding)}`,
              `Repay ${formatAmount(loan.asset_id, outstanding.total_value_outstanding)}`,
            )}
          </Button>
        </>
      )}
      <ErrorNote message={error} />
    </View>
  );
}

function LendingPanel({ assessment }: { assessment: CreditAssessment | null }) {
  const { t } = useSession();
  const api = useLendingApi();
  const [assets, setAssets] = useState<LendingAsset[]>([{ asset_id: NATIVE_ASSET_ID, vault_id: '' }]);
  const [asset, setAsset] = useState(NATIVE_ASSET_ID);
  const [positions, setPositions] = useState<LendingPositions | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowMonths, setBorrowMonths] = useState('');
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
      setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error'));
    } finally {
      setBusy(null);
    }
  };

  const unit = assetSymbol(asset);

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="coins" size={22} color={c.text} />
        <T variant="title">{t('Lending V1 — vault ouvert partagé', 'Lending V1 — shared open vault')}</T>
      </View>
      <T variant="muted">
        {t(
          "Dépôts et prêts passent par le vault et le loan broker partagés de l'actif choisi (adaptateur XRPL déjà vérifié en réel). Le retrait avance depuis le buffer de liquidité si le vault n'est pas encore liquide.",
          "Deposits and loans go through the shared vault and loan broker for the chosen asset (XRPL adapter already verified live). Withdrawals advance from the liquidity buffer if the vault isn't liquid yet.",
        )}
      </T>

      <AssetSelector assets={assets} selected={asset} onSelect={setAsset} />

      <View style={{ gap: 8 }}>
        <T variant="label">{t('Lender — déposer dans le vault', 'Lender — deposit into the vault')}</T>
        <Field
          label={t(`Montant (${unit})`, `Amount (${unit})`)}
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
                setLastMessage(t(`Dépôt confirmé : ${depositAmount} ${unit}`, `Deposit confirmed: ${depositAmount} ${unit}`));
                setDepositAmount('');
              },
            )
          }
        >
          {t('Déposer', 'Deposit')}
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">{t('Lender — retirer', 'Lender — withdraw')}</T>
        <Field
          label={t(`Montant (${unit})`, `Amount (${unit})`)}
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
                setLastMessage(t(`Retrait demandé : ${withdrawAmount} ${unit}`, `Withdrawal requested: ${withdrawAmount} ${unit}`));
                setWithdrawAmount('');
              },
            )
          }
        >
          {t('Retirer', 'Withdraw')}
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">{t('Borrower — emprunter un montant précis', 'Borrower — borrow a precise amount')}</T>
        {canBorrow && assessment && (
          <T variant="muted">
            {t(
              `Plafond recommandé : ${assessment.max_recommended_credit_line.amount_decimal} ${unit} sur ${assessment.term_months} mois maximum. Choisissez le montant et la durée exacts de votre emprunt.`,
              `Recommended cap: ${assessment.max_recommended_credit_line.amount_decimal} ${unit} over ${assessment.term_months} months maximum. Choose the exact amount and term of your loan.`,
            )}
          </T>
        )}
        <Field
          label={t(`Montant demandé (${unit})`, `Requested amount (${unit})`)}
          value={borrowAmount}
          onChangeText={setBorrowAmount}
          keyboardType="decimal-pad"
          editable={Boolean(canBorrow)}
          placeholder={assessment ? assessment.max_recommended_credit_line.amount_decimal : '0'}
        />
        <Field
          label={t('Durée souhaitée (mois)', 'Desired term (months)')}
          value={borrowMonths}
          onChangeText={setBorrowMonths}
          keyboardType="number-pad"
          editable={Boolean(canBorrow)}
          placeholder={assessment ? String(assessment.term_months) : '12'}
        />
        <Button
          busy={busy === 'loan-request'}
          disabled={!canBorrow || !borrowAmount || !borrowMonths}
          onPress={() =>
            run(
              'loan-request',
              () => api.requestLoan(asset, toLedgerAmount(asset, borrowAmount), Math.max(1, Math.floor(Number(borrowMonths)))),
              () => {
                setLastMessage(
                  t(`Prêt accordé : ${borrowAmount} ${unit} sur ${borrowMonths} mois.`, `Loan granted: ${borrowAmount} ${unit} over ${borrowMonths} months.`),
                );
                setBorrowAmount('');
                setBorrowMonths('');
              },
            )
          }
        >
          {t('Emprunter', 'Borrow')}
        </Button>
        {!assessment && <T variant="muted">{t("Demandez d'abord une évaluation de crédit approuvée.", 'Request an approved credit assessment first.')}</T>}
        {assessment && !canBorrow && (
          <T variant="muted">{t('Votre dernière évaluation de crédit a été refusée.', 'Your latest credit assessment was declined.')}</T>
        )}
      </View>

      {positions && positions.loans.some((l) => l.status === 'active') && (
        <View style={{ gap: 8 }}>
          <T variant="label">{t('Borrower — rembourser un prêt actif', 'Borrower — repay an active loan')}</T>
          {positions.loans
            .filter((l) => l.status === 'active')
            .map((loan) => (
              <LoanRepayRow key={loan.id} loan={loan} onRepaid={refresh} />
            ))}
        </View>
      )}

      <ErrorNote message={error} />
      {lastMessage && <Badge tone="success">{lastMessage}</Badge>}

      <View style={{ height: 1, backgroundColor: c.border }} />
      <T variant="label">{t('Vos positions', 'Your positions')}</T>
      <PositionsSection positions={positions} />
    </Card>
  );
}

function transactionStatusTone(resultCode: string, validated: boolean): 'neutral' | 'success' | 'warning' | 'error' {
  if (!validated) return 'warning';
  return resultCode === 'tesSUCCESS' ? 'success' : 'error';
}
function directionLabel(t: (fr: string, en: string) => string, direction: AccountTransaction['direction']): string {
  return direction === 'incoming' ? t('Reçu', 'Received') : direction === 'outgoing' ? t('Envoyé', 'Sent') : t('Interne', 'Internal');
}
function formatOccurredAt(iso: string | null, language: 'fr' | 'en'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Une ligne = une transaction on-chain reelle (pas seulement une action
// applicative deja loguee) — ouvre l'explorateur XRPL au tap.
function TransactionRow({ tx }: { tx: AccountTransaction }) {
  const { t, language } = useSession();
  return (
    <Pressable
      onPress={() => Linking.openURL(tx.explorer_url)}
      accessibilityRole="link"
      accessibilityLabel={t(
        `${directionLabel(t, tx.direction)} · ${tx.tx_type} · voir sur l'explorateur`,
        `${directionLabel(t, tx.direction)} · ${tx.tx_type} · view on the explorer`,
      )}
      style={({ pressed }) => [
        { gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
        pressed && { opacity: 0.65 },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={tx.direction === 'incoming' ? 'success' : 'neutral'}>{directionLabel(t, tx.direction)}</Badge>
          <T variant="label">{tx.tx_type}</T>
        </View>
        <Badge tone={transactionStatusTone(tx.result_code, tx.validated)}>{tx.result_code}</Badge>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <T variant="muted" style={{ fontSize: 13 }}>
          {formatOccurredAt(tx.occurred_at, language)}
          {tx.counterparty ? t(` · de ${tx.counterparty}`, ` · from ${tx.counterparty}`) : ''}
          {tx.counterparty && tx.direction === 'outgoing' ? '' : ''}
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
  const { t } = useSession();
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
      .catch((err) => setError(err instanceof Error ? err.message : t('Erreur inattendue', 'Unexpected error')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <Card style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="wallet" size={22} color={c.text} />
          <T variant="title">{t('Votre wallet XRPL', 'Your XRPL wallet')}</T>
        </View>
        <Button busy={loading} variant="ghost" onPress={refresh} style={{ minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 }}>
          {t('Actualiser', 'Refresh')}
        </Button>
      </View>

      <ErrorNote message={error} />
      {!activity && loading && <T variant="muted">{t("Chargement du solde et de l'historique…", 'Loading balance and history…')}</T>}

      {activity && (
        <>
          <View style={{ gap: 4 }}>
            <T variant="label">{t('Adresse', 'Address')}</T>
            <T selectable style={{ fontSize: 15 }}>
              {activity.address}
            </T>
            <T variant="muted" style={{ fontSize: 12 }}>
              {activity.network}
            </T>
          </View>

          <View style={{ gap: 8 }}>
            <T variant="label">{t('Solde', 'Balance')}</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {activity.balances.length === 0 ? (
                <T variant="muted">{t('Compte pas encore financé sur le ledger.', 'Account not yet funded on the ledger.')}</T>
              ) : (
                activity.balances.map((b) => <Badge key={b.asset_id}>{formatHumanAmount(b.asset_id, b.value)}</Badge>)
              )}
            </View>
          </View>

          {activity.vault_shares.length > 0 && (
            <View style={{ gap: 8 }}>
              <T variant="label">{t('Parts de vault (MPToken)', 'Vault shares (MPToken)')}</T>
              <T variant="muted" style={{ fontSize: 12 }}>
                {t(
                  "Votre part réelle dans le vault partagé — croît avec le rendement accumulé, distincte d'un solde classique.",
                  'Your real share in the shared vault — grows with accrued yield, distinct from a plain balance.',
                )}
              </T>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {activity.vault_shares.map((s) => (
                  <Badge key={s.asset_id} tone="success">
                    {formatHumanAmount(s.asset_id, s.shares)}
                  </Badge>
                ))}
              </View>
            </View>
          )}

          <View style={{ gap: 4 }}>
            <T variant="label">{t('Transactions récentes', 'Recent transactions')}</T>
            {activity.transactions.length === 0 ? (
              <T variant="muted">{t('Aucune transaction sur ce compte pour l\'instant.', 'No transactions on this account yet.')}</T>
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

// Statut partage (KYC + derniere evaluation de credit) entre les ecrans
// Accueil et Lending — chacun le recharge independamment (pas de cache
// inter-pages, coherent avec le reste de l'app : pas de conteneur DI cote
// client non plus).
function useAccountStatus(enabled: boolean) {
  const api = useLendingApi();
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [assessment, setAssessment] = useState<CreditAssessment | null>(null);

  useEffect(() => {
    if (!enabled) return;
    api
      .getKycStatus()
      .then(setKyc)
      .catch(() => setKyc({ status: 'not_started', simulated: true, decided_at: null }));
    api
      .getLatestCreditAssessment()
      .then(setAssessment)
      .catch(() => setAssessment(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { kyc, setKyc, assessment, setAssessment };
}

// Garde d'authentification commune aux trois ecrans reels (Accueil,
// Transactions, Lending) : inscription/connexion -> verification email ->
// contenu. Distinct du commutateur d'etats de demo existant
// (SessionProvider), jamais mele a lui.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useSession();
  const { user, token, ready } = useAuth();
  if (!ready) return <T>{t('Chargement…', 'Loading…')}</T>;
  if (!user) return <SignUpOrLogIn />;
  if (!user.email_verified_at) return <VerifyEmail />;
  if (!token) return <SignUpOrLogIn />;
  return <>{children}</>;
}

function AccountHeader() {
  const { t } = useSession();
  const { user, logout } = useAuth();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <T variant="title">{t(`Bonjour, ${user?.email}`, `Hello, ${user?.email}`)}</T>
      <Button variant="ghost" onPress={logout} style={{ minHeight: 40, paddingVertical: 8, paddingHorizontal: 12 }}>
        {t('Se déconnecter', 'Log out')}
      </Button>
    </View>
  );
}

// Integration Credentials + Permissioned Domains (bonus) : verifie sur le
// ledger qu'une attestation on-chain existe, en plus du statut KYC
// applicatif — peut rester absente (wallet pas encore finance au moment de
// la simulation), n'affiche alors rien plutot qu'un badge trompeur.
function OnChainCredentialBadge() {
  const { t } = useSession();
  const api = useLendingApi();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    api.getKycCredentialStatus().then((s) => setAllowed(s.allowed)).catch(() => setAllowed(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!allowed) return null;
  return <Badge tone="success">{t('Attestation on-chain acceptée', 'On-chain attestation accepted')}</Badge>;
}

// Accueil (Phase G) : identite -> KYC simule -> Odoo BYO -> credit. Le
// wallet (solde/historique) vit desormais sur /transactions, le lending
// (depot/retrait/emprunt) sur /lending — chacun un onglet dedie plutot
// qu'un unique ecran fourre-tout.
function HomeScreenInner() {
  const { t } = useSession();
  const { kyc, setKyc, assessment, setAssessment } = useAccountStatus(true);

  if (!kyc) return <T>{t('Chargement…', 'Loading…')}</T>;

  return (
    <View style={{ gap: 24 }}>
      <AccountHeader />
      {kyc.status !== 'valid' && <KycGateModal onDecided={setKyc} />}
      {kyc.status === 'invalid' && (
        <Card style={{ gap: 8 }}>
          <T style={{ color: c.error }}>
            {t('KYC simulé invalide : aucun instrument financier accessible.', 'Simulated KYC invalid: no financial instrument accessible.')}
          </T>
        </Card>
      )}
      {kyc.status === 'valid' && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('KYC simulé : valide', 'Simulated KYC: valid')}</Badge>
            <OnChainCredentialBadge />
          </View>
          <CreditSetupSection assessment={assessment} onAssessed={setAssessment} />
        </>
      )}
    </View>
  );
}
export function HomeScreen() {
  return (
    <AuthGate>
      <HomeScreenInner />
    </AuthGate>
  );
}

// Transactions : adresse complete, soldes reels (dont RLUSD), historique
// on-chain — accessible des la connexion, sans exiger le KYC (ce n'est
// jamais qu'une lecture du propre wallet de l'utilisateur, pas un
// instrument financier).
function TransactionsScreenInner() {
  return (
    <View style={{ gap: 24 }}>
      <AccountHeader />
      <WalletOverview />
    </View>
  );
}
export function TransactionsScreen() {
  return (
    <AuthGate>
      <TransactionsScreenInner />
    </AuthGate>
  );
}

// Lending : depot/retrait/emprunt sur le vault partage. Le KYC reste requis
// (PER-11) — si ce n'est pas encore fait, renvoie vers l'accueil plutot que
// de dupliquer la popup de simulation ici.
function LendingScreenInner() {
  const { t } = useSession();
  const { kyc, assessment } = useAccountStatus(true);

  if (!kyc) return <T>{t('Chargement…', 'Loading…')}</T>;

  if (kyc.status !== 'valid') {
    return (
      <View style={{ gap: 24 }}>
        <AccountHeader />
        <Card style={{ gap: 12 }}>
          <T variant="title">{t('Vérification requise', 'Verification required')}</T>
          <T variant="muted">
            {t(
              "Le dépôt, l'emprunt et le retrait exigent d'abord une vérification d'identité (KYC simulé) sur la page d'accueil.",
              'Deposits, loans, and withdrawals first require identity verification (simulated KYC) on the home page.',
            )}
          </T>
          <Link href="/" asChild>
            <Button>{t("Aller à l'accueil", 'Go to home')}</Button>
          </Link>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ gap: 24 }}>
      <AccountHeader />
      <LendingPanel assessment={assessment} />
    </View>
  );
}
export function LendingScreen() {
  return (
    <AuthGate>
      <LendingScreenInner />
    </AuthGate>
  );
}
