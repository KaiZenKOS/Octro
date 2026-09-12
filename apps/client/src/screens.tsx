import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Line, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Field, Typography as T, tokens } from '@octro/ui';
import { DecimalStringSchema } from '@octro/contracts';
import { demoFixture as fixture, designReference as reference, euro } from './data';
import { useAcknowledge, useClientData, useCreateEvent, useSession } from './session';
import { useDesktop } from './Shell';
import { Icon } from './Icon';
const c = tokens.color;
function Title({ children }: {
    children: React.ReactNode;
}) { return <T nativeID="screen-title" accessibilityRole="header" {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={s.title}>{children}</T>; }
function Heading({ children }: {
    children: React.ReactNode;
}) { return <T accessibilityRole="header" style={s.heading}>{children}</T>; }
function Note({ children, tone = 'muted' }: {
    children: React.ReactNode;
    tone?: 'muted' | 'warning' | 'success' | 'error';
}) { return <T style={[s.note, { color: c[tone] }]}>{children}</T>; }
function Money({ value, size = 64 }: {
    value: string;
    size?: number;
}) { const { language } = useSession(); return <T style={[s.money, { fontSize: size, lineHeight: size * 1.15 }]}>{euro(value, language)}</T>; }
function Split({ main, aside }: {
    main: React.ReactNode;
    aside?: React.ReactNode;
}) { const desktop = useDesktop(); return <View style={[s.split, desktop && { flexDirection: 'row' }]}><View style={[s.main, desktop && { flex: 1 }]}>{main}</View>{aside && <View style={[s.aside, desktop && { width: 360 }]}>{aside}</View>}</View>; }
function Rail({ children }: {
    children: React.ReactNode;
}) { return <LinearGradient colors={['#382B2E', '#18151B']} style={s.rail}>{children}</LinearGradient>; }
function Notice({ title, children, tone = 'warning' }: {
    title: string;
    children: React.ReactNode;
    tone?: 'warning' | 'success' | 'error';
}) { return <View style={s.notice}><T style={{ color: c[tone] }}>{title}</T><Note>{children}</Note></View>; }
function Row({ title, detail, value, icon = 'circle', positive = false }: {
    title: string;
    detail: string;
    value?: string;
    icon?: string;
    positive?: boolean;
}) { return <View style={s.row}><Icon name={icon}/><View style={{ flex: 1, minWidth: 0, gap: 5 }}><T>{title}</T><Note>{detail}</Note></View>{value && <T style={{ color: positive ? c.success : c.text, fontFamily: tokens.font.medium, textAlign: 'right', maxWidth: '42%' }}>{value}</T>}</View>; }
function EventRows({ short = false }: {
    short?: boolean;
}) {
    const { t, language } = useSession();
    const { data } = useClientData();
    const labels: Record<string, string> = { loyer: t('Loyer', 'Rent'), courses: t('Courses', 'Groceries'), transport: t('Transport', 'Transport'), salaire: t('Salaire', 'Salary') };
    const icons: Record<string, string> = { loyer: 'rent', courses: 'groceries', transport: 'transport', salaire: 'salary' };
    return <View>{data?.events.filter(event => !short || ['loyer', 'salaire'].includes(event.label)).map(event => { const day = event.expected_settlement_at ? Math.round((Date.parse(event.expected_settlement_at) - Date.parse(data.provenance.asOf)) / 86400000) : null; return <Row key={event.id} title={labels[event.label] ?? event.label} detail={`${day === null ? '—' : `J+${day}`} · ${event.direction === 'inflow' ? t('Attendu', 'Expected') : t('Déclaré', 'Declared')}`} value={`${event.direction === 'inflow' ? '+' : '−'}${euro(event.amount.amount_decimal, language)}`} positive={event.direction === 'inflow'} icon={icons[event.label] ?? 'calendar'}/>; })}</View>;
}
function Chart() {
    const { t, language } = useSession();
    return <View style={{ gap: 18 }}>
  <View style={[s.inline, { flexWrap: 'wrap' }]}><View style={s.inline}><View style={{ width: 24, height: 2, backgroundColor: c.text }}/><Note>{t('━━ Sans action', '━━ Without action')}</Note></View><View style={s.inline}><View style={{ width: 24, borderTopColor: c.success, borderTopWidth: 2, borderStyle: 'dashed' }}/><Note>{t('┄┄ Avec le plan proposé', '┄┄ With the proposed plan')}</Note></View></View>
  <Svg width="100%" height={196} viewBox="0 0 736 196" preserveAspectRatio="none" accessibilityRole="image" accessibilityLabel={t('Illustration synthétique de la prévision. Les valeurs détaillées figurent sous la courbe.', 'Synthetic forecast illustration. Detailed values appear below the chart.')}>
    {[40, 80, 120, 160].map(y => <Line key={y} x1={0} y1={y} x2={736} y2={y} stroke={c.border} strokeWidth={.7}/>)}
    <Line x1={0} y1={162.4} x2={736} y2={162.4} stroke={c.warning} strokeWidth={1}/>
    {reference.chartPaths.map((p, i) => <Path key={i} d={p.geometry} fill="none" stroke={p.stroke === '$success' ? c.success : c.text} strokeWidth={p.strokeWidth}/>)}
  </Svg>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{['Auj.', 'J+2', 'J+4', 'J+6', 'J+10'].map(day => <Note key={day}>{day}</Note>)}</View>
  <Note>{t('Repère ambre : réserve à préserver de ', 'Amber line: protected reserve of ')}{euro(fixture.current_reserve, language)}</Note>
  <Note>{t('Sans action : 650 → 50 → −50 → −130 → 1 470 €. Avec le plan : 880 → 280 → 180 → 100 → 1 700 €.', 'Without action: 650 → 50 → −50 → −130 → 1,470 €. With the plan: 880 → 280 → 180 → 100 → 1,700 €.')}</Note>
  </View>;
}
function TransferSummary() { const { t, language } = useSession(); const { data } = useClientData(); const action = data?.plan.proposed_actions.find(a => a.type === 'own_funds_transfer'); if (!action)
    return <T>{t('Aucune proposition disponible', 'No proposal available')}</T>; return <Rail><Note>{t('ACTION PROPOSÉE', 'PROPOSED ACTION')}</Note><Money value={action.amount_decimal} size={48}/><T style={{ fontSize: 18 }}>{t('Épargne → Compte courant', 'Savings → Current account')}</T><T>{t('Votre courant resterait à ', 'Your current account would remain at ')}{euro(fixture.expected.current_before_salary, language)}{t(' avant le salaire. Votre épargne serait de ', ' before payday. Your savings would be ')}{euro(fixture.expected.savings_remaining, language)}.</T><Notice title={t('Sans nouvelle dette', 'No new debt')} tone="success">{t('Les avoirs restent inchangés au moment du transfert.', 'Total assets remain unchanged at the time of transfer.')}</Notice><Button onPress={() => router.push('/proposal')}>{t('Voir la proposition', 'View proposal')}</Button><Note>{t('Projection, aucun transfert effectué.', 'Forecast, no transfer made.')}</Note></Rail>; }
function Home() {
    const { t, language } = useSession();
    const desktop = useDesktop();
    return <><Title>{t('Bonjour, Lina.', 'Hello, Lina.')}</Title><Split main={<>
  <Card warm style={[s.hero, desktop && { padding: 32 }]}><T>{t('Argent disponible sur le courant', 'Money available in your current account')}</T><Money value={fixture.opening_balances.current} size={desktop ? 72 : 64}/>{desktop ? <T>{t('Épargne : ', 'Savings: ')}{euro(fixture.opening_balances.savings, language)} · {t('Total déclaré : ', 'Declared total: ')}{euro(reference.totalBefore, language)}</T> : <View style={s.between}><T>{t('Épargne', 'Savings')}</T><T>{euro(fixture.opening_balances.savings, language)}</T></View>}<Note>{t('Saisie manuelle · exemple synthétique', 'Manual entry · synthetic example')}</Note></Card>
  {!desktop && <><View style={{ gap: 8, paddingVertical: 4 }}><Heading>{t('Votre loyer arrive avant le salaire', 'Your rent is due before payday')}</Heading><T>{t('À J+6, le courant serait à −130 €. Un transfert de 230 € peut préserver votre réserve.', 'On day 6, the account would reach −€130. A €230 transfer can preserve your reserve.')}</T></View><Button onPress={() => router.push('/calendar')}>{t('Voir mon calendrier', 'View my calendar')}</Button></>}
  {desktop && <Chart />}<View><Heading>{t('Vos prochaines échéances', 'Your upcoming payments')}</Heading><EventRows short/></View>
  {!desktop && <><View style={[s.inline, { paddingVertical: 16 }]}><Icon name="shield"/><T>{euro(fixture.current_reserve, language)}{t(' à préserver sur le courant', ' to preserve in your current account')}</T></View><Button variant="secondary" onPress={() => router.push('/add')}>{t('Ajouter une échéance', 'Add a due date')}</Button></>}
  </>} aside={desktop ? <Rail><Notice title={t('Une attention nécessaire', 'Something needs your attention')}>{t('Le loyer arrive avant le salaire. Le point bas prévu est de −130 €.', 'Rent is due before payday. The forecast low is −€130.')}</Notice><Button onPress={() => router.push('/calendar')}>{t('Voir mon calendrier', 'View my calendar')}</Button><Button variant="secondary" onPress={() => router.push('/add')}>{t('Ajouter une échéance', 'Add a due date')}</Button><Note>{t('Date de référence synthétique : 12 septembre 2026.', 'Synthetic reference date: September 12, 2026.')}</Note></Rail> : undefined}/></>;
}
function Calendar() {
    const { t } = useSession();
    const desktop = useDesktop();
    const [selectedPeriod, setSelectedPeriod] = useState(2);
    const periods = [
        { key: '7J', label: t('7 J', '7 D') },
        { key: '14J', label: t('14 J', '14 D') },
        { key: '30J', label: t('30 J', '30 D') },
        { key: '3M', label: t('3 M', '3 M') },
        { key: '1AN', label: t('1 AN', '1 Y') },
    ];

    return <><Title>{t('Calendrier', 'Calendar')}</Title><Split main={<>
  <T style={{ fontSize: desktop ? 20 : 16 }}>{t('SOLDE PRÉVU DU COURANT', 'PROJECTED CURRENT ACCOUNT BALANCE')}</T>
  <View style={[s.between, { alignItems: 'flex-end', gap: 16 }]}><View style={{ flex: 1 }}><Money value={reference.pointsWithoutAction[3]!} size={desktop ? 56 : 52}/><Note>{t('Au plus bas à J+6, avant le salaire', 'Lowest at day 6, before payday')}</Note></View><View style={{ maxWidth: '45%', gap: 6 }}><Money value={fixture.expected.current_before_salary} size={30}/><Note>{t('avec le plan', 'with the plan')}</Note></View></View>
  <View style={s.periods}>{periods.map((p, idx) => {
      const isSelected = selectedPeriod === idx;
      return (
          <Pressable
              key={p.key}
              onPress={() => setSelectedPeriod(idx)}
              style={[s.period, isSelected && { backgroundColor: c.raised, borderColor: '#5B454C' }]}
          >
              <T style={[s.note, { color: isSelected ? c.text : c.muted, fontFamily: isSelected ? tokens.font.medium : tokens.font.regular }]}>
                  {p.label}
              </T>
          </Pressable>
      );
  })}</View>
  {selectedPeriod !== 2 && <Note>{t('Horizon calculé dans cette démo : 30 jours (les autres horizons utilisent cette projection).', 'Calculated horizon in this demo: 30 days (other horizons reference this projection).')}</Note>}
  <Chart />{!desktop && <TransferSummary />}<View><Heading>{t('Vos échéances', 'Your scheduled payments')}</Heading><EventRows /></View>
  </>} aside={desktop ? <TransferSummary /> : undefined}/></>;
}
function Comparison() { const { t, language } = useSession(); const rows = [[t('Compte courant', 'Current account'), fixture.opening_balances.current, reference.pointsWithProposal[0]!], [t('Épargne', 'Savings'), fixture.opening_balances.savings, fixture.expected.savings_remaining], [t('Total des avoirs', 'Total assets'), reference.totalBefore, reference.totalBefore], [t('Avant le salaire', 'Before payday'), reference.pointsWithoutAction[3]!, fixture.expected.current_before_salary]]; return <View><Heading>{t('Avant / avec le plan', 'Before / with the plan')}</Heading>{rows.map(([label, before, after]) => <View key={label} style={[s.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}><T>{label}</T><View style={s.inline}><T style={{ color: c.muted }}>{euro(before!, language)}</T><Icon name="arrow" size={16}/><T style={{ fontFamily: tokens.font.medium }}>{euro(after!, language)}</T></View></View>)}</View>; }
function Proposal() {
    const { t, language, state } = useSession();
    const { data } = useClientData();
    const ack = useAcknowledge();
    const desktop = useDesktop();
    const action = data?.plan.proposed_actions.find(a => a.type === 'own_funds_transfer');
    if (!action)
        return <T>{t('Aucune proposition disponible', 'No proposal available')}</T>;
    return <>
  <Title>{desktop ? t('Gardez une longueur d’avance.', 'Stay one step ahead.') : t('Une réserve.\nL’esprit tranquille.', 'A reserve.\nPeace of mind.')}</Title><Note>{t('ACTION PROPOSÉE · SANS DETTE', 'PROPOSED ACTION · NO NEW DEBT')}</Note>
  <Split main={<><Card warm style={s.hero}><Money value={action.amount_decimal}/><T>{t('Épargne → Compte courant', 'Savings → Current account')}</T><Note>{t('Aperçu uniquement · aucun virement effectué', 'Preview only · no transfer made')}</Note></Card><Card style={s.detail}><Comparison /><Notice title={t('Réserve de 100 € préservée', '€100 reserve preserved')} tone="success">{t('Le salaire de 1 600 € reste attendu à J+10. Après son arrivée, le courant serait de 1 700 €.', 'The €1,600 salary is still expected on day 10. After it arrives, the current account would reach €1,700.')}</Notice><Note>{t('Ce plan suppose 300 € d’épargne mobilisable, les dépenses prévues et le salaire à la date indiquée.', 'This plan assumes €300 of available savings, the planned expenses and salary on the stated date.')}</Note>{!desktop && <PlanActions />}</Card></>} aside={desktop ? <Rail><Heading>{t('Votre décision', 'Your decision')}</Heading><PlanActions /><Note>{t('Épargne restante : ', 'Remaining savings: ')}{euro(fixture.expected.savings_remaining, language)}</Note></Rail> : undefined}/></>;
}
function PlanActions() { const { t, state } = useSession(); const { data } = useClientData(); const ack = useAcknowledge(); const saved = data?.plan.status === 'ACKNOWLEDGED'; return <View style={{ gap: 16 }}><Button busy={ack.isPending} disabled={!data || state === 'stale'} onPress={() => { if (data)
    ack.mutate(data.plan, { onSuccess: () => router.push('/tracking') }); }}>{saved ? t('Voir le plan enregistré', 'View saved plan') : t('Enregistrer ce plan', 'Save this plan')}</Button>{ack.isError && <T accessibilityRole="alert" style={{ color: c.error }}>{t('Enregistrement impossible. Relisez la proposition.', 'Could not save. Read the proposal again.')}</T>}<Button variant="secondary" onPress={() => router.push('/options')}>{t('Comparer les autres options', 'Compare other options')}</Button><Note>{t('Enregistrer acquitte la proposition dans cette session de démo. Aucun argent n’est déplacé. Le transfert reste à réaliser séparément.', 'Saving acknowledges the proposal in this demo session. No money moves. The transfer must be carried out separately.')}</Note></View>; }
function Sources() { const { t, language } = useSession(); const desktop = useDesktop(); const [info, setInfo] = useState(false); return <><Title>{t('Sources', 'Sources')}</Title><T>{t('Vos données, au même endroit.', 'Your data, in one place.')}</T><Split main={<><Card warm style={s.detail}><Heading>{t('Comptes', 'Accounts')}</Heading><Row title={t('Compte courant', 'Current account')} detail={t('Saisi manuellement · déclaré', 'Entered manually · declared')} value={euro(fixture.opening_balances.current, language)} icon="sources"/><Row title={t('Épargne', 'Savings')} detail={t('Mobilisable dans ce scénario', 'Available in this scenario')} value={euro(fixture.opening_balances.savings, language)} icon="shield"/></Card><Note>{t('Soldes déclarés par vous, non vérifiés par une banque.', 'Balances declared by you, not verified by a bank.')}</Note><View><Heading>{t('Événements & imports', 'Events & imports')}</Heading><Row title={t('4 échéances', '4 scheduled payments')} detail={t('Fixture Lina · saisie déclarative', 'Lina fixture · declared data')} icon="calendar"/><Row title="operations.csv" detail={t('Exemple d’aperçu uniquement · aucun fichier importé', 'Preview example only · no file imported')} icon="file"/></View><Button onPress={() => router.push('/import')}>{t('Importer un fichier', 'Import a file')}</Button><Button variant="secondary" onPress={() => router.push('/add')}>{t('Ajouter une échéance', 'Add a due date')}</Button></>} aside={<Rail><Notice title={t('Connexion facultative', 'Optional connection')}>{t('Vous pouvez continuer avec vos saisies et imports. Aucune connexion bancaire active.', 'You can continue with manual entries and imports. No active bank connection.')}</Notice><Button variant="secondary" onPress={() => setInfo(!info)}>{t('Voir les connexions disponibles', 'View available connections')}</Button>{info && <Note>{t('Aucun connecteur n’est raccordé. La prévision synthétique reste accessible sans wallet ni KYC.', 'No connector is integrated. The synthetic forecast remains available without a wallet or KYC.')}</Note>}<Button variant="ghost" onPress={() => router.push('/calendar')}>{t('Revenir au calendrier', 'Back to calendar')}</Button></Rail>}/></>; }
function Tracking() {
    const { t } = useSession();
    const { data } = useClientData();
    const saved = data?.plan.status === 'ACKNOWLEDGED';
    const action = data?.plan.proposed_actions.find(a => a.type === 'own_funds_transfer');
    const [viewMode, setViewMode] = useState<'lina' | 'network'>('lina');

    if (!action) return <T>{t('Aucune proposition disponible', 'No proposal available')}</T>;

    return <>
        <Title>{t('Suivi', 'Tracking')}</Title>
        <T>{t('Ce qui est prévu. Ce qui a eu lieu.', 'What is planned. What has happened.')}</T>

        <View style={[s.periods, { marginVertical: 8 }]}>
            <Pressable
                onPress={() => setViewMode('lina')}
                style={[s.period, viewMode === 'lina' && { backgroundColor: c.raised, borderColor: '#5B454C' }]}
            >
                <T style={[s.note, { color: viewMode === 'lina' ? c.text : c.muted }]}>
                    {t('Suivi personnel (Lina)', 'Personal tracking (Lina)')}
                </T>
            </Pressable>
            <Pressable
                onPress={() => setViewMode('network')}
                style={[s.period, viewMode === 'network' && { backgroundColor: c.raised, borderColor: '#5B454C' }]}
            >
                <T style={[s.note, { color: viewMode === 'network' ? c.text : c.muted }]}>
                    {t('Suivi réseau XRPL (Devnet)', 'XRPL Network tracking (Devnet)')}
                </T>
            </Pressable>
        </View>

        {viewMode === 'lina' ? (
            <Split
                main={<>
                    <Card warm style={s.hero}>
                        <Note>{saved ? t('PLAN ENREGISTRÉ', 'SAVED PLAN') : t('PROPOSITION À LIRE', 'PROPOSAL TO READ')}</Note>
                        <Money value={action.amount_decimal} />
                        <T style={{ fontSize: 18 }}>{t('Épargne → Compte courant', 'Savings → Current account')}</T>
                        <Note>{saved ? t('Aujourd’hui à 09:45 · session de démonstration', 'Today at 09:45 · demo session') : t('Aucune décision enregistrée', 'No decision recorded')}</Note>
                    </Card>
                    <Notice title={t('Le transfert reste à réaliser', 'The transfer still needs to be made')}>
                        {t('Votre accord enregistre le plan. Il ne modifie pas vos soldes.', 'Your agreement saves the plan. It does not change your balances.')}
                    </Notice>
                    <View>
                        <Heading>{t('Étapes du plan', 'Plan steps')}</Heading>
                        <Row
                            icon={saved ? 'check' : 'circle'}
                            title={saved ? t('Plan enregistré', 'Plan saved') : t('Plan proposé', 'Plan proposed')}
                            detail={saved ? t('Acquittement simulé · session uniquement', 'Simulated acknowledgement · session only') : t('À lire avant de décider', 'Read before deciding')}
                            positive={saved}
                        />
                        <Row
                            icon="circle"
                            title={t('Transfert à réaliser', 'Transfer to make')}
                            detail={t('Depuis votre banque, séparément', 'Through your bank, separately')}
                        />
                        <Row
                            icon="circle"
                            title={t('Mouvement confirmé', 'Confirmed movement')}
                            detail={t('Aucune observation disponible', 'No observation available')}
                        />
                    </View>
                </>}
                aside={<Rail>
                    <Button onPress={() => router.push('/proposal')}>
                        {saved ? t('Voir le plan enregistré', 'View saved plan') : t('Lire la proposition', 'Read proposal')}
                    </Button>
                    <Button variant="secondary" onPress={() => router.push('/sources')}>
                        {t('Mettre à jour mes données', 'Update my data')}
                    </Button>
                    <Note>{t('Aucune transaction ni preuve réseau n’a été créée sans votre accord exprès.', 'No transaction or network evidence has been created without your express consent.')}</Note>
                </Rail>}
            />
        ) : (
            <Split
                main={<>
                    <Card warm style={s.hero}>
                        <View style={s.between}>
                            <Note>{t('ÉTAT DE DÉMONSTRATION · RÉSEAU DE TEST', 'DEMO STATE · TEST NETWORK')}</Note>
                            <View style={{ backgroundColor: '#42281D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <T style={{ fontSize: 11, color: c.warning }}>XRPL Devnet</T>
                            </View>
                        </View>
                        <Heading style={{ fontSize: 24 }}>{t('Confirmation en attente', 'Confirmation pending')}</Heading>
                        <T>{t('Les fonds ne sont pas encore confirmés.', 'Funds are not yet confirmed.')}</T>
                        <Note>{t('Transaction non-custodiale signée localement (XLS-65 / XLS-66).', 'Non-custodial transaction signed locally (XLS-65 / XLS-66).')}</Note>
                    </Card>

                    <Notice title={t('Vos soldes ne sont pas crédités', 'Your balances are not credited')} tone="warning">
                        {t('Une opération envoyée ne devient confirmée qu’après vérification du résultat et de ses effets.', 'A submitted operation is confirmed only after ledger verification of its result and effects.')}
                    </Notice>

                    <View>
                        <Heading>{t('Cycle réseau', 'Network lifecycle')}</Heading>
                        <Row icon="check" title={t('1. Approbation', '1. Approval')} detail={t('Validité 5 minutes vérifiée off-chain', '5-minute validity verified off-chain')} positive />
                        <Row icon="check" title={t('2. Signature', '2. Signature')} detail={t('Clé Ed25519 locale non-custodiale (rPVMhWB...)', 'Local non-custodial Ed25519 key (rPVMhWB...)')} positive />
                        <Row icon="check" title={t('3. Envoi au réseau', '3. Submission')} detail={t('Broadcast au nœud devnet.xrpl.org:51233', 'Broadcast to devnet.xrpl.org:51233')} positive />
                        <Row icon="circle" title={t('4. Confirmation ledger', '4. Ledger confirmation')} detail={t('En attente de clôture du ledger devnet #49281', 'Awaiting ledger closure devnet #49281')} />
                    </View>
                </>}
                aside={<Rail>
                    <Heading>{t('Preuve on-chain', 'On-chain proof')}</Heading>
                    <Note>{t('Hash de transaction :', 'Transaction hash:')}</Note>
                    <T style={{ fontFamily: 'Courier', fontSize: 11, color: c.accent }}>
                        7F1D8B4E...91A2C3E5
                    </T>
                    <Button variant="secondary" onPress={() => router.push('/proposal')}>
                        {t('Vérifier le statut', 'Verify status')}
                    </Button>
                    <Note>{t('Les réserves cantonnées sont strictement séparées de la liquidité active.', 'Segregated reserves are strictly separated from active liquidity.')}</Note>
                </Rail>}
            />
        )}
    </>;
}

function Options() {
    const { t, setState } = useSession();
    const { data } = useClientData();
    const action = data?.plan.proposed_actions.find(a => a.type === 'own_funds_transfer');
    if (!action) return <T>{t('Aucune proposition disponible', 'No proposal available')}</T>;

    return <>
        <Title>{t('Vos options', 'Your options')}</Title>
        <T style={{ fontSize: 16, color: c.muted, marginBottom: 8 }}>
            {t('Préserver 100 € avant le salaire', 'Preserve €100 before payday')}
        </T>

        <Card warm style={{ gap: 14 }}>
            <View style={s.inline}>
                <View style={{ backgroundColor: '#382B2E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <T style={{ fontSize: 11, color: c.accent, fontFamily: tokens.font.medium }}>
                        {t('COMPATIBLE · SANS NOUVELLE DETTE', 'COMPATIBLE · NO NEW DEBT')}
                    </T>
                </View>
            </View>
            <Heading>{t('Transférer 230 € de l’épargne', 'Transfer €230 from savings')}</Heading>
            <Money value={action.amount_decimal} />
            <T>{t('70 € d’épargne restante. Réserve du courant préservée. À réaliser avant J+2.', '€70 remaining in savings. Current account reserve preserved. To complete before day 2.')}</T>
            <Note>{t('Coût bancaire éventuel à vérifier auprès de votre banque.', 'Possible banking fee to verify with your bank.')}</Note>
            <Button onPress={() => router.push('/proposal')}>{t('Voir ce plan', 'View this plan')}</Button>
        </Card>

        <Card style={{ gap: 12 }}>
            <Heading>{t('Demander un décalage du loyer', 'Request rent payment postponement')}</Heading>
            <T>{t('Accord du bailleur nécessaire. Le loyer reste à J+2 tant que la nouvelle date n’est pas confirmée.', 'Landlord agreement required. Rent remains scheduled at day 2 until confirmed.')}</T>
            <Note>{t('Option non engagée · aucune démarche automatique n’est effectuée sans votre accord.', 'Non-binding option · no automated request made without your consent.')}</Note>
        </Card>

        <Card style={{ gap: 12 }}>
            <Heading>{t('Et si mon épargne était protégée ?', 'What if my savings were protected?')}</Heading>
            <T>{t('Avec 300 € d’épargne protégée, aucune solution sans dette dans ce scénario fourni.', 'With €300 of protected savings, this supplied scenario has no debt-free solution.')}</T>
            <Button variant="secondary" onPress={() => { setState('no-solution'); router.push('/proposal'); }}>
                {t('Explorer ce diagnostic (sans dette)', 'Explore this diagnostic (no-debt)')}
            </Button>
        </Card>

        <Note style={{ marginTop: 8 }}>
            {t('Aucune dépense facultative à réduire n’est identifiée dans ces hypothèses.', 'No discretionary expense to reduce was identified under these assumptions.')}
        </Note>
        <Button variant="ghost" onPress={() => router.push('/sources')}>
            {t('Modifier les hypothèses', 'Modify assumptions')}
        </Button>
    </>;
}

function IndependentScreen() {
    const { t, setPersona } = useSession();
    return <>
        <Title>{t('Une rentrée est retardée', 'An income payment is late')}</Title>
        <Note>{t('PROCHAINS 3 JOURS · EXEMPLE INDÉPENDANT', 'NEXT 3 DAYS · FREELANCE EXAMPLE')}</Note>
        <Split
            main={<>
                <Card warm style={s.hero}>
                    <Money value="2400.00" size={60} />
                    <T style={{ fontSize: 18 }}>{t('Facture Studio Nord · attendue hier', 'Studio Nord invoice · expected yesterday')}</T>
                    <Note>{t('Montant facturé : 2 400 € · non encore encaissé', 'Invoiced amount: €2,400 · not yet credited')}</Note>
                </Card>

                <Notice title={t('Deux échéances sont concernées', 'Two due dates are affected')} tone="warning">
                    {t('La facture attendue ne compte pas comme argent disponible. Les dépenses du studio arrivent avant le règlement du client.', 'The expected invoice does not count as available money. Studio expenses arrive before client settlement.')}
                </Notice>

                <Card style={s.detail}>
                    <Heading>{t('Échéances activité', 'Business scheduled payments')}</Heading>
                    <Row
                        icon="rent"
                        title={t('Loyer du studio', 'Studio rent')}
                        detail={t('J+2 · Dépense essentielle d’exploitation', 'Day 2 · Essential operating expense')}
                        value="−900 €"
                    />
                    <Row
                        icon="file"
                        title={t('Fournisseur matériel', 'Equipment supplier')}
                        detail={t('J+3 · Commande validée', 'Day 3 · Confirmed purchase order')}
                        value="−650 €"
                    />
                    <Row
                        icon="shield"
                        title={t('Provision fiscale', 'Tax reserve')}
                        detail={t('Réservée · protégée de toute affectation opérationnelle', 'Reserved · protected from operational allocation')}
                        value="+1 400 €"
                        positive
                    />
                </Card>

                <Note>
                    {t('Votre espace personnel reste séparé. Aucun transfert entre espaces n’est automatique.', 'Your personal workspace remains separate. No transfer between spaces is automatic.')}
                </Note>

                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                    <Button onPress={() => router.push('/options')}>
                        {t('Comparer les options', 'Compare options')}
                    </Button>
                    <Button variant="secondary" onPress={() => router.push('/add')}>
                        {t('Actualiser la date de rentrée', 'Update income date')}
                    </Button>
                </View>
            </>}
            aside={<Rail>
                <Heading>{t('Séparation des patrimoines', 'Workspace separation')}</Heading>
                <T>{t('L’optimiseur garantit qu’aucun fonds personnel ne vient combler l’activité sans votre ordre exprès.', 'The optimizer ensures no personal funds patch business cashflow without your express order.')}</T>
                <Button variant="secondary" onPress={() => { setPersona('personal'); router.push('/'); }}>
                    {t('Revenir à Lina (Personnel)', 'Return to Lina (Personal)')}
                </Button>
            </Rail>}
        />
    </>;
}

function OrganizationScreen() {
    const { t, setPersona } = useSession();
    const [subScenario, setSubScenario] = useState<'31' | '32' | '33' | '34' | '35'>('31');

    return <>
        <View style={[s.between, { flexWrap: 'wrap', gap: 8 }]}>
            <Title>{t('Organisation', 'Organization')}</Title>
            <Button variant="ghost" onPress={() => { setPersona('personal'); router.push('/'); }}>
                {t('← Revenir à Lina', '← Return to Lina')}
            </Button>
        </View>

        <View style={[s.periods, { marginVertical: 12 }]}>
            {[
                { id: '31', label: t('31 · Incompatible', '31 · Incompatible') },
                { id: '32', label: t('32 · Approbation', '32 · Approval') },
                { id: '33', label: t('33 · Accès & DID', '33 · Access & DID') },
                { id: '34', label: t('34 · Frais sponsorisés', '34 · Sponsoring') },
                { id: '35', label: t('35 · Habilité', '35 · Authorized') },
            ].map(tab => (
                <Pressable
                    key={tab.id}
                    onPress={() => setSubScenario(tab.id as any)}
                    style={[s.period, subScenario === tab.id && { backgroundColor: c.raised, borderColor: '#5B454C' }]}
                >
                    <T style={[s.note, { color: subScenario === tab.id ? c.text : c.muted, fontSize: 11 }]}>
                        {tab.label}
                    </T>
                </Pressable>
            ))}
        </View>

        {subScenario === '31' && (
            <Split
                main={<>
                    <Card warm style={s.hero}>
                        <Note>{t('DIAGNOSTIC · EXEMPLE PME', 'DIAGNOSTIC · SME EXAMPLE')}</Note>
                        <Heading style={{ fontSize: 24 }}>{t('Capacité insuffisante', 'Insufficient capacity')}</Heading>
                        <Money value="90000.00" size={56} />
                        <Note>{t('Besoin formulé : 90 000 € · Plafond maximum : 80 000 €', 'Requested need: €90,000 · Maximum ceiling: €80,000')}</Note>
                    </Card>

                    <Notice title={t('Ce scénario est impossible (INFEASIBLE)', 'This scenario is impossible (INFEASIBLE)')} tone="warning">
                        {t('Le besoin dépasse la capacité. Aucune opération financière ne peut être exécutée.', 'The need exceeds available capacity. No financial operation can be executed.')}
                    </Notice>

                    <Card style={s.detail}>
                        <Heading>{t('Détail du calcul d’éligibilité', 'Eligibility calculation details')}</Heading>
                        <Row icon="warning" title={t('Besoin exprimé', 'Expressed need')} detail={t('Dépenses opérationnelles de clôture', 'Closing operating expenses')} value="90 000 €" />
                        <Row icon="shield" title={t('Capacité disponible du pool', 'Available pool capacity')} detail={t('Plafond XRPL XLS-65 / XLS-66', 'Ceiling XRPL XLS-65 / XLS-66')} value="80 000 €" />
                        <Row icon="circle" title={t('Écart non couvert', 'Uncovered gap')} detail={t('Déficit structurel hors limites de prêt', 'Structural deficit beyond loan limits')} value="−10 000 €" />
                    </Card>

                    <Note>
                        {t('Les fonds de clients cantonnés restent exclus. Une approbation ne peut pas dépasser ce plafond.', 'Segregated client funds remain excluded. An approval cannot exceed this ceiling.')}
                    </Note>

                    <Button onPress={() => setSubScenario('32')}>{t('Voir le scénario compatible 70 000 €', 'View compatible €70,000 scenario')}</Button>
                </>}
                aside={<Rail>
                    <Heading>{t('Garde-fous mathématiques', 'Mathematical safeguards')}</Heading>
                    <T>{t('Le solveur déterministe refuse formellement de générer une transaction si les contraintes du pool ne sont pas respectées.', 'The deterministic solver formally refuses to generate a transaction if pool constraints are not met.')}</T>
                </Rail>}
            />
        )}

        {subScenario === '32' && (
            <Split
                main={<>
                    <Card warm style={s.hero}>
                        <Note>{t('SIMULATION · CONDITIONS À VÉRIFIER', 'SIMULATION · CONDITIONS TO VERIFY')}</Note>
                        <Heading style={{ fontSize: 24 }}>{t('Scénario compatible', 'Compatible scenario')}</Heading>
                        <Money value="70000.00" size={56} />
                        <Note>{t('Besoin réajusté : 70 000 € · Capacité disponible : 80 000 €', 'Adjusted need: €70,000 · Available capacity: €80,000')}</Note>
                    </Card>

                    <Notice title={t('Approbation requise', 'Approval required')} tone="warning">
                        {t('Seule une personne habilitée peut approuver ces conditions. Votre rôle actuel : analyste (consultation et proposition uniquement).', 'Only an authorized person can approve these terms. Your current role: analyst (consultation and proposal only).')}
                    </Notice>

                    <Card style={s.detail}>
                        <Heading>{t('Conditions du prêt XRPL', 'XRPL Loan terms')}</Heading>
                        <Row icon="shield" title={t('Capacité du scénario', 'Scenario capacity')} detail={t('Compatible avec le pool d’actifs', 'Compatible with asset pool')} value="80 000 €" />
                        <Row icon="calendar" title={t('Durée proposée', 'Proposed duration')} detail={t('Remboursement planifié', 'Planned repayment')} value="30 jours" />
                        <Row icon="file" title={t('Taux / Coût total', 'Interest / Total fee')} detail={t('Fixé par le protocole XLS-66', 'Fixed by protocol XLS-66')} value="450 €" />
                    </Card>

                    <Note>
                        {t('Montant, frais, durée et remboursement doivent être renseignés avant signature. Tout changement invalide l’approbation.', 'Amount, fees, duration and repayment must be filled in before signature. Any change invalidates approval.')}
                    </Note>

                    <Button onPress={() => setSubScenario('35')}>{t('Demander une approbation (vue signataire)', 'Request approval (signer view)')}</Button>
                </>}
                aside={<Rail>
                    <Heading>{t('Exécution indisponible', 'Execution unavailable')}</Heading>
                    <T>{t('Les capacités réseau et les conditions ne sont pas encore vérifiées. Aucune clé privée de dépense n’est stockée sur nos serveurs.', 'Network capabilities and conditions are not yet verified. No private spending key is stored on our servers.')}</T>
                </Rail>}
            />
        )}

        {subScenario === '33' && (
            <Split
                main={<>
                    <Card warm style={{ gap: 12 }}>
                        <Note>{t('RÉSEAU DE TEST · CAPACITÉS À VÉRIFIER', 'TEST NETWORK · CAPABILITIES TO VERIFY')}</Note>
                        <Heading>{t('Pour accéder au fonds', 'To access the fund')}</Heading>
                        <T>{t('Une attestation valide, délivrée par un émetteur accepté, et l’accès au groupe autorisé (Permissioned Domain) sont requis.', 'A valid credential, issued by an accepted issuer, and access to the authorized group (Permissioned Domain) are required.')}</T>
                        <Row icon="shield" title={t('Accès du financeur', 'Funder access')} detail={t('Validateur d’attestation : Émetteur accrédité #892', 'Credential validator: Accredited Issuer #892')} positive />
                    </Card>

                    <Card style={{ gap: 12 }}>
                        <Heading>{t('Pour obtenir un financement', 'To obtain funding')}</Heading>
                        <T>{t('L’éligibilité et la capacité de remboursement sont évaluées séparément. L’accès au fonds ne garantit pas un prêt.', 'Eligibility and repayment capacity are assessed separately. Access to the fund does not guarantee a loan.')}</T>
                        <Row icon="check" title={t('Éligibilité de l’emprunteur', 'Borrower eligibility')} detail={t('Score de liquidité vérifié déterministement', 'Liquidity score deterministically verified')} positive />
                    </Card>

                    <Notice title={t('Attestation expirée ou révoquée', 'Expired or revoked credential')} tone="warning">
                        {t('Les nouvelles actions sont bloquées. Les droits de sortie doivent être vérifiés séparément.', 'New actions are blocked. Exit rights must be verified separately.')}
                    </Notice>

                    <Note>
                        {t('Identité portable (DID) : facultative. Elle ne suffit pas à établir votre éligibilité.', 'Decentralized Identifier (DID): optional. It is not sufficient on its own to establish eligibility.')}
                    </Note>
                </>}
                aside={<Rail>
                    <Heading>{t('Conformité XLS-65', 'XLS-65 Compliance')}</Heading>
                    <T>{t('Les Single Asset Vaults appliquent les règles du domaine sans intermédiaire centralisé.', 'Single Asset Vaults enforce domain rules without a centralized intermediary.')}</T>
                </Rail>}
            />
        )}

        {subScenario === '34' && (
            <Split
                main={<>
                    <Notice title={t('Prise en charge à vérifier', 'Sponsoring to verify')} tone="warning">
                        {t('Aucun sponsor actif n’est confirmé. Vous ne pouvez pas encore utiliser cette option.', 'No active sponsor is confirmed. You cannot use this option yet.')}
                    </Notice>

                    <Card style={s.detail}>
                        <Heading>{t('Limites de sponsoring', 'Sponsoring limits')}</Heading>
                        <Row icon="shield" title={t('Payeur des frais', 'Fee payer')} detail={t('Sponsor tiers accrédité', 'Accredited third-party sponsor')} value="rSponsor92..." />
                        <Row icon="circle" title={t('Plafond par opération', 'Limit per operation')} detail={t('Frais de gaz réseau maximum couverts', 'Maximum covered network gas fee')} value="0.005 XRP" />
                        <Row icon="circle" title={t('Budget journalier', 'Daily budget')} detail={t('Consommation globale du compte entreprise', 'Global enterprise account consumption')} value="50 XRP / jour" />
                    </Card>

                    <Note>
                        {t('Bénéficiaires autorisés uniquement. Une révocation ou un plafond atteint rend l’option indisponible. Les réserves immobilisées sont séparées des frais consommés.', 'Authorized beneficiaries only. Revocation or reaching the limit makes the option unavailable. Locked reserves are separated from consumed fees.')}
                    </Note>
                </>}
                aside={<Rail>
                    <Heading>{t('Règles du protocole', 'Protocol rules')}</Heading>
                    <T>{t('Le parrainage de transaction ne confère aucun droit sur les actifs empruntés.', 'Transaction sponsoring grants no rights over borrowed assets.')}</T>
                </Rail>}
            />
        )}

        {subScenario === '35' && (
            <Split
                main={<>
                    <Card warm style={s.hero}>
                        <Note>{t('SIMULATION · APPROBATEUR HABILITÉ', 'SIMULATION · AUTHORIZED SIGNER')}</Note>
                        <Heading style={{ fontSize: 24 }}>{t('Revoir les conditions', 'Review conditions')}</Heading>
                        <Money value="70000.00" size={56} />
                        <Note>{t('Scénario compatible avec une capacité de 80 000 €.', 'Compatible scenario with a capacity of €80,000.')}</Note>
                    </Card>

                    <Card style={s.detail}>
                        <Heading>{t('Paramètres contractuels validés', 'Validated contractual parameters')}</Heading>
                        <Row icon="calendar" title={t('Durée proposée', 'Proposed duration')} detail={t('Échéance unique à 30 jours', 'Single due date at 30 days')} value="30 jours" />
                        <Row icon="file" title={t('Coût total prévu', 'Total expected cost')} detail={t('Intérêts courus et frais de mise à disposition', 'Accrued interest and availability fee')} value="450 €" />
                        <Row icon="shield" title={t('Remboursement', 'Repayment')} detail={t('Échéance in fine déduite des encaissements clients', 'Bullet repayment deducted from client collections')} value="70 450 €" />
                    </Card>

                    <Notice title={t('Approbation liée à ces conditions', 'Approval tied to these conditions')} tone="success">
                        {t('Tout changement demande une nouvelle approbation. Validité proposée : 5 minutes.', 'Any change requires a fresh approval. Proposed validity: 5 minutes.')}
                    </Notice>

                    <Button onPress={() => router.push('/tracking')}>
                        {t('Approuver le scénario (simulation)', 'Approve scenario (simulation)')}
                    </Button>

                    <Note>
                        {t('Cette maquette enregistre une approbation simulée. La signature reste indisponible tant que réseau, actif et capacités ne sont pas vérifiés.', 'This mockup records a simulated approval. Signature remains unavailable until network, asset and capabilities are verified.')}
                    </Note>
                </>}
                aside={<Rail>
                    <Heading>{t('Rôle Signataire', 'Signer Role')}</Heading>
                    <T>{t('Vous disposez des privilèges de signature pour engager la ligne de trésorerie de l’organisation.', 'You hold signing privileges to commit the organization’s treasury line.')}</T>
                    <Button variant="secondary" onPress={() => router.push('/tracking')}>
                        {t('Voir le suivi réseau', 'View network tracking')}
                    </Button>
                </Rail>}
            />
        )}
    </>;
}

function AddEvent() {
    const { t } = useSession();
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const input = useRef<TextInput>(null);
    const createEvent = useCreateEvent();

    return <>
        <Title>{t('Ajouter une échéance', 'Add a due date')}</Title>
        <Card style={{ maxWidth: 680 }}>
            <Field ref={input} label={t('Libellé', 'Label')} value={label} onChangeText={setLabel} placeholder={t('Ex. Loyer', 'e.g. Rent')} error={error && !label ? error : undefined}/>
            <Field label={t('Montant en EUR', 'Amount in EUR')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="600,00"/>
            <Field label={t('Date prévue (AAAA-MM-JJ)', 'Expected date (YYYY-MM-DD)')} value={date} onChangeText={setDate} placeholder="2026-09-14"/>
            <Note>{t('Cette saisie reste déclarative. Les prévisions se mettent à jour automatiquement.', 'This entry remains declared. Forecasts update automatically.')}</Note>
            {error ? <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T> : null}
            <Button
                busy={createEvent.isPending}
                onPress={() => {
                    const normalizedAmount = amount.replace(',', '.');
                    if (!label.trim() || !DecimalStringSchema.safeParse(normalizedAmount).success || normalizedAmount.startsWith('-') || !/[1-9]/.test(normalizedAmount) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
                        setError(t('Vérifiez le libellé, le montant positif et la date.', 'Check the label, positive amount and date.'));
                        input.current?.focus();
                        return;
                    }
                    setError('');
                    createEvent.mutate({
                        direction: 'outflow',
                        amount_decimal: normalizedAmount,
                        asset_id: 'EUR',
                        label: label.trim(),
                        expected_settlement_at: `${date}T10:00:00Z`,
                    }, {
                        onSuccess: () => {
                            setSaved(true);
                            setTimeout(() => router.push('/calendar'), 800);
                        },
                    });
                }}
            >
                {t('Enregistrer l’échéance', 'Save due date')}
            </Button>
            {saved && <Notice title={t('Échéance enregistrée', 'Due date saved')} tone="success">{t('L’échéance a été ajoutée à vos prévisions.', 'The due date was added to your forecast.')}</Notice>}
            <Button variant="secondary" onPress={() => router.push('/sources')}>{t('Retour aux sources', 'Back to sources')}</Button>
        </Card>
    </>;
}

function ImportPreview() {
    const { t } = useSession();
    const [excluded, setExcluded] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    return <>
        <Title>{t('Aperçu de l’import', 'Import preview')}</Title>
        <Note>{t('Exemple synthétique de la maquette · aucun fichier chargé', 'Synthetic design example · no file uploaded')}</Note>
        <Card>
            <Heading>operations.csv</Heading>
            <Row icon="file" title={t('12 lignes détectées dans l’exemple', '12 rows detected in the example')} detail={t('11 lignes distinctes et 1 doublon illustratif', '11 distinct rows and 1 illustrative duplicate')}/>
            <Notice title={t('Un doublon à vérifier', 'One duplicate to check')}>{t('L’exemple contient deux lignes identiques. Excluez le doublon pour continuer.', 'The example contains two identical rows. Exclude the duplicate to continue.')}</Notice>
            <Button variant="secondary" onPress={() => { setExcluded(!excluded); setConfirmed(false); }}>
                {excluded ? t('Réinclure le doublon', 'Include duplicate again') : t('Exclure le doublon', 'Exclude duplicate')}
            </Button>
            <Button disabled={!excluded} onPress={() => setConfirmed(true)}>
                {t('Confirmer l’aperçu de démonstration', 'Confirm demonstration preview')}
            </Button>
            {confirmed && <T accessibilityLiveRegion="polite">{t('Aperçu validé : 11 lignes. Aucune importation ni écriture financière effectuée.', 'Preview validated: 11 rows. No import or financial write was performed.')}</T>}
            <Button variant="ghost" onPress={() => router.push('/sources')}>{t('Retour aux sources', 'Back to sources')}</Button>
        </Card>
    </>;
}

function Diagnostic() { const { t, persona, setState } = useSession(); return <><Title>{t('Aucune solution compatible', 'No compatible solution')}</Title><Card><Icon name="shield" color={c.warning} size={32}/><Heading>{persona === 'organization' ? t('Le besoin dépasse la capacité', 'The need exceeds capacity') : t('Votre réserve reste protégée', 'Your reserve remains protected')}</Heading><T>{persona === 'organization' ? t('Besoin : 90 000 €. Plafond : 80 000 €. Résultat de référence : INFEASIBLE.', 'Need: €90,000. Limit: €80,000. Reference result: INFEASIBLE.') : t('Avec 300 € d’épargne protégée, le scénario Lina fourni ne permet pas de solution sans dette.', 'With €300 of protected savings, the supplied Lina scenario has no debt-free solution.')}</T><Note>{t('Diagnostic de démonstration fourni, sans nouvelle action financière. Aucune réserve n’est réduite.', 'Provided demonstration diagnostic, without a new financial action. No reserve is reduced.')}</Note><Button onPress={() => { setState('ready'); router.push('/sources'); }}>{t('Vérifier les données', 'Check data')}</Button></Card></>; }
function Audience() { const { t, persona, setPersona } = useSession(); if (persona === 'independent') return <IndependentScreen />; if (persona === 'organization') return <OrganizationScreen />; return <Button variant="secondary" onPress={() => { setPersona('personal'); router.push('/'); }}>{t('Revenir à Lina', 'Return to Lina')}</Button>; }
export function Screen({ screen }: {
    screen: string;
}) {
    const { state, setState, persona, t } = useSession();
    const query = useClientData();
    if (state === 'loading' || query.isPending)
        return <><Title>{t('Chargement', 'Loading')}</Title><Card><ActivityIndicator color={c.accent}/><T accessibilityLiveRegion="polite">{t('Chargement des données…', 'Loading data…')}</T>{state === 'loading' && <Button variant="secondary" onPress={() => setState('ready')}>{t('Terminer l’aperçu de chargement', 'Finish loading preview')}</Button>}</Card></>;
    if (state === 'error' || query.isError)
        return <><Title>{t('Données indisponibles', 'Data unavailable')}</Title><Card><T accessibilityRole="alert">{t('Impossible de charger les données. Aucun solde n’a été modifié.', 'Could not load data. No balance has changed.')}</T><Button onPress={() => { setState('ready'); void query.refetch(); }}>{t('Réessayer', 'Try again')}</Button></Card></>;
    if (state === 'empty')
        return <><Title>{t('Commençons simplement.', 'Let’s start simply.')}</Title><Card><T>{t('Aucune donnée dans cet aperçu. Ajoutez une échéance ou découvrez le scénario de Lina, sans wallet ni compte bancaire connecté.', 'No data in this preview. Add a due date or explore Lina’s scenario, without a wallet or connected bank account.')}</T><Button onPress={() => { setState('ready'); router.push('/add'); }}>{t('Ajouter une échéance', 'Add a due date')}</Button><Button variant="secondary" onPress={() => setState('ready')}>{t('Découvrir avec Lina', 'Explore with Lina')}</Button></Card></>;
    if (persona !== 'personal')
        return <Audience />;
    if (state === 'no-solution' && ['proposal', 'calendar', 'home'].includes(screen))
        return <Diagnostic />;
    const pages: Record<string, React.ReactNode> = { home: <Home />, calendar: <Calendar />, sources: <Sources />, proposal: <Proposal />, tracking: <Tracking />, options: <Options />, add: <AddEvent />, import: <ImportPreview /> };
    return <>{state === 'stale' && <Notice title={t('Données anciennes', 'Outdated data')}>{t('Référence synthétique : 12 septembre 2026. Consultation uniquement ; actualisation réelle non raccordée.', 'Synthetic reference: September 12, 2026. Viewing only; live refresh is not connected.')}</Notice>}{state === 'unavailable' && <Notice title={t('Capacité financière indisponible', 'Financial capability unavailable')}>{t('La prévision reste accessible sans wallet, DID, KYC ou crédit.', 'Forecasting remains available without a wallet, DID, KYC or credit.')}</Notice>}{pages[screen] ?? <><Title>{t('Page introuvable', 'Page not found')}</Title><Button onPress={() => router.replace('/')}>{t('Retour à l’accueil', 'Back home')}</Button></>}</>;
}
const s = StyleSheet.create({
    title: { fontSize: 28, lineHeight: 36, letterSpacing: -0.8, fontFamily: tokens.font.regular },
    heading: { fontSize: 20, lineHeight: 28, letterSpacing: -0.3, fontFamily: tokens.font.medium },
    note: { fontSize: 13, lineHeight: 20, color: c.muted, fontFamily: tokens.font.regular },
    money: { fontFamily: 'Inter_300Light', letterSpacing: -2.5, fontVariant: ['tabular-nums'] },
    split: { gap: 32, alignItems: 'stretch' },
    main: { gap: 24, minWidth: 0 },
    aside: { gap: 24, minWidth: 0 },
    rail: { borderRadius: 28, padding: 24, gap: 24, borderWidth: 1, borderColor: '#3F353C' },
    hero: { borderRadius: 28, padding: 24, gap: 20, borderWidth: 1, borderColor: '#5B454C' },
    detail: { backgroundColor: '#1D191F', padding: 20, gap: 20, borderWidth: 1, borderColor: c.border, borderRadius: 24 },
    notice: { backgroundColor: '#2C252A', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#3F353C' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    periods: { flexDirection: 'row', gap: 6 },
    period: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
});

