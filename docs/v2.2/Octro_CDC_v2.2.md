# Octro Cahier des charges complet

Version 2.2 | 12 septembre 2026 | Kevin, Samet et Augustin

Produit universel de prévision et de coordination financière. Particuliers, indépendants et organisations sont des publics P0. Spécification de développement ; démonstration avec données synthétiques et actifs de test. Les chiffres, délais et seuils sont des décisions proposées, pas des résultats observés.

## 1 Octro pour la vie quotidienne et les activités

Octro aide chacun à voir si son argent sera disponible au bon moment, à anticiper les passages difficiles et à choisir une action adaptée. Le produit s'adresse dès le MVP aux particuliers, aux indépendants et aux entreprises. Il reste utile sans emprunter, sans créer une société et sans posséder de crypto.

**La promesse commune**

« Comprendre ce qui arrive, protéger l'essentiel et choisir quoi faire. » Octro rapproche l'argent disponible, les revenus attendus et les dépenses à venir. Il distingue les faits des hypothèses, signale un manque et explique les options. La décision appartient à l'utilisateur. Un accès au produit ne garantit jamais un financement.

**Trois situations, un même moteur**

| Personne | Besoin concret | Résultat attendu |
| --- | --- | --- |
| Salarié ou étudiant | Le loyer arrive avant le prochain revenu | Voir le manque et un plan sans dette si possible |
| Indépendant ou créateur | Une facture ou un versement est retardé | Préserver dépenses personnelles et professionnelles |
| Entreprise ou plateforme | Des paiements précèdent un règlement | Comparer les sources de liquidité autorisées |

Le socle permet de saisir ses soldes et échéances, importer un fichier, visualiser un calendrier et simuler des scénarios. Une connexion bancaire améliore les données lorsqu'elle est disponible ; elle n'est pas obligatoire pour commencer. Une connexion de wallet ne devient nécessaire que pour une opération qui utilise réellement XRPL.

**La première question n'est pas le crédit**

Octro recherche d'abord les options compatibles sans nouvelle dette : utiliser des fonds propres disponibles, ajuster une dépense facultative avec l'accord de l'utilisateur ou demander un changement d'échéance au créancier. Il compare ensuite un financement autorisé si cela répond au besoin. Il ne déplace jamais de l'argent, ne contacte jamais un créancier et ne reporte jamais un paiement sans autorisation et capacité d'exécution effectives.

## 2 Les 5W du produit universel

**WHAT — Ce que l'on construit**

Une application React Native unique et un moteur de coordination financière réutilisable par API. L'application affiche une vue personnelle par défaut et peut ajouter un espace d'activité ou d'équipe. Le même moteur combine calendrier, prévision, contraintes, comparaison d'actions, validation et suivi. La couche de crédit XRPL est une capacité, pas une obligation d'usage.

**WHY — Pourquoi cela sert**

Un décalage entre dépenses et revenus existe à tous les niveaux de montant. Octro vise à réduire les surprises, à préserver une réserve choisie et à expliquer les compromis. Son intérêt se mesure aussi lorsqu'il évite un emprunt. Aucun score social, conseil d'investissement ou rendement promis ne fait partie du produit.

**WHO — Pour qui**

Particulier, étudiant majeur, salarié, retraité, personne entre deux emplois, indépendant, commerçant, association et équipe d'entreprise peuvent utiliser le socle. Les types de revenus ne définissent pas une hiérarchie d'accès. Les mineurs nécessitent un parcours et une base légale adaptés, hors MVP. Un partenaire de crédit, s'il intervient, reste responsable de ses conditions d'éligibilité.

**WHERE — Où et par quel accès**

Accès direct dans Octro, ou expérience intégrée à une banque, plateforme ou portefeuille partenaire. Interface localisée, montants dans leur devise et fuseau explicite. Sans connecteur local, saisie manuelle et import restent possibles dans les marchés où le socle peut être proposé. Une matrice de disponibilité décrit séparément analyse, connexion, transfert et financement par pays ; « mondial » ne signifie pas que tous les rails fonctionnent partout.

**WHEN — Quand le produit intervient**

Lors de l'ajout d'une échéance, d'une nouvelle donnée ou d'un changement de prévision ; contrôle périodique lorsque les sources connectées le permettent. Le mode personnel couvre 30 jours par pas quotidien et détaille les événements datés ; le mode professionnel ajoute une vue 72 heures par pas horaire. L'optimiseur n'ignore jamais un ordre de paiement intrajournalier ni une dette au-delà de l'horizon. Le calendrier officiel donne 25 heures entre le début du hacking et le gel du code ; voir chapitre 26.

## 3 Décisions de version et portée normative

Cette version 2.2 remplace la v2.1 comme source de vérité. Elle conserve les trois publics P0 et adapte le périmètre hackathon au règlement fourni le 12 septembre 2026 et aux slides des ateliers. Le nouveau texte du règlement ajoute le lien du DevEx hook et un code d'invitation ; les tracks, le barème et les délais sont inchangés. Aucun code d'invitation ni accès Wi-Fi ne doit être committé dans le dépôt public.

Décision : Track 1, Loaded, Lending Protocol V1, vault ouvert sur le Custom Hackathon Devnet. Credentials et Permissioned Domains sont l'extension Loaded principale. Le sponsoring des frais et réserves XLS-68 est l'extension suivante à vérifier en priorité. DID reste optionnel. Loaded exige une primitive ledger supplémentaire réellement utilisée : MCP, IA et connexion de wallet ne suffisent pas à eux seuls.

P0 signifie obligatoire pour la recette de cette édition : socle personnel sans dette, parcours indépendant et organisation sur le même moteur, cycle XLS-65/66 complet, extension Loaded principale et preuves développeur. P1 signifie extension prioritaire conditionnée par les capacités réseau : sponsoring puis DID. Un P1 indisponible doit apparaître comme tel, sans simulation présentée comme intégration. La démo orale choisit un personnage principal ; les trois profils restent dans les fixtures et tests.

Les chapitres de cette édition et requirements.json doivent être chargés ensemble. Le registre hackathon.config.json fixe le track et les capacités ; les valeurs null indiquent une vérification à réaliser, jamais un succès implicite. Le contrat plan.schema.json est une proposition minimale, pas un contrat de signature ni une API complète. Les identifiants existants sont conservés, les exigences Loaded sont ajoutées avec leur propriétaire et leur recette.

Une seule application React Native et un moteur commun. Un Workspace personnel ne requiert pas d'Organization. Calendrier, saisie, import et simulation restent disponibles sans DID, wallet, KYC ou crédit. Accès à un financement et disponibilité mondiale sont évalués par capacité et juridiction. Les MUST s'appliquent à leur périmètre ; aucune proposition n'est une autorisation de paiement.

## 4 Ripple et différenciation stratégique

FAITS SOURCÉS — Ripple présente XLS-65/66 comme une infrastructure de crédit avec décision et risque hors chaîne, et exécution sur le ledger [S1, S2, S3]. Ses communications mettent en avant les usages institutionnels, les actifs numériques et la trésorerie [S4]. Ripple est une entreprise ; XRPL est un réseau dont les amendements dépendent de sa gouvernance. Le soutien de Ripple ne prouve pas une activation réseau.

ÉLÉMENT CONCURRENTIEL — Le 10 septembre 2026, Ripple annonce une extension de GSmart dans Ripple Treasury : prévisions, liquidité, risque, réconciliation, gouvernance et séparation entre calcul déterministe et interprétation IA [S5]. Octro ne doit donc pas revendiquer l'invention de la trésorerie agentique ni cette séparation comme exclusivité.

INTERPRÉTATION — Octro peut intéresser l'écosystème en démontrant comment des données externes deviennent un plan de crédit XLS-66 reproductible, avec preuves de contraintes et feedback développeur. Il peut aussi chevaucher des offres de Ripple. Le positionnement proposé est une couche de prévision et de décision accessible aux particuliers et aux activités, intégrable aussi aux PSP et TMS. Ce n'est ni un partenariat acquis ni une garantie de victoire.

PREUVES À PRÉSENTER — Un déficit détecté avant l'échéance ; un plan moins coûteux que la référence dans un scénario documenté ; une nouvelle décision après retard ; LoanSet et LoanPay validés ; un refus sécurisé ; un dossier de reproductibilité. RLUSD peut devenir un actif cible lorsque réseau, émetteur, accès et cadre légal sont validés. XRP reste nécessaire aux frais et réserves selon les règles réseau ; aucune thèse de prix XRP n'est requise.

L'expérience personnelle rend visible l'utilité du moteur au-delà des professionnels de la trésorerie. L'alignement XRPL repose sur les cas où un prêt autorisé est pertinent ; il ne faut pas ajouter une transaction blockchain à un budget ordinaire pour augmenter artificiellement le nombre de primitives utilisées. La différenciation à tester est la continuité entre anticipation accessible et exécution financière contrôlée.

## 5 Usages quotidiens et couverture mondiale

**Personnel — Gérer un mois incertain**

Lina dispose de 650 EUR sur son compte courant et de 300 EUR d'épargne mobilisable. Avant son salaire de 1 600 EUR à J+10, elle prévoit 600 EUR de loyer à J+2, 100 EUR de courses à J+4 et 80 EUR de transport à J+6. Sans action, le compte courant descend à −130 EUR. Pour conserver 100 EUR sur ce compte, Octro propose de transférer 230 EUR de l'épargne ; il reste 70 EUR sur celle-ci. Après le salaire, le courant atteint 1 700 EUR et les avoirs totaux 1 770 EUR. Les dépenses, l'épargne disponible et les dates sont des hypothèses de démonstration. Une épargne protégée ou indisponible ne doit pas être mobilisée par défaut.

**Indépendant — Séparer les deux vies**

Un créateur reçoit des versements de plateformes à plusieurs dates. Il conserve deux espaces, personnel et activité, avec taxes et dépenses essentielles protégées. Une facture attendue n'est pas du cash. Le retard déclenche une simulation et, éventuellement, une comparaison d'avance autorisée. Le transfert entre les deux espaces doit être légalement possible et expressément validé ; il n'est jamais automatique.

**Organisation — Coordonner les paiements**

Un commerçant, une association ou une marketplace rapproche charges, encaissements et réserves. Une équipe ajoute des rôles de consultation, proposition et approbation. Un PSP avec règlement différé fournit le scénario de prêt XLS-66. Les fonds de clients cantonnés ne deviennent jamais une source de financement propre.

