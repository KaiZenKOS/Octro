# Octro v2.2 — Travail à trois et prompts de développement

Ce document organise le travail de **Kevin, Samet et Augustin**, avec un agent principal et des sous-agents par développeur. Il transforme le chapitre 25 du CDC en lots parallèles et vérifiables. **Toutes les tâches ci-dessous sont à faire ou à vérifier dans le code existant : cette liste ne déclare aucune fonctionnalité livrée.**

## 1. Références et décisions acquises

Lire [AGENTS.md](../AGENTS.md), le [CDC v2.2](v2.2/Octro_CDC_v2.2.md), les [exigences](../requirements.json), la [configuration Track 1 Loaded](v2.2/hackathon.config.json) et l'[architecture](architecture.md). Les agents Claude appliquent aussi [CLAUDE.md](../CLAUDE.md). Les annexes sont dans l'[index documentaire](README.md).

La **v2.2 est la seule référence active**. Les archives ne sont pas des instructions de développement. Le schéma de proposition livré dans le pack reste volontairement en version 2.1 ; cela ne réactive pas une ancienne version produit. Le présent plan ne renumérote aucune exigence et ne remplace ni ses critères d'acceptation ni ses priorités.

- Particuliers, indépendants et entreprises sont tous P0, en Track 1 Loaded.
- Un Workspace personnel ne nécessite aucune Organization.
- Saisie, import, calendrier et prévisions restent utilisables sans wallet, DID, KYC ou crédit.
- Les options sans dette, dépenses essentielles et réserves protégées restent centrales. Une proposition acquittée ne prouve aucun transfert.
- Credentials et Permissioned Domains sont l'extension Loaded principale P0.
- Sponsoring : P1, soumis à SP0 et aux capacités réseau réellement constatées. DID : facultatif P1.
- Les outils du LLM ne signent et ne soumettent jamais. Les chiffres de référence viennent du calcul structuré.
- Aucun secret, identité de capture, réglage personnel ou donnée personnelle réelle de démonstration n'entre dans Git.

**État de départ vérifié pour ce plan :** le commit f5032eb contient le cadrage v2.2 et l'arborescence, sans application implémentée. À chaque démarrage, examiner la branche actuelle pour reprendre les travaux déjà intégrés au lieu de les recréer. Les versions SDK et capacités du réseau restent inconnues tant que G0 n'apporte pas de preuves.

## 2. Répartition et frontières de fichiers

| Responsable | Livrable principal | Périmètre d'écriture principal | Première démonstration |
| --- | --- | --- | --- |
| Kevin | Produit, cinq écrans, accessibilité, wallet côté UI, agents/MCP, présentation | apps/client/, packages/ui/, packages/agents/, packages/mcp/ ; tests et documentation propres à ces lots | Lina : calendrier et proposition de transfert de 230 EUR, utilisables sans wallet |
| Samet | Socle du monorepo, contrats, application, Workspace, API, données, sécurité, workers et infrastructure | packages/contracts/, packages/application/, apps/api/, apps/worker/, infra/ ; migrations, configuration de build et CI | Créer un Workspace personnel, enregistrer des événements et relire une projection avec isolation des espaces |
| Augustin | Calcul déterministe, G0, Lending V1, Credentials/Domains et preuves réseau | services/optimizer/, packages/xrpl/ ; tests financiers et preuves assainies | G0 et Payment réels ; en parallèle, calcul Lina 230 EUR et cas 90000/80000 infaisable |

**Fichiers partagés : un intégrateur désigné.**

| Zone commune | Intégrateur | Règle |
| --- | --- | --- |
| Manifestes racine, workspace, lockfile JavaScript, CI | Samet | Les autres demandent une dépendance avec sa justification ; aucune régénération concurrente du lockfile. Augustin fournit la version XRPL issue de G0. |
| packages/contracts/ et ports de packages/application/ | Samet | Augustin relit sémantique financière, précision et capacités ; Kevin relit besoins UI/MCP. Une évolution incompatible doit être coordonnée avant intégration. |
| packages/domain/ | Samet pour Workspace/accès ; Augustin pour règles financières | Délimiter les fichiers dans le premier contrat commun. Les exports/index partagés sont intégrés par Samet. Pas de doubles définitions de Money, Workspace ou ActionPlan. |
| Interface wallet | Augustin pour le contrat/adaptateur ; Kevin pour le parcours UI | S'accorder sur connexion, compte, réseau, signature et déconnexion. Le parcours de soumission demeure séparé des outils LLM. |
| Fixtures et tests transverses | Samet pour la structure commune | Chaque lot écrit dans des fichiers distincts annoncés dans sa PR. Les scénarios financiers de référence sont validés par Augustin. |
| README, registre réseau, preuves, rapport DevEx | Kevin pour README/soumission ; Augustin pour preuves réseau ; chaque humain pour ses observations | Les sous-agents proposent des modifications ciblées. Ne pas réécrire collectivement le même fichier. Préserver les originaux du pack. |

