# Octro v2.2 — Script de démonstration (4 minutes, SUB-01)

Ce script décrit uniquement le comportement présent dans le client et les preuves conservées dans le dépôt. Le client ne connecte pas de wallet, ne signe pas et ne soumet pas de transaction. La page « Preuves XRPL » rejoue des opérations historiques ; le cycle ledger montré a été exécuté séparément. Les données Lina sont synthétiques.

## Découpage

| Temps | Écran | Démonstration |
| --- | --- | --- |
| 0:00–0:30 | Titre | Le décalage entre entrée attendue et dépense certaine |
| 0:30–1:35 | Accueil, calendrier, proposition | Prévision Lina et option sans dette |
| 1:35–2:05 | Ajouter puis recalculer | Dépense synthétique imprévue et diagnostic |
| 2:05–3:20 | Suivi / preuves XRPL | Rejeu des preuves Devnet et lien explorateur |
| 3:20–4:00 | Conclusion | Portée livrée et prochaine étape honnête |

## Script et actions

### 0:00–0:30 — Le décalage

**À l’écran :** titre Octro, puis calendrier simplifié.

**Voix :**

> « Les revenus arrivent à une date et les dépenses à une autre. Quand le loyer passe avant le salaire, le problème n’est pas toujours un manque d’argent sur le mois : c’est un manque au mauvais moment. Octro rend ce décalage visible et aide à examiner les options avant toute action. »

### 0:30–1:35 — Lina, projection sans dette

**À l’écran :** route `/`, puis `/calendar`, puis `/proposal`. Préciser oralement que les données sont synthétiques.

**Actions :** montrer le solde courant de 650 €, l’épargne mobilisable de 300 €, les dépenses datées et le salaire attendu. Ouvrir la projection et la proposition calculée.

**Voix :**

> « Voici Lina, un scénario de démonstration. Elle a 650 euros sur son compte courant et 300 euros d’épargne. Ses dépenses de 780 euros précèdent son salaire attendu. Le moteur personnel calcule le passage sous sa réserve de 100 euros et renvoie un plan structuré : transférer 230 euros de ses propres fonds, sans nouveau crédit. Le résultat reste une proposition. Lire ou acquitter cette proposition ne déplace pas d’argent. »

### 1:35–2:05 — Une nouvelle dépense change le résultat

**À l’écran :** route `/add`, ajouter une dépense déclarée de 150 €, puis revenir au calendrier ou à la proposition après recalcul.

**Voix :**

> « Ajoutons maintenant une dépense imprévue de 150 euros. Le calcul repart des nouvelles hypothèses. Dans ce scénario, les fonds disponibles ne suffisent plus à préserver la réserve : Octro affiche un diagnostic sans solution sans dette au lieu d’inventer un plan. »

### 2:05–3:20 — Preuves XRPL observées

**À l’écran :** route `/tracking`, carte « Preuves XRPL observées », puis un lien d’explorateur ouvert depuis le registre.

**Voix :**

> « Octro conserve aussi des preuves d’essais sur le Custom Hackathon Devnet. Cette page est un rejeu en lecture seule, pas une connexion au ledger. Les pièces montrent un vault ouvert, un dépôt, un broker, un LoanSet coordonné, un remboursement LoanPay, puis un retrait avec 1 370 drops d’intérêt constaté. Le décaissement est confirmé par les variations de soldes de la LoanSet validée ; il n’y a pas de transaction Drawdown distincte dans cette preuve. »

> « La recette Loaded a également observé un dépôt privé refusé sans Credential reconnue, puis accepté avec l’attestation correspondante. Ce contrôle porte sur le dépôt dans le vault ; il ne remplace pas la décision de crédit du prêteur. »

**Note de tournage :** ne pas simuler de connexion wallet, signature ou soumission live. Les transactions, résultats et URLs doivent correspondre aux fichiers [registre de preuves](../progress/augustin/evidence/demo-evidence.run-2026-09-12.json), [cycle Lending V1](../progress/augustin/evidence/a3-loan-full-cycle.json) et [cycle Credentials/Domains](../progress/augustin/evidence/a4-credentials-domains-full-cycle.json).

### 3:20–4:00 — Ce qui est là, ce qui reste

**À l’écran :** retour à l’accueil, puis slide de clôture.

**Voix :**

> « Aujourd’hui, le parcours relié au moteur est la projection personnelle quotidienne. Les variantes indépendant et organisation restent des démonstrations, et l’application n’exécute aucune transaction XRPL. La prochaine étape est de relier les contrôles et preuves réseau à un parcours produit durable, tout en gardant la prévision utile sans wallet ni crédit. Octro commence par aider chacun à comprendre ce qui arrive et à protéger l’essentiel. »

## À vérifier avant l’enregistrement

- Vérifier les ports et démarrer le client et l’API en suivant le [README du client](../../apps/client/README.md) ; ne pas reprendre une URL d’une ancienne capture.
- Confirmer que l’interface utilise le scénario synthétique Lina et que chaque recalcul affiche l’état courant, pas une ancienne proposition.
- Ouvrir chaque preuve depuis les fichiers cités et confirmer son résultat et son lien d’explorateur.
- Garder visibles les mentions « données synthétiques » et « preuves historiques » ; ne pas filmer de secret, de terminal avec variables d’environnement ou de clé.
- N’ajouter au récit aucun test utilisateur, verbatim ou difficulté développeur qui n’a pas été observé et rédigé personnellement par son auteur (`DEVEX-01`, `DEVEX-02`).