**Des contextes différents, la même entrée simple**

Salaires, pensions, allocations, revenus irréguliers et espèces déclarées peuvent alimenter un calendrier personnel. Les données déclaratives sont marquées comme telles ; elles n'attestent pas un revenu pour un prêteur. Une personne sans revenu confirmé peut voir un déficit et organiser ses échéances ; Octro ne lui invente ni revenu ni solution de crédit. Les ressources d'aide locales, si proposées, sont vérifiées et séparées du moteur financier.

Mobile money dans un pays africain, UPI en Inde, PIX au Brésil, banque européenne ou PSP international sont des familles de connecteurs, pas des intégrations acquises. Les langues, le faible débit, les formats et les capacités locales sont traités indépendamment. Le socle personnel doit rester utile lorsque le financement est indisponible.

Modèle économique proposé : socle personnel gratuit (saisie, calendrier, simulation), abonnement facultatif pour automatisations avancées et offre d'équipe/API. Les plafonds de consommation doivent être transparents. Aucun revenu fondé sur la vente de données sensibles ; aucune commission ne modifie silencieusement le classement des options. Tarifs et modèle économique restent à valider avec les utilisateurs.

## 6 MVP commun aux trois publics

**P0 — Tout le monde entre par le même produit**

Une application, un espace personnel par défaut, un espace d'activité facultatif. Mode de découverte avec données fictives ; compte utilisateur pour sauvegarder, aucune création de société exigée. Saisie de soldes, revenus, dépenses récurrentes, dates et réserve ; import CSV avec aperçu et détection des doublons. Première simulation possible en moins de trois minutes lors d'un test utilisateur, objectif à mesurer.

P0 : calendrier à 30 jours personnel et 72 heures professionnel, solde prévu, intervalle d'incertitude ou scénarios, dépenses protégées, plan sans dette et comparaison d'options. Cinq écrans communs : accueil, calendrier, sources, proposition, suivi. Un sélecteur de profils sert uniquement à la démo ; l'utilisateur réel ne doit pas choisir une catégorie sociale pour accéder au produit.

**P0 — Trois recettes, un seul moteur**

| Démo | Ce qu'elle prouve | Exécution |
| --- | --- | --- |
| Personnel | Loyer avant salaire, transfert de fonds propres | Proposition et confirmation simulées, sans crédit |
| Indépendant | Versement retardé, réserves distinctes | Recalcul et explication, aucun déplacement réel |
| Organisation | Manque de règlement court | Prêt et remboursement réels sur réseau XRPL de test compatible |

Le chemin XRPL inclut vault, dépôt, broker, LoanSet et LoanPay validés. Le parcours personnel n'est pas bloqué si XRPL est indisponible. Le parcours financement de test est accessible depuis le moteur commun et présenté comme simulation contractuelle lorsqu'il n'est pas réellement envoyé au réseau. Les critères XRPL demeurent distincts et visibles.

P0 agentique : un orchestrateur borné et deux rôles spécialisés derrière des outils MCP. P0 technique : isolation des espaces, idempotence, approbation liée aux termes, audit, sources datées et fonctionnement sans LLM. Le mode personnel utilise le même service d'optimisation, avec actions autorisées différentes ; aucun moteur parallèle de calcul dans l'UI.

P1 : sponsoring natif après gate SP0, DID de test, second vault, appareil mobile, connexion financière réelle en lecture seule après habilitation. Post-MVP : partage familial explicite, transferts bancaires réels, pilotes de crédit particuliers et professionnels, multi-devises exécutables. Hors hackathon : fonds réels, crédit universel garanti, mineurs, conseil d'investissement et entraînement ML. L'usage personnel n'est plus une extension reportée après le pilote B2B.

## 7 Parcours et accès progressif

**Commencer sans jargon**

L'accueil demande « Que voulez-vous anticiper ? », puis un solde, une entrée attendue et une dépense. Les connexions sont facultatives. Le premier résultat montre un calendrier et une phrase factuelle, avec accès aux hypothèses. Aucune question sur le numéro d'entreprise, le wallet ou le DID pour utiliser le socle. Le compte persistant utilise une authentification classique ; les données de découverte sont fictives et réinitialisables.

| Capacité | Prérequis produit | Si indisponible |
| --- | --- | --- |
| Découverte | Aucun compte financier connecté | Exemple fictif utilisable |
| Prévision personnelle | Données déclarées, compte pour sauvegarde | Saisie et import possibles |
| Connexion financière | Source disponible et autorisation explicite | Calendrier manuel conservé |
| Transfert réel | Rail habilité, compte contrôlé, validation | Proposition ou instruction clairement identifiée |
| Crédit | Pays, prêteur, vérifications et capacité de remboursement | Fonctions sans dette toujours accessibles |

**Comparer sans pousser à emprunter**

Présenter pour chaque option le montant, le coût total, le délai, la réserve restante, la source des données et les conditions. Les options sans dette compatibles sont visibles en premier ; leur effet sur l'épargne protégée est explicite. « Aucune option sûre identifiée » est une sortie valide. Octro ne reporte pas une charge essentielle et ne suppose pas l'accord d'un créancier. Une demande d'échéance reste en attente jusqu'à confirmation.

**Agir et comprendre l'état**

Une proposition devient validée, puis éventuellement soumise et confirmée. Les actions simulées, les instructions à réaliser soi-même et les opérations réellement exécutées sont distinctes. Le mode personnel masque les rôles de broker ; le mode équipe ajoute des approbations. Le DID est une option d'identité portable, pas un ticket d'entrée.

Chaque écran gère vide, chargement, erreur, donnée ancienne, refus et reprise. Un utilisateur doit identifier montant, date et prochaine action en 30 secondes lors d'un test modéré. Une alerte reste consultable sans notification push. Les erreurs ne portent pas de jugement sur la personne et offrent correction des données ou revue humaine.

## 8 Design humain et accessibilité

**Une seule identité, à toutes les échelles**

Direction visuelle inspirée de l'intention American Matcha : crème #F5F2E8, encre #20271F, vert profond #304B35, matcha #B8C98A et terre #9F3F31 pour les erreurs. Ces choix traduisent une ambiance chaleureuse et éditoriale ; la référence exacte reste à confirmer avant toute recherche de fidélité. Aucun logo ou visuel d'une marque tierce n'est copié.

Typographie sobre, chiffres tabulaires, corps mobile d'au moins 16 px, grille de 8 px. Une serif expressive peut ponctuer les titres, sans rendre les montants difficiles à comparer. Actions nommées « Voir les options », « Vérifier les dates » et « Confirmer ». Pas de badges IA, robots, étoiles magiques, faux raisonnement ou vocabulaire crypto dans le parcours quotidien.

**Usable signifie aussi accessible**

Cible WCAG 2.2 AA [S20], clavier, focus visible, VoiceOver/TalkBack, agrandissement à 200 %, erreurs liées aux champs et alternatives textuelles aux courbes. Ne jamais coder un état uniquement par couleur. Les traductions FR/EN sont P0 ; formats de devise et fuseaux utilisent les locales. La future prise en charge RTL est anticipée dans les composants, sans être annoncée comme testée au MVP.

Version web légère : pas de média décoratif obligatoire, pagination et reprise d'import, écran d'état en faible connexion. Brouillons hors ligne protégés et marqués non synchronisés ; aucune exécution ni confirmation financière hors ligne. L'absence de smartphone haut de gamme, de compte bancaire connectable ou de maîtrise de la blockchain ne bloque pas la saisie et la prévision.

**Livrables Pencil et LaTeX**

Pencil.dev/pen.dev sert aux cinq écrans communs en 390 et 1440 px [S15]. Kevin livre tokens, composants et états ; chaque écran est décliné avec données personnelles et professionnelles. Le PDF du CDC utilise une couverture éditoriale, un sommaire par parties, des tableaux de décision, des encadrés et une grille cohérente. LaTeX et Markdown portent le même contenu normatif ; les figures synthétisent sans remplacer les exigences.

## 9 Architecture et stack décidée

Architecture MVP : monorepo modulaire, API centrale et workers, avec un service Python de calcul isolé. Flux : React Native → API → espace personnel/organisation → données et policy → moteur Python → plan immuable → approbation → adaptateur XRPL → signataire → ledger → réconciliation. Les agents appellent les mêmes services via MCP ; ils ne constituent pas un second chemin d'autorisation.

Frontend : React Native, Expo, Expo Router et TypeScript ; priorité Expo Web responsive, builds Android/iOS après stabilisation. TanStack Query pour état serveur, React Hook Form et validation de schémas pour formulaires, stockage sécurisé natif des jetons ; sur web préférer session cookie HttpOnly via API même origine. Les graphiques doivent fonctionner sur web et natif, avec résumé textuel accessible [S16].

Backend : Node.js LTS supporté à l'installation, TypeScript strict, Fastify, OpenAPI 3.1, JSON Schema, accès PostgreSQL via migrations SQL et couche de requêtes typée. Workers PostgreSQL avec outbox et verrouillage SKIP LOCKED pour éviter d'ajouter Redis au MVP. Python avec FastAPI, Pydantic, NumPy et SciPy/HiGHS pour le programme linéaire. Les versions exactes seront figées dans lockfiles et images après smoke test sur la VM ; ne jamais dépendre de latest en CI.

Agentique : graphe d'états explicite en TypeScript, appels de modèle derrière ModelGateway interchangeable et SDK MCP officiel validé par tests de contrat. Pas de dépendance obligatoire à un fournisseur de LLM. Infra : Docker Compose, reverse proxy Caddy ou équivalent existant, TLS, volumes persistants, observabilité légère. Aucun Kubernetes pour trois personnes au hackathon.

L'API expose un CapabilityRegistry par espace et pays : analyse, import, connexion, transfert et financement. Il fournit des raisons d'indisponibilité lisibles, jamais un rôle de sécurité décidé par le client. Le profil d'affichage personnalise le langage ; les autorisations serveur contrôlent les capacités. Le mode personnel est le premier chemin d'onboarding, pas un client séparé.

## 10 Utilisation de la VM existante

