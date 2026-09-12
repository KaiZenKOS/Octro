import React, { useEffect, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';
import type { DemoState } from './session';
import { WalletModal } from './Wallet';
import { AgentExplainerModal } from './AgentExplainer';

export function useDesktop() { return useWindowDimensions().width >= 1100; }

const destinations = [
    ['/demo', 'home', 'Accueil', 'Home'],
    ['/calendar', 'calendar', 'Calendrier', 'Calendar'],
    ['/sources', 'sources', 'Sources', 'Sources'],
    ['/tracking', 'tracking', 'Suivi', 'Tracking'],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
    const desktop = useDesktop();
    const insets = useSafeAreaInsets();
    const path = usePathname();
    const { language, setLanguage, t, state, setState, persona, setPersona, isOnline } = useSession();
    const [settings, setSettings] = useState(false);
    const [walletOpen, setWalletOpen] = useState(false);
    const [agentOpen, setAgentOpen] = useState(false);
    const scroll = useRef<ScrollView>(null);
    const isRealFlow = path === '/' || path === '/account';
    const normalizedPath = (!path || path === '/home' || path === '/index' || path === '/undefined') ? '/demo' : path;
    const activePath = ['/proposal', '/options'].includes(normalizedPath) ? '/calendar' : ['/add', '/import'].includes(normalizedPath) ? '/sources' : normalizedPath;

    useEffect(() => {
        scroll.current?.scrollTo({ y: 0, animated: false });
        if (Platform.OS === 'web') {
            if (path === '/undefined') router.replace('/demo');
            document.documentElement.lang = language;
            document.title = `Octro — ${t('vos prévisions', 'your forecast')}`;
            window.requestAnimationFrame(() => document.getElementById('screen-title')?.focus());
        }
    }, [path, language, t]);

    const profile = persona === 'personal'
        ? t('Personnel · Lina', 'Personal · Lina')
        : persona === 'independent'
            ? t('Activité indépendante', 'Independent activity')
            : t('Organisation', 'Organization');

    const nav = (mobile: boolean) => destinations.map(([href, icon, fr, en]) => {
        const selected = activePath === href;
        const color = selected ? tokens.color.accent : tokens.color.muted;
        return <Pressable
            key={href}
            onPress={() => router.push(href as never)}
            accessibilityLabel={t(fr, en)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [mobile ? s.mobileLink : s.navLink, selected && (mobile ? s.mobileSelected : s.selected), pressed && s.pressed]}
        >
            <Icon name={icon} size={20} color={color} />
            <T style={[mobile ? s.navLabel : undefined, { color, fontFamily: selected ? tokens.font.medium : tokens.font.regular }]}>{t(fr, en)}</T>
        </Pressable>;
    });

    return <View style={s.root}>
        {desktop && <View style={s.desktopBackdrop} pointerEvents="none">
            <View style={s.desktopOrbital} />
            <View style={[s.desktopOrbital, s.desktopOrbitalRight]} />
            <View style={s.desktopOrbitalCenter} />
            <View style={s.desktopGrid} />
        </View>}
        {Platform.OS === 'web' && <Pressable
            nativeID="octro-skip"
            accessibilityRole="link"
            onPress={() => document.getElementById('octro-main')?.focus()}
            style={s.skipLink}
        >
            <T style={{ color: tokens.color.buttonText }}>{t('Passer au contenu', 'Skip to content')}</T>
        </Pressable>}

        {desktop && <LinearGradient colors={['#0F151F', '#0C121D', '#070B11']} locations={[0, 0.5, 1]} style={s.sidebar}>
            <View style={s.sidebarGlow} />
            <View style={s.sidebarGlowRight} />
            <View style={s.sidebarContent}>
                <View style={s.brandDock}>
                    <View style={s.brandGlyph} />
                    <View style={{ gap: 2 }}>
                        <T style={s.wordmark}>octro</T>
                        <T style={s.brandSubhead}>Financial control layer</T>
                    </View>
                </View>
                <View style={s.sidebarHintCard}>
                    <T style={s.sidebarHint}>DASHBOARD LENS</T>
                    <T style={s.sidebarHintValue}>{isOnline ? t('Capacités observées', 'Observed capabilities') : t('Mode dégradé', 'Degraded mode')}</T>
                </View>
                {!isRealFlow && <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel={t('Choisir le scénario de démonstration', 'Choose demo scenario')} style={s.selector}>
                    <T style={s.small}>{profile}</T><Icon name="down" size={16} />
                </Pressable>}
                <View accessibilityRole="none" accessibilityLabel={t('Navigation principale', 'Main navigation')} style={s.navGroup}>{nav(false)}</View>
                <View style={s.sidebarTools}>
                    <Button variant="secondary" onPress={() => router.push('/account')} style={s.toolButton}>
                        <Icon name="shield" size={18} color={tokens.color.accent} />
                        <T style={s.toolText}>{t('Compte & crédit', 'Account & credit')}</T>
                    </Button>
                    <Button variant="secondary" onPress={() => setAgentOpen(true)} style={s.toolButton}>
                        <Icon name="file" size={18} color={tokens.color.accent} />
                        <T style={s.toolText}>{t('Comprendre', 'Understand')}</T>
                    </Button>
                    <Button variant="secondary" onPress={() => setWalletOpen(true)} style={s.toolButton}>
                        <Icon name="shield" size={18} color={tokens.color.accent} />
                        <T style={s.toolText}>{t('Preuves XRPL', 'XRPL evidence')}</T>
                    </Button>
                </View>
                <View style={s.sidebarMetrics}>
                    <View style={s.sidebarMetric}>
                        <T style={s.sidebarMetricLabel}>{t('État', 'State')}</T>
                        <T style={s.sidebarMetricValue}>{state}</T>
                    </View>
                    <View style={s.sidebarMetric}>
                        <T style={s.sidebarMetricLabel}>{t('Mode', 'Mode')}</T>
                        <T style={s.sidebarMetricValue}>{isOnline ? t('Réseau', 'Live') : t('Démo', 'Demo')}</T>
                    </View>
                </View>
                <T style={s.small}>{t('Le calendrier reste utile sans wallet ni crédit.', 'Your forecast works without a wallet or credit.')}</T>
                <View style={{ flex: 1 }} />
                <T style={s.small}>Octro · v2.2</T>
            </View>
        </LinearGradient>}

        <View style={{ flex: 1, minWidth: 0 }}>
            <ScrollView ref={scroll} contentContainerStyle={[s.scrollContent, { paddingBottom: desktop ? 32 : 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
                <LinearGradient colors={['#070B12', '#0A101A', '#0D1420', '#0A101A']} locations={[0, 0.42, 0.8, 1]} style={[s.canvas, desktop ? s.desktopCanvas : s.mobileCanvas]}>
                    {!desktop && <View style={s.mobileHeader}>
                        <View style={s.brandRow}>
                            <View style={s.brandGlyph} />
                            <View style={{ gap: 2 }}>
                                <T style={s.mobileWordmark}>octro</T>
                                <T style={s.mobileSubhead}>{t('Control Center', 'Control Center')}</T>
                            </View>
                        </View>
                        <View style={s.mobileTools}>
                            {!isRealFlow && <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel={t('Choisir le scénario', 'Choose a scenario')} style={s.profileAction}>
                                <T style={s.profileActionText}>{persona === 'personal' ? 'Lina' : persona === 'independent' ? t('Activité', 'Business') : t('Équipe', 'Team')}</T>
                                <Icon name="down" size={14} />
                            </Pressable>}
                        </View>
                    </View>}

                    <View style={s.demoBar}>
                        {!isRealFlow && <View style={s.demoTag}>
                            <View style={s.dot} />
                            <T style={s.tiny}>{t('Données synthétiques', 'Synthetic data')}</T>
                        </View>}
                        {!isOnline && <View style={[s.demoTag, s.offlineTag]}>
                            <View style={[s.dot, { backgroundColor: tokens.color.warning }]} />
                            <T style={[s.tiny, { color: tokens.color.warning }]}>{t('Hors ligne', 'Offline')}</T>
                        </View>}
                        <View style={{ flex: 1 }} />
                        <Pressable onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} accessibilityRole="button" accessibilityLabel={t('Passer en anglais', 'Switch to French')} style={s.language}>
                            <T style={s.languageText}>{language.toUpperCase()}</T>
                        </Pressable>
                    </View>

                    <View
                        nativeID="octro-main"
                        accessibilityRole="none"
                        {...(Platform.OS === 'web' ? { tabIndex: -1 } as object : {})}
                        style={s.main}
                    >{children}</View>

                    <T style={s.footer}>{isRealFlow ? t('Compte, KYC simulé et lending · toute opération réseau reste soumise aux capacités observées.', 'Account, simulated KYC and lending · every network operation remains gated by observed capabilities.') : t('Démo sur données synthétiques · aucun transfert exécuté', 'Synthetic data demo · no transfer executed')}</T>
                </LinearGradient>
            </ScrollView>
            {!desktop && <View style={[s.mobileNavContainer, { paddingBottom: Math.max(10, insets.bottom) }]}>
                <View accessibilityRole="none" accessibilityLabel={t('Navigation principale', 'Main navigation')} style={s.mobileNav}>{nav(true)}</View>
            </View>}
        </View>

        <WalletModal visible={walletOpen} onClose={() => setWalletOpen(false)} />
        <AgentExplainerModal visible={agentOpen} onClose={() => setAgentOpen(false)} />
        <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}>
            <View style={s.scrim}>
                <View style={s.dialog} accessibilityViewIsModal>
                    <ScrollView contentContainerStyle={{ gap: 16 }}>
                        <T variant="title">{t('Explorer la démo', 'Explore the demo')}</T>
                        <T variant="muted">{t('Les données et états sont synthétiques. Le wallet et les signatures ne sont pas connectés.', 'Data and states are synthetic. Wallet and signing are not connected.')}</T>
                        <T variant="label">{t('Scénario', 'Scenario')}</T>
                        {(['personal', 'independent', 'organization'] as const).map((value, index) => <Button key={value} variant={persona === value ? 'primary' : 'secondary'} onPress={() => { setPersona(value); setState('ready'); setSettings(false); }}>
                            {[
                                t('Lina · personnel', 'Lina · personal'),
                                t('Activité · facture retardée', 'Business · late invoice'),
                                t('Organisation · besoin incompatible', 'Organization · infeasible need'),
                            ][index]}
                        </Button>)}
                        <T variant="label">{t('État d’interface', 'Interface state')}</T>
                        {(['ready', 'loading', 'empty', 'error', 'stale', 'unavailable', 'no-solution'] as DemoState[]).map((value, index) => <Button key={value} variant={state === value ? 'primary' : 'ghost'} onPress={() => { setState(value); setSettings(false); }}>
                            {[
                                t('Prêt', 'Ready'), t('Chargement', 'Loading'), t('Vide', 'Empty'), t('Erreur', 'Error'),
                                t('Données anciennes', 'Outdated data'), t('Finance indisponible', 'Finance unavailable'), t('Aucune solution', 'No solution'),
                            ][index]}
                        </Button>)}
                        <Button variant="secondary" onPress={() => setSettings(false)}>{t('Fermer', 'Close')}</Button>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    </View>;
}

const s = StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', backgroundColor: tokens.color.canvas, minHeight: '100%', position: 'relative', overflow: 'hidden' },
    desktopBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 },
    desktopOrbital: {
        position: 'absolute',
        width: 680,
        aspectRatio: 1,
        borderRadius: 999,
        backgroundColor: 'rgba(242, 201, 141, 0.06)',
        top: -220,
        right: -230,
    },
    desktopOrbitalRight: {
        left: -370,
        right: 'auto',
        top: 360,
        backgroundColor: 'rgba(191, 240, 138, 0.06)',
        width: 500,
    },
    desktopOrbitalCenter: {
        position: 'absolute',
        width: 360,
        aspectRatio: 1,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        top: '58%',
        left: '62%',
        marginTop: -180,
        marginLeft: 60,
    },
    desktopGrid: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.01)' },
    sidebar: {
        width: 296,
        padding: 26,
        paddingTop: 28,
        gap: 22,
        borderRightWidth: 1,
        borderRightColor: '#2B3446',
        borderTopRightRadius: 32,
        borderBottomRightRadius: 32,
        marginRight: 18,
        overflow: 'hidden',
        marginVertical: 14,
        elevation: 2,
    },
    sidebarGlow: {
        position: 'absolute',
        top: -140,
        right: -120,
        width: 260,
        aspectRatio: 1,
        borderRadius: 999,
        backgroundColor: 'rgba(242, 201, 141, 0.08)',
    },
    sidebarGlowRight: {
        position: 'absolute',
        bottom: -150,
        left: -150,
        width: 230,
        aspectRatio: 1,
        borderRadius: 999,
        backgroundColor: 'rgba(191, 240, 138, 0.06)',
    },
    sidebarContent: { position: 'relative', gap: 18 },
    brandDock: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    navGroup: { gap: 10 },
    brandGlyph: {
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: tokens.color.accent,
        marginTop: -2,
    },
    brandSubhead: {
        fontSize: 10,
        lineHeight: 12,
        letterSpacing: 0.45,
        color: tokens.color.muted,
        textTransform: 'uppercase',
    },
    sidebarHintCard: {
        borderWidth: 1,
        borderColor: 'rgba(242,201,141,0.24)',
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 2,
        backgroundColor: 'rgba(18, 23, 36, 0.88)',
    },
    sidebarHint: { fontSize: 11, lineHeight: 16, color: tokens.color.muted, letterSpacing: 0.55, textTransform: 'uppercase' },
    sidebarHintValue: { color: tokens.color.text, fontFamily: tokens.font.medium, fontSize: 14 },
    sidebarMetrics: { gap: 8, marginTop: 4 },
    sidebarMetric: { paddingHorizontal: 2, gap: 1 },
    sidebarMetricLabel: { color: tokens.color.muted, fontSize: 11, letterSpacing: 0.45, textTransform: 'uppercase' },
    sidebarMetricValue: { color: tokens.color.text, fontSize: 14, lineHeight: 20, fontFamily: tokens.font.medium },
    selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 46, flexShrink: 1, paddingHorizontal: 12, borderWidth: 1, borderColor: tokens.color.border, borderRadius: tokens.radius.control, backgroundColor: 'rgba(15, 19, 30, 0.72)' },
    sidebarTools: { gap: 8 },
    toolButton: { paddingVertical: 10, minHeight: 46, justifyContent: 'flex-start', borderRadius: 14 },
    toolText: { fontSize: 14, color: tokens.color.text },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    wordmark: { fontSize: 27, lineHeight: 34, letterSpacing: -1.2, fontFamily: tokens.font.semibold, color: tokens.color.text },
    mobileWordmark: { fontSize: 24, lineHeight: 32, letterSpacing: -0.7, fontFamily: tokens.font.semibold, color: tokens.color.text },
    mobileSubhead: { fontSize: 10, lineHeight: 12, color: tokens.color.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
    small: { fontSize: 12, lineHeight: 18, color: tokens.color.muted },
    tiny: { fontSize: 12, lineHeight: 18, color: tokens.color.text },
    navLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    selected: { backgroundColor: 'rgba(242, 201, 141, 0.14)' },
    pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
    scrollContent: { minHeight: '100%', flexGrow: 1 },
    canvas: { flex: 1, minWidth: 0, width: '100%', alignSelf: 'center', maxWidth: 1440, gap: 28 },
    desktopCanvas: { paddingHorizontal: 40, paddingTop: 28, paddingBottom: 42 },
    mobileCanvas: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 34, gap: 20 },
    main: { gap: 22, minWidth: 0 },
    mobileHeader: { minHeight: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    mobileTools: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1E2533', borderWidth: 1, borderColor: '#333D52' },
    profileAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(20, 26, 41, 0.82)', borderWidth: 1, borderColor: '#2D3750' },
    profileActionText: { fontSize: 13, lineHeight: 18, color: tokens.color.text, fontFamily: tokens.font.medium },
    demoBar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10 },
    demoTag: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 30, paddingHorizontal: 10, borderRadius: tokens.radius.pill, backgroundColor: 'rgba(26, 34, 52, 0.9)', borderWidth: 1, borderColor: 'rgba(242, 201, 141, 0.18)' },
    offlineTag: { backgroundColor: '#202A3A', borderColor: 'rgba(240, 145, 123, 0.4)' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.color.warning },
    language: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(28, 34, 48, 0.86)', borderWidth: 1, borderColor: '#2B3449' },
    languageText: { fontSize: 11, fontFamily: tokens.font.semibold, color: tokens.color.text },
    footer: { color: tokens.color.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
    mobileNavContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0C1018',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderTopWidth: 1,
        borderTopColor: 'rgba(242,201,141,0.2)',
        paddingHorizontal: 8,
        paddingTop: 7,
        minHeight: 78,
    },
    mobileNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    mobileLink: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 16, paddingVertical: 4, marginHorizontal: 2 },
    mobileSelected: { backgroundColor: 'rgba(242, 201, 141, 0.14)' },
    navLabel: { fontSize: 11, lineHeight: 15 },
    skipLink: { position: 'absolute', top: -80, left: 16, zIndex: 100, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: tokens.color.accent },
    scrim: { flex: 1, backgroundColor: tokens.color.overlay, padding: 20, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 480, width: '100%', maxHeight: '90%', padding: 24, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
});
