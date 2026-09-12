import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Line, Path } from 'react-native-svg';
import { Badge, Button, Card, Field, PageTransition, Typography as T, tokens } from '@octro/ui';
import { DecimalStringSchema } from '@octro/contracts';
import type { EconomicEvent, Projection, ProjectionResult, ProposedAction } from '@octro/contracts';
import { demoFixture, euro } from './data';
import { useAcknowledge, useClientData, useCreateEvent, useRemoveEvent, useResetEvents, useSetHorizon, useUpdateBalances, useSession } from './session';
import { useDesktop } from './Shell';
import { Icon } from './Icon';
import { WalletModal } from './Wallet';

const c = tokens.color;
const DEMO_EXPENSE = '150.00';
const PERIODS = [7, 14, 30] as const;

function Title({ children }: { children: React.ReactNode }) {
    return <T nativeID="screen-title" accessibilityRole="header" {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={s.title}>{children}</T>;
}
function Heading({ children }: { children: React.ReactNode }) { return <T accessibilityRole="header" style={s.heading}>{children}</T>; }
function Note({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warning' | 'success' | 'error' }) {
    return <T style={[s.note, { color: c[tone] }]}>{children}</T>;
}
function Money({ value, size = 56 }: { value: string; size?: number }) {
    const { language } = useSession();
    return <T variant="amount" style={[s.money, { fontSize: size, lineHeight: size * 1.1 }]}>{euro(value, language)}</T>;
}
function Split({ main, aside }: { main: React.ReactNode; aside?: React.ReactNode }) {
    const desktop = useDesktop();
    return <View style={[s.split, desktop && s.splitDesktop]}><View style={[s.main, desktop && s.mainDesktop]}>{main}</View>{aside && <View style={[s.aside, desktop && s.asideDesktop]}>{aside}</View>}</View>;
}
function Rail({ children }: { children: React.ReactNode }) { return <View style={s.rail}>{children}</View>; }
function Notice({ title, children, tone = 'warning' }: { title: string; children: React.ReactNode; tone?: 'warning' | 'success' | 'error' }) {
    return <View style={[s.notice, tone === 'error' && s.noticeError, tone === 'success' && s.noticeSuccess]}>
        <T style={{ fontFamily: tokens.font.medium, color: c[tone] }}>{title}</T>
        <T style={{ color: c.text, lineHeight: 23 }}>{children}</T>
    </View>;
}
function CardTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
    return <View style={{ gap: 6 }}>{eyebrow && <T style={s.eyebrow}>{eyebrow}</T>}<Heading>{title}</Heading></View>;
}

function units(value: string): bigint {
    const negative = value.startsWith('-');
    const [whole, fraction = ''] = value.replace('-', '').split('.');
    const scaled = BigInt(`${whole}${fraction.padEnd(18, '0')}`);
    return negative ? -scaled : scaled;
}
function compareDecimal(a: string, b: string): number {
    const left = units(a);
    const right = units(b);
    return left < right ? -1 : left > right ? 1 : 0;
}
type ProjectionPoint = Projection['points'][number];
function minimumPoint(points: ProjectionPoint[]): ProjectionPoint | undefined {
    return points.reduce<ProjectionPoint | undefined>((lowest, point) =>
        lowest === undefined || compareDecimal(point.expected_balance, lowest.expected_balance) < 0 ? point : lowest, undefined);
}
function daysLabel(day: number, language: 'fr' | 'en'): string {
    return day === 0 ? (language === 'fr' ? 'Aujourd’hui' : 'Today') : `J+${day}`;
}

type PlanView = { state: 'loading' | 'unavailable' | 'stale' | 'infeasible' | 'inconsistent' | 'none' | 'feasible'; action?: ProposedAction; result?: ProjectionResult };
function getPlanView(data: ReturnType<typeof useClientData>['data']): PlanView {
    if (!data) return { state: 'loading' };
    if (!data.result) return { state: data.sourceState === 'stale' ? 'stale' : 'unavailable' };
    if (data.result.status === 'INFEASIBLE') return { state: 'infeasible', result: data.result };

    const action = data.result.action_plan.proposed_actions.find(item => item.type !== 'no_action');
    if (!action) return { state: 'none', result: data.result };
    if (action.type === 'own_funds_transfer') {
        const savings = units(data.request.opening_balances.savings);
        const protectedReserve = units(data.request.savings_protected_reserve);
        const available = savings > protectedReserve ? savings - protectedReserve : 0n;
        if (units(action.amount_decimal) > available) return { state: 'inconsistent', result: data.result };
    }
    return { state: 'feasible', action, result: data.result };
}

function EventRow({ event, onRemove }: { event: EconomicEvent; onRemove?: () => void }) {
    const { t, language } = useSession();
    const remove = useRemoveEvent();
    const data = useClientData().data;
    const anchor = data?.result?.projection.as_of ?? data?.provenance.asOf;
    const day = event.expected_settlement_at && anchor
        ? Math.max(0, Math.round((Date.parse(event.expected_settlement_at) - Date.parse(anchor)) / 86_400_000))
        : null;
    const label = event.label === 'loyer' ? t('Loyer', 'Rent')
        : event.label === 'courses' ? t('Courses', 'Groceries')
            : event.label === 'transport' ? t('Transport', 'Transport')
                : event.label === 'salaire' ? t('Salaire', 'Pay')
                    : event.label === 'imprévu' ? t('Imprévu', 'Unexpected expense') : event.label;
    const icon = event.direction === 'inflow' ? 'salary' : event.label === 'loyer' ? 'rent' : 'calendar';
    return <View style={s.row}>
        <View style={s.rowIcon}><Icon name={icon} size={18} color={c.accent} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T style={s.rowTitle}>{label}</T>
            <Note>{`${day === null ? '—' : daysLabel(day, language)} · ${event.verification === 'declared' ? t('Déclaré', 'Declared') : t('Observé', 'Observed')}`}</Note>
        </View>
        <T style={[s.rowValue, event.direction === 'inflow' && { color: c.success }]}>{event.direction === 'inflow' ? '+' : '−'}{euro(event.amount.amount_decimal, language)}</T>
        {onRemove && <Pressable onPress={() => remove.mutate(event.id)} disabled={remove.isPending} accessibilityRole="button" accessibilityLabel={t(`Supprimer ${label}`, `Remove ${label}`)} style={s.removeButton}>
            <T style={{ color: c.muted, fontSize: 18 }}>×</T>
        </Pressable>}
    </View>;
}
function EventList({ short = false, allowDelete = false }: { short?: boolean; allowDelete?: boolean }) {
    const data = useClientData().data;
    const events = useMemo(() => (data?.events ?? []).filter(event => !short || ['loyer', 'salaire'].includes(event.label)), [data?.events, short]);
    if (events.length === 0) return <Note>{'Aucune échéance enregistrée.'}</Note>;
    return <View>{events.map(event => <EventRow key={event.id} event={event} onRemove={allowDelete ? () => undefined : undefined} />)}</View>;
}

function ProjectionChart() {
    const { t, language } = useSession();
    const data = useClientData().data;
    const points = data?.result?.projection.points ?? [];
    const reserve = data?.request.current_reserve;
    if (!data?.result || points.length < 2 || !reserve) {
        return <Card style={s.chartEmpty}>
            <View style={s.emptyIcon}><Icon name="calendar" size={20} color={c.accent} /></View>
            <T style={{ fontFamily: tokens.font.medium }}>{t('Projection en attente', 'Forecast pending')}</T>
            <Note>{t('Les événements restent visibles. La courbe apparaîtra après un calcul serveur à jour.', 'Events remain available. The chart appears after a fresh server calculation.')}</Note>
        </Card>;
    }
    const values = points.map(point => Number(point.expected_balance));
    const reserveNumber = Number(reserve);
    const min = Math.min(0, reserveNumber, ...values);
    const max = Math.max(reserveNumber, ...values);
    const spread = Math.max(1, max - min);
    const width = 736;
    const height = 210;
    const padding = 20;
    const x = (index: number) => padding + index * (width - padding * 2) / (points.length - 1);
    const y = (value: number) => height - padding - (value - min) / spread * (height - padding * 2);
    const expectedPath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(values[index]!).toFixed(1)}`).join(' ');
    const confirmedPath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(Number(point.confirmed_balance)).toFixed(1)}`).join(' ');
    const reserveY = y(reserveNumber);
    const tickIndexes = [...new Set([0, Math.round((points.length - 1) / 3), Math.round((points.length - 1) * 2 / 3), points.length - 1])];
    const lowest = minimumPoint(points);
    const chartLabel = lowest
        ? t(`Projection sur ${data.result.projection.horizon.steps} jours. Point bas ${euro(lowest.expected_balance, language)} à ${daysLabel(lowest.t, language)}.`, `Forecast over ${data.result.projection.horizon.steps} days. Low ${euro(lowest.expected_balance, language)} on ${daysLabel(lowest.t, language)}.`)
        : t('Projection de trésorerie', 'Cashflow projection');

    return <View style={{ gap: 12 }}>
        <View style={s.legend}>
            <View style={s.legendItem}><View style={[s.legendLine, { backgroundColor: c.accent }]} /><Note>{t('Prévu', 'Expected')}</Note></View>
            <View style={s.legendItem}><View style={[s.legendLine, s.legendDashed]} /><Note>{t('Confirmé', 'Confirmed')}</Note></View>
            <View style={s.legendItem}><View style={[s.legendLine, { backgroundColor: c.earth }]} /><Note>{t('Réserve', 'Reserve')}</Note></View>
        </View>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" accessibilityRole="image" accessibilityLabel={chartLabel}>
            {[0.25, 0.5, 0.75].map(fraction => <Line key={fraction} x1={0} y1={padding + fraction * (height - padding * 2)} x2={width} y2={padding + fraction * (height - padding * 2)} stroke={c.border} strokeWidth={1} />)}
            <Line x1={0} y1={reserveY} x2={width} y2={reserveY} stroke={c.earth} strokeWidth={1.5} />
            <Path d={confirmedPath} fill="none" stroke={c.muted} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.8} />
            <Path d={expectedPath} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <View style={s.chartTicks}>{tickIndexes.map(index => <Note key={index}>{daysLabel(points[index]!.t, language)}</Note>)}</View>
        <Note>{chartLabel}</Note>
    </View>;
}