Inventaire déclaré : VM, PostgreSQL, MongoDB, stockage S3, domaine, serveur SMTP et Stripe Identity. Samet vérifie versions, OS, vCPU/RAM, espace, réseau, TLS, droits, sauvegardes, région et accès aux secrets avant installation. Cible de départ proposée : 4 vCPU, 8 à 16 Go RAM et disque SSD ; à mesurer, pas une description de la VM actuelle.

PostgreSQL est obligatoire pour comptes, événements normalisés, état financier, jobs, policies et audit. MongoDB MAY conserver des documents de connecteurs variables et des brouillons agentiques expurgés, avec TTL ; il ne décide jamais d'un solde, d'une permission ni de l'état d'un prêt. Si S3 couvre les données brutes, désactiver MongoDB dans le chemin MVP réduit la charge.

S3 reçoit snapshots chiffrés, exports et pièces strictement nécessaires ; buckets privés, liens présignés courts, versionnement et cycle de vie. Un stockage compatible S3 sur la même VM n'est pas une sauvegarde indépendante : prévoir copie hors hôte. SMTP sert aux invitations et alertes minimales avec SPF/DKIM/DMARC ; les notifications ne déclenchent aucune autorisation.

Domaine : app et API même origine si possible, sous-domaines séparés pour monitoring privé et callback identity. Bases jamais exposées publiquement ; ingress public limité au HTTPS ; administration par VPN ou SSH avec clés et filtrage. Conteneurs non root, réseau interne pour Python, MCP et bases. Ressources CPU/mémoire plafonnées pour éviter qu'un solveur bloque l'API.

Stripe Identity utilise son mode test au hackathon. La disponibilité annoncée ne prouve pas que clés, webhooks ou contrats soient configurés. Ne pas stocker de clés dans le dépôt ni dans les maquettes.

## 11 Modèle de données et invariants

Entités relationnelles : Workspace, Organization, User, Membership, Consent, DataConnection, FinancialAccount, EconomicEvent, CashSnapshot, Receivable, ExposureReservation, ForecastRun, Scenario, PolicyVersion, OptimizationRun, Plan, Approval, Execution, VaultReference, LoanReference, Repayment, IdentityCheck, DIDBinding, CredentialStatus, AuditEvent, OutboxEvent.

Chaque objet métier porte tenant_id (identifiant du Workspace), id UUID, created_at UTC, schema_version et provenance utile. Les relations inter-tenant sont interdites par contraintes et contrôles serveur. Les événements ont source_event_id unique par tenant et connexion, occurred_at, observed_at, expected_settlement_at, status et raw_object_ref. Un règlement réconcilie sa créance au lieu de créer deux revenus.

Montants : chaînes décimales dans JSON et NUMERIC(38,18) dans PostgreSQL ; jamais de float binaire pour la comptabilité. AssetId distingue fiat, XRP et token émis : réseau, code et émetteur, ou identifiant MPT selon actif. La conversion en drops ou précision protocolaire appartient à l'adaptateur. Quantifier et revérifier toutes les contraintes après arrondi du solveur ; un reliquat ne peut dépasser une limite.

Journal financier en partie double par actif, avec écritures immuables et écritures de correction. La somme débit/crédit doit être nulle pour chaque transaction comptable. Une prévision est stockée séparément des soldes confirmés. Les sommes en transit et engagements en attente consomment la capacité ; les fonds clients cantonnés ne financent pas la trésorerie propre.

Snapshot de décision : références d'événements, hash SHA-256, calendrier, modèle, scénarios, seed, policy, taux et frais, version du solveur et code commit. Les dossiers sont immuables ; une modification produit une nouvelle version et invalide les approbations précédentes.

Workspace porte kind=personal|organization. Un espace personnel appartient à un utilisateur et n'exige aucun Organization ; tenant_id reste la clé d'isolation des deux types. Ajouter BudgetItem, ProtectedExpense, ReserveRule, ProposedAction et CapabilityGrant. Une personne peut posséder deux espaces sans fusion des données. Le partage de foyer est hors MVP ; aucun conjoint ni membre d'équipe n'obtient un accès implicite.

Les fonds personnels et professionnels ne se compensent pas automatiquement. Un mouvement entre comptes du même espace est enregistré avec deux jambes liées, sans revenu artificiel. La capacité de transfert dépend de la propriété, du mandat et de la disponibilité réelle. Chaque donnée porte verification=declared|imported|provider_verified|ledger_verified. Déclaré et importé ne valent pas vérifiés pour l'octroi de crédit.

## 12 Prévisions et jumeau de trésorerie

Le jumeau est un état opérationnel réconcilié : cash disponible par compte/actif, obligations ordonnées, créances attendues, dette et réserve. Il ne nécessite ni simulation 3D ni modèle génératif. Le premier forecast personnel couvre 30 jours, le professionnel 72 heures ; il utilise échéanciers connus et scénarios de retard paramétrés ; le LLM n'invente pas une probabilité d'encaissement.

Scénarios MVP : règlement normal à H+36 (poids 0,80), tardif à H+60 (0,15), absent sur l'horizon (0,05). Ces poids sont fictifs et affichés comme tels. Leur somme vaut 1. Les retards corrélés de plusieurs créances doivent être représentés ensemble ; l'indépendance ne doit pas être supposée par défaut.

Fraîcheur proposée : solde et liquidité exécutables âgés de moins de 60 secondes au moment de préparer ; événements PSP de moins de 15 minutes pour une nouvelle proposition ; policy et conformité revérifiées à chaque action financière. Les seuils restent configurables par source. Sans source fiable, mode consultation/simulation et blocage du financement.

Post-hackathon : estimer les distributions de délais et défauts avec historique autorisé, séparation temporelle entraînement/validation, suivi des quantiles et tests de couverture. Mesurer erreur absolue des montants, erreur des dates et calibration des probabilités. Comparer à une baseline calendrier avant de retenir un ML plus complexe. Une cible de liquidité à 99 % n'est pas une promesse de solvabilité à 99 %.

Toute nouvelle arrivée de fonds réels déclenche réconciliation, recalcul et proposition de service du prêt. Une anomalie ou une dérive n'autorise pas une modification unilatérale du contrat.

Le mode manuel reste en simulation lorsque les critères d'exécution ne sont pas réunis. Une faible confiance n'interdit pas l'accès au calendrier : elle rend l'incertitude visible et bloque seulement les actions qui exigent une donnée vérifiée. Le forecast personnel inclut revenus récurrents confirmés par l'utilisateur, dépenses récurrentes, réserve et scénarios de retard. Aucun historique de crédit ni revenu minimum n'est nécessaire pour calculer une prévision descriptive.

## 13 Formulation MPC et optimisation sous contraintes

Le Model Predictive Control recalcule un plan sur un horizon mobile et ne met en œuvre que la première action autorisée [S11]. À chaque cycle : figer l'état, produire les scénarios, résoudre, vérifier les contraintes en précision décimale, demander validation si nécessaire, puis observer. Il s'agit ici d'une application proposée au financement, sans prétendre aux garanties de stabilité d'un procédé physique.

Notation : t désigne le pas de temps, quotidien ou horaire, s un scénario de probabilité p_s, a un actif, v un prêteur. C est le cash, I les entrées, O les sorties dues, b les tirages, r le service contractuel de dette et B la réserve. Les flux de conversion incluent taux, frais et délais.

FORMULA cash: C[t+1,s,a] = C[t,s,a] + I[t,s,a] - O[t,a] + sum_v b[t,v,a] - sum_v r[t,s,v,a] + FXnet[t,s,a]

Contraintes MUST : principal et tirage positifs, capacité disponible du vault, plafond de crédit approuvé, exposition engagée plus active, restrictions d'actif et de juridiction, paiements non reportables, durée autorisée, service de dette et réserve. Une variable de déficit q mesure max(0, B-C) pour diagnostic et risque ; elle ne rend jamais un paiement impossible « autorisé ».

FORMULA objective: min E[cost_credit + cost_FX + cost_fees] + lambda * CVaR_alpha(L)

Les coûts et la perte L sont exprimés dans une devise numéraire au taux versionné. L est le déficit maximal sous réserve sur l'horizon, après conversion documentée. lambda est sans unité. Le coût inclut intérêts, origination, clôture anticipée, frais réseau et coûts de conversion pertinents. La valeur terminale des dettes restant après H+72 est intégrée ; on ne cache pas une échéance en sortie d'horizon.

Le MVP n'autorise pas de décisions futures dépendant d'informations encore inconnues : plan commun aux scénarios pour les décisions engagées. Une future version stochastique avec recours doit imposer la non-anticipativité avant la révélation des événements. En cas d'infaisabilité : retourner contraintes bloquantes et état INFEASIBLE, aucun ordre financier.

Extension personnelle P0 : les décisions candidates comprennent ne rien faire, transférer des fonds propres disponibles, ajuster une dépense marquée facultative ou demander un changement de date. Les dépenses essentielles et les réserves protégées sont des contraintes dures, sauf modification explicite par l'utilisateur. Le moteur ne déplace jamais automatiquement leur date pour fabriquer une solution.

Le classement est lexicographique : écarter d'abord les plans interdits ou menaçant les contraintes protégées ; parmi les plans admissibles, privilégier ceux sans nouvelle dette selon la préférence affichée ; comparer ensuite coût, délai et réserve. En absence de solution, retourner un diagnostic. Les décisions de créancier non confirmées ne sont que scénarios, pas des actions certaines. Toute dette restant après les 30 jours personnels ou les 72 heures professionnelles est traitée comme engagement terminal.

## 14 Min cost flow CVaR et exemple calculé

Le min-cost flow représente la liquidité par un graphe étendu dans le temps : nœuds compte/actif/heure ; arcs de détention, financement et transfert avec capacité, délai et coût. Il convient aux coûts linéaires dans une unité cohérente. Des changes à taux différents, frais fixes, échéances de prêt et contraintes CVaR nécessitent un LP généralisé ou un MILP ; ce n'est plus un simple min-cost flow. Le MVP utilise un LP, sans frais fixes conditionnels ni allocation multi-actif réelle.

CVaR au niveau alpha proposé de 0,95 : introduire eta et z_s. Minimiser eta + sum_s p_s*z_s/(1-alpha), avec z_s ≥ L_s-eta et z_s ≥ 0 [S12]. Le moteur peut imposer CVaR ≤ risk_budget et minimiser le coût parmi les plans admis. Un budget de risque nul peut rendre le scénario d'absence de paiement infaisable ; le produit doit le montrer.

