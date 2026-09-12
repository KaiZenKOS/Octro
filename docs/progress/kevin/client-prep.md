# Kevin — préparation des cinq écrans K1 et du raccordement K2

Statut : spécification de réalisation et recette préparée ; aucun écran exécutable livré. Référence active : [CDC v2.2](../../v2.2/Octro_CDC_v2.2.md), chapitres 5–9, 11–12, 19–24, 31–33, et [exigences](../../../requirements.json). Les critères ci-dessous sont à exécuter après S1/C1, pas des résultats de tests. Voir [dépendances](contracts-request.md) et [statut Kevin](../kevin.md).

## Navigation à implémenter dans Expo Router

Chemins proposés pour le client seulement ; ils ne définissent aucune route API. Les cinq destinations restent accessibles sans wallet, DID, KYC, crédit ou Organization personnelle. La découverte Lina précède toute connexion financière. Le choix de persona est un contrôle de démonstration, jamais une condition d'accès au produit réel.

| Destination | Contenu dans l'ordre de lecture | Liens/actions attendus |
| --- | --- | --- |
| `/` — Accueil | Titre, mention synthétique, espace courant, synthèse datée, argent déclaré/confirmé distinct du prévu, prochaine échéance, réserve | « Découvrir avec Lina », « Ajouter une échéance », « Voir le calendrier », « Voir les options » |
| `/calendar` — Calendrier | Titre, horizon et fuseau, résumé textuel, événements ordonnés, hypothèses, scénarios | « Vérifier les dates » mène à la donnée source ; « Voir les options » mène à la proposition |
| `/sources` — Sources | Titre, comptes et provenance, date d'observation, réserves/protections, saisie, import avec aperçu | Corriger une donnée ; prévisualiser puis confirmer l'import ; actualiser une source ; connexions facultatives |
| `/proposal` — Proposition | Titre, statut, provenance du résultat, version/hypothèses, options sans dette, montant/actif, délai, coût et réserves selon le plan | « J'ai lu la proposition », « Écarter la proposition », « Vérifier les données », « Voir le suivi » ; aucune soumission financière dans K1/K2 |
| `/tracking` — Suivi | Titre, chronologie datée, proposition acquittée distincte d'instruction et de transfert observé, prochaine action | Relire la proposition ; vérifier les données ; relire l'état depuis l'application lorsqu'elle sera raccordée |

Navigation persistante dans cet ordre : Accueil, Calendrier, Sources, Proposition, Suivi. À 390 px, autoriser retour à la ligne des intitulés ou une liste sur plusieurs lignes, sans défilement horizontal. Les liens web et le retour navigateur doivent fonctionner, y compris après entrée directe dans une destination. Sans plan, `/proposal` propose de compléter les données ; `/tracking` affiche son état vide. Aucun lien profond ne crée un plan ou un acquittement.

À chaque changement d'écran, annoncer le titre et positionner le focus sur ce titre ; ne pas le déplacer pendant une actualisation passive. Retour d'une correction : retrouver le contrôle d'origine si encore disponible. La langue change les libellés et formats sans perdre l'écran, l'espace ni les brouillons. Changement d'espace : vider les vues/cache de l'ancien espace avant de charger le suivant ; ne jamais montrer temporairement ses données dans le nouvel espace.

## Matrice écran → exigence → recette

