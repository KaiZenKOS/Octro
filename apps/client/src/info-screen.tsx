import React from 'react';
import { View } from 'react-native';
import { Badge, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';

const c = tokens.color;

// Section publique (pas de AuthGate — un jury doit pouvoir la lire sans
// creer de compte) declarant les choix de configuration du hackathon
// (decisions deja actees ailleurs dans le code : docs/v2.2/hackathon.config.json
// et le CDC v2.2).
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
          'Octro pour le XRPL Lending Protocol Hackathon, organisé par DeVinci Blockchain et Ripple.',
          'Octro, built for the XRPL Lending Protocol Hackathon, hosted by DeVinci Blockchain and Ripple.',
        )}
      </T>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T variant="title">{t('Piste', 'Track')}</T>
          <Badge tone="success">{t('Track 1 — vault ouvert', 'Track 1 — open-ended vault')}</Badge>
        </View>
        <T variant="muted">
          {t(
            'Le vault reste ouvert aux dépôts et aux retraits pendant toute sa durée de vie. Les prêts ont une échéance, pas le vault.',
            "The vault stays open for deposits and withdrawals the whole time. Loans have a term; the vault doesn't.",
          )}
        </T>
        <T variant="muted">
          {t(
            'Réseau : Custom Hackathon Devnet. Protocole : Lending Protocol V1 (XLS-66) et Single Asset Vaults (XLS-65).',
            'Network: Custom Hackathon Devnet. Protocol: Lending Protocol V1 (XLS-66) and Single Asset Vaults (XLS-65).',
          )}
        </T>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T variant="title">{t('Saveur', 'Flavour')}</T>
          <Badge tone="success">{t('Loaded', 'Loaded')}</Badge>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('Credentials + Permissioned Domains', 'Credentials + Permissioned Domains')}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('Sponsorship (XLS-68/69)', 'Sponsorship (XLS-68/69)')}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('Parts de vault (MPToken)', 'Vault shares (MPToken)')}</T>
          </View>
        </View>
      </Card>
    </View>
  );
}