Exemple pédagogique sans frais ni change : besoin 90 000 pendant 36 h, offre A limitée à 60 000 à 4,2 % annuel simple, offre B à 4,8 %. Base ACT/365 : A coûte 60000*0,042*36/8760 = 10,36 ; B sur 30 000 coûte 5,92 ; total 16,27 après calcul puis arrondi global. B seule coûte 17,75. Gain illustratif 1,48. Cet exemple n'est pas le calcul contractuel XLS-66, qui doit venir des règles du protocole et inclure ses frais.

Après tirage et paiement, la trésorerie vaut 10 000 ; après encaissement de 110 000 et remboursement de 90 016,27, elle vaut 29 983,73. Si le règlement n'arrive pas, le remboursement n'est pas financé : le risque reste réel. Les trois scénarios de démonstration ne suffisent pas à calibrer une queue de distribution en production.

## 15 Agents IA et outils MCP

Le Coordinator gère un graphe borné : collecter → analyser → simuler → expliquer → attendre décision → suivre. Analyst appelle snapshot, forecast et optimize ; Explainer transforme les résultats structurés en texte avec références aux champs. Ces rôles partagent un service de calcul, pas un raisonnement financier libre. Maximum proposé : 12 appels outils, 30 secondes par exécution interactive et budget de tokens configuré. Au dépassement, retour au dashboard avec état sauvegardé.

Namespaces MCP : data.get_snapshot, data.sync_source, engine.forecast, engine.optimize, policy.evaluate, identity.get_eligibility, xrpl.get_vault, xrpl.get_loan, xrpl.prepare_loan, monitor.get_incidents. Les outils de lecture sont accessibles selon scopes ; sync et prepare sont des écritures contrôlées. Le signataire et submit ne sont pas exposés au LLM. Chaque outil réutilise l'autorisation métier de l'API.

Entrée standard : request_id, références d'objets et expected_version ; tenant et identité effective dérivés du jeton. Sortie : status, data, evidence_refs, warnings et trace_id. Pas de SQL arbitraire, shell, URL libre ni accès aux secrets. Le serveur valide JSON Schema, limites de taille, quota et egress.

Le protocole MCP normalise les appels ; il n'est ni un moteur d'agents ni une preuve de confiance. Pour un serveur distant : HTTPS, authentification adaptée, jetons courts et audience vérifiée, scopes minimaux, pas de transmission aveugle de tokens [S13]. En MVP, services privés et identités de service distinctes suffisent au déploiement interne documenté.

Instructions contenues dans factures, transactions ou réponses d'outils = données non fiables. Les résumés doivent référencer un plan existant ; si chiffres générés et chiffres structurés divergent, afficher le rendu déterministe. Les journaux conservent outils, décisions et preuves utiles, pas de chaîne de pensée privée.

Les outils personnels ajoutent calendar.get_projection et engine.compare_actions, avec accès exclusivement à l'espace autorisé. Une proposition de transfert n'appelle jamais une API de crédit. Les dépenses individuelles ne sont pas transférées à un prêteur sans base légale et étape explicite. Les prompts d'explication utilisent des montants minimaux et excluent les libellés sensibles lorsque ceux-ci ne sont pas nécessaires.

## 16 Intégration XRPL du Track 1

Le seul réseau de soumission de cette édition est le Custom Hackathon Devnet V1 [H1]. WSS : wss://lending-hackathon.dev.ripplex.io:51233 ; RPC : https://lending-hackathon.dev.ripplex.io:51234 ; faucet : https://lending-hackathon-faucet.dev.ripplex.io/accounts ; explorateur : https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/. Le SDK xrpl.js doit être une version stable compatible, testée et verrouillée exactement dans le lockfile. Aucune version exacte n'est déclarée validée dans ce CDC. La bêta 5.2.0-beta.0 et le Public Devnet concernent le Track 2, exclu de cette soumission.

G0 est bloquant pour toute transaction : Augustin relève heure UTC, serveur, network_id, ledger validé, amendements effectifs, version SDK et état du service. Il confirme avec les mentors que le réseau reste V1 pour les nouveaux prêts de vault ouvert. Il finance les comptes de test puis démontre un Payment basique avec hash et lien d'explorateur. Une documentation récente ne prouve ni l'activation locale ni la compatibilité du SDK. Une divergence suspend l'adaptateur financier, sans bloquer le calendrier personnel.

Comptes distincts : propriétaire du vault, prêteur, courtier, emprunteur, émetteur de Credential et sponsor si activé. Les seeds restent hors dépôt et hors LLM. Choisir un actif de test explicitement identifié : XRP ou actif émis sur ce même réseau après vérification. Un jeton de test créé par l'équipe ne s'appelle pas RLUSD. Les ressources RLUSD Testnet ne fournissent pas automatiquement un actif sur ce Devnet.

Le scénario doit créer un vault ouvert, recevoir le dépôt d'un prêteur, configurer le courtier et sa couverture éventuelle, faire accepter et originer le prêt, constater le décaissement, traiter un remboursement et retirer capital plus rendement effectivement obtenu. Les transactions candidates sont VaultCreate, VaultDeposit, LoanBrokerSet, LoanBrokerCoverDeposit si applicable, LoanSet, LoanPay et VaultWithdraw. Le mapping exact et les transactions complémentaires proviennent de la version V1 testée. Ne pas inventer une transaction Drawdown : prouver le décaissement dans les effets ledger du parcours implémenté.

Le rendement affiché distingue intérêt contractuel prévu, revenu reconnu selon V1, intérêt effectivement payé et montant retirable. Le retrait final doit être démontré avec les soldes, parts, frais et métadonnées nécessaires à son rapprochement. Un dépôt initial ne produit pas seul du rendement. Ne pas importer la comptabilité V1.1 du Track 2 ni confondre disponibilité du retrait et liquidité garantie.

LoanSet peut nécessiter la coordination du courtier et de l'emprunteur : conserver un payload canonique, ses signataires attendus, une expiration et la preuve que chacun a approuvé les mêmes conditions. Toute modification après signature invalide la collecte. Le transport des signatures est distinct de l'authentification à Octro.

Avant soumission, conserver le blob signé et son hash sans les exposer au LLM. Sérialiser les opérations par compte, contrôler Sequence et l'expiration ledger. Après timeout, chercher le hash et son résultat avant toute nouvelle opération : une réponse submit n'est pas une confirmation. Relever validated, résultat et effets avant de passer à confirmed. Les soldes prévisionnels ne sont jamais crédités par une soumission incertaine.

La recette comprend un refus réel pour une protection du protocole, isolé des contrôles applicatifs. Conserver le code observé, les conditions initiales et les soldes après tentative. Un rejet avant soumission peut ne pas produire de transaction consultable : fournir alors la requête expurgée et la réponse, sans fabriquer un lien on-chain.

## 17 DID et identité vérifiable

Décision : OUI à une intégration DID facultative P1, applicable aux personnes et organisations utilisant des comptes de test. XRPL documente les DID et les transactions DIDSet/DIDDelete [S6, S7]. Un DID identifie un sujet contrôlant des clés ; il ne prouve pas à lui seul son identité légale, sa solvabilité ou son habilitation à emprunter. Les principes W3C distinguent contrôle, méthodes de vérification et attestations [S9].

Architecture proposée : DIDBinding relie espace personnel ou organisation, compte XRPL, réseau, DID, preuve de contrôle, date de vérification et statut. Le document DID public se limite aux clés et points de service nécessaires ; il peut être référencé par URI selon l'implémentation. Aucun nom, email, document d'identité, identifiant Stripe ou empreinte de pièce sensible sur le ledger. Une empreinte peut elle-même être corrélable.

Enrôlement : preuve de contrôle du titulaire ; vérification personnelle si requise, ou KYB et mandat pour une organisation ; challenge unique lié au domaine, à la session, au tenant et au réseau, expiration 5 minutes ; vérification de signature ; création ou résolution du DID ; attestation d'éligibilité par un émetteur autorisé. La syntaxe did:xrpl et le resolver sont testés contre la méthode et le réseau effectifs ; ne pas fabriquer une URI à partir d'une adresse sans vérifier la méthode.

DID, VC W3C et Credentials XRPL sont distincts. Les Credentials natifs utilisent leurs propres structures [S8] ; ils peuvent servir de contrôle d'accès avec des fonctionnalités compatibles. Aucun accès à un vault n'est réputé protégé par un DID seul. Prévoir un registre d'émetteurs acceptés, durée, statut de révocation et audience d'utilisation.

Tests P1 : création/résolution, mauvais signataire, replay de challenge, expiration, mauvais réseau, rotation des clés, indisponibilité du document et révocation d'attestation. Rotation ou compromission suspend les nouvelles actions, déclenche revalidation et conserve l'historique. Supprimer le DID ne supprime pas l'historique public. Un mode sans DID reste pleinement utilisable avec identité et autorisations classiques.

Pour l'utilisateur personnel, un DID n'est jamais requis pour le calendrier, l'import, la simulation ou la sauvegarde du compte. Son ajout est une option avancée d'identité portable. Les attestations d'une personne et celles d'une société ont des schémas et des responsabilités distincts ; l'une ne doit pas être déduite de l'autre.

## 18 Stripe Identity conformité et données personnelles

Stripe Identity fournit des vérifications d'identité selon les fonctions et pays supportés [S14]. Ce composant ne constitue pas à lui seul un KYB complet, un contrôle des bénéficiaires effectifs, un screening de sanctions, une licence ni une décision de crédit. Stocker seulement session_id, statut, horodatage et références minimales ; privilégier la collecte hébergée. Vérifier la signature du webhook et son idempotence ; ne jamais faire confiance à la redirection navigateur.

Gouvernance proposée : Octro opère la technologie ; le partenaire prêteur décide, contractualise et porte le rôle de crédit défini juridiquement. La réalité des services, du contrôle des clés et de la rémunération prime sur cette formulation. Un conseil local doit déterminer licences de prêt, intermédiation, services de paiement, custody et obligations crypto applicables avant tout fonds réel.

Union européenne : documenter RGPD, finalités, base légale par traitement, minimisation, droits, rétention, sous-traitants, transferts et éventuelle AIPD [S17]. Le consentement de connexion à une source n'est pas une base légale universelle. Analyser MiCA pour les services et actifs concernés, sans supposer qu'il couvre toutes les règles de crédit [S18]. L'AI Act mentionne la solvabilité des personnes physiques parmi les usages à haut risque ; l'élargissement à des indépendants exige une qualification spécifique et une revue du calendrier applicable [S19].

