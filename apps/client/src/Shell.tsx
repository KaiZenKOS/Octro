import React, { useEffect, useRef, useState } from 'react';
import { Link, router, usePathname } from 'expo-router';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';
import type { DemoState } from './session';
import { WalletModal } from './Wallet';
import { AgentExplainerModal } from './AgentExplainer';

const logoSource = require('../assets/logo.png');

export function useDesktop() { return useWindowDimensions().width >= 1100; }
const destinations = [
    ['/', 'home', 'Accueil', 'Home'],
    ['/calendar', 'calendar', 'Calendrier', 'Calendar'],
    ['/sources', 'sources', 'Sources', 'Sources'],
    ['/tracking', 'tracking', 'Suivi', 'Tracking']
] as const;

export function Shell({ children }: {
    children: React.ReactNode;
}) {
    const desktop = useDesktop();
    const path = usePathname();
    const { language, setLanguage, t, state, setState, persona, setPersona, isOnline } = useSession();
    const [settings, setSettings] = useState(false);
    const [walletOpen, setWalletOpen] = useState(false);
    const [agentOpen, setAgentOpen] = useState(false);
    const scroll = useRef<ScrollView>(null);
    const normalizedPath = (!path || path === '/' || path === '/home' || path === '/index') ? '/' : path;
    const activePath = ['/proposal', '/options'].includes(normalizedPath) ? '/calendar' : ['/add', '/import'].includes(normalizedPath) ? '/sources' : normalizedPath;

    useEffect(() => {
        scroll.current?.scrollTo({ y: 0, animated: false });
        if (Platform.OS === 'web') {
            document.documentElement.lang = language;
            document.title = `Octro — ${t('vos prévisions', 'your forecast')}`;
            setTimeout(() => document.getElementById('screen-title')?.focus(), 0);
        }
    }, [path, language]);

    const profile = persona === 'personal' ? t('Personnel · Lina', 'Personal · Lina') : persona === 'independent' ? t('Activité indépendante', 'Independent activity') : t('Organisation', 'Organization');

    const nav = (mobile: boolean) => destinations.map(([href, icon, fr, en]) => {
        const isSelected = activePath === href;
        const color = isSelected ? tokens.color.text : tokens.color.muted;
        return (
            <Pressable
                key={href}
                onPress={() => router.push(href as any)}
                accessibilityLabel={t(fr, en)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                    mobile ? s.mobileLink : s.navLink,
                    isSelected && (mobile ? s.mobileSelected : s.selected),
                    pressed && { opacity: 0.7 }
                ]}
            >
                <Icon name={icon} size={22} color={color} />
                <T style={[mobile ? s.navLabel : undefined, { color, fontFamily: isSelected ? tokens.font.medium : tokens.font.regular }]}>
                    {t(fr, en)}
                </T>
            </Pressable>
        );
    });

    return <View style={s.root}>
    {desktop && <View style={s.sidebar}>
      <View style={s.brandRow}>
        <Image source={logoSource} style={s.desktopLogo} resizeMode="contain" />
        <T style={s.wordmark}>octro</T>
      </View>
      <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel={t('Choisir le scénario de démonstration', 'Choose demo scenario')} style={s.selector}><T style={s.small}>{profile}</T><Icon name="down" size={16}/></Pressable>
      <View style={{ gap: 16 }}>{nav(false)}</View>
      <Button variant="secondary" onPress={() => setAgentOpen(true)} style={{ paddingVertical: 10, minHeight: 44 }}>
        <Icon name="sparkles" size={18} color={tokens.color.accent} />
        <T style={{ fontSize: 13 }}>{t('Agent MCP', 'MCP Agent')}</T>
      </Button>
      <Button variant="secondary" onPress={() => setWalletOpen(true)} style={{ paddingVertical: 10, minHeight: 44 }}>
        <Icon name="shield" size={18} color={tokens.color.accent} />
        <T style={{ fontSize: 13 }}>{t('Wallet XRPL', 'XRPL Wallet')}</T>
      </Button>
      <T style={[s.small, { marginTop: 8 }]}>{t('Vos prévisions restent accessibles sans connexion bancaire.', 'Your forecasts remain accessible without a bank connection.')}</T>
      <View style={{ flex: 1 }}/>
      <T style={s.small}>Octro · v2.2</T>
    </View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: desktop ? 40 : 110 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#0D0C12', '#0D0C12', '#2E201E']} locations={[0, .7, 1]} style={[s.canvas, desktop ? s.desktopCanvas : s.mobileCanvas]}>
          {!desktop && <View style={s.mobileHeader}>
            <View style={s.brandRow}>
              <Image source={logoSource} style={s.mobileLogo} resizeMode="contain" />
              <T style={{ fontSize: 24, letterSpacing: -.6 }}>octro</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => setAgentOpen(true)} accessibilityRole="button" style={s.walletBtn}>
                <Icon name="sparkles" size={16} color={tokens.color.accent} />
                <T style={s.tiny}>IA</T>
              </Pressable>
              <Pressable onPress={() => setWalletOpen(true)} accessibilityRole="button" style={s.walletBtn}>
                <Icon name="shield" size={16} color={tokens.color.accent} />
                <T style={s.tiny}>XRPL</T>
              </Pressable>
              <Pressable onPress={() => setSettings(true)} accessibilityRole="button" style={s.selector}><T style={s.small}>{profile}</T><Icon name="down" size={16}/></Pressable>
            </View>
          </View>}
          <View style={s.demoBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => setSettings(true)} accessibilityRole="button" style={s.demoTag}>
                <View style={s.dot}/>
                <T style={s.tiny}>{t('Données synthétiques', 'Synthetic data')}</T>
              </Pressable>
              {!isOnline && (
                <View style={[s.demoTag, { backgroundColor: '#382B2E', paddingHorizontal: 6, borderRadius: 6 }]}>
                  <View style={[s.dot, { backgroundColor: tokens.color.warning }]} />
                  <T style={[s.tiny, { color: tokens.color.warning }]}>{t('Hors-ligne (TanStack Cache)', 'Offline (TanStack Cache)')}</T>
                </View>
              )}
            </View>
            <Pressable onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} accessibilityRole="button" accessibilityLabel={t('Passer en anglais', 'Switch to French')} style={s.language}>
              <T style={s.tiny}>{language.toUpperCase()} ↗</T>
            </Pressable>
          </View>
          {children}
          <T style={[s.tiny, { marginTop: 32, color: tokens.color.muted }]}>{t('Démonstration · aucune connexion bancaire · aucun transfert exécuté', 'Demonstration · no bank connection · no executed transfer')}</T>
        </LinearGradient>
      </ScrollView>
      {!desktop && <View style={s.mobileNavContainer}><View style={s.mobileNav}>{nav(true)}</View></View>}
    </View>
    <WalletModal visible={walletOpen} onClose={() => setWalletOpen(false)} />
    <AgentExplainerModal visible={agentOpen} onClose={() => setAgentOpen(false)} />
    <Modal visible={settings} transparent animationType="none" onRequestClose={() => setSettings(false)}><View style={s.scrim}><View style={s.dialog} accessibilityViewIsModal><ScrollView><View style={{ gap: 16 }}><T variant="title">{t('Explorer la démo', 'Explore the demo')}</T><T variant="muted">{t('Les données et les états sont synthétiques. Aucun service financier n’est activé.', 'Data and states are synthetic. No financial service is activated.')}</T><T>{t('Scénario', 'Scenario')}</T>{(['personal', 'independent', 'organization'] as const).map((v, i) => <Button key={v} variant={persona === v ? 'primary' : 'secondary'} onPress={() => { setPersona(v); setState('ready'); setSettings(false); }}>{[t('Lina · personnel', 'Lina · personal'), t('Activité · facture retardée', 'Business · late invoice'), t('Organisation · besoin incompatible', 'Organization · incompatible need')][i]}</Button>)}<T>{t('État d’interface', 'Interface state')}</T>{(['ready', 'loading', 'empty', 'error', 'stale', 'unavailable', 'no-solution'] as DemoState[]).map((v, i) => <Button key={v} variant={state === v ? 'primary' : 'ghost'} onPress={() => { setState(v); setSettings(false); }}>{[t('Prêt', 'Ready'), t('Chargement', 'Loading'), t('Vide', 'Empty'), t('Erreur', 'Error'), t('Données anciennes', 'Outdated data'), t('Finance indisponible', 'Finance unavailable'), t('Aucune solution', 'No solution')][i]}</Button>)}<Button variant="secondary" onPress={() => setSettings(false)}>{t('Fermer', 'Close')}</Button></View></ScrollView></View></View></Modal>
  </View>;
}