Ces emplacements décrivent des responsabilités ; ils n'imposent pas de nouveaux frameworks ni une multiplication de packages.

### Architecture à appliquer dans tous les lots

- **packages/domain/** : objets, valeurs et règles métier, sans SQL, SDK XRPL, HTTP, framework web ou LLM.
- **packages/application/** : cas d'usage et ports ; dépend du domaine et orchestre autorisations, versions, idempotence et approbations.
- **API, workers et MCP** : entrées vers ces mêmes cas d'usage. Aucun contrôle métier alternatif propre au MCP.
- **PostgreSQL, S3, Stripe Identity et XRPL** : adaptateurs derrière les ports. Leur assemblage reste hors du domaine.
- **services/optimizer/** : calcul Python indépendant de FastAPI, du LLM et du SDK XRPL. FastAPI peut en adapter le transport.
- L'UI présente le plan ; l'agent l'explique. Ni l'un ni l'autre ne reconstitue les montants de référence.

Suivre la stack du CDC : Expo/React Native avec priorité web, TypeScript, Fastify, PostgreSQL avec jobs/outbox, Python et solveur décrit par le pack. Ne pas ajouter Redis, un autre framework ou un service externe pour contourner une dépendance entre lots.

## 3. Démarrage commun, puis trois pistes parallèles

### C0 — État local et capture, chacun sur sa machine

**Responsables : tous. Exigences : DEVEX-01, DEVEX-02, SEC-04.**

Vérifier la branche, les fichiers locaux, l'accès au dépôt et sa propre installation DevEx. Chaque participant donne son propre consentement ; l'identité d'un coéquipier n'est jamais copiée. Conserver les hooks et correctifs locaux. Les sous-agents ne créent pas de fausses observations de recherche.

Sur une installation Windows contenant des skills copiés et des fichiers non suivis en collision, ne pas lancer un pull aveugle. Préserver les fichiers et utiliser un worktree propre basé sur origin/main. La disponibilité de la capture dans ce worktree doit être vérifiée pour le participant concerné ; un worktree ne reproduit pas automatiquement toute sa configuration locale.

**Sortie :** chaque développeur connaît son checkout de travail et l'état réel de sa capture. Un problème local de capture reste visible et ne devient pas une preuve de succès.

### C1 — Contrats communs, réunion courte de 30 à 45 minutes maximum

**Intégrateur : Samet, revue Kevin + Augustin. Lié à S1.**

Fixer une première tranche utilisable des neuf contrats du CDC : **Workspace, EconomicEvent, Projection, ActionPlan, Approval, Execution, EligibilityDecision, NetworkCapabilities et Error**. Décrire notamment :

- Identifiant de Workspace et règles d'accès ; Organization facultative pour un espace personnel.
- Montants décimaux, actif, précision, dates, fuseaux et provenance des données.
- Prévision versus cash confirmé ; actions proposées versus exécutions observées.
- Version du snapshot/plan, approbation liée aux conditions, clé d'idempotence et erreurs.
- Capacités réseau inconnues ou indisponibles ; contrôle applicatif versus contrôle ledger.
- Entrée/sortie de l'optimiseur et interface wallet avec Augustin.

Partir du [schéma fourni](v2.2/plan.schema.json), de son [exemple](v2.2/plan.example.json) et de la [fixture personnelle](v2.2/personal.fixture.json). Le schéma proposal_only n'est pas une API complète. Conserver ces annexes ; développer les contrats exécutables dans le périmètre de Samet.

**Sortie :** une petite PR de contrats et fixtures intégrée, les chemins réservés à chaque personne, puis chacun avance. Les formats peuvent évoluer par revue explicite ; il n'est pas nécessaire de concevoir toute l'API avant de démarrer.

### Ce qui peut démarrer immédiatement

| Piste | Sans attendre les autres | Après la première tranche de contrats |
| --- | --- | --- |
| Kevin | Parcours Pencil, cinq écrans et états attendus ; lecture des tokens | Interface sur fixtures contractuelles, puis raccordement à l'API |
| Samet | Bootstrap du monorepo, environnement local, contrats initiaux | Workspace, persistance et cas d'usage ; adaptateur de calcul simulé explicitement identifié |
| Augustin | Vérification G0 dans un environnement isolé et collecte des capacités | Calcul Python sur fixtures et adaptateurs XRPL derrière les ports convenus |

G0 ne doit pas attendre l'interface. Les échéances du prêt de test doivent permettre remboursement et retrait avant le gel ; ne pas démarrer ce travail en fin de hackathon. Pour éviter qu'Augustin porte seul deux chemins critiques, **Samet prend la plomberie de persistance et d'intégration des adaptateurs**, sur des fichiers convenus, tandis qu'Augustin garde la sémantique réseau et financière.

## 4. Tâches de Samet

Les identifiants S1 à S7 sont des tâches de coordination, distinctes des IDs normatifs.

| Tâche | Résultat à livrer | Exigences | Dépendances |
| --- | --- | --- | --- |
| **S1 — Socle et contrats** | Workspace de packages, commandes réellement exécutables, premiers lockfiles, CI minimale ; C1 et ports de calcul/persistance/réseau. Imports conformes à l'architecture. | OPS-02, DATA-03, ARCH-LOAD-01 | Aucune pour le socle ; revue commune C1 pour les contrats |
| **S2 — Workspace et accès** | Cas d'usage de création/lecture de Workspace personnel sans Organization ; rôles, isolation et capacités progressives ; prévisions disponibles sans Stripe, wallet ou crédit. | PER-03, PER-09, ACC-02, PER-11, SEC-01, NET-02 | S1 |
| **S3 — Événements, imports et projection** | Persistance, import avec aperçu/confirmation, provenance, déduplication ; transferts propres à deux jambes ; cas d'usage appelant le port de calcul. | DATA-01, DATA-02, DATA-03, PER-04, PER-06, ACC-02 | S2 ; contrat A2, sans attendre son implémentation pour les tests sur doublure |
| **S4 — Approbation et exécution** | Approbations liées aux conditions, idempotence, réservations atomiques, jobs/outbox et audit ; reprise d'un résultat incertain. | SEC-02, SEC-03, SEC-05, OPS-01 | S2, C1 ; A3/A5 pour validation réseau intégrée |
| **S5 — Identité et Loaded applicatif** | Stripe Identity en mode test, webhook authentifié ; émetteur de Credentials de démonstration ; éligibilités prêteur/emprunteur séparées et capacités connues ; secrets isolés. | CMP-01, LOAD-02, PER-11, NET-02, SEC-04, SEC-LOAD-01, ARCH-LOAD-01 | S2 pour identité/éligibilité sur doublures explicites ; A1 requis pour opérations réseau, puis coordination A4 pour validation ledger |
| **S6 — Exploitation et intégration** | Environnement Compose/VM selon le CDC, CI des lots, secrets et logs assainis ; sauvegarde/restauration isolée, réconciliation et procédure de lancement vérifiée. Aide à la plomberie XRPL. | OPS-02, OPS-03, OPS-01, SEC-04, ARCH-LOAD-01 | Commencer la CI avec S1 ; intégrer progressivement S3/S4 et A3/A5 |
| **S7 — Extensions P1** | Budgets de sponsoring, distinction frais consommés/réserves immobilisées, bénéficiaires et concurrence ; éligibilité distincte du DID si ce dernier est implémenté. | SPON-02, SPON-03, DID-02 | P0 et intégration sécurisés ; A6/SP0 pour activation sponsoring |

**Critères de sortie prioritaires :**

- Un Workspace personnel fonctionne sans Organization ; aucun employeur, conjoint ou autre espace n'accède implicitement à ses données.
- Rejouer un événement ne crédite pas deux fois le solde ; une rentrée prévue ne devient pas du cash confirmé.
- Un transfert interne conserve le total des avoirs ; une saisie/import reste déclarative tant qu'elle n'est pas vérifiée.
- Même clé + même corps : une seule exécution ; même clé + autre corps : 409. Un changement des conditions invalide l'approbation.
- Les demandes concurrentes ne dépassent pas une capacité réservée ; une capacité réseau inconnue bloque la finance et laisse la projection fonctionner.
- Un faux webhook Stripe est rejeté ; la prévision fonctionne sans session Stripe. Les clés d'émetteur ne passent pas par le LLM.
- Une restauration et une réconciliation sont réellement vérifiées avant de déclarer OPS-03 terminé.

**Sous-agents de Samet :** après S1/C1, confier Workspace/données (S2/S3) à un sous-agent et CI/infra (partie indépendante de S6) à un autre, avec listes de fichiers distinctes. Samet garde les contrats, exports communs, migrations partagées, intégration et revue des contrôles S4/S5. Les migrations reçoivent un ordre unique ; aucun sous-agent ne les renumérote en parallèle.

## 5. Tâches d'Augustin

| Tâche | Résultat à livrer | Exigences | Dépendances |
| --- | --- | --- | --- |
| **A1 — G0 et capacités réseau** | Vérifier réseau exact, network_id, version serveur/ledger, actif et SDK stable ; Payment validé avec preuves ; communiquer les capacités observées et la version à épingler. | XRP-01, HACK-01, EVID-01 | Aucune dépendance à l'UI ; accès réseau et comptes de test nécessaires |
| **A2 — Moteur financier** | Calcul Python testable sans serveur/LLM ; horizons, contraintes, coûts, arrondis, CVaR et dette terminale ; propositions sans dette et diagnostics. | ENG-01, ENG-02, ENG-03, ENG-04, ENG-05, PER-01, PER-02, PER-05 | C1 ; peut avancer indépendamment du succès de G0 |
| **A3 — Cycle Lending V1** | Adaptateurs vault/dépôt/broker/prêt accepté/décaissement/remboursement/retrait avec rendement ; échéancier réel, identité borrower et protection protocolaire refusant une opération invalide. | XRP-02, XRP-04, HACK-02, HACK-03 | A1 et ports C1 ; S4 + K3 pour parcours applicatif complet |
| **A4 — Credentials et Domains** | Contrôle Loaded du vault : dépôt refusé sans attestation, puis accepté avec attestation reconnue ; expiration et retrait de parts existantes observés. Séparer effets ledger et décision applicative. | LOAD-01, LOAD-03, HACK-03, EVID-01 | A1, base vault A3, émetteur/éligibilité S5 |
| **A5 — Réconciliation et preuves** | Résultat ambigu réconcilié sans second prêt ; preuves assainies pour chaque étape et chaque refus ; contrat wallet vérifié avec Kevin. | XRP-03, EVID-01, XRP-02 | Préparer les tests dès A3 ; intégrer avec S4 et K3 |
| **A6 — Extensions P1** | SP0 puis opération réellement sponsorisée si supportée ; DID facultatif et tests de résolution/rejeu si temps disponible. | SPON-01, DID-01 | Ne pas retarder A2/A3/A4/A5 ; S7 pour le sponsoring applicatif |

**Critères de sortie prioritaires :**

- Lina : 650 EUR courant + 300 EUR épargne, sorties de 780 EUR avant salaire, réserve courant de 100 EUR → proposition de transfert de 230 EUR sans prêt.
- Si l'épargne est protégée à 300 EUR, ne pas la consommer automatiquement : produire un diagnostic sans solution sans dette dans ces hypothèses.
- Besoin 90000 et plafond 80000 → INFEASIBLE, sans action. Besoin nul → aucun tirage.
- Pertes [0, 0, 100], poids [0.80, 0.15, 0.05] → CVaR95 de 100. Les contraintes sont revérifiées après arrondi ; la dette ne disparaît pas à H72.
- Même snapshot et versions → même plan. Les paramètres du manifeste restent la référence.
- Le cycle réseau couvre aussi remboursement et retrait, pas uniquement création du prêt. Un refus SDK/API n'est pas présenté comme un refus ledger validé.
- Le cas Loaded est observé sur le réseau cible, notamment le comportement de retrait après expiration. Si la combinaison requise n'est pas supportée, produire un diagnostic reproductible ; ne pas changer silencieusement de track ni remplacer la preuve par un mock.

**Sous-agents d'Augustin :** déléguer A2 et ses tests financiers à un sous-agent pendant qu'Augustin pilote A1/A3 ; un second sous-agent peut relire les schémas/erreurs et préparer des tests de réconciliation sur fichiers distincts. L'agent principal conserve le contrôle des opérations réseau. **Un seul exécuteur par compte de test** : pas de soumissions concurrentes non coordonnées par plusieurs agents, pas de diffusion des secrets aux sous-agents.

Les scripts de calcul et tests isolés peuvent utiliser des fixtures synthétiques. Le [modèle de preuves](v2.2/demo-evidence.template.json) demeure inchangé ; les résultats réellement observés vont dans un registre séparé, avec statuts honnêtes. Ne jamais fabriquer de hash, résultat validé, network_id, identité ou retour DevEx.

## 6. Tâches de Kevin

| Tâche | Résultat à livrer | Exigences | Dépendances |
| --- | --- | --- | --- |
| **K1 — Parcours et interface sur fixtures** | Pencil puis Expo Web ; accueil, calendrier, sources, proposition, suivi ; trois profils, états de capacités et onboarding personnel autonome. | UI-01, ACC-01, ACC-03, UI-02 | Conception immédiate ; S1/C1 pour code branché aux fixtures |
| **K2 — Parcours réel de prévision** | Connecter la saisie/import/projection à l'application ; afficher le plan calculé et distinguer proposition acquittée, instruction et transfert observé. | ACC-01, UI-02, PER-07, PER-10, REL-01 | K1, S2/S3, A2 pour recette réelle du calcul |
| **K3 — Wallet et exécution à l'écran** | Connexion volontaire, réseau personnalisé, compte, refus de signature, changement de compte et LoanSet ; suivi d'exécution et état incertain, via l'application. | WAL-01, PER-07, UI-02 | Contrat wallet C1, K1 ; co-validation avec A3/A5 et S4 après A1, sans attendre A5 pour démarrer |
| **K4 — Agents et MCP métier** | Orchestrateur borné, rôles spécialisés, explication du plan ; outils passant par les cas d'usage communs ; parcours manuel sans LLM. | AGT-01, AGT-02, AGT-03, MCP-02, UI-02 | Contrats C1 et cas d'usage S3 ; stabiliser K2 avant d'en faire dépendre la démonstration |
| **K5 — Recette des trois publics** | Personnel sans dette, indépendant avec rentrée retardée et organisation XRPL rejouables ; FR/EN, clavier, lecteur d'écran, zoom et mobile ; tests réels avec novices. | UI-01, ACC-03, PER-08, PER-10, REL-01 | Commencer la recette UI avec K1 ; intégrer K2/K3 et les preuves A5 |
| **K6 — Livraison et présentation** | README testé, liens de preuves, commit de démo, dix slides maximum et pitch de quatre minutes ; coordonner rapport humain et formulaire de soumission. | SUB-01, REL-01, DEVEX-02 | Préparer le récit immédiatement ; finaliser après recette intégrée |
| **K7 — Gate de pilote, hors hackathon** | Recenser les validations de production requises avant ouverture à l'argent réel, selon le CDC. | REL-02 — PILOT | Responsables habilités ; aucune activation implicite au titre du hackathon |

**Critères de sortie prioritaires :**

- Première projection personnelle sans identifiant société, wallet, DID ni KYC ; le crédit n'est jamais un passage obligatoire.
- Cinq écrans cohérents à 390 px, utilisables au clavier, en FR/EN, avec contrôles lecteur d'écran et zoom 200 %.
- Les montants viennent du plan. Une explication LLM divergente est remplacée par un rendu déterministe.
- L'acquittement d'un transfert proposé ne marque pas les fonds transférés.
- Maximum 12 appels d'outils avant retour à un état durable ; aucun outil LLM de signature/soumission ; panne du modèle compatible avec simulation et validation manuelle.
- Trois novices testent réellement l'objectif d'onboarding en trois minutes. Consigner les résultats mesurés, même défavorables ; aucun sous-agent ne se substitue à ces personnes.
- Le pitch principal suit l'indépendante confrontée à une rentrée retardée, avec les deux autres publics démontrables. Les enregistrements de secours et simulations restent identifiables.

**Sous-agents de Kevin :** confier composants/accessibilité de packages/ui/ à un sous-agent pendant que Kevin construit les écrans ; après C1, un autre peut prendre packages/agents/ et packages/mcp/ sur les contrats approuvés. Kevin garde la navigation, le raccordement API/wallet et l'intégration. Pendant la recette, remplacer un agent de construction par un relecteur : ne pas multiplier les agents qui modifient les mêmes écrans.

## 7. Jalons d'intégration et ordre de priorité

Les horaires absolus sont ceux du [CDC, chapitre 26](v2.2/Octro_CDC_v2.2.md) : **gel dimanche 13 septembre 2026 à 12 h 30, soumission à 13 h 00, heure de Paris**. Un démarrage tardif ne redonne pas 25 heures. Recaler les lots sur le temps restant et préserver une fenêtre de recette.

| Jalon | Démonstration vérifiable | Lots concernés |
| --- | --- | --- |
| **J1 — Contrats et accès** | Contrats partagés, UI sur fixtures identifiées, Workspace personnel persistant ; état G0 exposé avec preuves ou blocage explicite | C1, S1/S2, K1, A1 |
| **J2 — Valeur sans dette** | Saisie → persistance → vrai moteur → proposition Lina 230 EUR ; réserve protégée et cas infaisable correctement traités ; pas de wallet requis | S3, A2, K2 |
| **J3 — Exécution contrôlée** | Approbation liée aux conditions, wallet, cycle Lending, audit et reprise ; remboursement/retrait préparés et exécutés selon échéances réelles | S4, A3/A5, K3 |
| **J4 — Loaded** | Refus sans attestation puis dépôt accepté ; application/ledger séparés ; comportement d'expiration et retrait observé | S5, A4, K3/K5 |
| **J5 — Recette et soumission** | Trois parcours, agents bornés et mode manuel, tests P0, preuves, lancement propre, retours humains et support de pitch | S6, A5, K4/K5/K6, C0 |

Ce sont des **points de contrôle**, pas cinq phases en cascade : A1/A3 et S5/A4 démarrent pendant la construction de J2. Intégrer de petits changements et faire une démonstration commune environ toutes les deux heures ; communiquer immédiatement un contrat incompatible ou un blocage réseau critique.

En cas de retard : retirer d'abord DID, intégrations agentiques annexes, second vault et embellissements. Le sponsoring reste inactif si SP0 échoue. Ne pas retirer le parcours personnel, le mode manuel, Credentials/Domains, les contrôles financiers ou les preuves de remboursement/retrait pour ajouter une technologie. Tout P0 incomplet reste déclaré incomplet.

## 8. Mode opératoire obligatoire des agents et sous-agents

### Un agent principal par développeur

Le développeur lance le prompt de sa section ci-dessous. Son agent principal lit le contexte, annonce le prochain lot, délimite les fichiers et délègue **des sous-tâches concrètes et indépendantes à de vrais sous-agents**. Par défaut, **deux sous-agents actifs au maximum en plus du principal**, dans la limite réelle de l'outil. Un seul suffit pendant un bootstrap dépendant ; ne pas forcer deux écritures concurrentes pour remplir un quota.

Chaque mission déléguée comporte : tâche et IDs d'exigences, résultat attendu, fichiers autorisés/interdits, contrats d'entrée/sortie, critère d'acceptation, dépendances et format du compte rendu. Pas de délégation récursive par les sous-agents. L'agent principal conserve du travail utile, intègre les résultats et fait relire les changements sensibles.

Si l'outil utilisé ne permet pas de lancer des sous-agents, **le signaler clairement** et poursuivre les tâches réalisables ; ne pas prétendre avoir délégué et ne pas inventer une commande slash. Cette limite n'autorise pas l'installation d'un outil inconnu, le changement de permissions ou la suppression d'un contrôle.

### Prévenir les collisions

- Avant une écriture, attribuer un ensemble de fichiers exclusif. Le reste du dépôt est consultable ; ne pas modifier le lot d'un collègue.
- Pour deux implémentations qui se chevauchent, les séquencer ou utiliser des branches/worktrees séparés. L'agent principal choisit et intègre ; les sous-agents ne fusionnent pas seuls.
- Les sous-agents ne font pas de push, ne changent pas de branche dans un checkout partagé et ne régénèrent pas le lockfile commun.
- Une dépendance manquante autorise une doublure explicite derrière le port convenu, avec données synthétiques. Elle ne justifie ni un contrat parallèle ni un résultat de recette réseau inventé.
- Aucun code métier dans un composant UI, handler HTTP ou outil MCP pour contourner un cas d'usage absent.
- Le responsable d'un contrat est sollicité par une proposition précise : champs, raison et effet sur les consommateurs. Les agents n'envoient pas de messages à des personnes sans autorisation.
- Réserver les secrets et les transactions de test au parcours autorisé ; les sous-agents de lecture, calcul ou UI n'ont pas à recevoir les clés.

### Git et reprise

Faire un fetch et examiner l'état local avant de choisir une branche. Travailler sur une branche de tâche, par exemple feat/samet-s2-workspace, feat/augustin-a2-optimizer ou feat/kevin-k1-interface. Partir du main distant à jour ou reprendre la branche existante pertinente ; préserver toute modification locale. **Pas de reset destructif, clean, push forcé ou pull aveugle sur les installations en collision.**

Livrer une PR courte par tâche cohérente, avec IDs, comportement attendu, vérifications exécutées et limites. L'agent principal peut pousser sa branche et ouvrir une PR ; **pas de fusion autonome vers main** dans ce workflow. Une personne autre que l'auteur relit avant intégration, notamment les contrats, montants, droits et exécutions. Reprendre les changements intégrés avant le lot suivant.

Le fichier TEAM_TASKS.md reste le plan commun. Le statut détaillé vit dans les PR ou dans une note propre au responsable, par exemple docs/progress/kevin.md, docs/progress/samet.md ou docs/progress/augustin.md, créée seulement si utile. Ne pas faire éditer ce plan simultanément par neuf agents.

### Terminer une tâche

Une tâche est terminée lorsque son code est intégré au parcours concerné, ses critères sont vérifiés et ses limites explicites. « Compile », « le mock répond » ou « l'agent a fini » ne suffit pas pour une exigence financière ou réseau.

L'agent principal fournit : tâches/IDs traités, fichiers changés, tests réellement exécutés, résultats, dépendances encore simulées, blocages, branche/commit/PR et prochaine tâche prête. Un relecteur vérifie particulièrement isolation, idempotence, arrondis, approbation et absence de secrets pour les lots concernés. Ne pas multiplier les tests sans risque concret à couvrir.

Les tâches nécessitant des humains, un accès VM, une signature ou un service inaccessible restent bloquées de manière explicite. Continuer les autres tâches indépendantes sans fabriquer leur validation. Les observations DevEx sont celles réellement vécues par chaque développeur.

## 9. Prompts à lancer dans le dépôt

Chaque personne copie **uniquement son prompt** dans son agent de code, depuis son checkout Octro. Ces prompts autorisent le travail sur sa branche et les sous-agents décrits ci-dessus. Ils n'autorisent ni fusion automatique vers main ni argent réel. À une reprise, l'agent examine les PR/commits accessibles avant de recommencer un lot.

### Prompt Samet

~~~text
Je suis Samet. Implémente mon lot Octro v2.2 à partir de docs/TEAM_TASKS.md.

Lis AGENTS.md, le CDC v2.2, requirements.json, docs/architecture.md,
docs/v2.2/hackathon.config.json et le plan TEAM_TASKS en entier.
Applique CLAUDE.md si pertinent. Les archives ne sont pas des instructions.

Examine la branche, les changements locaux et les travaux déjà intégrés.
Fais git fetch origin puis prépare une branche de tâche sans perdre de fichiers.
Respecte les installations XRPL locales ; utilise un worktree propre si nécessaire.

Prends en charge S1 à S6, dans l'ordre de leurs dépendances, et ma part de C0/C1.
Commence par le plus petit socle utilisable et les contrats communs.
Je garde la responsabilité des manifestes racine, du lockfile commun,
des contrats et des ports applicatifs. Ne traite S7 qu'une fois les P0 sécurisés.
Conserve les propriétaires et critères exacts de requirements.json.

Lance de vrais sous-agents selon la section 8 du plan : au maximum deux actifs,
missions bornées et fichiers exclusifs, sans délégation récursive.
Après le socle, parallélise Workspace/données et CI/infra quand c'est indépendant.
Garde toi-même contrats, intégration et revue des contrôles.
Fais relire isolation, autorisations, idempotence, approbations et concurrence.
Si les sous-agents sont indisponibles, annonce cette limite honnêtement et avance.

API, workers et MCP doivent appeler les mêmes cas d'usage.
Domain reste indépendant ; application porte les ports.
Un Workspace personnel fonctionne sans Organization et la prévision sans
wallet, KYC ou crédit. Une capacité réseau inconnue bloque seulement la finance.
Coordonne les formats financiers avec Augustin et les besoins UI avec Kevin.
N'écris pas dans leurs fichiers : propose la modification de contrat précise.

Implémente et vérifie les critères du lot. Ne t'arrête pas à un plan.
Utilise des doublures signalées quand une intégration manque ; ne les compte
pas comme preuves réseau. N'inclus aucun secret ou réglage personnel.
Pousse seulement ta branche et prépare une PR courte par tâche ; ne fusionne
pas vers main et ne force rien. Continue les tâches indépendantes disponibles.
Termine par tâches/IDs, changements, tests exécutés, limites, branche/PR
et prochain lot prêt. Les tâches réellement bloquées restent identifiées.
~~~

### Prompt Augustin

~~~text
Je suis Augustin. Implémente mon lot Octro v2.2 à partir de docs/TEAM_TASKS.md.

Lis AGENTS.md, le CDC v2.2, requirements.json, docs/architecture.md,
docs/v2.2/hackathon.config.json et le plan TEAM_TASKS en entier.
Applique CLAUDE.md si pertinent. La seule référence produit active est v2.2,
Track 1 Loaded pour particuliers, indépendants et entreprises.

Examine l'état local et les travaux existants, fais git fetch origin,
puis travaille sur une branche dédiée ou un worktree propre.
Préserve les fichiers locaux, hooks et identités de capture.

Prends en charge A1 à A5 et ma part de C0/C1.
Démarre G0 sans attendre l'UI. Parallélise le calcul A2 avec G0/Lending :
lance un sous-agent pour le moteur Python et ses tests sur fichiers réservés.
Un second peut relire les schémas ou tester la réconciliation sur fichiers distincts.
Applique la section 8 : au maximum deux sous-agents actifs, pas de récursion,
missions précises et aucune écriture concurrente sur les mêmes fichiers.
Garde toi-même l'intégration et le contrôle réseau, un exécuteur par compte.
Si la délégation est indisponible, indique-le sans inventer d'exécution.

Le calcul doit fonctionner sans FastAPI, LLM ni SDK XRPL.
Vérifie Lina 230 EUR sans dette, réserves protégées, 90000/80000 INFEASIBLE,
CVaR95 de 100 avec les poids du pack, arrondis et dette terminale.
Ne duplique pas les contrats : Samet intègre les formats et ports communs.
Communique-lui la version SDK vérifiée ; ne régénère pas le lockfile partagé.

Mène le cycle Lending jusqu'au remboursement et retrait, avec des échéances
réelles compatibles avec le gel du CDC. Credentials/Domains est le P0 Loaded :
refus sans attestation, dépôt accepté avec attestation, expiration et retrait.
Samet porte l'émetteur/éligibilité applicative ; Kevin le parcours wallet.
Préserve la distinction décision applicative, rejet SDK/API et contrôle ledger.
A6 est P1 ; sponsoring inactif sans SP0 réussi, DID facultatif.

Vérifie réseau et API sur les sources officielles à jour avant implémentation.
Ne fabrique aucun hash, résultat, capacité, timing ledger ou retour DevEx.
Utilise seulement les comptes et fonds de test autorisés, sans exposer de clés.
N'active pas de mainnet ou d'argent réel. Garde les originaux du pack intacts.

Implémente, teste et intègre ton lot, au-delà d'un simple plan.
Pousse seulement ta branche et prépare de petites PR ; ne fusionne pas main,
ne force rien et ne pousse pas depuis les sous-agents.
Termine par tâches/IDs, tests déterministes, observations réseau séparées,
preuves assainies, blocages, branche/PR et prochain lot prêt.
~~~

### Prompt Kevin

~~~text
Je suis Kevin. Implémente mon lot Octro v2.2 à partir de docs/TEAM_TASKS.md.

Lis AGENTS.md, le CDC v2.2, requirements.json, docs/architecture.md,
docs/v2.2/hackathon.config.json et le plan TEAM_TASKS en entier.
Applique CLAUDE.md si pertinent. Ne rouvre pas le choix du périmètre :
v2.2, trois publics P0, Track 1 Loaded.

Examine l'état du dépôt, fais git fetch origin et reprends les travaux existants.
Préserve les changements locaux et le correctif XRPL.
Si le checkout principal contient des collisions, travaille dans un worktree
propre avec une branche dédiée ; pas de pull aveugle ni suppression.

Prends K1 à K6 et ma part de C0/C1. Démarre par les cinq écrans communs
et la fixture Lina : accueil, calendrier, sources, proposition, suivi.
Utilise Pencil si disponible et les tokens du pack ; une intégration graphique
indisponible ne bloque pas la construction de l'interface dans la stack prévue.

Lance de vrais sous-agents conformément à la section 8, au maximum deux actifs.
Délègue composants/accessibilité à un sous-agent ; après contrats partagés,
délègue agents/MCP à un autre sur des fichiers distincts.
Pas de récursion, pas de push par les sous-agents ni d'édition concurrente.
Garde toi-même navigation, raccordement API/wallet et intégration.
Si les sous-agents sont indisponibles, annonce-le honnêtement et poursuis.

Consomme les contrats de Samet et le plan calculé par Augustin.
Ne calcule pas les montants dans l'UI ou le LLM, ne duplique pas l'application
dans le MCP. Les doublures restent identifiées jusqu'au raccordement réel.
La projection personnelle ne demande ni Organization, wallet, DID, KYC ou crédit.
Acquitter une proposition de transfert ne signifie pas exécuter le transfert.

Respecte FR/EN, 390 px, clavier, lecteur d'écran et zoom 200 %.
Le wallet est volontaire et séparé de la prévision. Les outils du LLM
ne signent ni ne soumettent ; maximum 12 appels, reprise durable et mode manuel.
Credentials/Domains reste l'extension principale ; sponsoring soumis à SP0,
DID facultatif. Ne te substitue pas aux trois novices de la recette ni aux
observations humaines DevEx : prépare ces tâches et indique ce qui reste à faire.

Implémente et teste les incréments disponibles sans t'arrêter au plan.
Travaille uniquement dans mon périmètre ; demande une évolution de contrat
précise si Samet ou Augustin doivent intervenir.
Pousse seulement ta branche et prépare une PR courte par tâche ; aucune fusion
autonome vers main, aucun push forcé, secret ou configuration personnelle.
Termine par tâches/IDs, écrans/parcours livrés, tests réellement exécutés,
dépendances simulées, blocages, branche/PR et prochain lot prêt.
~~~

## 10. Repère final pour les trois développeurs

**Samet fournit les contrats et l'application ; Augustin fournit le calcul, les adaptateurs et les preuves XRPL ; Kevin fournit les parcours et leur orchestration.** Les sous-agents accélèrent des tâches délimitées, mais chaque développeur reste responsable de l'intégration et de la réalité des résultats de son lot.