Gates de lancement : pays emprunteur/prêteur, entité contractante, actif, corridor, identité personnelle ou KYB/UBO pour les organisations, sanctions/PEP selon obligations, licence, disclosures, plafonds/tarifs, recouvrement, conservation et localisation. À défaut d'une décision documentée : pas de prêt réel. Une infrastructure mondiale nécessite une matrice de pays, pas un badge « compliant globally ».

MVP de démonstration : données synthétiques uniquement pour les trois profils. Politique proposée hors production : traces opérationnelles 30 jours, raw de test 7 jours, snapshots de recette conservés avec la version. La rétention de production est définie avec les obligations légales, y compris les exceptions à l'effacement. Aucun dossier KYC envoyé au LLM.

L'accès à la prévision personnelle n'est pas conditionné par Stripe Identity. Les vérifications apparaissent au moment où une fonction précise les exige, avec explication et conservation minimale. L'évaluation de solvabilité d'une personne physique est distincte d'un outil descriptif de calendrier ; le passage de l'un à l'autre exige une qualification juridique et des contrôles dédiés [S19].

Le pilote personnel commence par l'analyse et les propositions non exécutées. Avant crédit aux consommateurs : revue du droit national applicable, de l'évaluation de solvabilité, des informations précontractuelles, du coût total, des droits de contestation et des procédures de difficulté de paiement ; intégrer le calendrier de transposition/application de la directive UE 2023/2225 selon le pays [S21]. Les règles du prêt B2B ne sont pas simplement réutilisées. Aucun refinancement automatique en cascade ni sollicitation insistante lorsque les dépenses essentielles ne sont pas couvertes.

## 19 API et contrats machine readable

API REST /v1 ; authentification OIDC/session, RBAC et contrôle tenant serveur. Les GET retournent ressource, version et fraîcheur. Les commandes longues retournent 202 avec operation_id, puis GET /v1/operations/{id}. Les erreurs exposent code stable, message, retryable, details et trace_id, sans secret. OpenAPI décrit tous les schémas et exemples ; JSON Schema interdit les champs inattendus sur les commandes critiques.

Endpoints MVP : POST /v1/connections/sync ; GET /v1/cash-snapshots/{id} ; POST /v1/forecasts ; POST /v1/plans ; GET /v1/plans/{id} ; POST /v1/plans/{id}/approvals ; POST /v1/executions ; GET /v1/executions/{id} ; POST /v1/loans/{id}/repayment-plans ; GET /v1/audit-events. Identité P1 : POST /v1/did-challenges puis /v1/did-bindings. Webhook Stripe dédié avec authentification par signature fournisseur.

Toute commande monétaire MUST exiger Idempotency-Key, expected_version et plan_hash applicable. Clé unique par tenant, route et commande métier ; conserver statut et réponse avec empreinte du corps. Même clé/autre corps retourne 409. Les montants utilisent amount_decimal et asset_id, jamais une chaîne ambiguë « $ ».

Codes minimaux : DATA_STALE, POLICY_DENIED, COMPLIANCE_REQUIRED, INFEASIBLE, PLAN_EXPIRED, VERSION_CONFLICT, INSUFFICIENT_LIQUIDITY, NETWORK_UNSUPPORTED, SIGNATURE_REJECTED et LEDGER_OUTCOME_UNKNOWN. Aucun retry aveugle de ces deux derniers cas.

Le paquet joint contient un manifeste d'exigences, un schéma de plan et un exemple. Ces fichiers décrivent les contrats Octro, pas les payloads natifs XRPL. Le contrat OpenAPI complet doit être implémenté en premier et vérifié par Samet/Augustin avant les intégrations.

Contrats universels : POST /v1/workspaces avec kind=personal ne requiert aucun identifiant d'entreprise ; POST /v1/budget-items ; POST /v1/imports/preview puis /confirm ; GET /v1/capabilities ; POST /v1/projections ; POST /v1/action-plans. Un ActionPlan porte purpose, horizon, proposed_actions et execution_mode ; le prêt devient une variante, pas un champ obligatoire de tous les plans. Un plan sans dette ne porte pas de principal de crédit.

Actions MVP : no_action, own_funds_transfer, optional_expense_adjustment, due_date_change_request et financing_comparison. Les commandes de transaction conservent leurs guards séparés. plan.schema.json v2.1 décrit un plan de proposition non exécutable directement. Le serveur MUST refuser de considérer une conformité JSON comme autorisation bancaire ou XRPL.

## 20 États approbations et signatures

Cycle plan : DRAFT → DATA_READY → OPTIMIZED → POLICY_PASSED → COMPLIANCE_PASSED → APPROVAL_PENDING → APPROVED → PREPARED → SIGNATURE_PENDING → SIGNED → SUBMITTED → CONFIRMED. Branches : REJECTED, EXPIRED, CANCELLED, FAILED et OUTCOME_UNKNOWN. Seul CONFIRMED déclenche l'état de prêt ACTIVE ; servicing suit ACTIVE → DUE → REPAID ou LATE → IMPAIRED/DEFAULTED selon événements et droits protocole.

L'approbation porte le hash des termes, frais maximaux, réseau, compte, destinataires, policy, version du plan et expiration proposée 5 minutes. Toute modification exige une nouvelle approbation. Relire liquidité, exposition et conformité avant préparation et soumission ; une réserve interne ne garantit pas que le vault externe soit encore liquide.

Lecture/simulation : Analyst autorisé. Proposition : trésorier. Approbation de termes : approbateur désigné et prêteur selon responsabilités. Signature : comptes requis par XRPL. Changement de policy et clés : administrateur habilité avec seconde revue. Organisation : séparation proposant/approbateur obligatoire ; le particulier autorise ses propres actions ; démo permet les mêmes personnes dans des comptes de rôle clairement distincts.

Le service de signature isolé n'accepte qu'un payload de type autorisé conforme au plan et à un jeton d'approbation à usage unique. Aucune seed dans LLM, MCP, frontend ou logs. Clés de test jetables avec accès restreint ; production via wallet utilisateur ou service institutionnel/HSM et procédures de récupération validées.

En cas de timeout après envoi : persister blob signé, hash et bornes de validité avant submit, passer OUTCOME_UNKNOWN, rechercher la transaction et réconcilier. Réenvoyer le même blob peut être permis par la stratégie protocole ; générer une nouvelle transaction attend la preuve que l'ancienne ne peut plus être validée. Les séquences sont sérialisées par compte ; les tickets éventuels sont gérés explicitement.

Le cycle précédent décrit la branche de crédit. Pour une proposition personnelle sans mouvement réel : DRAFT → PROPOSED → ACKNOWLEDGED ou DISMISSED, puis EXPIRED si les données changent. ACKNOWLEDGED signifie lu/accepté, jamais argent déplacé. Toute branche de transfert réel réutilise approbation, soumission et confirmation du rail concerné. Une demande de date passe par REQUESTED puis ACCEPTED_BY_COUNTERPARTY ; une simple préférence personnelle ne modifie pas une obligation contractuelle.

## 21 Sécurité et menaces

Menaces principales : prise de compte, accès inter-tenant, faux webhook, injection dans document, outil MCP compromis, vol de clé, double tirage, donnée périmée, opérateur malveillant et exposition de pièces. Les barrières doivent être appliquées par des services déterministes indépendants du texte produit par le modèle.

Identité applicative : MFA pour rôles sensibles, sessions courtes, révocation, authentification renforcée avant signature, protection CSRF si cookies et CORS limité. Autorisation à chaque objet, row-level security ou contrôles équivalents testés, rôle DB distinct pour worker et API. Les accès support sont temporaires et audités.

Entrées : requêtes préparées, validation de schéma, limites de taille, scan des fichiers et quarantaine avant traitement. Protection SSRF sur connecteurs, resolvers DID et liens de documents : destinations autorisées, blocage réseaux privés et métadonnées cloud, contrôle des redirections. Désactiver l'exécution de contenu et les dépendances distantes non nécessaires.

Secrets : gestionnaire ou fichiers montés à permissions strictes au MVP ; séparation environnements, rotation, chiffrement au repos avec clés séparées des backups, TLS en transit. Les logs masquent jetons, seeds, données KYC et valeurs sensibles. Signature des images et inventaire des dépendances en CI ; aucune installation dynamique d'outil par l'agent.

Fraude crédit : identifiant unique des créances, réservations transactionnelles et contrôle de l'exposition empêchent le double engagement interne. Ils ne prouvent pas l'absence de financement chez un tiers : vérifications externes et déclarations contractuelles restent nécessaires. Aucune donnée protégée ou sans pertinence économique n'entre dans le moteur. Les explications exposent les facteurs contestables et un parcours de revue humaine.

Protection personnelle : accès à son seul espace par défaut, verrouillage et révocation des appareils, export et suppression selon droits applicables. Aucun partage automatique avec un foyer, employeur, plateforme ou prêteur. Les alertes masquent les montants sensibles sur écran verrouillé selon préférence. Le marketing ne reçoit ni transactions ni motifs de difficulté financière. Les imports malveillants et formules de tableur sont neutralisés à l'export.

## 22 Résilience observabilité et exploitation

Fail-safe : données périmées, policy absente, identité incertaine, solveur invalide ou réseau non supporté bloquent les nouvelles actions financières. Une panne du modèle n'interrompt pas les vues, simulations déterministes et échéances déjà suivies. Un kill switch bloque préparation et soumission de nouvelles actions ; il ne révoque pas une transaction déjà acceptée par le réseau.

Jobs et outbox sont écrits dans la même transaction que le changement métier. Livraison au moins une fois, handlers idempotents, backoff exponentiel avec jitter et file d'échec ; jamais promesse d'exactly-once distribuée. Les verrouillages d'exposition sont transactionnels ; perte de lock ou conflit de version annule la préparation.

Pannes : timeout solveur après 5 secondes retourne TIMEOUT et aucune exécution ; solde insuffisant renvoie une nouvelle proposition ; provider dégradé sert les données avec âge ; SMTP indisponible conserve l'alerte dashboard ; crash worker reprend depuis état durable ; désaccord RPC conserve OUTCOME_UNKNOWN. Le remboursement en retard appelle intervention, pas emprunt caché pour refinancer.

