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
        {Platform.OS === 'web' && <Pressable
            nativeID="octro-skip"
            accessibilityRole="link"
            onPress={() => document.getElementById('octro-main')?.focus()}
            style={s.skipLink}
        >
            <T style={{ color: tokens.color.buttonText }}>{t('Passer au contenu', 'Skip to content')}</T>
        </Pressable>}

        {desktop && <View style={s.sidebar}>
            <View style={s.brandRow}>
                <T style={s.wordmark}>octro</T>
            </View>
            {!isRealFlow && <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel={t('Choisir le scénario de démonstration', 'Choose demo scenario')} style={s.selector}>
                <T style={s.small}>{profile}</T><Icon name="down" size={16} />
            </Pressable>}
            <View accessibilityRole="none" accessibilityLabel={t('Navigation principale', 'Main navigation')} style={{ gap: 8 }}>{nav(false)}</View>
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
            <T style={s.small}>{t('Le calendrier reste utile sans wallet ni crédit.', 'Your forecast works without a wallet or credit.')}</T>
            <View style={{ flex: 1 }} />
            <T style={s.small}>Octro · v2.2</T>
        </View>}

        <View style={{ flex: 1, minWidth: 0 }}>
            <ScrollView ref={scroll} contentContainerStyle={[s.scrollContent, { paddingBottom: desktop ? 32 : 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
                <LinearGradient colors={['#0D0C12', '#0D0C12', '#2E201E']} locations={[0, 0.72, 1]} style={[s.canvas, desktop ? s.desktopCanvas : s.mobileCanvas]}>
                    {!desktop && <View style={s.mobileHeader}>
                        <View style={s.brandRow}>
                            <T style={s.mobileWordmark}>octro</T>
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
    root: { flex: 1, flexDirection: 'row', backgroundColor: tokens.color.canvas, minHeight: '100%' },
    sidebar: { width: 228, padding: 28, paddingTop: 34, gap: 26, backgroundColor: '#121015', borderRightWidth: 1, borderRightColor: '#211D22' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    wordmark: { fontSize: 27, lineHeight: 34, letterSpacing: -1.2, fontFamily: tokens.font.semibold, color: tokens.color.text },
    mobileWordmark: { fontSize: 24, lineHeight: 32, letterSpacing: -0.7, fontFamily: tokens.font.semibold, color: tokens.color.text },
    selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, flexShrink: 1, paddingHorizontal: 12, borderWidth: 1, borderColor: tokens.color.border, borderRadius: tokens.radius.control, backgroundColor: tokens.color.surface },
    sidebarTools: { gap: 8 },
    toolButton: { paddingVertical: 10, minHeight: 46, justifyContent: 'flex-start' },
    toolText: { fontSize: 14, color: tokens.color.text },
    small: { fontSize: 13, lineHeight: 20, color: tokens.color.muted },
    tiny: { fontSize: 12, lineHeight: 18, color: tokens.color.text },
    navLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
    selected: { backgroundColor: tokens.color.raised },
    pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
    scrollContent: { minHeight: '100%', flexGrow: 1 },
    canvas: { flex: 1, minWidth: 0, width: '100%', alignSelf: 'center', maxWidth: 1440, gap: 28 },
    desktopCanvas: { paddingHorizontal: 40, paddingTop: 32, paddingBottom: 40 },
    mobileCanvas: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
    main: { gap: 22, minWidth: 0 },
    mobileHeader: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    mobileTools: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tokens.color.raised, borderWidth: 1, borderColor: '#3F353C' },
    profileAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, borderRadius: 14, backgroundColor: tokens.color.surface, borderWidth: 1, borderColor: tokens.color.border },
    profileActionText: { fontSize: 13, lineHeight: 18, color: tokens.color.text, fontFamily: tokens.font.medium },
    demoBar: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 },
    demoTag: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 32, paddingHorizontal: 10, borderRadius: tokens.radius.pill, backgroundColor: tokens.color.raised },
    offlineTag: { backgroundColor: '#382B2E' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.color.warning },
    language: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    languageText: { fontSize: 12, fontFamily: tokens.font.semibold, color: tokens.color.muted },
    footer: { color: tokens.color.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
    mobileNavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#151217', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#40373D', paddingHorizontal: 8, paddingTop: 7, minHeight: 78 },
    mobileNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    mobileLink: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, paddingVertical: 4, marginHorizontal: 2 },
    mobileSelected: { backgroundColor: tokens.color.raised },
    navLabel: { fontSize: 12, lineHeight: 16 },
    skipLink: { position: 'absolute', top: -80, left: 16, zIndex: 100, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: tokens.color.accent },
    scrim: { flex: 1, backgroundColor: tokens.color.overlay, padding: 20, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 480, width: '100%', maxHeight: '90%', padding: 24, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
});