const s = StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', backgroundColor: tokens.color.bg },
    sidebar: { width: 220, padding: 28, gap: 28, backgroundColor: '#121015', borderRightWidth: 1, borderRightColor: '#211D22' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    desktopLogo: { width: 32, height: 32, borderRadius: 8 },
    mobileLogo: { width: 28, height: 28, borderRadius: 6 },
    wordmark: { fontSize: 28, lineHeight: 36, letterSpacing: -1.2, fontFamily: tokens.font.semibold },
    selector: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, flexShrink: 1 },
    walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.raised, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#3F353C' },
    small: { fontSize: 13, lineHeight: 20, color: tokens.color.muted },
    tiny: { fontSize: 12, lineHeight: 18 },
    navLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
    selected: { backgroundColor: tokens.color.raised },
    mobileNavContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#151217',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderTopColor: '#40373D',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 14,
        minHeight: 84,
    },
    mobileNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    mobileLink: {
        flex: 1,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: 16,
        paddingVertical: 4,
        marginHorizontal: 2,
    },
    mobileSelected: {
        backgroundColor: tokens.color.raised,
    },
    navLabel: { fontSize: 12, lineHeight: 16 },
    canvas: { flex: 1, minWidth: 0 },
    desktopCanvas: { padding: 40, gap: 24 },
    mobileCanvas: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
    mobileHeader: { height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    demoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    demoTag: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.color.warning },
    language: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' },
    scrim: { flex: 1, backgroundColor: '#000B', padding: 24, justifyContent: 'center', alignItems: 'center' },
    dialog: { maxWidth: 480, width: '100%', maxHeight: '90%', padding: 24, borderRadius: 28, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
});