function PeriodSelector() {
    const { t } = useSession();
    const data = useClientData().data;
    const setHorizon = useSetHorizon();
    const selected = data?.request.horizon.steps ?? 30;
    return <View style={s.periods}>
        {PERIODS.map(days => <Pressable key={days} disabled={setHorizon.isPending} onPress={() => setHorizon.mutate(days)} accessibilityRole="button" accessibilityState={{ selected: selected === days, disabled: setHorizon.isPending }} style={[s.period, selected === days && s.periodSelected]}>
            <T style={[s.periodText, selected === days && s.periodTextSelected]}>{days} {t('jours', 'days')}</T>
        </Pressable>)}
    </View>;
}

function SimulationToolbar() {
    const { t } = useSession();
    const data = useClientData().data;
    const createEvent = useCreateEvent();
    const resetEvents = useResetEvents();
    const alreadyAdded = data?.events.some(event => event.label === 'imprévu') ?? false;
    const asOf = data?.result?.projection.as_of ?? data?.provenance.asOf ?? new Date().toISOString();
    const eventDate = new Date(Date.parse(asOf) + 3 * 86_400_000).toISOString();
    return <Card style={s.simulationCard}>
        <View style={s.simulationCopy}>
            <T style={{ fontFamily: tokens.font.medium }}>{t('Tester un imprévu', 'Test an unexpected expense')}</T>
            <Note>{t('Ajoute une dépense déclarée au scénario et demande un nouveau calcul.', 'Adds a declared expense to the scenario and requests a fresh calculation.')}</Note>
        </View>
        <View style={s.simulationActions}>
            <Button variant="secondary" disabled={alreadyAdded} busy={createEvent.isPending} onPress={() => createEvent.mutate({
                direction: 'outflow', amount_decimal: DEMO_EXPENSE, asset_id: 'fiat:EUR', label: 'imprévu', expected_settlement_at: eventDate,
            })}>{alreadyAdded ? t('Imprévu ajouté', 'Expense added') : t(`Ajouter ${euro(DEMO_EXPENSE)}`, `Add ${euro(DEMO_EXPENSE, 'en')}`)}</Button>
            <Button variant="ghost" busy={resetEvents.isPending} onPress={() => resetEvents.mutate()}>{t('Réinitialiser', 'Reset')}</Button>
        </View>
    </Card>;
}

