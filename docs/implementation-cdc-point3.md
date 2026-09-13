# Implémentation — Observabilité Orchestrateur IA & MCP (CDC v2.2)

Ce document formalise les trois points d'observabilité et d'outillage ajoutés à Octro v2.2 :

1. **Endpoint d'observabilité orchestrateur IA** : `GET /v1/admin/agent/orchestration`
2. **Endpoint d'exposé des outils MCP** : `GET /v1/admin/mcp/tools`
3. **Vue frontend d'administration** : `/admin/ops` (et alias `/admin/observability`)

---

## 1. Sécurité, Garde-fous et Invariants Métier

- **Garde-fou environnemental** : Les routes d'administration sont désactivables globalement via `ADMIN_INSIGHTS_DISABLED=true`. Si ce drapeau est actif, l'API répond HTTP 404.
- **Authentification d'administration** : L'accès requiert le header `x-admin-key: <ADMIN_INSIGHTS_KEY>`. Toute requête sans clé ou avec une clé erronée est immédiatement rejetée avec HTTP 401 Unauthorized.
- **Non-exposition des secrets (`SEC-04`)** : Aucune clé d'API LLM (DeepSeek, OpenAI, Gemini) ni secret d'infrastructure ne transite dans les payloads JSON renvoyés. Seuls les indicateurs booléens de configuration (`configuredProviders`) et le mode d'inférence (`live` ou `deterministic`) sont exposés.
- **Lecture seule et absence d'exécution (`AGT-02`, `MCP-02`)** : Aucun endpoint ne modifie le ledger XRPL ou n'exécute d'ordre financier. Les outils MCP et l'observateur opèrent strictement en lecture seule.

---

## 2. Spécification des Endpoints Backend

### 2.1 `GET /v1/admin/agent/orchestration`

Renvoie les politiques actives de l'orchestrateur et l'historique récent d'exécution en mémoire RAM (tampon circulaire FIFO de 20 éléments maximum).

#### Exemple de requête
```bash
curl -H "x-admin-key: octro-admin-dev-secret" http://localhost:3000/v1/admin/agent/orchestration
```

#### Exemple de réponse (HTTP 200)
```json
{
  "orchestratorVersion": "2.2.0",
  "policy": {
    "maxToolCalls": 12,
    "policyTimeoutMs": 15000,
    "budget": "bounded"
  },
  "providerMode": "deterministic",
  "configuredProviders": {
    "deepseek": false,
    "gemini": false,
    "openai": false
  },
  "dernieres_executions": [
    {
      "traceId": "c4d32a10-1234-4567-89ab-cdef01234567",
      "timestamp": "2026-09-13T07:45:00.000Z",
      "workspaceId": "ws-personal-lina",
      "requestShape": "explain_cashflow",
      "callCount": 2,
      "callCountCap": 12,
      "fallbackUsed": true,
      "durationMs": 42,
      "riskTag": "deficit_detected"
    }
  ]
}
```

### 2.2 `GET /v1/admin/mcp/tools`

Instancie le serveur `OctroMcpServer` du package `@octro/mcp` et expose la liste des outils financiers déclarés avec leurs paramètres et descriptions.

#### Exemple de requête
```bash
curl -H "x-admin-key: octro-admin-dev-secret" http://localhost:3000/v1/admin/mcp/tools
```

#### Exemple de réponse (HTTP 200)
```json
{
  "source": "@octro/mcp",
  "count": 3,
  "timestamp": "2026-09-13T07:53:41.594Z",
  "tools": [
    {
      "name": "octro_get_workspace_summary",
      "description": "Lit le résumé du compte et les soldes actuels (Lecture seule, sans clé privée)",
      "parameters": {
        "type": "object",
        "properties": {
          "workspaceId": { "type": "string", "description": "ID du workspace" }
        },
        "required": ["workspaceId"]
      }
    },
    {
      "name": "octro_get_projection",
      "description": "Calcule le calendrier de trésorerie sur un horizon donné (ex. 30 jours)",
      "parameters": {
        "type": "object",
        "properties": {
          "workspaceId": { "type": "string" },
          "horizonDays": { "type": "number", "default": 30 }
        },
        "required": ["workspaceId"]
      }
    },
    {
      "name": "octro_explain_proposal",
      "description": "Explique le plan d action proposé et les options sans dette",
      "parameters": {
        "type": "object",
        "properties": {
          "workspaceId": { "type": "string" },
          "actionType": { "type": "string" }
        },
        "required": ["workspaceId"]
      }
    }
  ]
}
```

---

## 3. Vue Frontend d'Observabilité (`/admin/ops`)

Le composant `AdminObservabilityScreen` (`apps/client/src/admin-observability.tsx`) est servi sur les routes Expo :
- `/admin/ops` (`apps/client/app/admin/ops.tsx`)
- `/admin/observability` (`apps/client/app/admin/observability.tsx`)

Il présente :
- Un champ de saisie dynamique du header `x-admin-key`.
- L'état général du service IA (`Actif`, `Provider Live / Déterministe`).
- Les politiques d'orchestration (`Max Tool Calls: 12`, `Timeout: 15 000 ms`, `Budget: bounded`).
- Le tableau temps réel des 20 dernières exécutions de l'agent (avec traceId, durée, tours et risque).
- La liste complète des outils MCP et leurs schémas de paramètres.
- En cas d'erreur ou d'absence de clé, un message clair et un bouton de redirection conviviale vers l'accueil.

---

## 4. Preuves de Validation Automatisées

- `apps/api/test/admin-ops.test.ts` : 6 tests vérifiant le rejet 401, l'acceptation 200, l'absence de fuite de secret, l'alimentation du ring buffer via `/v1/agent/explain`, la liste des outils MCP et la désactivation 404.
- `packages/mcp/test/server.test.ts` : Assertions complètes sur les outils MCP.
- Typecheck global `tsc -b tsconfig.json` : 100% propre (code 0).
