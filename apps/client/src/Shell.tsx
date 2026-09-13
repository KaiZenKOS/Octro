import React, { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from 'expo-router';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';
import type { DemoState } from './session';
export function useDesktop() { return useWindowDimensions().width >= 1100; }
const destinations = [['/', 'home', 'Accueil', 'Home'], ['/transactions', 'tracking', 'Transactions', 'Transactions'], ['/lending', 'coins', 'Lending', 'Lending'], ['/info', 'info', 'Infos', 'Info']] as const;
export function Shell({ children }: {
    children: React.ReactNode;
}) {
    const desktop = useDesktop();
    const path = usePathname();
    const { language, setLanguage, t, state, setState, persona, setPersona } = useSession();
    const [settings, setSettings] = useState(false);
    const scroll = useRef<ScrollView>(null);
    const activePath = path;
    // Le compte reel (Phase G) n'a ni persona ni scenario de demonstration :
    // le selecteur "Personnel · Lina" et le badge "Donnees synthetiques"
    // n'ont pas de sens sur ces routes et resteraient une trace de maquette.
    const isRealFlow = ['/', '/account', '/transactions', '/lending', '/info'].includes(path);
    useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); if (Platform.OS === 'web') {
        document.documentElement.lang = language;
        document.title = `Octro — ${t('vos prévisions', 'your forecast')}`;
        setTimeout(() => document.getElementById('screen-title')?.focus(), 0);
    } }, [path, language]);
    const profile = persona === 'personal' ? t('Personnel · Lina', 'Personal · Lina') : persona === 'independent' ? t('Activité indépendante', 'Independent activity') : t('Organisation', 'Organization');
    const nav = (mobile: boolean) => destinations.map(([href, icon, fr, en]) => <Link href={href} key={href} asChild><Pressable accessibilityLabel={t(fr, en)} accessibilityRole="link" accessibilityState={{ selected: activePath === href }} style={({ pressed }) => [mobile ? s.mobileLink : s.navLink, activePath === href && s.selected, pressed && { opacity: .65 }]}><Icon name={icon} size={22} color={activePath === href ? tokens.color.text : tokens.color.muted}/><T style={[mobile && s.navLabel, { color: activePath === href ? tokens.color.text : tokens.color.muted }]}>{t(fr, en)}</T></Pressable></Link>);
    return <View style={s.root}>
    {desktop && <View style={s.sidebar}><T style={s.wordmark}>octro</T>{!isRealFlow && <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel={t('Choisir le scénario de démonstration', 'Choose demo scenario')} style={s.selector}><T style={s.small}>{profile}</T><Icon name="down" size={16}/></Pressable>}<View style={{ gap: 20 }}>{nav(false)}</View>{!isRealFlow && <T style={[s.small, { marginTop: 8 }]}>{t('Vos prévisions restent accessibles sans connexion bancaire.', 'Your forecasts remain accessible without a bank connection.')}</T>}<View style={{ flex: 1 }}/><T style={s.small}>Octro · v2.2</T></View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#0D0C12', '#0D0C12', '#2E201E']} locations={[0, .7, 1]} style={[s.canvas, desktop ? s.desktopCanvas : s.mobileCanvas]}>
          {!desktop && <View style={s.mobileHeader}><T style={{ fontSize: 24, letterSpacing: -.6 }}>octro</T>{!isRealFlow && <Pressable onPress={() => setSettings(true)} accessibilityRole="button" style={s.selector}><T style={s.small}>{profile}</T><Icon name="down" size={16}/></Pressable>}</View>}
          <View style={s.demoBar}>{!isRealFlow && <Pressable onPress={() => setSettings(true)} accessibilityRole="button" style={s.demoTag}><View style={s.dot}/><T style={s.tiny}>{t('Données synthétiques', 'Synthetic data')}</T></Pressable>}<Pressable onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} accessibilityRole="button" accessibilityLabel={t('Passer en anglais', 'Switch to French')} style={s.language}><T style={s.tiny}>{language.toUpperCase()} ↗</T></Pressable></View>
          {children}
          <T style={[s.tiny, { marginTop: 32, color: tokens.color.muted }]}>{isRealFlow ? t('Octro — plateforme de coordination financière et prêts XRPL.', 'Octro — financial coordination platform and XRPL lending.') : t('Démonstration · aucune connexion bancaire · aucun transfert exécuté', 'Demonstration · no bank connection · no executed transfer')}</T>
        </LinearGradient>
      </ScrollView>
      {!desktop && <View style={s.mobileNav}>{nav(true)}</View>}
    </View>
    <Modal visible={settings} transparent animationType="none" onRequestClose={() => setSettings(false)}><View style={s.scrim}><View style={s.dialog} accessibilityViewIsModal><ScrollView><View style={{ gap: 16 }}><T variant="title">{t('Explorer la démo', 'Explore the demo')}</T><T variant="muted">{t('Les données et les états sont synthétiques. Aucun service financier n’est activé.', 'Data and states are synthetic. No financial service is activated.')}</T><T>{t('Scénario', 'Scenario')}</T>{(['personal', 'independent', 'organization'] as const).map((v, i) => <Button key={v} variant={persona === v ? 'primary' : 'secondary'} onPress={() => { setPersona(v); setState('ready'); setSettings(false); }}>{[t('Lina · personnel', 'Lina · personal'), t('Activité · facture retardée', 'Business · late invoice'), t('Organisation · besoin incompatible', 'Organization · incompatible need')][i]}</Button>)}<T>{t('État d’interface', 'Interface state')}</T>{(['ready', 'loading', 'empty', 'error', 'stale', 'unavailable', 'no-solution'] as DemoState[]).map((v, i) => <Button key={v} variant={state === v ? 'primary' : 'ghost'} onPress={() => { setState(v); setSettings(false); }}>{[t('Prêt', 'Ready'), t('Chargement', 'Loading'), t('Vide', 'Empty'), t('Erreur', 'Error'), t('Données anciennes', 'Outdated data'), t('Finance indisponible', 'Finance unavailable'), t('Aucune solution', 'No solution')][i]}</Button>)}<Button variant="secondary" onPress={() => setSettings(false)}>{t('Fermer', 'Close')}</Button></View></ScrollView></View></View></Modal>
  </View>;
}
const s = StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', backgroundColor: tokens.color.bg }, sidebar: { width: 208, padding: 32, gap: 32, backgroundColor: '#121015' }, wordmark: { fontSize: 32, lineHeight: 40, letterSpacing: -1.5 }, selector: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, flexShrink: 1 }, small: { fontSize: 13, lineHeight: 20, color: tokens.color.muted }, tiny: { fontSize: 12, lineHeight: 18 }, navLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, padding: 12, borderRadius: 12 }, selected: { backgroundColor: tokens.color.raised }, mobileLink: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 8 }, navLabel: { fontSize: 12, lineHeight: 18 }, canvas: { flex: 1, minWidth: 0 }, desktopCanvas: { padding: 40, gap: 24 }, mobileCanvas: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 24, gap: 20 }, mobileHeader: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, mobileNav: { backgroundColor: '#151217', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', gap: 4, minHeight: 84 }, demoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, demoTag: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: tokens.color.warning }, language: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }, scrim: { flex: 1, backgroundColor: '#000B', padding: 24, justifyContent: 'center', alignItems: 'center' }, dialog: { maxWidth: 480, width: '100%', maxHeight: '90%', padding: 24, borderRadius: 28, backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1 },
});