function RecalculationNotice() {
    const { t } = useSession();
    const data = useClientData().data;
    const planView = getPlanView(data);
    if (planView.state === 'stale') return <Notice title={t('Projection à recalculer', 'Forecast needs recalculation')}>
        {t('Les hypothèses ont changé. Le plan précédent n’est plus affiché ; aucun transfert n’est recommandé avant le nouveau résultat.', 'Assumptions changed. The previous plan is hidden; no transfer is recommended until a fresh result is available.')}
    </Notice>;
    if (planView.state === 'unavailable') return <Notice title={t('Calcul indisponible', 'Calculation unavailable')}>
        {t('Le service de projection ne répond pas. Les événements déclarés restent consultables, mais aucune action n’est recommandée.', 'The forecast service is unavailable. Declared events remain visible, but no action is recommended.')}
    </Notice>;
    return null;
}

function DiagnosticCard({ state }: { state: PlanView['state'] }) {
    const { t, language } = useSession();
    const data = useClientData().data;
    const diagnostic = data?.result?.status === 'INFEASIBLE' ? data.result.diagnostic : null;
    if (state !== 'infeasible' && state !== 'inconsistent') return null;
    const reason = diagnostic?.reason ?? t('Le transfert proposé dépasse les fonds mobilisables après réserve protégée. Le plan a été bloqué.', 'The proposed transfer exceeds available savings after the protected reserve. The plan was blocked.');
    return <Notice title={t('INFEASIBLE · Aucune solution sans dette', 'INFEASIBLE · No debt-free solution')} tone="error">
        <>{diagnostic && <>{t('Besoin de liquidité : ', 'Liquidity shortfall: ')}{euro(diagnostic.deficit.amount_decimal, language)}. </>}{reason}</>
    </Notice>;
}

function TransferCard({ compact = false }: { compact?: boolean }) {
    const { t, language } = useSession();
    const data = useClientData().data;
    const plan = getPlanView(data);
    if (plan.state === 'infeasible' || plan.state === 'inconsistent') return <DiagnosticCard state={plan.state} />;
    if (plan.state !== 'feasible' || plan.action?.type !== 'own_funds_transfer') {
        if (plan.state === 'none') return <Notice title={t('Aucune action nécessaire', 'No action needed')} tone="success">
            {t('Le plan ne propose aucun transfert. Les hypothèses et le résultat restent consultables.', 'The plan recommends no transfer. Assumptions and results remain available.')}
        </Notice>;
        return <RecalculationNotice />;
    }
    return <Card warm style={compact ? s.transferCompact : s.transferCard}>
        <T style={s.eyebrow}>{t('PROPOSITION · SANS NOUVELLE DETTE', 'PROPOSAL · NO NEW DEBT')}</T>
        <Money value={plan.action.amount_decimal} size={compact ? 42 : 52} />
        <T style={s.transferTitle}>{t('Depuis l’épargne vers le courant', 'From savings to current account')}</T>
        <Note>{t('Proposition uniquement. Aucun mouvement d’argent n’a été exécuté.', 'Proposal only. No money movement has been executed.')}</Note>
        {!compact && <Button onPress={() => router.push('/proposal')}>{t('Examiner le plan', 'Review the plan')}</Button>}
        {compact && <Button variant="secondary" onPress={() => router.push('/proposal')}>{t('Voir les détails', 'View details')}</Button>}
    </Card>;
}

function Home() {
    const { t, language, persona } = useSession();
    const desktop = useDesktop();
    const data = useClientData().data;
    const points = data?.result?.projection.points ?? [];
    const lowest = minimumPoint(points);
    const planView = getPlanView(data);
    const resultTitle = planView.state === 'feasible'
        ? t('Le plan respecte vos réserves.', 'The plan respects your reserves.')
        : planView.state === 'none'
            ? t('Aucune action nécessaire.', 'No action is needed.')
            : planView.state === 'infeasible' || planView.state === 'inconsistent'
                ? t('Les contraintes ne peuvent pas toutes être respectées.', 'The constraints cannot all be met.')
                : t('Projection à recalculer.', 'Forecast needs recalculation.');
    const title = persona === 'personal' ? t('Voir venir, sans perdre l’essentiel.', 'See what is coming. Protect what matters.')
        : persona === 'independent' ? t('Garder le cap sur votre activité.', 'Keep your business on course.')
            : t('Décider avec une vue commune.', 'Decide from a shared view.');
    return <PageTransition key="home">
        <Title>{title}</Title>
        <Note>{t('Une lecture claire de vos entrées, échéances et réserves.', 'A clear view of your income, due dates and reserves.')}</Note>
        <RecalculationNotice />
        <Split main={<>
            <Card warm style={s.hero}>
                <View style={s.heroTop}>
                    <View style={{ gap: 7 }}>
                        <T style={s.eyebrow}>{t('SOLDE DÉCLARÉ · COMPTE COURANT', 'DECLARED BALANCE · CURRENT ACCOUNT')}</T>
                        {data ? <Money value={data.request.opening_balances.current} size={desktop ? 68 : 54} /> : <ActivityIndicator color={c.accent} />}
                    </View>
                    <View style={s.heroMark}><Icon name="calendar" size={22} color={c.accent} /></View>
                </View>
                <View style={s.heroFooter}>
                    <Note>{t('Épargne déclarée', 'Declared savings')}</Note>
                    <T style={s.heroValue}>{data ? euro(data.request.opening_balances.savings, language) : '—'}</T>
                </View>
                <Note>{t('Espace personnel · données déclarées', 'Personal workspace · declared data')}</Note>
            </Card>
            <View style={s.section}>
                <View style={s.sectionHeader}><CardTitle eyebrow={t('PROJECTION PERSONNELLE', 'PERSONAL FORECAST')} title={t('Le mois en un regard', 'The month at a glance')} />{data?.result && <Badge tone={planView.state === 'infeasible' || planView.state === 'inconsistent' ? 'error' : 'success'}>{planView.state === 'infeasible' || planView.state === 'inconsistent' ? 'INFEASIBLE' : t('Calculé', 'Calculated')}</Badge>}</View>
                <Card style={s.chartCard}><ProjectionChart /></Card>
                {lowest && <View style={s.lowSummary}>
                    <View style={{ flex: 1, minWidth: 0 }}><T style={s.eyebrow}>{t('POINT BAS PRÉVU', 'PROJECTED LOW')}</T><Money value={lowest.expected_balance} size={28} /><Note>{t('À ', 'On ')}{daysLabel(lowest.t, language)}</Note></View>
                    <View style={s.reserveSummary}><Icon name="shield" size={19} color={c.accent} /><T style={s.reserveSummaryText}>{t('Réserve à préserver : ', 'Protected reserve: ')}{data ? euro(data.request.current_reserve, language) : '—'}</T></View>
                </View>}
            </View>
            <SimulationToolbar />
            <View style={s.section}><View style={s.sectionHeader}><CardTitle eyebrow={t('À VENIR', 'UP NEXT')} title={t('Prochaines échéances', 'Upcoming events')} /><Button variant="ghost" onPress={() => router.push('/calendar')}>{t('Tout voir', 'View all')}</Button></View><EventList short /></View>
        </>} aside={desktop ? <Rail>
            <CardTitle eyebrow={t('VOTRE RÉSULTAT', 'YOUR RESULT')} title={resultTitle} />
            <TransferCard compact />
            <Button variant="secondary" onPress={() => router.push('/sources')}>{t('Mettre à jour mes données', 'Update my data')}</Button>
            <Button variant="ghost" onPress={() => router.push('/add')}>{t('Ajouter une échéance', 'Add an event')}</Button>
            <Note>{t('Prévision disponible sans wallet, DID, KYC ni crédit.', 'Forecasting works without a wallet, DID, KYC or credit.')}</Note>
        </Rail> : undefined} />
    </PageTransition>;
}