| Écran | Exigences | Scénario et critère d'acceptation à vérifier |
| --- | --- | --- |
| Accueil | UI-01, ACC-01, ACC-02, PER-03, PER-11 | Depuis un profil personnel sans Organization ni connexion, accéder à saisie/import et obtenir une première projection après raccordement S2/S3. Retirer toutes les capacités financières : les mêmes entrées restent accessibles. |
| Accueil | UI-01, PER-10, PER-09 | Parcourir les cinq écrans pour personnel, activité indépendante et organisation. Les espaces personnels/professionnels sont distincts ; aucun employeur/foyer n'apparaît comme autorisé implicitement. |
| Calendrier | UI-01, UI-02, DATA-02, ACC-03 | Afficher horizon personnel 30 jours, professionnel 72 heures, ordre daté et résumé textuel équivalent à la courbe. Le salaire attendu reste prévu ; sa date passée ne le transforme pas en cash confirmé. |
| Sources | PER-02, PER-04, PER-06, DATA-03, ACC-02 | Afficher origine, qualité, âge et réserve. Import manuel reste importé/déclaratif ; aperçu et confirmation ne le rendent pas vérifié. Transfert propre présenté entre deux comptes, jamais comme revenu. |
| Proposition | UI-02, PER-01, PER-07, REL-01 | Lina affiche 230 EUR provenant du plan de démonstration, sans prêt et sans calcul local. Acquitter affiche « Proposition acquittée » sans créditer aucun solde ni produire de preuve de transfert. |
| Proposition | PER-02, PER-05, ENG-04 | Épargne protégée à 300 EUR : diagnostic sans solution sans dette, aucune ponction ni offre inventée. Organisation besoin 90000/plafond 80000 : INFEASIBLE, sans action financière. Distinguer absence de données, aucune action nécessaire et impossibilité. |
| Proposition | UI-02 | Rendre uniquement les valeurs structurées. Lors du raccordement ultérieur d'une explication LLM, injecter un montant divergent : le rendu déterministe doit le remplacer. Aucun LLM n'est ajouté dans ce lot. |
| Suivi | PER-07, REL-01, DATA-02 | Après acquittement, rechargement et reprise, aucun transfert confirmé inventé. Une instruction manuelle ou une déclaration utilisateur ne suffit pas à afficher une observation vérifiée. Aucun hash de fixture. |
| Suivi | SEC-03, REL-01 | Si les données/conditions changent, montrer le plan expiré ; ne pas conserver une validation active. En résultat inconnu, montrer l'incertitude et la reprise en lecture, jamais un succès ni une nouvelle soumission. |
| Tous | UI-01, ACC-03 | FR/EN, largeur 390 px, zoom 200 %, clavier seul et lecteur d'écran : titre, statut, montant, date et prochaine action lisibles ; aucun état uniquement coloré, piège clavier ou bouton iconique sans nom. |

## États communs et reprise

Les états d'affichage ci-dessous ne remplacent pas les états métier des contrats C1. Chargement et erreur portent sur une ressource ; ancienneté et capacité sont des informations indépendantes. Exemple : un calendrier chargé peut contenir des données anciennes avec financement indisponible.

| État | Affichage et action | Garde à vérifier |
| --- | --- | --- |
| Chargement initial | « Chargement… », nom de la ressource, contenu occupé annoncé ; navigation conservée | Ne pas afficher zéro comme valeur provisoire. Empêcher le double envoi d'une commande en attente. |
| Vide | Accueil : découvrir/saisir ; calendrier : ajouter une échéance ; sources : saisie/import ; proposition : compléter les données ; suivi : aucune action suivie | Vide n'est ni « aucune solution » ni « transfert terminé ». |
| Erreur | Message compréhensible, code/trace en détail seulement si utile au support ; corriger ou réessayer selon la réponse | Conserver les saisies. Une erreur de lecture ne transforme pas la dernière donnée en donnée fraîche. |
| Données anciennes | Dernière observation et âge, provenance, indication consultation/simulation, « Actualiser les données » | Les seuils viennent du serveur ; ne pas inventer un délai unique côté UI. Pas d'action financière sur données expirées. |
| Capacité financière inconnue/indisponible | Raison fournie par l'application et « La prévision reste disponible » | Ne pas demander KYC ou wallet pour débloquer le calendrier. Réseau inconnu ≠ prêt autorisé. |
| Aucune solution | Diagnostic et contraintes bloquantes du moteur, « Vérifier les données » | Aucune réduction automatique d'une réserve, aucun crédit proposé par défaut. |
| Aucune action nécessaire | Résultat explicite `no_action` avec justification issue du plan | Ne pas le confondre avec INFEASIBLE ou une liste encore en chargement. |
| Refus/accès expiré | Raison, retour vers un espace autorisé ou reconnexion applicative | Après refus d'accès, supprimer le contenu protégé de la vue ; pas de repli vers le cache d'un autre espace. |
| Hors ligne/reprise | Dernières données datées, brouillon non synchronisé lorsque le stockage prévu par S1 le permet | Aucune exécution ni confirmation financière hors ligne. Pas de retry aveugle de commande. |
| Version en conflit/plan expiré | Recharger le plan et expliquer la modification | Ne pas acquitter silencieusement une autre version. Aucune approbation optimiste. |
| Résultat inconnu | « Résultat à vérifier », dernière observation ; reprise en lecture | L'application réconcilie ; ni nouvelle transaction ni succès déduit d'un timeout. K3 reste hors lot. |

