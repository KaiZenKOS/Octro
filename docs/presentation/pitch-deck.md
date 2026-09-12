# Octro v2.2 — Pitch Deck (4 minutes / 10 slides)

## Slide 1 — Titre & Vision
**Octro** : L’infrastructure prédictive de trésorerie et de crédit décentralisé.
*Combler les décalages de règlement (settlement gaps) sans dette inutile, avec exécution vérifiée sur XRPL.*
- **Présentateurs** : Kevin (Produit & Frontend), Samet (API & Infra), Augustin (Moteur & XRPL).
- **Track** : Track 1 Loaded (XLS-65 / XLS-66 SingleAssetVault, LoanBroker, Credentials & Domains).

---

## Slide 2 — Le Problème : Le gouffre de liquidité (Settlement Gap)
- Une entreprise, un indépendant ou un particulier peut être **rentable ou solvable**, mais manquer de liquidités à l'instant $T$ où une échéance arrive avant un encaissement.
- *Exemple concret* : Le loyer/fournisseur arrive à J+2, le virement client ou salaire n'arrive qu'à J+10.
- Les solutions actuelles : découverts coûteux, affacturage opaque ou stress financier.

---

## Slide 3 — Notre Réponse : Le principe « Sans dette d'abord »
- **Calcul Déterministe** : Analyse de la courbe de trésorerie sur 30 jours / 72h.
- **Priorité aux fonds propres** : Si une réserve d'épargne mobilisable existe (ex. scénario Lina : 230 € de transfert interne), Octro propose l'arbitrage sans emprunt.
- **Crédit uniquement si nécessaire** : Si le besoin dépasse les fonds disponibles, activation de facilités de liquidité courtes autorisées.

---

## Slide 4 — Architecture : Séparation stricte Calcul / IA / Ledger
- **Moteur Financier (Python)** : LP / CVaR95 déterministe avec calculs décimaux stricts (`Decimal`, zéro float).
- **Agents & MCP (TypeScript)** : Rôle *Analyst* & *Explainer* pour vulgariser le plan. Aucun droit de signature.
- **Ledger XRPL** : Exécution non-custodial via XLS-65 / XLS-66.

---

## Slide 5 — La Démonstration Produit (Live Demo)
1. **Accueil & Calendrier** : Vue instantanée du point bas de trésorerie (−130 € à J+6) et de la réserve de sécurité (100 €).
2. **Recommandation claire** : Proposition de transfert de 230 € avec explication automatique.
3. **Ajout d'échéance dynamique** : Saisie en temps réel d'une facture ou dépense avec recalcul immédiat.

---

## Slide 6 — L'Intégration XRPL Réelle (XLS-65 / XLS-66)
- **Cycle complet validé sur Devnet** :
  - `VaultDeposit` & `LoanBrokerSet`
  - Co-signature `LoanSet` entre emprunteur et broker (`temBAD_SIGNER` évité)
  - Décaissement automatique & confirmation de solde
  - Remboursement `LoanPay`
  - Retrait `VaultWithdraw` avec rendement d'intérêt réel constaté (1370 drops).

---

## Slide 7 — Track 1 Loaded : Permissioned Domains & Compliance
- Contrôle d'accès au crédit via **Credentials & Permissioned Domains**.
- Dépôt refusé sans attestation, accepté dès la reconnaissance du credential.
- Séparation stricte entre conformité réglementaire (off-chain) et exécution sécurisée (on-chain).

---

## Slide 8 — Les 3 Publics Cibles
1. **Particuliers (Lina)** : Gestion de budget sans dette, accessible sans wallet ni KYC obligatoire.
2. **Indépendants & Freelances** : Protection des provisions fiscales et float sur factures en retard.
3. **PSP & Marketplaces B2B** : Optimisation de float institutionnel et facilités de crédit court terme automatisées.

---

## Slide 9 — Modèle Économique & Go-to-Market
- **SaaS B2B** : Abonnement pour le moteur d'optimisation et les connecteurs ERP/Banques.
- **Frais d'infrastructure API** : Micro-frais à l'arbitrage de liquidité.
- **Pilote B2B encadré** : Lancement pilote sur un corridor spécifique avant expansion multi-devises (RLUSD / EUR).

---

## Slide 10 — Conclusion & Équipe
- **Ce qui est livré aujourd'hui** :
  - 5 écrans React Native / Expo Web fluides et dynamiques.
  - Moteur mathématique pur vérifié par 26 tests unitaires.
  - Cycle de prêt XRPL réel exécuté et documenté sur le devnet.
  - Serveur MCP et orchestrateur d'agents bornés.
- **Octro** : Donnez à chaque trésorerie le pouvoir de l'anticipation.