OpenTelemetry relie API, job, solveur, outil et transaction par trace_id. Logs structurés, métriques Prometheus et tableau Grafana privé : âge des sources, latence p95, solutions infaisables, écarts prévus/réalisés, échecs de policy, coût LLM, âge du dernier ledger, états inconnus et retard de jobs. Alertes : résultat inconnu > 60 s, source expirée, zéro ledger récent, backup en échec, disque > 80 %.

Cibles MVP à tester : p95 lecture < 500 ms hors réseau, optimisation < 5 s pour 72 pas professionnels ou 30 pas personnels, 3 scénarios et 2 sources, 10 sessions simultanées. Pilote : disponibilité API 99,5 % mensuelle, RPO 15 min et RTO 4 h, à valider par restauration. La VM unique reste un point de panne ; ces objectifs ne sont pas des SLA acquis. Backup PostgreSQL et S3 hors hôte, restauration isolée, puis réconciliation ledger avant réouverture.

Panne de réseau ou crédit non supporté : les simulations personnelles et les données déjà synchronisées restent consultables avec leur date. Les événements saisis hors ligne restent en brouillon jusqu'à synchronisation ; les conflits ne sont pas écrasés silencieusement. Un échec du prêt ne retire pas l'accès au calendrier. L'indicateur de réussite inclut des plans utiles sans dette, pas seulement les transactions de prêt.

## 23 CI CD et organisation du dépôt

Monorepo : apps/client ; apps/api ; apps/worker ; services/optimizer ; packages/contracts ; packages/domain ; packages/xrpl ; packages/agents ; packages/mcp ; packages/ui ; infra ; fixtures ; docs ; tests. Les modules domain et optimizer ne dépendent pas du LLM. Les contrats appartiennent à Samet avec revue Augustin ; Kevin consomme des exemples stables pour ne pas attendre les services.

Pipeline PR : lint et types, validation JSON Schema/OpenAPI, tests unitaires financiers, tests de policy et états, tests PostgreSQL/outbox, scan secrets et dépendances, build client/API/optimizer, génération SBOM. Tests réseau dédiés séparés des tests déterministes ; un réseau indisponible est marqué indisponible, pas faussement réussi.

Déploiement : images référencées par digest ; CI sans secret de production dans les PR ; environnement de staging ; migrations expand/contract et snapshot avant opération risquée ; smoke tests de lecture, policy et network capability ; promotion de la même image. Les secrets de déploiement ont des droits limités. Production nécessite le gate de lancement défini au chapitre conformité.

Rollback : revenir à l'image compatible précédente et désactiver nouvelles exécutions. Ne jamais « rollback » un prêt ledger par suppression SQL ; réconcilier et, si nécessaire, réaliser une opération compensatoire autorisée. Les migrations destructrices nécessitent une stratégie explicite hors fenêtre hackathon.

Source de vérité pour Claude/Codex : ce CDC et requirements.json ; contrats d'API pour les formats ; schémas XRPL épinglés pour les transactions réseau. Tout conflit crée une décision ADR explicite plutôt qu'une invention. Chaque tâche de développement cite un ID d'exigence et son test d'acceptation ; aucun agent n'ajoute un flux d'argent, pays ou permission hors périmètre pour satisfaire une démo.

La CI ajoute trois fixtures de personas et des tests de capacités sans KYC/wallet/organisation. Le changement de tenant_id vers un Workspace nécessite une migration préservant les organisations existantes ; les identifiants, historiques et permissions ne sont pas fusionnés. Les documents v2.0 sont archivés comme versions antérieures, jamais chargés simultanément comme instructions actives par les agents de code.

## 24 Recette pour tous les publics

**Accès et usage autonome**

ACC-01 : créer un espace personnel sans société, compte bancaire connecté, wallet ni DID ; saisir trois événements et obtenir une projection. ACC-02 : une fonction crédit indisponible ne bloque ni calendrier ni import. ACC-03 : vérifier FR/EN, 390 px, clavier, lecteur d'écran, zoom 200 % et données périmées. L'objectif des trois minutes d'onboarding est mesuré avec au moins trois personnes novices ; une métrique observée est distinguée de l'objectif.

**Trois fixtures de référence**

Personnel : 650 EUR courant + 300 EUR épargne, sorties 780 EUR avant salaire et réserve courant 100 EUR ; proposer 230 EUR de transfert sans prêt et conserver le total des avoirs. Si l'épargne est protégée à 300 EUR, déclarer aucune solution sans dette dans les hypothèses données. Indépendant : retard de facture et provision fiscale protégée ; pas de ponction automatique de cette provision. Organisation : besoin 90 000, plafond 80 000 → INFEASIBLE, puis conditions compatibles → chemin de prêt de test.

**Finance et calcul**

Besoin nul → aucun tirage. Tester frais, arrondis, actif et précision, événements intrajournaliers, fuseaux, horizon et dette terminale. Les frais fixes non modélisés provoquent refus de l'offre. CVaR95 de pertes [0,0,100] aux poids [0,80;0,15;0,05] = 100 ; vérifier poids, contraintes post-arrondi et non-anticipativité. Les chiffres d'explication correspondent au plan structuré.

**Sécurité et reprise**

Accès à un autre espace refusé ; aucun accès implicite d'un employeur ou conjoint ; Analyst ne signe pas. Faux webhook, replay DID, instruction malveillante, même clé/autre corps et approbation périmée sont rejetés. Deux demandes identiques produisent une exécution unique. Crash après submit → réconciliation par hash ; panne LLM → parcours manuel ; source ancienne → simulation identifiée, pas d'exécution aveugle.

**Definition of Done**

Trois parcours bout en bout, dont un personnel utile sans dette ; cinq écrans communs ; tests P0 verts ; preuve network_id/hash/ledger/état pour dépôt, prêt et remboursement ; distinction simulation/instruction/exécution ; aucune donnée réelle dans la démo ; reset isolé ; README, feedback XRPL et vidéo identifiée. Un test non exécuté ou une dépendance réseau indisponible reste visible, sans être compté comme réussite.

## 25 Responsabilités Kevin Samet Augustin

Kevin porte le produit, Pencil et React Native/Expo Web, les trois profils, l'affichage des capacités, le wallet côté interface, l'orchestration et les explications agentiques. Il prépare le récit de quatre minutes, les slides et l'accessibilité. Il vérifie les chiffres avec Augustin et les droits avec Samet. Les agents ne portent aucun calcul financier de référence.

Samet porte Workspace, API, PostgreSQL, jobs/outbox, idempotence, audit, VM, secrets, CI/CD et observabilité. Il construit l'émetteur de Credentials de démonstration, les décisions d'éligibilité applicatives et les budgets de sponsoring avec Augustin. Il documente les états réseau et prépare les interfaces mock clairement marquées pour Kevin.

Augustin porte G0, XLS-65/66, le cycle financier complet, l'intégration Domains/Credentials au vault et les preuves réseau. Il développe le moteur déterministe MPC/LP/CVaR et les tests chiffrés ; Samet l'assiste sur la plomberie des adaptateurs pour éviter un goulot d'étranglement. Il verrouille paramètres et arrondis après observation de la version réelle.

Contrats partagés dès le démarrage : Workspace, EconomicEvent, Projection, ActionPlan, Approval, Execution, EligibilityDecision, NetworkCapabilities et Error. Kevin décide du récit produit ; Samet et Augustin bloquent une action financière invalide. Les trois installent et vérifient leur propre DevEx hook, notent leurs expériences et rédigent personnellement leurs observations finales.

Ordre de réduction en cas de retard : DID, intégrations de paiement agentique annexes, second vault, embellissements. Le sponsoring peut rester désactivé et documenté si son gate échoue ; Credentials/Domains reste le chemin Loaded à terminer. Ne supprimer ni le socle personnel ni les preuves de remboursement/retrait pour ajouter une technologie.

## 26 Roadmap du hackathon et après

Le calendrier officiel est le 12 et 13 septembre 2026, fuseau Europe/Paris, CEST. Début samedi à 11 h 30 ; code freeze dimanche à 12 h 30 ; soumission dimanche à 13 h 00. Cela donne 25 heures jusqu'au gel, et non 48 heures. Si le travail commence plus tard, comprimer les étapes en gardant les échéances absolues. Campus fermé à 21 h samedi, poursuite distante possible selon le règlement.

**Samedi 11 h 30 à 13 h 00**

Installer et vérifier le DevEx hook sur les trois machines ; G0 réseau, comptes et Payment ; contrats communs et fixtures ; copie de la documentation de référence pertinente. Choisir l'actif, verrouiller le SDK et enregistrer les capacités observées. Le résultat attendu est une transaction réelle de test et un front qui lit les fixtures.

**Samedi 13 h 00 à 17 h 00**

En parallèle : cycle vault/courtier/prêt ; API avec persistance et audit ; calendrier personnel et comparaison déterministe. Préparer les échéances du prêt assez tôt pour un remboursement et un retrait avant le gel. Le temps ledger ne doit pas être présenté comme accéléré. Les durées économiques dans le récit restent séparées des paramètres on-chain.

**Samedi 17 h 00 à 21 h 00**

Intégration Loaded : fonds privé, attestation acceptée, dépôt refusé puis accepté ; test de sponsoring si disponible. Relier les propositions aux conditions du prêt. Stand-up de l'équipe à 20 h. Première répétition du cycle et consignation des difficultés avant fermeture du campus.

**Samedi 21 h 00 à dimanche 08 h 30**

Fenêtre distante facultative : durcir reprise et erreurs, finir remboursement/retrait selon échéances, tests de contrats et scénarios. Répartir la présence et préserver du temps de repos. Aucun jalon ne doit dépendre exclusivement d'un développeur disponible toute la nuit.

**Dimanche 08 h 30 à 12 h 30**

Rejouer les trois profils et tous les critères Track 1 ; capturer les preuves, retours humains et éventuelle contribution réutilisable. Coaching à 11 h. Finaliser au plus dix slides et le rapport au plus trois pages. À 12 h 30, geler le code, relever le commit et tester le README depuis un environnement propre.

**Dimanche 12 h 30 à 13 h 00**

Contrôler le dépôt public, liens de transactions, rapport racine, formulaire DevEx et identité des membres. Soumettre avant 13 h. Les pitches débutent à 14 h : quatre minutes de démonstration et deux minutes de questions. Une vidéo de secours est identifiée comme enregistrement, avec ses preuves réseau.

