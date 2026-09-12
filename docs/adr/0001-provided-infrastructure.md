# ADR 0001 — Préparer les services fournis sans changer les règles métier

Statut : préparation acceptée dans ce changement ; remplacement effectif de Stripe par Didit à arbitrer dans S5 avant implémentation. Cette ADR ne réactive aucune ancienne version du CDC.

## Contexte

L'inventaire fourni le 12 septembre 2026 comporte PostgreSQL, MongoDB, Linode S3, deux cibles SSH, Didit et une API email. Le [CDC v2.2](../v2.2/Octro_CDC_v2.2.md) prévoit PostgreSQL principal, MongoDB facultatif, S3, SMTP et Stripe Identity. Les identifiants console Didit ne permettent pas une intégration API. La documentation de l'API email est inaccessible avec l'accès actuel.

## Décision et portée

1. Préparer un environnement serveur expurgé et un précontrôle sans réseau. Il n'active ni adapter ni déploiement et ne remplace pas les dépôts en mémoire de S1.
2. Conserver PostgreSQL comme état métier et financier. Garder MongoDB désactivé par défaut ; son éventuel usage reste documentaire avec TTL et sans duplication des soldes ou permissions.
3. Distinguer endpoint S3 régional et bucket, garder les objets privés et prévoir des URL présignées de durée courte. L'authentification et les policies effectives restent à tester.
4. Recenser Didit comme candidat du port de vérification d'identité et laisser KYC désactivé. Le remplacement de Stripe est une décision d'adaptateur explicite à finaliser, pas une déduction depuis la présence d'un login. Il conserve la recette de webhook vérifié, la minimisation des données et la prévision sans KYC.
5. Préparer les emplacements des paramètres de l'API mail sans inventer son protocole. Aucun envoi pour vérifier la configuration.
6. Exclure de cette livraison toutes les valeurs de secrets, connexions SSH, opérations DB, sessions KYC et transactions ledger. Les accès d'administration ne deviennent pas des paramètres d'application.

## Conséquences sur les références

Le pack `docs/v2.2/` et les 62 exigences restent inchangés. Cette ADR est un inventaire d'intégration, pas une dérogation aux exigences `CMP-01`, `PER-11`, `SEC-04`, `SEC-LOAD-01` et `ARCH-LOAD-01`. Avant l'activation de Didit, mettre explicitement à jour la décision d'architecture et le manifeste racine si le fournisseur normatif change, tout en conservant la copie originale du pack. Un compte console ou une authentification réussie ne satisfait pas la recette.

Les travaux S3/S5/S6 de Samet consommeront cette préparation : [variables, commandes et blocages](../infra/backend-configuration.md). Les erreurs du moteur et du traitement XRPL relevées lors de l'audit sont des lots distincts ; aucune capacité ledger n'est réécrite dans cette préparation.