## Lina : données d'entrée et résultat fourni

Charger la [fixture officielle](../../v2.2/personal.fixture.json) et le [plan fourni](../../v2.2/plan.example.json) sans les modifier ni les recopier en deuxième source métier. `synthetic: true` doit rester visible sur chaque écran et chaque résultat. `data_quality: declared` ne devient jamais `provider_verified`.

| Information | Champ/source | Affichage de démonstration |
| --- | --- | --- |
| Courant et épargne d'ouverture | `opening_balances.current`, `.savings` | 650 EUR et 300 EUR, déclarés et synthétiques, pas des soldes bancaires observés |
| Réserve courant | `current_reserve` | 100 EUR |
| Événements | `events` | Loyer 600 EUR J+2 ; courses 100 EUR J+4 ; transport 80 EUR J+6 ; salaire prévu 1600 EUR J+10 |
| Proposition | `proposed_actions[0].amount_decimal`, `.asset_id` du plan | Transfert proposé de 230 EUR de l'épargne vers le courant ; `execution_mode: proposal_only` |
| Effet attendu | `expected` de la fixture | Courant avant salaire 100 EUR ; épargne restante 70 EUR ; courant après salaire 1700 EUR ; total après salaire 1770 EUR ; nouvelle dette 0 EUR |

Les effets attendus sont des résultats de démonstration fournis, pas des observations ni une projection temporelle complète. Ne pas interpoler une courbe ou recomposer le calcul dans l'UI. La fixture ne fournit ni date absolue J0 ni fuseau : afficher J+2/J+4/J+6/J+10, avec légende relative ; C1 doit fournir l'ancrage pour les dates réelles. Ne pas utiliser la date système comme fait financier. Le formatage localisé conserve la précision décimale sans convertir les montants métier en flottants binaires.

La branche personnelle définie par le CDC est `DRAFT → PROPOSED → ACKNOWLEDGED` ou `DISMISSED`, puis `EXPIRED` si les données changent. L'acquittement n'est pas `Approval` d'une transaction et ne rejoint pas `CONFIRMED`. K1 montrera une simulation explicitement identifiée ; K2 persistera l'acquittement via le cas d'usage approuvé. Une éventuelle observation réelle appartiendra à un objet Execution séparé avec provenance et preuve applicative ; elle ne découle jamais d'un clic client.

## Indépendant et organisation à conserver

- Indépendant : deux espaces sans fusion automatique, facture attendue puis retardée, provision fiscale et dépenses essentielles protégées. Comparer les scénarios via le moteur ; demander les fixtures contractuelles à Samet/Augustin. Ne pas inventer un troisième `Workspace.kind` : le CDC conserve `personal|organization` ; le public indépendant est une personnalisation d'affichage.
- Organisation : accès selon rôle serveur, réserves et fonds clients cantonnés indisponibles pour financer le compte propre ; diagnostic 90000/80000. La recette de prêt réel relève de K3 et A3/A5, sans simulation présentée comme preuve réseau.

## Accessibilité et présentation minimale à raccorder après S1

Utiliser les [tokens existants](../../v2.2/design.tokens.json) : `page → cream`, `text → ink`, `primary → forest`, `highlight → matcha`, `error → earth`, corps ≥ 16 px et grille 8 px. Les fontes documentaires ne sont pas une décision de fonte applicative. Vérifier les contrastes des combinaisons effectivement utilisées après Pencil ; aucune conformité WCAG acquise par la seule palette.