Après le hackathon : semaines 1-2, stabiliser les adapters et tester l'utilité avec particuliers/indépendants ; semaines 3-6, connecteurs autorisés, backtests et instrumentation du risque ; semaines 7-12, pilote par capacité et juridiction validées. Crédit consommateur réel, garde et automatisation sous mandat nécessitent leur propre validation avant ouverture. Le calendrier personnel peut avancer indépendamment. Sponsoring, DID et connecteurs se développent selon résultats de recette, pas selon une promesse de disponibilité mondiale.

## 27 Démonstration et critères de soumission

Le personnage principal est une indépendante confrontée à une rentrée retardée. Le même moteur est accessible en mode personnel et organisation ; les fixtures démontrent ces deux autres usages. La démo ne revendique pas comme invention le financement transfrontalier déjà illustré par Ripple. Elle montre l'anticipation, une réserve préservée, une décision explicable et l'exécution contrôlée.

**Quatre minutes et deux minutes de questions**

0:00-0:35 : problème, calendrier et options sans dette ; 0:35-1:05 : manque prévu, montant calculé, coût et réserve protégée ; 1:05-2:20 : cycle ledger avec traces déjà validées et action live réalisable, consentement et suivi ; 2:20-2:50 : contrôle Loaded, refus et activation autorisée, sponsoring si validé ; 2:50-4:00 : trois difficultés rencontrées, preuves et propositions d'amélioration. Montrer les étapes longues à partir de traces réelles horodatées ; identifier toute partie préenregistrée.

Barème officiel : qualité des retours développeur 40 %, exécution XRPL 30 %, créativité et cas d'usage 20 %, présentation 10 %. Une correction de documentation, un exemple reproductible, une référence ou une PR constitue un bonus possible. Aucun nombre de primitives ne remplace la qualité de l'intégration.

Le dépôt public doit contenir README avec track, flavour, environnement, version SDK exacte et chaque transaction XLS-65/66 utilisée ; liens vérifiés ; jusqu'à dix slides ; rapport développeur de trois pages maximum à la racine ; procédure de lancement et commit de démo. Compléter le formulaire DevEx avec noms et handles GitHub réels. Le CDC ne remplace ni le rapport ni les slides.

Mesures produit : première projection, compréhension, plans sans dette, réserves préservées et continuité sans connecteur. Mesures techniques : critères de prêt terminés, extension réellement validée, reprise d'un résultat incertain, reproductibilité et clarté des erreurs. L'augmentation du volume de dette n'est pas un indicateur de réussite.

Décisions ouvertes : paramètres du réseau et du prêt à vérifier par Augustin ; caractéristiques et accès VM par Samet ; référence Pencil exacte et préparation du pitch par Kevin ; juridictions, partenaires et fonctions de production par l'équipe. Tous les résultats de tests mentionnés ici sont des résultats attendus, pas des tests déjà exécutés.

## 28 Sources vérifiées et registre documentaire

Sources consultées le 12 septembre 2026. Les références officielles étayent les fonctions citées ; les choix de stack, paramètres, UX, roadmap et attributions sont des décisions proposées pour Octro. Les statuts dynamiques du réseau doivent être constatés lors de G0.

[S1] Ripple, The XRPL Lending Protocol Bringing Credit Infrastructure Onchain, 29 juin 2026. https://ripple.com/insights/the-xrpl-lending-protocol-bringing-credit-infrastructure-onchain/

[S2] XRPL, Single Asset Vaults. https://xrpl.org/docs/concepts/tokens/single-asset-vaults

[S3] XRPL, Lending Protocol. https://xrpl.org/docs/concepts/tokens/lending-protocol

[S4] Ripple, Institutional DeFi on XRPL, 5 février 2026. https://ripple.com/insights/institutional-defi-on-xrpl-scaling-real-world-finance-with-xrp-at-the-core/

[S5] Ripple, GSmart et gouvernance de trésorerie, 10 septembre 2026. https://ripple.com/ripple-press/ripple-treasury-brings-industry-s-first-governed-ai-for-enterprise-treasury/

[S6] XRPL, Known Amendments. https://xrpl.org/resources/known-amendments

[S7] XRPL, Decentralized Identifiers. https://xrpl.org/docs/concepts/decentralized-storage/decentralized-identifiers

[S8] XRPL, Credentials. https://xrpl.org/docs/concepts/decentralized-storage/credentials

[S9] W3C, Decentralized Identifiers. https://www.w3.org/TR/did/

[S10] XRPL, LoanPay. https://xrpl.org/docs/references/protocol/transactions/types/loanpay

[S11] Rawlings, Mayne et Diehl, Model Predictive Control Theory Computation and Design. https://sites.chemengr.ucsb.edu/~jbraw/mpc/

[S12] Rockafellar et Uryasev, travaux sur l'optimisation de la CVaR. https://sites.math.washington.edu/~rtr/papers.html

[S13] Model Context Protocol, Security Best Practices. https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices

[S14] Stripe, Identity. https://docs.stripe.com/identity

[S15] Pencil, site et redirection pen.dev. https://www.pencil.dev/

[S16] Expo, Introduction to Expo Router. https://docs.expo.dev/router/introduction/

[S17] Union européenne, RGPD 2016/679. https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng

[S18] Union européenne, MiCA 2023/1114. https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng

[S19] Union européenne, règlement IA 2024/1689. https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689

[B1] FlowCredit_CDC_Complet_v1.1.zip, PDF de 20 pages fourni par l'équipe ; base de migration décrite au chapitre 3.

[S20] W3C, WCAG 2 Overview et WCAG 2.2. https://www.w3.org/WAI/standards-guidelines/wcag/

[S21] Union européenne, directive 2023/2225 relative aux contrats de crédit aux consommateurs. https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=OJ%3AL_202302225

[B2] Octro CDC v2.0, version précédente. La v2.1 remplace son cadrage B2B exclusif ; les renvois techniques restent applicables uniquement lorsqu'ils sont repris ici.

## 29 Loaded et contrôle des accès

Le besoin : permettre à un financeur de n'accepter que les dépôts accompagnés d'une attestation reconnue, tout en laissant les autres fonctions d'Octro accessibles. Une Credential de démonstration atteste uniquement une éligibilité de test. Aucun KYC réel ni capacité de remboursement ne doit être déduit de son seul nom.

Le parcours nominal comporte un émetteur autorisé, un compte sujet et un type d'attestation. Préparer CredentialCreate, l'acceptation via CredentialAccept lorsque requise, puis PermissionedDomainSet avec la liste des couples émetteur/type autorisés. Lier le domaine au vault privé avec les champs effectivement pris en charge par la V1 observée. Augustin enregistre le payload exact et le contrôle ledger auquel il s'applique. Les noms de champs non vérifiés ne sont pas des contrats normatifs.

D'abord tenter un VaultDeposit depuis un compte non éligible dans des conditions où liquidité, actif et frais sont valides. Puis émettre/accepter l'attestation et rejouer un dépôt valide. Conserver deux identifiants d'opération distincts et leurs preuves. Compléter par mauvaise autorité, mauvais type, attestation non acceptée ou expirée lorsque supporté. Vérifier le retrait de parts existantes après expiration : la documentation générale distingue ce droit du dépôt [H3]. Ne pas bloquer arbitrairement la sortie au niveau applicatif ; les autres contraintes de liquidité et d'actif restent applicables.

La politique du courtier évalue séparément l'emprunteur : données, capacité, juridiction, mandat et approbation. Domaines du vault et éligibilité du prêt ne sont pas interchangeables. Chaque décision porte enforcement = application ou ledger, reason_code, evidence_refs, policy_version, expires_at. Une réponse API refusée n'est pas une preuve de refus du protocole.

Un changement d'attestation entraîne une nouvelle évaluation des opérations non exécutées. Ne pas empêcher le remboursement d'une dette par simple révocation d'accès à de nouveaux prêts. Conserver issuer, subject, network, credential_type, accepted, expiration et ledger_ref sans copie de pièce d'identité ni score sensible sur chaîne.

Si la combinaison Domains/Credentials/vault n'est pas disponible sur le réseau imposé, ouvrir immédiatement un constat reproductible avec les mentors. Le mode Loaded reste l'objectif ; une autre primitive réellement prise en charge, telle que le sponsoring, peut le satisfaire après décision documentée. Ne pas basculer silencieusement de track et ne pas présenter une vérification hors chaîne comme un contrôle ledger.


## 30 Sponsoring et expérience sans préfinancement technique

Le sponsoring XLS-68 est un P1 prioritaire : Octro ou un partenaire prend en charge les frais et réserves admissibles pour réduire les obstacles à l'usage [H4]. Cela ne finance pas le principal du prêt et ne supprime pas l'existence des frais. L'interface indique qui paie, le plafond et ce qui reste à charge. Le wallet et le consentement ne disparaissent pas avec le sponsoring.

Gate SP0 : vérifier amendement, serveur, SDK, actif, type de transaction et méthode de signature sur le Custom Devnet. Relever séparément support des frais, réserves de base et objets, et révocation. Les capacités restent désactivées tant qu'un test réel n'a pas réussi. Une simple alimentation XRP depuis le faucet n'est pas une preuve de sponsoring natif.

Politique Octro indépendante des champs protocolaires : sponsor_account, bénéficiaires autorisés, types de transactions, montant maximum par opération, budget global et par utilisateur, plafond de réserves, expiration et révocation. Autoriser uniquement les payloads préparés par le service déterministe ; interdire destination arbitraire, modification des clés et consommation illimitée. Le sponsor n'est jamais le wallet d'un agent LLM.

Avant chaque opération, réserver atomiquement le budget dans PostgreSQL ; après validation, rapprocher le coût réel, ajuster ou libérer la réservation. Les réserves immobilisées ne sont pas des frais consommés : tenir des compteurs distincts. Tester la concurrence et les demandes répétées. Un résultat ledger inconnu garde sa réservation jusqu'à résolution ; ne pas payer deux fois par retry.

Recette : opération admissible sponsorisée avec preuve de débit et attribution des réserves ; budget insuffisant ; bénéficiaire interdit ; coût supérieur au plafond ; sponsoring expiré/révoqué ; timeout de soumission. Tester la situation où l'utilisateur n'a pas la capacité de reprendre une réserve avant de modifier le sponsoring. Les effets réels de révocation doivent être documentés, jamais supposés.

