import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Badge, Card, Typography as T, tokens } from '@octro/ui';
import { Icon } from './Icon';
import { useSession } from './session';
import { formatAmount, formatHumanAmount, useLendingApi } from './lending-data';
import type { BufferStatus } from './lending-data';

const c = tokens.color;

function formatBufferDate(iso: string, language: 'fr' | 'en'): string {
  return new Date(iso).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Transparence publique (GET /v1/lending/buffer) : solde reel du wallet
// buffer et historique des avances qu'il a deja faites (Phase F, repli de
// liquidite quand le vault n'a pas encore assez pour honorer un retrait).
function BufferSection() {
  const { t, language } = useSession();
  const api = useLendingApi();
  const [status, setStatus] = useState<BufferStatus | null>(null);

  useEffect(() => {
    api.getBufferStatus().then(setStatus).catch(() => setStatus(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!status) return null;

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <T variant="title">{t('Buffer de liquidité', 'Liquidity buffer')}</T>
        <Badge tone="success">
          {status.on_chain_balance !== null ? formatHumanAmount(status.asset_id, status.on_chain_balance) : '—'}
        </Badge>
      </View>
      <T variant="muted">
        {t(
          "Avance un retrait quand le vault n'a pas encore assez de liquidité (borrower pas encore remboursé), dans la limite de son propre solde.",
          "Advances a withdrawal when the vault doesn't have enough liquidity yet (borrower not repaid), capped at its own balance.",
        )}
      </T>
      {status.advances.length === 0 ? (
        <T variant="muted">{t("Aucune avance faite pour l'instant.", 'No advances made yet.')}</T>
      ) : (
        <View style={{ gap: 6 }}>
          {status.advances.map((advance, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <T>{formatAmount(status.asset_id, advance.amount)}</T>
              <T variant="muted" style={{ fontSize: 12 }}>
                {formatBufferDate(advance.created_at, language)}
              </T>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('RLUSD (stablecoin simulé) en second actif de prêt', 'RLUSD (simulated stablecoin) as a second lending asset')}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="success">{t('Implémenté', 'Implemented')}</Badge>
            <T>{t('Buffer de liquidité pour les retraits', 'Liquidity buffer for withdrawals')}</T>
          </View>
        </View>
      </Card>

      <BufferSection />
    </View>
  );
}
