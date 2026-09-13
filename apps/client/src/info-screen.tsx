import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Badge, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';

const c = tokens.color;
const HACKATHON_SOURCE_URL = 'https://holly-pixie-8e9.notion.site/XRPL-Lending-Protocol-Hackathon-3152f6835886823ab31f01cd9d1f6ded';

function SourceLink({ label }: { label: string }) {
  return (
    <Pressable onPress={() => Linking.openURL(HACKATHON_SOURCE_URL)} accessibilityRole="link" accessibilityLabel={label}>
      {({ pressed }) => (
        <T style={{ color: c.accent, textDecorationLine: 'underline', opacity: pressed ? 0.65 : 1 }}>{label}</T>
      )}
    </Pressable>
  );
}

// Section publique (pas de AuthGate — un jury doit pouvoir la lire sans
// creer de compte) declarant les choix de configuration du hackathon
// (decisions deja actees ailleurs dans le code : docs/v2.2/hackathon.config.json
// et le CDC v2.2), avec citation de la source officielle.
export function InfoScreen() {
  const { t } = useSession();

  return (
    <View style={{ gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="info" size={26} color={c.text} />
        <T variant="title">{t('À propos de ce projet', 'About this project')}</T>
      </View>
      <T variant="muted">
        {t(
          'Octro est construit pour le XRPL Lending Protocol Hackathon (12–13 septembre 2026, organisé par DeVinci Blockchain et Ripple). Cette page déclare les choix de configuration retenus.',
          'Octro is built for the XRPL Lending Protocol Hackathon (September 12–13, 2026, hosted by DeVinci Blockchain and Ripple). This page states the configuration choices we made.',
        )}
      </T>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T variant="title">{t('Piste', 'Track')}</T>
          <Badge tone="success">{t('Track 1 — Vault ouvert', 'Track 1 — Open-ended vault')}</Badge>
        </View>
        <T variant="muted">
          {t(
            'Le Single Asset Vault standard : les prêts ont une durée déterminée, pas le vault.',
            'The standard Single Asset Vault: loans are term-bound, the vault is not.',
          )}
        </T>
        <T variant="muted" style={{ fontStyle: 'italic' }}>
          {t(
            '« reste ouvert aux dépôts et retraits pendant tout son cycle de vie »',
            '"stays open for deposits and withdrawals throughout its lifetime"',
          )}
        </T>
        <T variant="muted">
          {t(
            'Réseau : Custom Hackathon Devnet · Protocole : Lending Protocol V1 (XLS-66) + Single Asset Vaults (XLS-65).',
            'Network: Custom Hackathon Devnet · Protocol: Lending Protocol V1 (XLS-66) + Single Asset Vaults (XLS-65).',
          )}
        </T>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T variant="title">{t('Saveur', 'Flavour')}</T>
          <Badge tone="success">{t('Loaded (pas Vanilla)', 'Loaded (not Vanilla)')}</Badge>
        </View>
        <T variant="muted" style={{ fontStyle: 'italic' }}>
          {t(
            '« la base Vanilla plus une autre primitive du ledger »',
            '"the Vanilla baseline plus another ledger primitive"',
          )}
        </T>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('Credentials + Permissioned Domains (primaire)', 'Credentials + Permissioned Domains (primary)')}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('Sponsorship XLS-68/69 (secondaire)', 'Sponsorship XLS-68/69 (secondary)')}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Bonus', 'Bonus')}</Badge>
            <T>{t('Parts de vault MPToken affichées', 'Vault shares (MPToken) surfaced in the UI')}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge>{t('Optionnel, non fait', 'Optional, not done')}</Badge>
            <T variant="muted">{t('DID', 'DID')}</T>
          </View>
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <T variant="label">{t('Source', 'Source')}</T>
        <T variant="muted">
          {t(
            'Règles et catégories citées ci-dessus reprises de la page officielle de l\'événement :',
            'Rules and categories quoted above are taken from the event\'s official page:',
          )}
        </T>
        <SourceLink label="XRPL Lending Protocol Hackathon — Notion" />
      </Card>
    </View>
  );
}