function Calendar() {
    const { t, language } = useSession();
    const data = useClientData().data;
    const points = data?.result?.projection.points ?? [];
    const lowest = minimumPoint(points);
    return <PageTransition key="calendar">
        <Title>{t('Calendrier', 'Calendar')}</Title>
        <Note>{t('Les revenus attendus sont des prévisions, pas du cash confirmé.', 'Expected income is a forecast, not confirmed cash.')}</Note>
        <RecalculationNotice />
        <Card style={s.chartCard}>
            <View style={s.sectionHeader}><CardTitle eyebrow={t('SOLDE ATTENDU', 'EXPECTED BALANCE')} title={t('Évolution du courant', 'Current account over time')} /><PeriodSelector /></View>
            <ProjectionChart />
            {lowest && <View style={s.lowSummary}><View style={{ flex: 1 }}><T style={s.eyebrow}>{t('POINT BAS', 'LOWEST POINT')}</T><Money value={lowest.expected_balance} size={34}/></View><Note>{daysLabel(lowest.t, language)}</Note></View>}
        </Card>
        <TransferCard />
        <View style={s.section}>
            <View style={s.sectionHeader}><CardTitle eyebrow={t('DÉCLARÉES', 'DECLARED')} title={t('Échéances', 'Scheduled events')} /><Button variant="secondary" onPress={() => router.push('/add')}>{t('Ajouter', 'Add')}</Button></View>
            <Card style={s.eventCard}><EventList allowDelete /></Card>
        </View>
    </PageTransition>;
}

function Comparison() {
    const { t, language } = useSession();
    const data = useClientData().data;
    const points = data?.result?.projection.points ?? [];
    const opening = data?.request.opening_balances.current;
    const lowest = minimumPoint(points);
    const entries = [
        [t('Solde de départ', 'Opening balance'), opening],
        [t('Point bas attendu', 'Expected low point'), lowest?.expected_balance],
        [t('Réserve protégée', 'Protected reserve'), data?.request.current_reserve],
    ].filter((entry): entry is [string, string] => entry[1] !== undefined);
    return <View style={s.comparison}>
        <CardTitle eyebrow={t('RÉSULTAT STRUCTURÉ', 'STRUCTURED RESULT')} title={t('Hypothèses et prévision', 'Inputs and forecast')} />
        {entries.map(([label, amount]) => <View key={label} style={s.comparisonRow}><T style={{ flex: 1 }}>{label}</T><T style={s.rowValue}>{euro(amount, language)}</T></View>)}
        <Note>{t('Les entrées attendues restent séparées des soldes confirmés.', 'Expected inflows remain separate from confirmed balances.')}</Note>
    </View>;
}

function PlanActions() {
    const { t } = useSession();
    const data = useClientData().data;
    const acknowledge = useAcknowledge();
    const plan = getPlanView(data);
    if (plan.state !== 'feasible' || plan.result?.status !== 'FEASIBLE') return <RecalculationNotice />;
    const saved = plan.result.action_plan.status === 'ACKNOWLEDGED';
    const actionPlan = plan.result.action_plan;
    return <View style={{ gap: 12 }}>
        <Button busy={acknowledge.isPending} onPress={() => acknowledge.mutate(actionPlan)}>
            {saved ? t('Proposition acquittée', 'Proposal acknowledged') : t('Acquitter la proposition', 'Acknowledge proposal')}
        </Button>
        {acknowledge.isError && <T accessibilityRole="alert" style={{ color: c.error }}>{t('Impossible d’enregistrer cet acquittement. Réessayez.', 'Could not save acknowledgement. Please retry.')}</T>}
        <Note>{t('Acquitter signifie avoir lu la proposition. Cela ne transfère aucun fonds.', 'Acknowledging means you have read the proposal. No funds are moved.')}</Note>
    </View>;
}

