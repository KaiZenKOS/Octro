# Octro v2.2 — Script & Storyboard Vidéo Démo (SUB-01 / 4 Minutes)

**Projet** : Octro — Infrastructure Prédictive de Trésorerie & Crédit Décentralisé  
**Track** : Track 1 Loaded (XLS-65 / XLS-66 SingleAssetVault & LoanBroker, Credentials, Permissioned Domains)  
**Équipe** : Kevin (Frontend, UI/UX & MCP), Samet (API & Infra), Augustin (Moteur Déterministe & XRPL)  
**Format** : Vidéo de 3 à 4 minutes, capture d'écran HD 1080p avec voix off claire et dynamique.

---

## Vue d'ensemble du Découpage (Timing 4:00)

| Séquence | Durée | Écran affiché | Sujet & Message Clé |
| :--- | :--- | :--- | :--- |
| **1. Hook & Problème** | 0:00 - 0:45 | Slide 1 & 2 / Diagramme de trésorerie | Le gouffre de règlement (*Settlement Gap*) : rentable sur le papier mais bloqué à J+6. |
| **2. Démo Live Produit (Lina)** | 0:45 - 1:45 | App Client (`/`, `/calendar`, `/proposal`) | Découverte sans dette : prévision réactive, point bas J+6, proposition de transfert de 230 €. |
| **3. Dynamisme Réactif & Simulation** | 1:45 - 2:30 | App Client (`/calendar` & `/add`) | Ajout en direct d'une échéance (+150 €) : recalcul instantané de la courbe SVG et du plan. |
| **4. Entreprise & Ledger XRPL Live** | 2:30 - 3:15 | App Client (Vue Org & Modale Wallet) | Cas 90k INFEASIBLE vs 70k compatible. Co-signature `LoanSet`, `LoanPay` et preuve explorateur. |
| **5. Architecture & Conclusion** | 3:15 - 4:00 | Slides Architecture & Track 1 Loaded | Séparation stricte Calcul / IA / Ledger. Modèle économique et pilotes B2B. |

---

## Script Détaillé & Actions à l'Écran

### 🎬 Séquence 1 — Le Problème : Le gouffre de liquidité (0:00 - 0:45)
- **Visuel** : Slide 1 (Titre Octro), puis Slide 2.
- **Voix off** :
  > *"Bonjour à tous. Chaque jour, des milliers d’entreprises, d’indépendants et de particuliers rentables ou solvables font face à une épreuve invisible : le décalage de règlement, ou settlement gap.*
  > *Votre loyer ou vos charges tombent le 14 du mois, mais vos encaissements clients ou votre salaire n'arrivent que le 22. Résultat ? Découverts abusifs, agios bancaires, ou refus d'affacturage.*
  > *Voici Octro : l’infrastructure prédictive qui comble les gouffres de trésorerie en appliquant une règle d'or : d’abord les fonds propres sans dette, et si nécessaire, du crédit court terme décentralisé sur XRPL."*

### 🎬 Séquence 2 — Démo Live : Le parcours Lina sans dette (0:45 - 1:45)
- **Visuel** : Navigateur sur `http://localhost:8081` (Vue Mobile 390 px ou Desktop).
- **Actions** :
  1. Afficher l'accueil de Lina : solde courant 650 €, épargne 300 €.
  2. Cliquer sur *"Voir mon calendrier"*. Montrer le point bas de trésorerie (−130 € à J+6) et la réserve protégée (ligne ambre de 100 €).
  3. Cliquer sur *"Voir la proposition"*.
- **Voix off** :
  > *"Voici l'expérience Octro pour Lina, une salariée. Aucune connexion bancaire intrusive, aucun KYC, aucun wallet requis pour démarrer.*
  > *En un coup d’œil, le moteur déterministe détecte qu'à J+6, le loyer fait plonger le compte courant à -130 €, brisant sa réserve de sécurité de 100 €.*
  > *Plutôt que de lui vendre un micro-crédit toxique, Octro identifie son épargne mobilisable et lui recommande un transfert interne de 230 €. La réserve est sauvée, son épargne conserve 70 €, zéro centime d’intérêt payé."*

