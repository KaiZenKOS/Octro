# Préparation de l'infrastructure Octro

Base inspectée : `9d1ccb6ad700217ba98bd6cd1d3ba5debc9ea0b9`.
Références : [CDC v2.2](../v2.2/Octro_CDC_v2.2.md), chapitres 10, 18, 21, 31 et 32 ; [exigences](../../requirements.json) ; [architecture](../architecture.md) ; [décision d'adaptateurs](../adr/0001-provided-infrastructure.md).

Cette livraison prépare les variables et leur vérification **hors réseau**. L'API S1 utilise toujours ses dépôts en mémoire, son calcul simulé et son authentification de développement. Aucun adaptateur de données, déploiement, migration, session KYC, envoi d'email ou transaction XRPL n'est effectué par ces fichiers. Un contrôle de configuration réussi ne prouve ni l'accès au service ni son raccordement à l'application.

## Inventaire fourni

| Service | Cible déclarée | Traitement préparé |
| --- | --- | --- |
| PostgreSQL | `core.data.fr-par-2.octro.co:5432`, base `octro`, utilisateur `app` | Source métier principale ; mot de passe séparé ; TLS avec validation du certificat et du nom d'hôte |
| MongoDB | `store.data.fr-par-2.octro.co:27017`, base `octro`, `authSource=admin` | Facultatif et désactivé ; documents bruts avec TTL si un besoin subsiste |
| Stockage S3 Linode | URL bucket déclarée `https://octro.fr-par-1.linodeobjects.com` | Bucket `octro`, endpoint régional proposé `https://fr-par-1.linodeobjects.com` ; accès privé et liens présignés courts |
| API | `core.app.fr-par-2.octro.co` | URL HTTPS proposée pour le futur service |
| Site | `octro.co`, `www.octro.co` | Origines HTTPS proposées pour le futur client |
| KYC | Didit Business Console | Candidat d'adaptateur, désactivé ; clés d'application et workflow manquants |
| Email | Dépôt `sametcatakli/octro_mailing` | Désactivé ; contrat HTTP inaccessible lors de la préparation |

Les ports **22 sont des accès SSH d'administration**, pas les ports HTTP du backend ou du site. Les mots de passe SSH, identifiants console et secrets TOTP ne servent pas au processus API. Aucun accès root n'est encodé dans les fichiers du projet.

L'endpoint S3 est déduit de l'URL fournie : confirmer bucket, endpoint et région de signature dans Cloud Manager au prochain test SDK. `S3_REGION=fr-par-1` est une valeur proposée, pas une observation d'authentification réussie. `S3_FORCE_PATH_STYLE=false` conserve l'adressage virtuel du bucket. La région des bases `fr-par-2` ne permet pas de déduire celle du stockage. Le TTL choisi par ce projet est de 300 secondes, borné à 900 par le précontrôle ; il n'applique aucune politique au bucket.

## Préparer son environnement

Utiliser Node **22 ou ultérieur** pour les commandes de préparation (`--env-file`). Depuis la racine d'un checkout contenant ce changement, dans PowerShell :

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
notepad .env
node --env-file=.env scripts/check-backend-config.mjs
node --test infra/config/environment.test.mjs
```

Ne pas écraser un `.env` déjà utilisé : ajouter seulement les variables absentes après comparaison locale. Les mêmes contrôles sont disponibles avec `npm run config:check` et `npm run config:test`, sans installation de dépendance pour ces deux scripts. Les variables déjà injectées dans le processus ont priorité sur le fichier avec Node ; éviter un ancien environnement de shell pour une vérification de déploiement.

Renseigner localement les valeurs renouvelées de `PGPASSWORD`, `S3_ACCESS_KEY_ID` et `S3_SECRET_ACCESS_KEY`. L'exemple laisse ces champs vides et le contrôle doit alors échouer en listant uniquement leurs noms. Les deux annonces successives de mot de passe DB ne permettent pas de confirmer l'état de PostgreSQL et de MongoDB : vérifier chaque compte séparément, sans réutiliser automatiquement le mot de passe SSH. Le projet ne stocke aucune valeur secrète du message source.

Les secrets applicatifs sont exclusivement côté serveur. Ne pas les préfixer `EXPO_PUBLIC_`, les importer dans le client, les mettre dans Pencil ou les joindre aux logs. `.env`, `.env.*`, `.secrets/` et `.certs/` sont ignorés ; seul `.env.example` est versionné. En déploiement, préférer l'injection par le gestionnaire de secrets, avec accès restreint au compte de service. Les comptes et clés partagés dans un canal de discussion sont à renouveler par leurs propriétaires, y compris le facteur TOTP. Leur renouvellement n'a pas été exécuté ici.

## TLS et futures connexions

`PGSSLMODE=verify-full` est requis par ce précontrôle pour la base distante. Si une autorité privée est utilisée, installer la CA approuvée et indiquer `PGSSLROOTCERT`. L'adaptateur PostgreSQL futur doit traduire ce choix en TLS avec vérification du certificat **et** du nom d'hôte ; la variable seule ne configure pas automatiquement tous les pilotes Node.

Pour MongoDB, conserver `MONGODB_TLS=true`, la validation du certificat et celle du nom d'hôte. Remplacer le contournement `tlsAllowInvalidCertificates=true` présent dans l'inventaire par une chaîne de confiance correcte (`MONGODB_TLS_CA_FILE` si nécessaire). Les chemins de CA, droits système, résolution DNS, pare-feu et connexions ne sont pas testés par la commande de précontrôle.

Construire les options des pilotes à partir des champs distincts ; si un futur adaptateur construit une URI, encoder séparément utilisateur et mot de passe. Ne pas journaliser cette URI. Restreindre l'accès aux bases à la VM/API ou au réseau privé autorisé ; un nom DNS ne démontre pas une exposition publique ni un filtrage correct.

## KYC et email : éléments encore nécessaires

Pour Didit, récupérer une **clé API d'application**, un **workflow publié** et le **secret de signature de la destination webhook**. Les renseigner dans `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`, puis définir `DIDIT_WEBHOOK_URL` seulement après implémentation de la route. Le login Business Console et son TOTP ne sont pas des clés API. Aucune route webhook n'est créée par cette livraison. La signature, l'idempotence et l'association session/Workspace seront testées dans S5 avant tout statut d'identité utilisable (`CMP-01`). Le retour navigateur ne valide pas une identité.

Le [contrat mail fourni](https://github.com/sametcatakli/octro_mailing/blob/main/doc/api.md) renvoie 404 avec l'accès GitHub disponible. Cela peut signifier un dépôt privé non autorisé ou un chemin absent. Il faut fournir `doc/api.md` ou permettre sa lecture, puis confirmer base URL, en-tête et schéma d'authentification, route, payload, erreurs et reprise. `MAIL_API_BASE_URL`, `MAIL_API_AUTH_HEADER` et `MAIL_API_SEND_PATH` restent vides ; aucune valeur Bearer, route `/send` ou capacité de dry-run n'est supposée. `MAIL_API_TOKEN` est réservé au secret renouvelé. La syntaxe de ces variables ne remplace pas la validation du contrat.

`KYC_ENABLED` et `MAIL_ENABLED` sélectionnent uniquement les blocs à vérifier par l'outil de préparation. Ils ne démarrent aucune intégration. Leur activation applicative future doit rester explicite et ne jamais bloquer la prévision personnelle (`PER-11`, `ACC-02`).

## Raccordement à confier à Samet

| Lot | Travail restant | Vérification d'acceptation |
| --- | --- | --- |
| S3 | Dépôts PostgreSQL derrière les ports ; migrations ; import et dédoublonnage | Persistance après redémarrage, isolation Workspace, `DATA-01` et `SEC-01` |
| S3/S6 | Adaptateur S3 privé, URL présignée bornée, rétention et autorisation par Workspace | Aucun objet accessible par un autre Workspace ; copie et restauration selon `OPS-03` |
| S5 | Arbitrage Didit/Stripe et adaptation du port de vérification | Faux webhook refusé (`CMP-01`), prévision sans KYC (`PER-11`) |
| S6 | Adaptateur email selon contrat vérifié et outbox | Doublons/reprise maîtrisés ; aucun envoi déclenché par la préparation |
| S6 | Auth réelle, reverse proxy HTTPS, secrets et sauvegarde | Aucun déploiement public de la composition S1 ; revue de `SEC-01`, `SEC-04` et `OPS-03` |

Les seeds de test XRPL restent dans le stockage de secrets utilisé par l'intégration ledger, séparées des paramètres de données. Le wallet V1.1 partagé dans l'inventaire n'est pas ajouté comme dépendance : le Track 1 et le réseau réellement confirmé restent régis par G0. Les événements et correctifs locaux de capture XRPL ne sont pas modifiés.

## Vérifications de cette livraison

- Contrôle du modèle incomplet : refus attendu si les secrets sélectionnés manquent.
- Tests déterministes : fournisseurs optionnels, contournements TLS, confusion endpoint/bucket, TTL, URL contenant des identifiants et absence de fuite dans les sorties.
- CI : exécution de `config:test` sans secret de fournisseur ni réseau.
- Aucun test de disponibilité, d'authentification fournisseur ou de persistance réelle n'est revendiqué.

## Références techniques

- [Akamai : URL de service et URL de bucket](https://techdocs.akamai.com/cloud-computing/docs/access-buckets-and-files-through-urls).
- [Akamai : types d'endpoints et régions](https://techdocs.akamai.com/cloud-computing/docs/endpoint-types).
- [MongoDB : options de connexion TLS](https://www.mongodb.com/docs/manual/reference/connection-string-options/#tls-options).
- [PostgreSQL : vérification SSL](https://www.postgresql.org/docs/current/libpq-ssl.html).
- [Didit : authentification API](https://docs.didit.me/getting-started/api-authentication), [création de session](https://docs.didit.me/sessions-api/create-session) et [webhooks](https://docs.didit.me/integration/webhooks).
- [Node : chargement d'un fichier d'environnement](https://nodejs.org/api/cli.html#--env-filefile).