À 390 px : une colonne, espacements de grille, aucune hauteur de texte bloquée, montants et libellés pouvant revenir à la ligne, contenu principal et barre de navigation sans recouvrement. Courbes facultatives avec résumé et liste d'événements accessibles. Cible WCAG 2.2 AA du CDC ; zoom à 200 % sans perte d'action ou d'information.

Ordre clavier : accès au contenu → sélection langue/espace → cinq liens de navigation → contenu dans l'ordre visuel du tableau → actions. Pas de `tabIndex` positif. Focus toujours visible ; contrôles accessibles par Tab/Shift+Tab et activation clavier standard. Les textes d'erreur sont associés au champ ; après soumission invalide, aller au premier champ invalide. Les annonces de chargement/résultat restent brèves, sans relire toute la page. État sélectionné, désactivé et occupé exposé sémantiquement. Si un dialogue est nécessaire, retour de focus à son déclencheur à la fermeture.

Noms accessibles : utiliser le libellé visible complet ; compléter les actions répétées, par exemple « Modifier la date du loyer » / « Edit rent date ». Montant, devise, échéance, statut et source doivent pouvoir se comprendre sans couleur. Les libellés FR/EN préparés sont dans [copy.fr-en.json](copy.fr-en.json), dictionnaire de contenu seulement, pas contrat métier ni état persistant.

## Recette à exécuter et preuves attendues

| Test | Manipulation | Résultat requis | Statut actuel |
| --- | --- | --- | --- |
| K1-NAV | Ouvrir les cinq destinations, liens directs, retour/avance, changement langue/espace | Aucun lien mort ; focus/titre corrects ; aucune fuite du précédent espace | Non exécuté — S1/C1 |
| K1-STATE | Sur chacun des cinq écrans, forcer chargement, vide, erreur, ancienneté, refus et reprise ; combiner ancienneté + capacité inconnue | Messages/action cohérents avec la table ; pas de zéro ni succès inventé | Non exécuté — S1/C1 |
| K1-LINA | Charger uniquement les annexes officielles ; afficher plan puis acquitter deux fois et recharger | 230 EUR fourni ; pas d'appel au moteur dans l'UI ; aucune mutation de solde ni preuve réelle | Non exécuté — S1/C1 |
| K1-NOSOLUTION | Charger résultats contractuels Lina épargne protégée et organisation infaisable | Diagnostic, réserves conservées, aucune action financière ; distinct de no_action | Non exécuté — fixtures C1/A2 |
| K1-A11Y | Chaque écran FR puis EN, clavier seul, 390 px, zoom 200 %, lecteur d'écran disponible | Ordre et noms cohérents, messages perceptibles, contenu/action non tronqués | Non exécuté — client absent |
| K2-REAL | Créer Workspace personnel → saisir trois événements/import aperçu-confirmation → relire → calcul via application/moteur → acquitter → relire suivi | Persistance réelle ; plan/version/trace reliés ; aucun wallet/KYC/Organization ; pas de transfert fictif | Non exécuté — S2/S3/C1 et intégration A2 |
| K2-LINA | Dans l'application réelle, enregistrer les deux soldes, la réserve et les quatre événements officiels Lina ; appeler le calcul via l'application, puis acquitter et relire | Résultat moteur 230 EUR, dette 0 EUR, effets attendus conformes à la fixture ; mention synthétique propagée ; aucun transfert observé inventé | Non exécuté — S2/S3/C1 et intégration A2 |
| K2-RECOVERY | Retirer crédit, interrompre lecture, changer version avant acquittement, reprendre | Prévision conservée ; erreur/conflit visibles ; aucun succès optimiste | Non exécuté — application absente |

K2-REAL teste l'onboarding minimal ; K2-LINA teste la fixture complète. Ne pas attendre le résultat Lina à partir de seulement trois événements. Chaque exécution future consigne commit, navigateur/appareil, langue, viewport/zoom, lecteur d'écran, scénario, attendu, observé et anomalie. Les trois novices et l'objectif de trois minutes (PER-08) restent une recette humaine ultérieure : ne pas remplir de mesures synthétiques. K2 ne sera déclaré terminé qu'après K2-REAL et K2-LINA avec le véritable port applicatif appelant le moteur.