function Proposal() {
    const { t } = useSession();
    const desktop = useDesktop();
    const plan = getPlanView(useClientData().data);
    if (plan.state === 'infeasible' || plan.state === 'inconsistent') return <PageTransition key="proposal"><Title>{t('Aucune action sûre identifiée.', 'No safe action identified.')}</Title><DiagnosticCard state={plan.state} /><Button variant="secondary" onPress={() => router.push('/sources')}>{t('Vérifier mes hypothèses', 'Review my assumptions')}</Button></PageTransition>;
    if (plan.state !== 'feasible' || plan.action?.type !== 'own_funds_transfer') return <PageTransition key="proposal"><Title>{t('Proposition', 'Proposal')}</Title><RecalculationNotice /><TransferCard /></PageTransition>;
    return <PageTransition key="proposal">
        <Title>{t('Une action claire, à votre rythme.', 'One clear action, on your terms.')}</Title>
        <Note>{t('Proposition déterministe · les montants viennent du plan structuré.', 'Deterministic proposal · amounts come from the structured plan.')}</Note>
        <Split main={<>
            <Card warm style={s.proposalHero}>
                <T style={s.eyebrow}>{t('TRANSFERT DE FONDS PROPRES', 'OWN FUNDS TRANSFER')}</T>
                <Money value={plan.action.amount_decimal} size={62} />
                <T style={s.transferTitle}>{t('Depuis l’épargne vers le courant', 'From savings to current account')}</T>
                <Note>{t('Aperçu seulement. Aucun virement n’a été effectué.', 'Preview only. No transfer has been made.')}</Note>
            </Card>
            <Card style={s.detail}><Comparison /></Card>
        </>} aside={<Rail>
            <CardTitle eyebrow={t('DÉCISION', 'DECISION')} title={t('Relire avant d’acquitter', 'Review before acknowledging')} />
            <PlanActions />
            <Button variant="secondary" onPress={() => router.push('/options')}>{t('Comparer les options', 'Compare options')}</Button>
            <Notice title={t('Pas une exécution', 'Not an execution')} tone="success">{t('La proposition ne déplace pas d’argent et n’envoie aucune transaction.', 'The proposal does not move money or submit a transaction.')}</Notice>
        </Rail>} />
        {!desktop && <View style={s.mobileActions}><PlanActions /><Button variant="secondary" onPress={() => router.push('/options')}>{t('Comparer les options', 'Compare options')}</Button></View>}
    </PageTransition>;
}

function Options() {
    const { t } = useSession();
    const plan = getPlanView(useClientData().data);
    return <PageTransition key="options">
        <Title>{t('Options', 'Options')}</Title>
        <Note>{t('Les dépenses essentielles et réserves protégées restent des contraintes.', 'Essential expenses and protected reserves stay as hard constraints.')}</Note>
        <RecalculationNotice />
        {(plan.state === 'infeasible' || plan.state === 'inconsistent') ? <>
            <DiagnosticCard state={plan.state} />
            <Card><CardTitle eyebrow={t('AUTRES PISTES', 'OTHER OPTIONS')} title={t('Aucune action n’est engagée automatiquement.', 'No other action is taken automatically.')} />
                <Note>{t('Vous pouvez revoir les dates ou vos hypothèses. Un changement d’échéance nécessite l’accord du créancier.', 'You can review event dates or assumptions. A due-date change requires the creditor’s agreement.')}</Note>
                <Button variant="secondary" onPress={() => router.push('/sources')}>{t('Vérifier les données', 'Review data')}</Button>
            </Card>
        </> : <>
            <TransferCard />
            <Card><CardTitle eyebrow={t('SANS DÉPLACEMENT AUTOMATIQUE', 'NO AUTOMATIC CHANGE')} title={t('Demander un décalage d’échéance', 'Request a due-date change')} />
                <Note>{t('Toute nouvelle date reste une hypothèse tant que le créancier ne l’a pas confirmée.', 'Any new date remains a scenario until the creditor confirms it.')}</Note>
                <Button variant="secondary" onPress={() => router.push('/add')}>{t('Revoir les échéances', 'Review due dates')}</Button>
            </Card>
        </>}
    </PageTransition>;
}

