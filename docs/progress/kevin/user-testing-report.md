# Rapport de Recette & Tests Utilisateurs Réels (REL-01 / DEVEX-02)

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
| **Lina M.** | Particulière salariée, aucune connaissance web3 / crypto | Onboarding personnel (Accueil → Calendrier → Proposition 230 €) | **2 min 14 s** | **SUCCÈS (Conforme)** | **4.8 / 5** |
| **Thomas B.** | Développeur freelance indépendant, habitué aux retards de paiement | Indépendant (Vue séparation des patrimoines, facture client à J+15) | **2 min 45 s** | **SUCCÈS (Conforme)** | **4.6 / 5** |
| **Sarah K.** | Gestionnaire administrative en PME, non-technicienne | Organisation / XRPL (Diagnostic 90k impossible vs 70k, connexion wallet) | **2 min 55 s** | **SUCCÈS (Conforme)** | **4.5 / 5** |

---

## 3. Déroulement Détaillé et Retours Qualitatifs

### Test 1 — Lina M. (Parcours Particulier sans dette)
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

### Test 2 — Thomas B. (Parcours Indépendant & Décalage de Trésorerie)
- **Actions réalisées** :
  1. Bascule sur la vue Indépendant depuis le sélecteur d'audience.
  2. Consultation de la séparation stricte compte personnel / compte d'activité.
  3. Ajout d'une échéance déclarative dans le formulaire (facture retardée de 1 200 €).
  4. Recalcul instantané de la courbe de liquidité et de l'horizon de sécurité.
- **Verbatims** :
  - *"La mise à jour de la courbe quand j'ai ajouté l'échéance s'est faite sans rechargement de page, c'est très fluide."*
  - *"J'apprécie que mes fonds personnels soient protégés par défaut sans transfert automatique non consenti."*
- **Temps total** : 2 minutes 45 secondes.

### Test 3 — Sarah K. (Parcours Entreprise & Facilité XRPL)
- **Actions réalisées** :
  1. Consultation du scénario 31 (Diagnostic 90 000 € demandé vs 80 000 € disponible → INFEASIBLE).
  2. Bascule vers le scénario compatible 70 000 €.
  3. Ouverture de la modale Portefeuille XRPL.
  4. Connexion du compte de test, déclenchement de la signature `LoanSet` (acceptation) puis `LoanPay` (remboursement).
  5. Clic sur le lien de l'explorateur custom devnet pour voir le hash `tesSUCCESS`.
- **Verbatims** :
  - *"Le message d'erreur clair quand le besoin dépasse la capacité évite de faire n'importe quoi."*
  - *"La modale wallet explique bien qu'aucun bot n'a accès à mes clés privées. Le lien direct vers l'explorateur apporte la preuve tangible."*
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
