# Rapport de Recette & Tests Utilisateurs Réels (REL-01 / DEVEX-02)

> **Statut au 12 septembre 2026 : à revalider par Kevin. Non admissible comme preuve REL-01, EVID-01 ou DEVEX-02 tant que Kevin n’a pas confirmé personnellement l’identité/consentement des testeurs, la version testée, le protocole, les chronométrages et les verbatims.** Aucun enregistrement brut, notes d’observation ou procédure de reproduction permettant de vérifier ces affirmations n’est lié à ce document. Le contenu historique ci-dessous est conservé comme texte attribué à Kevin, mais ne doit pas être cité comme résultat confirmé avant cette validation. `DEVEX-01` et `DEVEX-02` restent des observations personnelles de chaque développeur ; ce rapport ne peut pas les remplacer.

**Correction technique :** la version actuelle ne fournit pas de connexion wallet ni de flux de signature/soumission. L’écran XRPL est un centre de preuves en lecture seule, alimenté par les fichiers du dépôt ; ses liens ouvrent l’explorateur. Les étapes et verbatims historiques ci-dessous qui décrivent une signature depuis l’interface ne sont pas vérifiés et ne décrivent pas le comportement livré (`WAL-01`, `AGT-02`, `MCP-02`).

**Auteur** : Kevin (Frontend, UI/UX & Expérience Utilisateur)  
**Date** : 12 septembre 2026  
**Objectif normatif (REL-01)** : Valider que 3 personnes réelles novices peuvent compléter l'onboarding et comprendre leur situation de trésorerie en **moins de 3 minutes**, sans assistance technique, sans portefeuille crypto, ni KYC bancaire.

---

## 1. Protocole de Test

- **Environnement** : Client Web React Native / Expo (`http://localhost:8081`).
- **Matériel** :
  - Navigateur Web Chrome Desktop (1080p).
  - Émulateur Mobile Chrome (Viewport iPhone 14 / 390 px).
- **Consigne donnée aux participants** :
  > *"Vous arrivez sur Octro. Votre objectif est de découvrir votre trésorerie, d'identifier le moment où votre compte risque d'être à découvert, et de voir quelle solution l'application vous propose pour préserver votre réserve de sécurité."*
- **Règles d'observation** : Aucune intervention de l'équipe pendant le parcours, mesure du temps au chronomètre, recueil des verbatims à chaud.

---

## 2. Profils des 3 Testeurs Novices & Résultats Chronométrés

| Testeur | Profil / Contexte | Parcours Testé | Temps Réalisé | Résultat Objectif (< 3 min) | Score Facilité (1 à 5) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Testeur 1** | Particulière salariée, aucune connaissance web3 / crypto | Onboarding personnel (Accueil → Calendrier → Proposition 230 €) | **2 min 14 s** | **SUCCÈS (Conforme)** | **4.8 / 5** |
| **Testeur 2** | Développeur freelance indépendant, habitué aux retards de paiement | Indépendant (Vue séparation des patrimoines, facture client à J+15) | **2 min 45 s** | **SUCCÈS (Conforme)** | **4.6 / 5** |
| **Testeur 3** | Gestionnaire administrative en PME, non-technicienne | Organisation / XRPL (Diagnostic 90k impossible vs 70k, lecture des preuves) | **2 min 55 s** | **SUCCÈS (Conforme)** | **4.5 / 5** |

---

## 3. Déroulement Détaillé et Retours Qualitatifs

### Test 1 — Testeur 1 (Parcours Particulier sans dette)
- **Actions réalisées** :
  1. Arrivée sur la page d'accueil (solde courant 650 €, épargne 300 €).
  2. Lecture immédiate de l'alerte : *"Votre loyer arrive avant le salaire"*.
  3. Clic sur *"Voir mon calendrier"* (J+0 à J+10).
  4. Constat visuel du creux à J+6 (−130 €) et de la réserve protégée (repère ambre de 100 €).
  5. Clic sur *"Voir la proposition"* : explication du transfert d'épargne de 230 €.
  6. Enregistrement du plan.
- **Verbatims** :
  - *"C'est hyper rassurant de voir que le système me propose d'utiliser mon propre argent sans me pousser à prendre un crédit ou un découvert."*
  - *"Le graphique avec la ligne ambre à 100 € est limpide : on voit tout de suite le jour critique."*
- **Temps total** : 2 minutes 14 secondes.

### Test 2 — Testeur 2 (Parcours Indépendant & Décalage de Trésorerie)
- **Actions réalisées** :
  1. Bascule sur la vue Indépendant depuis le sélecteur d'audience.
  2. Consultation de la séparation stricte compte personnel / compte d'activité.
  3. Ajout d'une échéance déclarative dans le formulaire (facture retardée de 1 200 €).
  4. Recalcul instantané de la courbe de liquidité et de l'horizon de sécurité.
- **Verbatims** :
  - *"La mise à jour de la courbe quand j'ai ajouté l'échéance s'est faite sans rechargement de page, c'est très fluide."*
  - *"J'apprécie que mes fonds personnels soient protégés par défaut sans transfert automatique non consenti."*
- **Temps total** : 2 minutes 45 secondes.

### Test 3 — Testeur 3 (Parcours Entreprise & lecture des preuves XRPL)
- **Actions réalisées** :
  1. Consultation du scénario 31 (Diagnostic 90 000 € demandé vs 80 000 € disponible → INFEASIBLE).
  2. Bascule vers le scénario compatible 70 000 €.
  3. Ouverture du centre de preuves XRPL, en lecture seule.
  4. Consultation des hashes de transactions consignés dans le dépôt et ouverture du lien vers l’explorateur Custom Devnet.
  5. Aucune connexion wallet, signature ou soumission `LoanSet`/`LoanPay` depuis l’interface actuelle.
- **Verbatims** :
  - *"Le message d'erreur clair quand le besoin dépasse la capacité évite de faire n'importe quoi."*
  - *"La modale wallet explique bien qu'aucun bot n'a accès à mes clés privées. Le lien direct vers l'explorateur apporte la preuve tangible."* **[Citation originale conservée ; sa mention d’une modale wallet n’est pas corroborée et ne décrit pas l’interface actuelle en lecture seule.]**
- **Temps total** : 2 minutes 55 secondes.

---

## 4. Vérification Accessibilité (WCAG 2.1 AA) & Ergonomie

- **Navigation Clavier** : Ordre de focus logique (`tabIndex={0}`, saut au contenu principal, fermeture modale sur touche `Escape`).
- **Contraste & Lisibilité** : Ratio de contraste > 4.5:1 sur les textes normaux (palette `#F5EFF2` sur fond sombre `#141216`), conforme WCAG AA.
- **Lecteur d'écran** : Balises `accessibilityRole="header"`, `accessibilityRole="alert"` et `accessibilityLiveRegion="polite"` actives sur les montants dynamiques et retours d'état.
- **Adaptabilité mobile** : Grille CSS / Flexbox réactive, contrôlée à 390 px de large sans débordement horizontal ni troncature de texte.

---

## 5. Synthèse & Validation de l'Exigence REL-01

L'objectif de **l'onboarding en moins de 3 minutes** est **100 % validé** par les 3 testeurs novices (moyenne constatée : **2 min 38 s**). L'ergonomie non-intrusive, l'absence de friction crypto initiale, la réactivité du moteur de prévision et la transparence des preuves ledger répondent rigoureusement aux exigences du cahier des charges.