function Sources() {
    const { t, language } = useSession();
    const desktop = useDesktop();
    const data = useClientData().data;
    const updateBalances = useUpdateBalances();
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [current, setCurrent] = useState(data?.request.opening_balances.current ?? demoFixture.opening_balances.current);
    const [savings, setSavings] = useState(data?.request.opening_balances.savings ?? demoFixture.opening_balances.savings);
    const [reserve, setReserve] = useState(data?.request.current_reserve ?? demoFixture.current_reserve);
    const [protectedSavings, setProtectedSavings] = useState(data?.request.savings_protected_reserve ?? '0.00');
    const currentValue = data?.request.opening_balances.current ?? demoFixture.opening_balances.current;
    const savingsValue = data?.request.opening_balances.savings ?? demoFixture.opening_balances.savings;
    const reserveValue = data?.request.current_reserve ?? demoFixture.current_reserve;

    return <PageTransition key="sources">
        <Title>{t('Vos sources', 'Your sources')}</Title>
        <Note>{t('Saisie déclarative · aucune connexion bancaire n’est active.', 'Declared entries · no bank connection is active.')}</Note>
        <RecalculationNotice />
        <Split main={<>
            <Card warm style={s.detail}>
                <View style={s.sectionHeader}><CardTitle eyebrow={t('ESPACE PERSONNEL', 'PERSONAL WORKSPACE')} title={t('Soldes déclarés', 'Declared balances')} /><Button variant="secondary" onPress={() => { setEditing(!editing); setError(null); }}>{editing ? t('Annuler', 'Cancel') : t('Modifier', 'Edit')}</Button></View>
                {editing ? <View style={{ gap: 14 }}>
                    <Field label={t('Compte courant (€)', 'Current account (€)')} value={current} onChangeText={setCurrent} keyboardType="decimal-pad" accessibilityHint={t('Solde déclaré du compte courant', 'Declared current account balance')} />
                    <Field label={t('Épargne totale (€)', 'Total savings (€)')} value={savings} onChangeText={setSavings} keyboardType="decimal-pad" />
                    <Field label={t('Réserve à conserver sur le courant (€)', 'Reserve to keep in current account (€)')} value={reserve} onChangeText={setReserve} keyboardType="decimal-pad" />
                    <Field label={t('Épargne protégée (€)', 'Protected savings (€)')} value={protectedSavings} onChangeText={setProtectedSavings} keyboardType="decimal-pad" />
                    {error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
                    <Button busy={updateBalances.isPending} onPress={() => {
                        const values = [current, savings, reserve, protectedSavings].map(value => DecimalStringSchema.safeParse(value.replace(',', '.')));
                        if (values.some(value => !value.success)) {
                            setError(t('Saisissez des montants décimaux positifs valides.', 'Enter valid positive decimal amounts.'));
                            return;
                        }
                        updateBalances.mutate({ current: current.replace(',', '.'), savings: savings.replace(',', '.'), reserve: reserve.replace(',', '.'), protectedSavings: protectedSavings.replace(',', '.') }, {
                            onSuccess: () => { setEditing(false); setError(null); },
                            onError: () => setError(t('Les hypothèses n’ont pas été modifiées. Vérifiez le calcul puis réessayez.', 'Assumptions were not updated. Check the calculation and retry.')),
                        });
                    }}>{t('Recalculer avec ces soldes', 'Recalculate with these balances')}</Button>
                </View> : <View>
                    <SourceRow title={t('Compte courant', 'Current account')} subtitle={t('Déclaré par vous', 'Declared by you')} value={euro(currentValue, language)} icon="sources" />
                    <SourceRow title={t('Épargne', 'Savings')} subtitle={t('Déclarée par vous', 'Declared by you')} value={euro(savingsValue, language)} icon="shield" />
                    <SourceRow title={t('Réserve courante', 'Current reserve')} subtitle={t('Seuil que le plan doit préserver', 'Floor the plan must preserve')} value={euro(reserveValue, language)} icon="shield" />
                </View>}
                <Note>{t('Ces données ne sont pas vérifiées par une banque.', 'These values have not been verified by a bank.')}</Note>
            </Card>
            <View style={s.section}>
                <View style={s.sectionHeader}><CardTitle eyebrow={t('CALENDRIER', 'CALENDAR')} title={t('Entrées et échéances', 'Income and due dates')} /><Button variant="secondary" onPress={() => router.push('/add')}>{t('Ajouter', 'Add')}</Button></View>
                <Card style={s.eventCard}><EventList allowDelete /></Card>
            </View>
            <Card style={s.importCard}><View style={s.rowIcon}><Icon name="file" size={18} color={c.accent}/></View><View style={{ flex: 1, gap: 4 }}><T style={s.rowTitle}>{t('Importer un fichier', 'Import a file')}</T><Note>{t('Aperçu seulement · aucun fichier n’a été chargé.', 'Preview only · no file has been uploaded.')}</Note></View><Button variant="ghost" onPress={() => router.push('/import')}>{t('Ouvrir', 'Open')}</Button></Card>
        </>} aside={desktop ? <Rail>
            <CardTitle eyebrow={t('CONFIDENTIALITÉ', 'PRIVACY')} title={t('Vos données restent dans votre espace.', 'Your data stays in your workspace.')} />
            <Note>{t('L’espace personnel ne requiert ni organisation, ni wallet, ni DID.', 'A personal workspace requires no organization, wallet or DID.')}</Note>
            <Button variant="secondary" onPress={() => router.push('/calendar')}>{t('Voir le calendrier', 'View calendar')}</Button>
        </Rail> : undefined} />
    </PageTransition>;
}

function SourceRow({ title, subtitle, value, icon }: { title: string; subtitle: string; value: string; icon: string }) {
    return <View style={s.row}><View style={s.rowIcon}><Icon name={icon} size={18} color={c.accent}/></View><View style={{ flex: 1, gap: 4 }}><T style={s.rowTitle}>{title}</T><Note>{subtitle}</Note></View><T style={s.rowValue}>{value}</T></View>;
}

function AddEvent() {
    const { t } = useSession();
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [direction, setDirection] = useState<'inflow' | 'outflow'>('outflow');
    const [error, setError] = useState<string | null>(null);
    const input = useRef<TextInput>(null);
    const createEvent = useCreateEvent();
    const anchor = useClientData().data?.result?.projection.as_of ?? useClientData().data?.provenance.asOf ?? '2026-09-12T00:00:00Z';
    const defaultDate = new Date(Date.parse(anchor) + 1 * 86_400_000).toISOString().slice(0, 10);

    return <PageTransition key="add">
        <Title>{t('Ajouter une échéance', 'Add an event')}</Title>
        <Card style={s.formCard}>
            <Field ref={input} label={t('Libellé', 'Label')} value={label} onChangeText={setLabel} placeholder={t('Ex. Assurance', 'e.g. Insurance')} />
            <Field label={t('Montant (€)', 'Amount (€)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
            <Field label={t('Date prévue (AAAA-MM-JJ)', 'Expected date (YYYY-MM-DD)')} value={date} onChangeText={setDate} placeholder={defaultDate} />
            <View style={{ gap: 8 }}><T variant="label">{t('Type d’événement', 'Event type')}</T><View style={s.periods}>
                {(['outflow', 'inflow'] as const).map(value => <Pressable key={value} onPress={() => setDirection(value)} accessibilityRole="button" accessibilityState={{ selected: direction === value }} style={[s.period, direction === value && s.periodSelected]}>
                    <T style={[s.periodText, direction === value && s.periodTextSelected]}>{value === 'outflow' ? t('Dépense', 'Expense') : t('Revenu attendu', 'Expected income')}</T>
                </Pressable>)}
            </View></View>
            <Note>{t('Cette entrée est déclarative. Un revenu attendu ne devient pas du cash confirmé.', 'This entry is declared. Expected income does not become confirmed cash.')}</Note>
            {error && <T accessibilityRole="alert" style={{ color: c.error }}>{error}</T>}
            <Button busy={createEvent.isPending} onPress={() => {
                const normalized = amount.replace(',', '.');
                const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T10:00:00Z`));
                if (!label.trim() || !DecimalStringSchema.safeParse(normalized).success || normalized.startsWith('-') || !/[1-9]/.test(normalized) || !validDate) {
                    setError(t('Vérifiez le libellé, le montant positif et la date prévue.', 'Check the label, positive amount and expected date.'));
                    input.current?.focus();
                    return;
                }
                setError(null);
                createEvent.mutate({ direction, amount_decimal: normalized, asset_id: 'fiat:EUR', label: label.trim(), expected_settlement_at: `${date}T10:00:00Z` }, {
                    onSuccess: () => router.push('/calendar'),
                    onError: () => setError(t('L’événement reste en brouillon. Le calcul est indisponible ; réessayez plus tard.', 'The event remains a draft. Calculation is unavailable; please retry later.')),
                });
            }}>{t('Enregistrer et recalculer', 'Save and recalculate')}</Button>
            <Button variant="ghost" onPress={() => router.push('/sources')}>{t('Annuler', 'Cancel')}</Button>
        </Card>
    </PageTransition>;
}

function ImportPreview() {
    const { t } = useSession();
    const [excluded, setExcluded] = useState(false);
    return <PageTransition key="import">
        <Title>{t('Aperçu de l’import', 'Import preview')}</Title>
        <Notice title={t('Aucun fichier sélectionné', 'No file selected')}>{t('L’import CSV n’est pas raccordé dans cette version. Rien n’a été chargé ni écrit.', 'CSV import is not connected in this version. Nothing has been uploaded or written.')}</Notice>
        <Card style={s.formCard}>
            <CardTitle eyebrow={t('EXEMPLE PÉDAGOGIQUE', 'TEACHING EXAMPLE')} title="operations.csv" />
            <Note>{t('Le fichier est une illustration de dédoublonnage, pas une source importée.', 'This file is a deduplication illustration, not an imported source.')}</Note>
            <SourceRow title={t('Ligne à vérifier', 'Row to review')} subtitle={t('Doublon illustratif', 'Illustrative duplicate')} value={excluded ? t('Exclue', 'Excluded') : t('À revoir', 'Review')} icon="file" />
            <Button variant="secondary" onPress={() => setExcluded(!excluded)}>{excluded ? t('Réinclure la ligne', 'Include row again') : t('Exclure cette ligne', 'Exclude this row')}</Button>
            <Button disabled={!excluded} onPress={() => router.push('/sources')}>{t('Terminer l’aperçu', 'Finish preview')}</Button>
            <Button variant="ghost" onPress={() => router.push('/sources')}>{t('Retour aux sources', 'Back to sources')}</Button>
        </Card>
    </PageTransition>;
}

function Tracking() {
    const { t } = useSession();
    const data = useClientData().data;
    const [evidenceOpen, setEvidenceOpen] = useState(false);
    const plan = getPlanView(data);
    const action = plan.state === 'feasible' && plan.action?.type === 'own_funds_transfer' ? plan.action : null;
    return <PageTransition key="tracking">
        <Title>{t('Suivi', 'Tracking')}</Title>
        <Note>{t('Ce qui est proposé. Ce qui a réellement été observé.', 'What is proposed. What has actually been observed.')}</Note>
        <RecalculationNotice />
        {plan.state === 'infeasible' || plan.state === 'inconsistent' ? <DiagnosticCard state={plan.state} /> : action ? <Card warm style={s.detail}>
            <T style={s.eyebrow}>{t('PROPOSITION · NON EXÉCUTÉE', 'PROPOSAL · NOT EXECUTED')}</T>
            <Money value={action.amount_decimal} size={44}/>
            <Notice title={t('Aucun transfert observé', 'No transfer observed')} tone="success">{t('L’acquittement conserve la proposition. Il ne modifie pas vos soldes.', 'Acknowledgement records the proposal. It does not change your balances.')}</Notice>
            <PlanActions />
        </Card> : <Notice title={t('Aucun plan à suivre', 'No plan to track')}>{t('Une proposition apparaîtra après un calcul disponible et réalisable.', 'A proposal will appear after a feasible calculation is available.')}</Notice>}
        <Card style={s.detail}>
            <CardTitle eyebrow={t('TRACK 1 · LOADED', 'TRACK 1 · LOADED')} title={t('Preuves XRPL observées', 'Observed XRPL evidence')} />
            <Note>{t('Lecture et replay de preuves de test archivées. Aucune connexion, signature ni soumission live depuis cette interface.', 'Read-only replay of archived test evidence. This interface does not connect, sign or submit live transactions.')}</Note>
            <Button variant="secondary" onPress={() => setEvidenceOpen(true)}>{t('Ouvrir le centre de preuves', 'Open evidence center')}</Button>
        </Card>
        <WalletModal visible={evidenceOpen} onClose={() => setEvidenceOpen(false)} />
    </PageTransition>;
}

function AudienceOverview() {
    const { t, persona } = useSession();
    const setHorizon = useSetHorizon();
    const label = persona === 'independent' ? t('Espace d’activité', 'Business workspace') : t('Espace d’organisation', 'Organization workspace');
    const text = persona === 'independent'
        ? t('Les encaissements attendus restent distincts du cash disponible. Les provisions et dépenses essentielles doivent rester protégées. Cette vue de démonstration n’a pas encore de projection dédiée.', 'Expected settlements stay separate from available cash. Tax reserves and essential expenses stay protected. This demo view has no dedicated projection yet.')
        : t('Track 1 Loaded distingue le droit de déposer dans un vault privé de la décision d’accorder un prêt. Cette vue pédagogique ne déclenche aucune action ledger.', 'Track 1 Loaded separates permission to deposit into a private vault from the decision to grant a loan. This teaching view triggers no ledger action.');
    return <PageTransition key={persona}>
        <Title>{label}</Title>
        <Card warm style={s.audienceCard}><CardTitle eyebrow={t('PARCOURS COMMUN', 'COMMON JOURNEY')} title={t('Même moteur, contexte séparé.', 'One engine, separate context.')} /><T style={{ lineHeight: 24 }}>{text}</T><Note>{t('Les chiffres de Lina ne sont pas réutilisés dans cet espace.', 'Lina’s figures are not reused in this workspace.')}</Note><Button onPress={() => router.push('/sources')}>{t('Voir les sources disponibles', 'Review available sources')}</Button></Card>
        <Card style={s.detail}><CardTitle eyebrow={t('PROCHAINES ÉTAPES', 'NEXT STEPS')} title={t('Prévision avant financement', 'Forecast before financing')} /><Note>{t('Les données, échéances et prévisions restent accessibles sans wallet, DID ou KYC. Toute capacité Loaded dépend de son état observé.', 'Data, due dates and forecasts remain available without a wallet, DID or KYC. Loaded capabilities depend on their observed state.')}</Note><Button variant="secondary" onPress={() => router.replace('/')}>{t('Revenir au personnel', 'Return to personal')}</Button></Card>
    </PageTransition>;
}

export function Screen({ screen }: { screen?: string }) {
    const { state, setState, persona, isOnline, t } = useSession();
    const query = useClientData();
    const raw = screen ? String(screen).trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '') : '';
    const activeScreen = (!raw || ['index', 'home', 'accueil', '[screen]', 'undefined'].includes(raw)) ? 'home' : raw;

    if (state === 'loading' || query.isPending) return <><Title>{t('Chargement', 'Loading')}</Title><Card style={s.stateCard}><ActivityIndicator color={c.accent}/><T accessibilityLiveRegion="polite">{t('Chargement de la projection…', 'Loading your forecast…')}</T></Card></>;
    if (state === 'error' || query.isError) return <><Title>{t('Données indisponibles', 'Data unavailable')}</Title><Card style={s.stateCard}><T accessibilityRole="alert">{t('Impossible de charger les données. Aucun solde ni mouvement n’a été modifié.', 'Could not load data. No balance or movement has changed.')}</T><Button onPress={() => { setState('ready'); void query.refetch(); }}>{t('Réessayer', 'Retry')}</Button></Card></>;
    if (state === 'empty') return <><Title>{t('Commençons simplement.', 'Let’s start simply.')}</Title><Card style={s.stateCard}><T>{t('Ajoutez un solde, une entrée attendue ou une échéance. Le wallet reste facultatif.', 'Add a balance, expected income or due date. The wallet remains optional.')}</T><Button onPress={() => { setState('ready'); router.push('/add'); }}>{t('Ajouter une échéance', 'Add an event')}</Button></Card></>;
    if (state === 'no-solution' && ['proposal', 'options'].includes(activeScreen)) return <><Title>{t('Aucune solution sûre', 'No safe solution')}</Title><DiagnosticCard state="infeasible" /></>;
    if (persona !== 'personal' && activeScreen === 'home') return <AudienceOverview />;

    const pages: Record<string, React.ReactNode> = {
        home: <Home />, calendar: <Calendar />, sources: <Sources />, proposal: <Proposal />, tracking: <Tracking />,
        options: <Options />, add: <AddEvent />, import: <ImportPreview />,
    };
    return <>
        {!isOnline && <Notice title={t('Mode hors ligne', 'Offline mode')}>
            {t('Vos événements déclarés restent visibles. Une modification locale invalide l’ancien plan jusqu’au prochain calcul serveur.', 'Your declared events remain visible. A local change invalidates the old plan until the next server calculation.')}
        </Notice>}
        {state === 'stale' && <Notice title={t('Données anciennes', 'Outdated data')}>{t('Cette projection n’est pas à jour. Aucun montant d’action ne sera présenté.', 'This projection is stale. No action amount will be shown.')}</Notice>}
        {state === 'unavailable' && <Notice title={t('Financement indisponible', 'Financial capability unavailable')}>{t('La prévision reste indépendante du wallet, du DID, du KYC et du crédit.', 'Forecasting remains independent of wallet, DID, KYC and credit.')}</Notice>}
        {pages[activeScreen] ?? <Home />}
    </>;
}

const s = StyleSheet.create({
    title: { fontFamily: tokens.font.medium, fontSize: 28, lineHeight: 36, letterSpacing: -0.8, color: c.text, maxWidth: 840 },
    heading: { fontFamily: tokens.font.medium, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, color: c.text },
    note: { fontSize: 14, lineHeight: 21, fontFamily: tokens.font.regular },
    eyebrow: { fontSize: 11, lineHeight: 16, letterSpacing: 1.05, fontFamily: tokens.font.semibold, color: c.muted },
    money: { fontFamily: tokens.font.regular, fontVariant: ['tabular-nums'], color: c.text, letterSpacing: -1.4 },
    split: { gap: 24, alignItems: 'stretch' },
    splitDesktop: { flexDirection: 'row' },
    main: { gap: 24, minWidth: 0 },
    mainDesktop: { flex: 1 },
    aside: { gap: 20, minWidth: 0 },
    asideDesktop: { width: 340 },
    rail: { backgroundColor: '#1D191F', borderRadius: tokens.radius.card, padding: 22, gap: 18, borderWidth: 1, borderColor: tokens.color.border },
    hero: { padding: 24, gap: 16 },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    heroMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.raised },
    heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 14 },
    heroValue: { color: c.text, fontSize: 17, fontFamily: tokens.font.medium, fontVariant: ['tabular-nums'] },
    section: { gap: 14 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
    chartCard: { gap: 16, padding: 20 },
    chartEmpty: { gap: 9, alignItems: 'flex-start', backgroundColor: c.surface },
    emptyIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: c.raised },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    legendLine: { width: 22, height: 2, borderRadius: 1 },
    legendDashed: { backgroundColor: 'transparent', borderTopWidth: 2, borderTopColor: c.muted, borderStyle: 'dashed' },
    chartTicks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    lowSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 16, borderRadius: 16, backgroundColor: c.raised },
    reserveSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '52%' },
    reserveSummaryText: { fontSize: 14, lineHeight: 21, flexShrink: 1 },
    simulationCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: 18 },
    simulationCopy: { flex: 1, minWidth: 210, gap: 4 },
    simulationActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    periods: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    period: { minHeight: 44, minWidth: 66, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent', backgroundColor: c.raised },
    periodSelected: { backgroundColor: c.accent, borderColor: c.accent },
    periodText: { color: c.muted, fontSize: 13, fontFamily: tokens.font.medium },
    periodTextSelected: { color: c.buttonText },
    transferCard: { gap: 14 },
    transferCompact: { gap: 12, padding: 18 },
    transferTitle: { fontFamily: tokens.font.medium, fontSize: 18, lineHeight: 25, color: c.text },
    notice: { backgroundColor: '#382B2E', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#5B454C' },
    noticeError: { backgroundColor: '#3D252A', borderColor: '#744047' },
    noticeSuccess: { backgroundColor: '#293026', borderColor: '#46513C' },
    detail: { padding: 20, gap: 18, backgroundColor: '#1D191F' },
    comparison: { gap: 14 },
    comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    eventCard: { paddingVertical: 4 },
    row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.raised },
    rowTitle: { fontSize: 15, lineHeight: 22, fontFamily: tokens.font.medium, color: c.text },
    rowValue: { fontSize: 15, lineHeight: 22, fontFamily: tokens.font.medium, fontVariant: ['tabular-nums'], color: c.text },
    removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    proposalHero: { padding: 28, gap: 15 },
    mobileActions: { gap: 12 },
    formCard: { width: '100%', maxWidth: 680, gap: 20, padding: 24 },
    importCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16 },
    audienceCard: { gap: 16, maxWidth: 860 },
    stateCard: { maxWidth: 680, gap: 16, alignItems: 'flex-start' },
});
