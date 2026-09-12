# ADR 0002 — Comptes, KYC simulé, crédit Odoo, lending V1 partagé, buffer de liquidité

Statut : implémenté et vérifié (build + suite de tests verte sur l'ensemble du monorepo ; bootstrap réel du vault ouvert et du loan broker exécuté sur le Custom Hackathon Devnet). Cette ADR documente une extension explicite au-delà du pack C1 fermé, pas une réouverture du CDC v2.2.

## Contexte

Le produit doit désormais reposer sur un vrai parcours utilisateur et une vraie base de données, plutôt que sur les fixtures de démonstration : inscription + vérification email, KYC simulé bloquant l'accès aux instruments financiers, score de crédit calculé depuis Odoo (BYO, un utilisateur = son propre Odoo), relation lender/borrower sur le vault ouvert + loan broker partagés (Lending V1, déjà vérifié en réel), et un wallet buffer de liquidité avançant les retraits quand le vault est illiquide. Décisions actées avec l'utilisateur avant implémentation : buffer wallet réel fourni utilisé tel quel ; KYC simulé uniquement (Didit reste dormant) ; Odoo BYO ; un seul vault/broker partagé ; ordre complet des phases malgré le calendrier serré du hackathon.

## Décision et portée

1. Nouveau package `packages/credit/` : réimplémentation fidèle (mêmes poids, seuils, formules) de la méthodologie du script Python de référence ("Odoo Credit Assessment Report"), calcul pur sans I/O.
2. Nouveaux contrats (`packages/contracts/src/{user,email-verification,kyc-status,odoo-connection,credit-assessment,wallet,lending}.ts`), explicitement hors du pack C1 des neuf contrats originaux — commentaire dédié dans `index.ts`.
3. Nouveaux invariants domaine : `assertKycValid` (PER-11), `assertCreditApproved`, `assertAdvanceWithinBalance` — jamais invoqués depuis les cas d'usage de prévision existants (`GetPersonalProjectionUseCase`, `RecordDeclaredEventUseCase`, `CreateWorkspaceUseCase`).
4. Première persistance PostgreSQL réelle du projet (migrations SQL brutes, `infra/db/migrate.mjs`), avec chiffrement au repos (AES-256-GCM, deux clés distinctes) des seeds de wallet utilisateur et des clés API Odoo BYO.
5. Wallet XRPL généré à l'inscription (`Wallet.generate()`, aucun appel faucet) ; custody serveur assumée pour la durée du hackathon.
6. Vault ouvert + loan broker uniques, partagés par tous les lenders/borrowers, amorcés une fois via `infra/scripts/bootstrap-lending-pool.mjs` (opération d'administration, hors trafic public) — exécuté avec succès sur le Custom Hackathon Devnet (wallet propriétaire fondé via faucet, `VaultCreate` puis `LoanBrokerSet` validés en réel).
7. Wallet buffer réel fourni par l'équipe, utilisé pour avancer les retraits quand `LendingV1Port.withdrawFromVault` ne renvoie pas `"ready"` — plafonné au solde du grand livre interne, jamais un échec silencieux sur un remplissage partiel.
8. Aucune modification de `packages/xrpl/src/{lending-v1.ts,ports.ts,payment.ts,types.ts,network-capabilities.ts}` existant : uniquement des ajouts additifs (`WalletProvisioningPort`, `BufferDisbursementPort`).

## Écarts documentés vis-à-vis des exigences existantes

- **WAL-01** ("isoler wallet web et signatures") est écrit pour le flux client `WalletInterfacePort` (signature côté client, exclue de ce port par conception). Cette extension fait une **dérogation explicite et limitée au hackathon** : les wallets provisionnés à l'inscription sont signés côté serveur (seed chiffrée en base). Chemin de migration prévu post-hackathon : remplacer la signature serveur par `WalletInterfacePort` côté client pour tout usage au-delà de la démonstration.
- **PER-11** reste respecté par construction : `assertKycValid`/`assertCreditApproved` ne sont invoqués que depuis les cas d'usage crédit/lending, jamais depuis la prévision personnelle.
- **CMP-01** ("aucun KYC réel dans fixture") est satisfait par construction pour le volet simulé (`KycStatus.simulated` est un littéral `true`) ; le volet "faux webhook Didit refusé" reste **hors périmètre** — Didit demeure dormant, non branché. Statut : partiellement adressé, pas complet.
- **SEC-04 / SEC-LOAD-01** : le wallet buffer et le wallet propriétaire du vault/broker sont deux secrets plateforme supplémentaires — jamais en Git (`.gitignore` : `infra/scripts/*.evidence.json`), jamais exposés à un outil `packages/agents`/`packages/mcp` (aucune nouvelle capacité LLM n'est ajoutée pour déposer/retirer/emprunter/évaluer un crédit ; tout reste des routes HTTP déterministes d'`apps/api`).

## Limites connues, acceptées pour le hackathon

- Le solde retirable de chaque lender dans le vault partagé est calculé uniquement depuis PostgreSQL (dépôts confirmés − retraits honorés) : `LendingV1Port` n'expose aucune lecture de la part réelle d'un lender, donc ce calcul peut dériver du rendement réel accumulé on-chain.
- La conversion du plafond de crédit (devise native des livres Odoo, ex. `fiat:EUR`) en drops XRP pour une demande de prêt utilise un taux naïf (1 unité = 1 XRP), faute d'oracle FX branché — à corriger avant tout usage hors démo.
- Le calendrier de remboursement reste un remboursement en une fois (`PaymentTotal=1`) ; un vrai calendrier multi-échéances n'est pas rejoué par ce chemin de production (`services/optimizer` reste la seule source déterministe d'échéancier).
- La réconciliation du buffer (recréditer le buffer une fois le borrower remboursé et la liquidité du vault revenue) n'est pas automatisée (`apps/worker` reste vide) : les avances restent visibles comme "avancées, non réconciliées" dans le grand livre interne.
- Les wallets utilisateur générés à l'inscription restent non fondés (aucun appel faucet) : un dépôt/emprunt réel nécessite qu'un utilisateur finance lui-même son wallet avant sa première opération — ce parcours de financement n'est pas construit par cette extension.

## Conséquences sur les références

Le pack `docs/v2.2/` et les 62 exigences restent inchangés. Cette ADR documente une extension explicitement additive, jamais une dérogation silencieuse : tout écart ci-dessus est nommé, avec son statut et son chemin de résolution. `packages/xrpl/src/lending-v1.ts` (Augustin, vérifié en réel) n'est pas modifié ; cette extension le consomme tel quel via `LendingV1Port`.