### 🎬 Séquence 3 — Dynamisme Réactif & Simulation Directe (1:45 - 2:30)
- **Visuel** : Écran `/calendar`, puis clic sur le bouton `[+ Imprévu 150 €]`.
- **Actions** :
  1. Montrer la courbe SVG initiale.
  2. Cliquer sur `+ Imprévu 150 €` : observer le tracé SVG se recalculer instantanément, le point bas descendre, et le montant recommandé s'adapter.
  3. Cliquer sur `[↺ Réinitialiser]` pour revenir au scénario de base.
- **Voix off** :
  > *"Mais la vie réelle n'est jamais figée. Regardez bien la courbe : si un imprévu de 150 € survient à J+3, je clique : instantanément, la projection recalculée en temps réel redessine le profil de liquidité et ajuste le plan.*
  > *Ce moteur réactif garantit une transparence mathématique absolue à chaque nouvelle dépense déclarée."*

### 🎬 Séquence 4 — Entreprise, XLS-65/66 et Preuves Ledger (2:30 - 3:15)
- **Visuel** : Bascule sur la vue Organisation (`/` → Organisation), puis ouverture de la modale Wallet.
- **Actions** :
  1. Montrer l'onglet `31 · Incompatible` : besoin de 90 000 € alors que le pool XLS-65 est plafonné à 80 000 € → Diagnostic `INFEASIBLE`.
  2. Basculer sur `32 · Approbation` (70 000 € compatible).
  3. Ouvrir le Portefeuille XRPL : cliquer sur *"Connecter compte de test XRPL"*.
  4. Cliquer sur *"Signer LoanSet (Tirage 10 XRP)"* : statut confirmé `tesSUCCESS` sur ledger 65045 avec tx hash réel.
  5. Cliquer sur *"Signer LoanPay"* : remboursement complet et clôture du prêt.
  6. Survoler le lien de l'explorateur custom devnet.
- **Voix off** :
  > *"Pour les entreprises, Octro exploite la puissance des protocoles de prêt natifs XRPL XLS-65 et XLS-66.*
  > *Si une PME demande 90 000 € sur un pool plafonné à 80 000 €, le solveur mathématique refuse formellement l'opération : INFEASIBLE.*
  > *Sur le scénario compatible à 70 000 €, l'analyste soumet et le signataire approuve. Ouvrons notre wallet non-custodial : en signant le LoanSet, l'emprunteur et le courtier co-signent la transaction validée tesSUCCESS sur le devnet de Ripple.*
  > *Le décaissement est immédiat, et le remboursement LoanPay se fait en un clic, consultable directement sur l'explorateur public."*

### 🎬 Séquence 5 — Architecture & Conclusion (3:15 - 4:00)
- **Visuel** : Slides 4, 7 et 10 du pitch deck.
- **Voix off** :
  > *"L'architecture d'Octro repose sur une séparation stricte : un moteur déterministe LP/CVaR95 en Python pour les calculs, des agents IA bornés et un serveur MCP pour expliquer et guider l'utilisateur sans aucun droit de signature, et le ledger XRPL pour l'exécution vérifiable avec Permissioned Domains.*
  > *Nous avons validé ce parcours auprès de 3 novices réels en moins de 3 minutes chacun.*
  > *Avec Octro, nous donnons à chaque trésorerie — du particulier à la grande entreprise — le pouvoir de l'anticipation sans dette inutile. Merci !"*

---

## Checklist Technique pour l'Enregistrement

- [x] Serveur Web Expo lancé sur `http://localhost:8081`.
- [x] API backend Fastify active sur `http://localhost:3000`.
- [x] Résolution écran configurée en 1920x1080 (échelle 100%).
- [x] Micro calibré, son clair sans bruit de fond.
- [x] Explorateur XRPL accessible : `https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/`.
- [x] Test de fluidité du bouton réactif `+ Imprévu 150 €` vérifié avant tournage.