Si SP0 échoue, garder Credentials/Domains comme extension Loaded, afficher la prise en charge indisponible et employer des comptes de test financés explicitement. Ne demander à aucun participant de payer des fonds réels pour la démonstration.


## 31 Outils de développement et frontières du monorepo

Monorepo retenu : apps/client, apps/api, apps/worker ; services/optimizer ; packages/contracts, domain, xrpl, agents, mcp et ui ; infra, fixtures, docs et tests. Ajouter dans packages/xrpl des adapters lending-v1, credentials, domains, sponsorship et wallet-interface. L'optimiseur ne dépend pas du SDK XRPL ; il reçoit des capacités normalisées. Le client ne dépend pas des seeds, du SQL ni du serveur d'optimisation directement.

La référence ripple/xrpl-reference-app-lending-sav sert à comprendre les transactions et comparer les résultats [H5]. Relever commit et licence de tout code réutilisé, conserver attribution et notices. Ne pas copier sa stack entière si elle contredit le monorepo. Scaffold-XRP et Bedrock sont des sources possibles d'exemples, pas des dépendances obligatoires.

xrpl-connect est candidat pour Expo Web [H6]. Son composant UI est web : la compatibilité React Native native doit être testée séparément. Un adapter interne expose connect, getAccount, getNetwork, sign et disconnect ; séparer signature et soumission. Critères bloquants : réseau personnalisé, refus de signature, payload LoanSet multi-parties, changement de compte et reprise de session. Ne pas imposer les versions de dépendances d'un exemple au détriment de la V1 choisie. Afficher les conditions financières avec notre design Pencil avant toute demande de signature.

XRPL Docs MCP fournit de la documentation aux assistants de développement [H7]. Le serveur MCP Octro expose les données et propositions métier sous scopes. Le DevEx hook observe le travail de développement [H8] : ce n'est ni un agent produit ni une primitive ledger. Les trois systèmes ont des identités, logs et permissions distincts. Les outils MCP métier ne peuvent ni signer ni soumettre.

Les ressources XRPL AI, t54 et les starters agentiques peuvent être étudiées pour leurs interfaces, sans dépendance imposée. x402, MPP, Claw Credit et TokenEscrow sont hors chemin critique tant qu'un cas d'usage précis et leur compatibilité réseau ne sont pas démontrés. Aucun escrow ne devient automatiquement une garantie native de LoanSet. Les parts du vault étant déjà représentées par le protocole, ne pas revendiquer un usage supplémentaire de MPT sans fonction distincte.

Pencil reste l'outil de maquettage ; palette crème et vert, typographie lisible, mots usuels et états explicites. Aucun badge IA. Montrer les réserves protégées, total remboursable, échéances, payeur des frais, attestation de test et état de validation. Les interfaces restent FR/EN, accessibles au clavier, compréhensibles sans vocabulaire blockchain.


## 32 Données contrats et sécurité des extensions

Nouvelles entités PostgreSQL : NetworkCapabilitySnapshot, CredentialBinding, PermissionedDomainBinding, EligibilityDecision, SponsorshipPolicy, SponsorshipReservation et TransactionEvidence. Toutes les relations métier portent workspace_id ; les comptes infrastructure partagés sont référencés par des identifiants contrôlés et ne donnent pas accès aux autres espaces. Les données publiques ledger sont distinctes des secrets et des décisions privées.

NetworkCapabilitySnapshot conserve réseau, URL serveur, version, SDK, ledger_index, heure, amendements et résultats de smoke tests. TransactionEvidence conserve scenario_id, step_id, tx_type, tx_hash facultatif pour les rejets avant inclusion, result_code, validated, ledger_index, balances_before/after, explorer_url, redacted_request_ref et commit. Une preuve absente reste absente ; jamais de hash synthétique dans le registre réel.

Contrats API à implémenter : GET /v1/network-capabilities ; GET /v1/eligibility ; POST /v1/credentials/requests ; GET /v1/credentials/{id} ; POST /v1/sponsorship-quotes ; GET /v1/executions/{id}/evidence. Une demande de Credential ne l'émet pas automatiquement. Les émissions et signatures sont réservées aux rôles de service autorisés. Les quotes de sponsoring expirent et doivent être réévaluées avant exécution. Les requêtes GET n'exécutent aucune mutation.

Chaque commande utilise Idempotency-Key, version attendue et référence de plan lorsque pertinent. Les mêmes clés avec des corps différents retournent un conflit. Les données de réseau et de tenant viennent de la configuration et de la session, pas d'arguments d'agent non vérifiés. Appliquer quotas, redaction des logs, validation stricte et limites de taille. Les webhooks Stripe/SMTP sont indépendants de la confirmation financière.

Les adapters retournent unavailable, unsupported, ready ou degraded avec des preuves horodatées. Seul ready permet une préparation transactionnelle, sous contrôle des autres politiques. Réseau incorrect, données obsolètes, erreur de signature, budget insuffisant et résultat inconnu ont des codes distincts. Le frontend ne transforme aucun de ces états en succès optimiste.

CI : validation des schémas, lint/typecheck, tests unitaires des invariants, intégration Postgres et optimizer, puis tests des adapters avec fixtures. Les tests Devnet sont un workflow séparé, déclenché explicitement et doté uniquement de secrets de test ; aucune clé dans les pipelines de PR externes. Archiver les versions exactes et un rapport expurgé. Vérifier sauvegarde et reprise sur la VM sans publier ses services de données sur Internet.


## 33 Recette Loaded et collecte des preuves

Le fichier requirements.json est la liste structurée des obligations ; demo-evidence.template.json est un registre vide à remplir à partir de résultats observés. Les tests suivants complètent les recettes personnelles, quantitatives, de sécurité et de résilience du chapitre 24. Chaque échec indique propriétaire, cause, reproduction et décision ; une case non exécutée ne passe pas au vert.

AC-L01 : G0 consigne le bon réseau et une transaction de base validée. AC-L02 : vault ouvert créé, capital déposé, courtier prêt, prêt accepté et décaissement rapproché. AC-L03 : au moins un remboursement et retrait avec rendement constaté ; distinguer frais et intérêts dans les montants affichés. AC-L04 : refus réel par une protection du prêt ou du vault, avec code observé et absence d'effet financier indu.

AC-L05 : dépôt privé refusé sans attestation adéquate puis accepté avec attestation reconnue. AC-L06 : distinguer permissions du déposant et décision du courtier pour l'emprunteur. AC-L07 : expiration d'attestation et sortie des parts existantes observées, sans promesse sur une liquidité absente. AC-L08 : sponsoring valide et dépassement de plafond si SP0 réussi. AC-L09 : double clic, timeout et reprise ne dupliquent ni prêt ni consommation de sponsoring.

AC-L10 : personnel sans wallet effectue sa projection ; indépendant voit un retard et une réserve préservée ; organisation conserve séparation des rôles. AC-L11 : LLM indisponible laisse calculs et propositions déterministes utilisables. AC-L12 : le registre de preuves sépare transactions validées, refus avant inclusion, mocks et tests non exécutés. AC-L13 : README permet le lancement sur un environnement propre avec versions verrouillées.

Les assertions de succès sont fondées sur les métadonnées ledger et le rapprochement ; les captures d'écran complètent ces preuves. Pour les refus, documenter à quel étage la réponse apparaît : validation SDK, API Octro, moteur rippled ou ledger validé. Ne pas présenter un refus SDK comme protection exécutée on-chain.

Le rapport final demandé est humain et limité à trois pages [H2]. Chaque développeur note ses observations réelles : catégorie, titre, action, attendu, constaté, version, reproduction, sévérité et proposition de correction. Le CDC peut définir le format et l'instrumentation ; il ne fournit aucun témoignage fictif ni rapport prétendument vécu. Équipe : sélectionner trois difficultés instructives et les rédiger personnellement.

Le DevEx hook doit être installé selon son dépôt officiel et vérifié individuellement ; conserver son commit/version et état de fonctionnement, en protégeant seeds et données privées. Les réglages de collecte sont inspectés avant usage. Un problème potentiel de sécurité du protocole est transmis en privé à un mentor avant toute présentation, conformément au règlement ; son exploit et ses détails ne sont pas placés dans le dépôt public.


## 34 Sources de cette édition et décisions ouvertes

Les sources H complètent les sources S du chapitre 28. Le règlement et les slides sont des documents fournis par l'utilisateur. Ils fixent le concours ; les guides techniques peuvent décrire une version différente du serveur de l'événement. Les vérifications documentaires ne constituent pas un test de réseau. Date de consultation : 12 septembre 2026.

[H1] Règlement XRPL Lending Protocol Hackathon fourni le 12 septembre : deux tracks, environnements, minimums, échéances et soumission. [H2] Slides fournies : critères 40/30/20/10, rapport écrit par les développeurs, outils, crédit hybride et exemple transfrontalier. Aucun lien de slides officiel complet n'a été fourni.

[H3] XRPL Single Asset Vaults : accès privé par attestations et distinction dépôt/retrait. https://xrpl.org/docs/concepts/tokens/single-asset-vaults

[H4] XLS-68 Sponsored Fees and Reserves : spécification à confronter au serveur de l'événement. https://xls.xrpl.org/xls/XLS-0068-sponsored-fees-and-reserves.html

[H5] Application de référence Ripple pour XLS-65/66. https://github.com/ripple/xrpl-reference-app-lending-sav

[H6] XRPL Commons xrpl-connect : adapter de wallet et composant web. https://github.com/XRPL-Commons/xrpl-connect

[H7] XRPL Agentic Transactions et documentation MCP. https://xrpl.org/docs/agents/agentic-transactions

[H8] XRPL DevEx hook pour participants. https://github.com/RippleDevRel/xrpl-devex-hook

À fermer avant les transactions : G0 réseau V1, version SDK stable exacte, acteur qui signe chaque étape, actif et échéances. À fermer avant de déclarer Loaded réussi : combinaison domain/credential/vault testée ou alternative ledger prouvée. À fermer avant sponsoring : SP0 et limites observées. À fermer avant production : conformité locale, hébergement, garde, partenaires, consentements et validation du modèle. Ne pas transformer ces inconnues en promesses dans l'interface ou le pitch.


