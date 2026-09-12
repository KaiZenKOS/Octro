import React, { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { Badge, Button, Card, Field, PageTransition, Typography as T, tokens } from '@octro/ui';
import { useAuth } from './auth';
import { useLendingApi } from './lending-data';
import type { CreditAssessment, KycStatus, OdooCompany, OdooConnection } from './lending-data';

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
    <Card warm style={{ maxWidth: 520, width: '100%', alignSelf: 'center', gap: 18 }}>
      <T variant="title">{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</T>
      <T variant="muted">
        Commencez par vos prévisions. Le wallet, le KYC et le crédit restent facultatifs tant que vous n’activez pas un service financier.
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
    <Card warm style={{ maxWidth: 520, width: '100%', alignSelf: 'center', gap: 18 }}>
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
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: c.overlay, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Card style={{ maxWidth: 480, width: '100%', gap: 16 }}>
          <T variant="title">Vérification d'identité (KYC)</T>
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
        fournisseur pour l'instant. Votre clé API n'est jamais réaffichée et le nom technique de la base n'est pas requis.
      </T>
      <Field label="URL Odoo" value={odooUrl} onChangeText={setOdooUrl} placeholder="https://mon-entreprise.odoo.com" autoCapitalize="none" />
      <Field label="Clé API Odoo" value={odooApiKey} onChangeText={setOdooApiKey} secureTextEntry />
      <ErrorNote message={error} />
      <Button busy={busy} disabled={!odooUrl || !odooApiKey} onPress={submit}>
        Connecter
      </Button>
    </Card>
  );
}

