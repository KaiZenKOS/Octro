import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Field, Typography as T, tokens } from '@octro/ui';
import { API_BASE_URL } from './auth';
import { Icon } from './Icon';

const c = tokens.color;

interface AgentExecution {
  traceId: string;
  timestamp: string;
  workspaceId: string;
  requestShape: string;
  callCount: number;
  callCountCap: number;
  fallbackUsed: boolean;
  durationMs: number;
  riskTag: string;
}

interface OrchestrationData {
  orchestratorVersion: string;
  policy: {
    maxToolCalls: number;
    policyTimeoutMs: number;
    budget: string;
  };
  providerMode: 'live' | 'deterministic';
  configuredProviders: {
    deepseek: boolean;
    gemini: boolean;
    openai: boolean;
  };
  dernieres_executions: AgentExecution[];
}

interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface McpData {
  source: string;
  count: number;
  timestamp: string;
  tools: McpTool[];
}

export function AdminObservabilityScreen() {
  const [adminKey, setAdminKey] = useState('octro-admin-dev-secret');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledNotice, setDisabledNotice] = useState(false);
  const [orchData, setOrchData] = useState<OrchestrationData | null>(null);
  const [mcpData, setMcpData] = useState<McpData | null>(null);

  const fetchOpsData = async (keyToUse: string) => {
    setLoading(true);
    setError(null);
    setDisabledNotice(false);

    try {
      const headers = { 'x-admin-key': keyToUse.trim() };

      const [orchRes, mcpRes] = await Promise.all([
        fetch(`${API_BASE_URL}/v1/admin/agent/orchestration`, { headers }),
        fetch(`${API_BASE_URL}/v2/admin/mcp/tools`, { headers }),
      ]);

      if (orchRes.status === 404 || mcpRes.status === 404) {
        setDisabledNotice(true);
        setOrchData(null);
        setMcpData(null);
        return;
      }

      if (orchRes.status === 401 || mcpRes.status === 401) {
        throw new Error("Accès non autorisé (HTTP 401) : la clé x-admin-key fournie est invalide ou manquante.");
      }

      if (!orchRes.ok || !mcpRes.ok) {
        throw new Error(`Erreur serveur : HTTP ${orchRes.status} / ${mcpRes.status}`);
      }

      const orchJson: OrchestrationData = await orchRes.json();
      const mcpJson: McpData = await mcpRes.json();

      setOrchData(orchJson);
      setMcpData(mcpJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpsData(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ gap: 4 }}>
          <T variant="title" accessibilityRole="header">
            Observabilité & Administration Ops
          </T>
          <T variant="muted">
            Monitoring en temps réel de l'orchestrateur IA et des outils MCP (CDC v2.2, AGT-01, AGT-02, MCP-02).
          </T>
        </View>
        <Button variant="secondary" onPress={() => router.push('/')}>
          Retour à l'accueil
        </Button>
      </View>

      {/* Barre d'authentification admin */}
      <Card style={{ gap: 12 }}>
        <T variant="label">Authentification Administration (x-admin-key)</T>
        <View style={styles.keyRow}>
          <View style={{ flex: 1 }}>
            <Field
              label="Clé Admin (header x-admin-key)"
              value={adminKey}
              onChangeText={setAdminKey}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          <Button busy={loading} disabled={!adminKey} onPress={() => fetchOpsData(adminKey)}>
            Actualiser
          </Button>
        </View>
      </Card>

      {/* Message d'erreur / Accès refusé */}
      {error && (
        <Card style={{ gap: 12, borderColor: c.error }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="warning" color={c.error} size={24} />
            <T style={{ color: c.error, fontFamily: tokens.font.medium }}>Erreur d'accès aux métriques admin</T>
          </View>
          <T style={{ color: c.text }}>{error}</T>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Button variant="secondary" onPress={() => setAdminKey('octro-admin-dev-secret')}>
              Utiliser la clé dev par défaut
            </Button>
            <Button variant="ghost" onPress={() => router.push('/')}>
              Quitter la console admin
            </Button>
          </View>
        </Card>
      )}

      {/* Mode désactivé */}
      {disabledNotice && (
        <Card style={{ gap: 12, borderColor: c.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="shield" color={c.warning} size={24} />
            <T style={{ color: c.warning, fontFamily: tokens.font.medium }}>
              Observabilité désactivée (ENABLE_ADMIN_DEBUG désactivé par défaut)
            </T>
          </View>
          <T variant="muted">
            Les routes administratives d'observabilité sont désactivées par défaut sur ce backend (ENABLE_ADMIN_DEBUG=true requis).
          </T>
        </Card>
      )}

      {/* Données d'orchestration */}
      {orchData && (
        <>
          {/* État général & Politiques */}
          <View style={styles.cardsGrid}>
            <Card style={{ flex: 1, minWidth: 280, gap: 12 }}>
              <T variant="label">État du Système IA</T>
              <View style={styles.badgeRow}>
                <Badge tone="success">Mode Debug : Actif</Badge>
                <Badge tone={orchData.providerMode === 'live' ? 'success' : 'neutral'}>
                  Provider : {orchData.providerMode.toUpperCase()}
                </Badge>
              </View>
              <T>Version de l'orchestrateur : v{orchData.orchestratorVersion}</T>
              <View style={{ gap: 4 }}>
                <T variant="muted">Fournisseurs configurés (clés masquées SEC-04) :</T>
                <T style={{ fontSize: 13 }}>
                  • DeepSeek : {orchData.configuredProviders.deepseek ? 'Actif' : 'Non configuré'}
                </T>
                <T style={{ fontSize: 13 }}>
                  • Gemini : {orchData.configuredProviders.gemini ? 'Actif' : 'Non configuré'}
                </T>
                <T style={{ fontSize: 13 }}>
                  • OpenAI : {orchData.configuredProviders.openai ? 'Actif' : 'Non configuré'}
                </T>
              </View>
            </Card>

            <Card style={{ flex: 1, minWidth: 280, gap: 12 }}>
              <T variant="label">Politique d'Orchestration (Policy Bounded)</T>
              <View style={styles.badgeRow}>
                <Badge tone="warning">Max Tool Calls : {orchData.policy.maxToolCalls}</Badge>
                <Badge tone="neutral">Budget : {orchData.policy.budget}</Badge>
              </View>
              <T>Délai max (Timeout) : {orchData.policy.policyTimeoutMs} ms</T>
              <T variant="muted" style={{ fontSize: 13 }}>
                Garantie AGT-02 : L'agent n'a aucun pouvoir d'exécution de fonds ni de signature sur le ledger.
                Les préconisations sont générées en lecture seule depuis le plan structuré.
              </T>
            </Card>
          </View>

          {/* Ring buffer des exécutions récentes */}
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T variant="label">Dernières Exécutions IA (Mémoire RAM — max 20)</T>
              <Badge tone="neutral">{orchData.dernieres_executions.length} enregistrement(s)</Badge>
            </View>

            {orchData.dernieres_executions.length === 0 ? (
              <T variant="muted">
                Aucune requête enregistrée dans le tampon mémoire. Posez une question financière via le bouton
                « Comprendre » pour observer les métriques d'exécution.
              </T>
            ) : (
              orchData.dernieres_executions.map((item) => (
                <View key={item.traceId} style={styles.executionItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <T style={{ fontFamily: tokens.font.medium }}>
                      {item.workspaceId} · {item.requestShape}
                    </T>
                    <Badge tone={item.riskTag === 'deficit_detected' ? 'warning' : 'success'}>
                      {item.riskTag}
                    </Badge>
                  </View>
                  <T variant="muted" style={{ fontSize: 12 }}>
                    Trace ID : {item.traceId} · {new Date(item.timestamp).toLocaleTimeString()}
                  </T>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                    <T style={{ fontSize: 13 }}>
                      Appels : {item.callCount} / {item.callCountCap}
                    </T>
                    <T style={{ fontSize: 13 }}>Durée : {item.durationMs} ms</T>
                    <T style={{ fontSize: 13, color: item.fallbackUsed ? c.warning : c.text }}>
                      Repli : {item.fallbackUsed ? 'Déterministe' : 'Live LLM'}
                    </T>
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Outils MCP */}
          {mcpData && (
            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 4 }}>
                  <T variant="label">Serveur d'Outils MCP ({mcpData.source})</T>
                  <T variant="muted">Outils exposés en lecture seule sans capacité de modification financière (MCP-02).</T>
                </View>
                <Badge tone="success">{mcpData.count} outil(s)</Badge>
              </View>

              {mcpData.tools.map((tool) => (
                <View key={tool.name} style={styles.toolCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="sparkles" color={tokens.color.accent} size={18} />
                    <T style={{ fontFamily: tokens.font.medium, fontSize: 15 }}>{tool.name}</T>
                  </View>
                  <T style={{ color: c.muted, fontSize: 13 }}>{tool.description}</T>
                  <View style={styles.paramsBox}>
                    <T style={{ fontFamily: 'monospace', fontSize: 12, color: '#C5BAC4' }}>
                      {JSON.stringify(tool.parameters, null, 2)}
                    </T>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,
    maxWidth: 1080,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  executionItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1C1820',
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  toolCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#18151D',
    borderWidth: 1,
    borderColor: c.border,
    gap: 6,
  },
  paramsBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#100D14',
    borderWidth: 1,
    borderColor: '#2D2733',
  },
});