function CompanySelector({
  connection,
  selectedCompanyId,
  onSelected,
}: {
  connection: OdooConnection;
  selectedCompanyId: number | null;
  onSelected: (companyId: number) => void;
}) {
  const { listOdooCompanies } = useLendingApi();
  const [companies, setCompanies] = useState<OdooCompany[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(null);
    listOdooCompanies(connection.id)
      .then((items) => {
        if (!active) return;
        setCompanies(items);
        if (items.length === 1) onSelected(items[0]!.id);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger les sociétés Odoo');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [connection.id, listOdooCompanies, onSelected]);

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 5 }}>
        <T variant="title">Périmètre Odoo</T>
        <T variant="muted">Choisissez la société dont les données serviront à l’évaluation. Seules vos sociétés accessibles sont proposées.</T>
      </View>
      {busy && <T variant="muted">Chargement des sociétés…</T>}
      <ErrorNote message={error} />
      {!busy && !error && companies.length === 0 && (
        <T variant="muted">Aucune société accessible avec cette clé API.</T>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {companies.map((company) => (
          <Button
            key={company.id}
            variant={selectedCompanyId === company.id ? 'primary' : 'secondary'}
            onPress={() => onSelected(company.id)}
          >
            {company.name}
          </Button>
        ))}
      </View>
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
  companyId: number | null;
  assessment: CreditAssessment | null;
  onAssessed: (assessment: CreditAssessment) => void;
}) {
  const api = useLendingApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decisionTone = (decision: CreditAssessment['decision']) =>
    decision === 'approve' ? 'success' : decision === 'approve_with_conditions' ? 'warning' : 'error';

  const requestAssessment = async () => {
    setBusy(true);
    setError(null);
    try {
      onAssessed(await api.requestCreditAssessment(connection.id, companyId ?? undefined));
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
      <Button busy={busy} disabled={companyId === null} onPress={requestAssessment}>
        {assessment ? 'Réévaluer' : "Demander l'évaluation"}
      </Button>
      {companyId === null && <T variant="muted">Sélectionnez d’abord la société Odoo à analyser.</T>}
      {assessment && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Badge tone={decisionTone(assessment.decision)}>Grade {assessment.grade}</Badge>
            <Badge tone={decisionTone(assessment.decision)}>{assessment.decision}</Badge>
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

function LendingPanel({ assessment, walletReady }: { assessment: CreditAssessment | null; walletReady: boolean }) {
  const api = useLendingApi();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    setLastResult(null);
    try {
      const result = await action();
      setLastResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <T variant="title">Lending V1 — vault ouvert partagé</T>
      <T variant="muted">
        Dépôts et prêts passent par le même vault et le même loan broker, partagés par tous les lenders/borrowers
        (adaptateur XRPL déjà vérifié en réel).
      </T>

      <View style={{ gap: 8 }}>
        <T variant="label">Lender — déposer dans le vault</T>
        <Field label="Montant (drops)" value={depositAmount} onChangeText={setDepositAmount} keyboardType="number-pad" />
        <Button busy={busy === 'deposit'} disabled={!walletReady || !depositAmount} onPress={() => run('deposit', () => api.deposit(depositAmount))}>
          Déposer
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Lender — retirer (avance buffer si le vault est illiquide)</T>
        <Field label="Montant (drops)" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="number-pad" />
        <Button busy={busy === 'withdraw'} disabled={!walletReady || !withdrawAmount} onPress={() => run('withdraw', () => api.withdraw(withdrawAmount))}>
          Retirer
        </Button>
      </View>

      <View style={{ gap: 8 }}>
        <T variant="label">Borrower — emprunter jusqu'au plafond recommandé</T>
        <Button
          busy={busy === 'loan-request'}
          disabled={!walletReady || !assessment || (assessment.decision !== 'approve' && assessment.decision !== 'approve_with_conditions')}
          onPress={() => run('loan-request', () => api.requestLoan())}
        >
          Demander un prêt
        </Button>
        {!walletReady && <T variant="muted">Activez d’abord le wallet dédié au lending.</T>}
        {walletReady && !assessment && <T variant="muted">Demandez d'abord une évaluation de crédit approuvée.</T>}
      </View>

      <ErrorNote message={error} />
      {lastResult && (
        <T variant="muted" style={{ fontFamily: tokens.font.regular }}>
          {lastResult}
        </T>
      )}
    </Card>
  );
}

// Ecran compose (Phase G) : compte reel -> KYC simule -> Odoo BYO -> credit
// -> lending. Distinct des ecrans de fixture Lina (src/screens.tsx),
// composes a cote via une route separee (app/account.tsx), sans passer par
// le commutateur d'etats de demo existant (SessionProvider).
export function AccountScreen() {
  const { user, token } = useAuth();
  const api = useLendingApi();
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [odooConnection, setOdooConnection] = useState<OdooConnection | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [assessment, setAssessment] = useState<CreditAssessment | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

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

  if (!user) return <SignUpOrLogIn />;
  if (!user.email_verified_at) return <VerifyEmail />;
  if (!token) return <SignUpOrLogIn />;
  if (!kyc) return <T>Chargement…</T>;

  return (
    <PageTransition>
    <View style={{ gap: 24, width: '100%', maxWidth: 920, alignSelf: 'center' }}>
      <View style={{ gap: 8 }}>
        <T style={{ color: c.muted, fontSize: 12, letterSpacing: 1.1, fontFamily: tokens.font.semibold }}>ESPACE FINANCIER</T>
        <T variant="title">Bonjour, {user.email}</T>
        <T variant="muted">Activez uniquement les capacités dont vous avez besoin. La prévision personnelle reste indépendante.</T>
      </View>
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
          <Card warm style={{ gap: 16 }}>
            <T variant="title">Wallet lending</T>
            <T variant="muted">Créez-le uniquement si vous souhaitez déposer, emprunter ou retirer. Cette activation est idempotente.</T>
            {walletReady ? <Badge tone="success">Wallet activé</Badge> : <Button busy={walletBusy} onPress={async () => {
              setWalletBusy(true);
              setWalletError(null);
              try {
                await api.provisionWallet();
                setWalletReady(true);
              } catch (err) {
                setWalletError(err instanceof Error ? err.message : 'Activation impossible');
              } finally {
                setWalletBusy(false);
              }
            }}>Activer le wallet lending</Button>}
            <ErrorNote message={walletError} />
          </Card>
          {!odooConnection ? (
            <OdooConnectForm onConnected={setOdooConnection} />
          ) : (
            <>
              <CompanySelector connection={odooConnection} selectedCompanyId={companyId} onSelected={setCompanyId} />
              <CreditAssessmentPanel
                connection={odooConnection}
                companyId={companyId}
                assessment={assessment}
                onAssessed={setAssessment}
              />
            </>
          )}
          <LendingPanel assessment={assessment} walletReady={walletReady} />
        </>
      )}
    </View>
    </PageTransition>
  );
}
