# Progress — Augustin (Octro v2.2)

Reference : `docs/TEAM_TASKS.md` section 5. A1/A2/A3 furent developpes
sur la branche `augustin` (fusionnee, PR #3). A4 est developpe sur
`feat/augustin-a4-credentials`, a partir de `main` a jour (qui inclut
aussi le socle S1/S2 de Samet, merge #1).

## A1 — G0 et capacites reseau : FAIT

Execute pour de vrai le 2026-09-12 contre le Custom Hackathon Devnet
(`wss://lending-hackathon.dev.ripplex.io:51233`,
`https://lending-hackathon.dev.ripplex.io:51234`), sans wallet ni
credential pre-existante — les comptes de test viennent du faucet du
reseau lui-meme.

- `server_info` : `network_id = 4001`, `build_version = 3.4.0-rc1`,
  `server_state = full`, ledger valide observe au depart `seq 64527`.
- `feature` : 48 amendements actifs, notamment `SingleAssetVault`,
  `LendingProtocol`, `LendingProtocolV1_1`, `Credentials`,
  `PermissionedDomains`, `Sponsor`, `DID`, `fixEmptyDID`.
- SDK verifie par test reel (pas seulement par changelog, conformement
  a AGENTS.md) : `xrpl` **5.2.0** (stable, pas une balise `-beta`).
  Cette version expose nativement les modeles `VaultCreate`,
  `VaultDeposit`, `VaultWithdraw`, `LoanBrokerSet`, `LoanSet`,
  `LoanPay`, `LoanManage`, `LoanDelete`, `CredentialCreate`,
  `CredentialAccept`, `PermissionedDomainSet`.
- Payment de base : deux comptes finances par le faucet, `Payment` de
  10 XRP soumis et confirme valide. Hash
  `9B10C26297515512FC7535E9B31C175C2AA5B0CDEDCEB66F06AC3B6AB61A1A9C`,
  `tesSUCCESS`, ledger `64529`. Lien explorateur dans
  `docs/progress/augustin/evidence/g0-network-and-payment.json`.

**Non fait dans G0** : confirmation mentor explicite que ce reseau
reste V1 pour les nouveaux prets de vault ouvert (la presence de
`LendingProtocolV1_1` a cote de `LendingProtocol` n'a pas ete
discutee avec un mentor). `docs/v2.2/hackathon.config.json` porte
`"mentor_v1_confirmation": "not_obtained_yet"` dans le registre de
preuves ; ce champ reste a lever par un humain, pas par un agent.

`docs/v2.2/hackathon.config.json` a ete mis a jour avec ces faits
observes (`network_id`, `sdk_version`, `ledger_verified`,
`capabilities`) sans changer sa structure ni les decisions de perimetre
(track/flavour/protocol/vault). Ces valeurs sont fournies a Samet pour
le lockfile partage, comme prevu section 2 du plan ; je n'ai pas touche
au lockfile racine (inexistant a ce stade, S1 non demarre).

## A2 — Moteur financier : FAIT (teste, 26/26 tests verts)

`services/optimizer/octro_optimizer/` : pur Python stdlib (`Decimal`
uniquement, zero dependance tierce), aucun FastAPI/LLM/SDK XRPL importe.
Lancer avec `cd services/optimizer && python3 -m unittest discover -s
tests -v`.

Verifie exactement les criteres de sortie prioritaires d'Augustin :

- Lina (docs/v2.2/personal.fixture.json) : transfert propose 230.00 EUR,
  solde courant avant salaire 100.00, apres salaire 1700.00, epargne
  restante 70.00, total 1770.00, dette nouvelle 0.00.
- Epargne protegee a 300 EUR (tout le solde) -> diagnostic
  `INFEASIBLE_NO_DEBT` sans transfert invente, contrainte bloquante
  `savings_protected_reserve` explicite.
- Besoin 90000 / plafond 80000 -> `INFEASIBLE`, deficit 10000.00, aucune
  action.
- CVaR95 sur pertes [0,0,100], poids [0.80,0.15,0.05] -> 100 exactement
  (formulation Rockafellar-Uryasev, forme fermee pour scenarios
  discrets).
- Exemple chapitre 14 (offres A 4.2%/60000 plafonnee, B 4.8%) -> cout
  combine 16.27, B seule 17.75, gain 1.48, memes chiffres que le CDC.
- Dette terminale a H72 : un principal partiellement rembourse dans
  l'horizon reste un `terminal_debt` explicite, jamais remis a zero.
- Reproductibilite (ENG-01) : meme fixture -> meme `plan_id` et meme
  trace de solde (hash du snapshot inclus dans `plan_id`).
- `octro_optimizer/schema.py` construit/valide un
  `OctroActionPlanProposal` (`docs/v2.2/plan.schema.json`,
  `schema_version: "2.1"`, `execution_mode: "proposal_only"`) ; le
  proposal genere pour Lina est **identique** a
  `docs/v2.2/plan.example.json` (verifie par test).

**Non fait** : le raccordement reel au port de calcul depuis
`packages/application/` (S3, Samet), l'horizon professionnel 72h avec
plusieurs preteurs concurrents au-dela de l'exemple pedagogique, et
l'appel FastAPI en transport (hors perimetre du moteur lui-meme, voir
architecture.md).

## A3 — Cycle Lending V1 : FAIT, cycle complet reellement execute

Meme reseau, comptes finances par le faucet, transactions reelles
signees et soumises (voir `docs/progress/augustin/evidence/
a3-vault-broker-loanset-attempt.json`, `a3-vault-withdraw.json` et
`a3-loan-full-cycle.json`) :

| Etape | Transaction | Resultat |
| --- | --- | --- |
| Vault ouvert cree | `VaultCreate` (Asset XRP) | `tesSUCCESS`, hash `04FA0A2F...0255` |
| Depot preteur | `VaultDeposit` 50 XRP | `tesSUCCESS`, hash `B21D001B...96D` |
| Courtier configure | `LoanBrokerSet` | `tesSUCCESS`, hash `A1337FEE...86E` |
| Retrait de capital (avant le pret) | `VaultWithdraw` 10 XRP | `tesSUCCESS`, hash `72752DB4...F69` |
| Pret tente sans co-signature | `LoanSet` (emprunteur seul) | **rejete avant inclusion**, `temBAD_SIGNER` |
| **Pret accepte (coordonne)** | `LoanSet` (emprunteur signe, puis le proprietaire du courtier co-signe) | `tesSUCCESS`, hash `693C846F...6FE2` |
| Decaissement | effet de bord du `LoanSet` valide, pas de transaction separee | confirme par les soldes (voir plus bas) |
| Remboursement tente en solde total | `LoanPay` (`Amount` = `TotalValueOutstanding` arrondi, `Flags = tfLoanFullPayment`) | inclus dans un ledger valide puis **annule**, `tecKILLED` |
| **Remboursement reel** | `LoanPay` (meme `Amount`, `Flags = 0`) | `tesSUCCESS`, hash `EA2B4816...A3C1F1`, pret ferme |
| **Retrait avec rendement reel** | `VaultWithdraw` du solde disponible post-remboursement | `tesSUCCESS`, hash `9522A975...E173B` |

Le premier rejet `LoanSet` (`temBAD_SIGNER`) reste conserve comme
preuve honnete de protection du protocole (HACK-03/AC-L04) : verifie
apres coup qu'aucun objet `Loan` n'existait alors et que le solde de
l'emprunteur etait reste identique.

**Comment la co-signature a ete obtenue** : l'emprunteur signe la
transaction normalement (`wallet.sign(prepared)`), puis le proprietaire
du courtier co-signe le meme `tx_blob` avec l'aide SDK
`signLoanSetByCounterparty` (xrpl.js 5.2.0) ; le blob final co-signe est
soumis directement (pas besoin de `combineLoanSetCounterpartySigners`
avec un seul co-signataire). Sans cette co-signature, `autofill` calcule
quand meme un `Fee` majore pour le nombre de signataires attendus par le
courtier (avertissement SDK explicite), mais rippled rejette toujours la
transaction faute de signature reelle.

**Decaissement confirme par effet, pas par transaction dediee** : ce
build SDK/reseau ne fait apparaitre aucune transaction `Drawdown`
separee. Le decaissement est verifie par delta de solde : emprunteur
`1000000000 -> 1009999976` drops (+10 XRP moins frais), vault
`AssetsAvailable` `40000000 -> 30000000` drops (-10 XRP), `AssetsTotal`
inchange (le principal preté reste compte comme actif du vault tant
qu'il est en cours).

**Le remboursement a d'abord echoue avec `tecKILLED`** (« No funds
transferred and no offer created »), inclus dans un ledger valide donc
facturé, en utilisant `Amount = TotalValueOutstanding` (valeur arrondie
affichee par le ledger, `10001370` drops) avec `Flags =
tfLoanFullPayment`. Le meme montant sans ce flag (`Flags = 0`) a reussi
et a ferme le pret (le `Loan` a perdu `PrincipalOutstanding` /
`TotalValueOutstanding` / `PaymentRemaining` / `NextPaymentDueDate` et a
gagne `PreviousPaymentDueDate`). Hypothese la plus probable : le vrai
montant de solde est `PeriodicPayment` non arrondi
(`10001369.86301369963` drops, non representable en entier), et
`tfLoanFullPayment` exige une correspondance exacte que la valeur
arrondie ne satisfait pas. Retenu comme friction reseau/SDK reelle,
signalee separement via le hook DevEx de cette session.

**Rendement reellement constate** : apres remboursement, le vault
affichait `AssetsAvailable = AssetsTotal = 10001370` drops. Le
proprietaire a retire ce solde integral ; son solde a augmente de
`977999940` a `988001298` drops (+10001358 net de 12 drops de frais).
Le delta de 1370 drops (~0.00137 XRP) au-dessus du principal de
10 000 000 drops correspond a l'interet reellement du :
`10 000 000 * 5% annuel * 1/365 jour = 1369.86`, arrondi a 1370 par le
ledger — un rendement constate, pas suppose.

**Note d'ordre de script** : un retrait intermediaire (`VaultWithdraw`
de 30 000 000 drops, avant la reussite du remboursement) a ete fait par
erreur de sequencement de script entre les deux tentatives de
`LoanPay`. C'etait un retrait de capital disponible, pas un retrait de
rendement ; il est documente separement (`a3-vault-withdraw.json`) et
n'affecte pas la coherence comptable du cycle final (verifiee ci-dessus).

`packages/xrpl/src/lending-v1.ts` reflete cet etat verifie :
`createVault`, `depositToVault`, `setLoanBroker`, `acceptLoan`,
`repayLoan`, `withdrawFromVault` sont tous des adaptateurs reels et
testes (voir le header du fichier pour le detail des deux frictions
`temBAD_SIGNER`/`tecKILLED` et leur solution).

**Calendrier de paiements multiples, verifie reellement** (voir
`docs/progress/augustin/evidence/a3-multipayment-schedule.json`) : un
second pret independant avec `PaymentTotal: 3` a ete accepte
(`tesSUCCESS`), puis un seul des trois paiements programmes a ete
regle. Le `Loan` montre `PaymentRemaining` passer de `3` a `2` et
`PrincipalOutstanding` passer de `30000000` a `20000058` drops — la
dette restante ne disparait jamais, elle est correctement decrementee
(`ENG-05` observe sur reseau reel, pas seulement en deterministe dans
`services/optimizer`). Friction reelle rencontree au passage :
`PaymentInterval: 60` (le minimum accepte cote client par
`validateLoanSet` dans xrpl.js) a ete rejete par rippled lui-meme avec
`temINVALID` ; `PaymentInterval: 3600` a fonctionne. Le minimum reel
appliqué par ce build est donc plus eleve que le minimum verifie
cote SDK — a traiter comme non normatif tant que confirme autrement.

**`tfLoanFullPayment` avec le montant non arrondi** : non re-teste
(reste ouvert, priorite plus basse que ce qui precede).

## A4 — Credentials et Domains : FAIT, cycle complet reellement execute

Contrairement a l'estimation initiale, ceci n'attendait pas S5 (Samet) :
le controle applicatif d'eligibilite (S5) et le controle ledger
Credentials/Domains (A4) sont separables, exactement comme le chapitre
29 le distingue ("enforcement = application ou ledger"). Execute pour
de vrai le 2026-09-12 avec un emetteur, un sujet et un proprietaire de
vault, tous finances par le faucet (voir
`docs/progress/augustin/evidence/a4-credentials-domains-full-cycle.json`) :

| Etape | Transaction | Resultat |
| --- | --- | --- |
| Domaine cree | `PermissionedDomainSet` (`AcceptedCredentials` = emetteur + type) | `tesSUCCESS` |
| Vault prive gate par ce domaine | `VaultCreate` (`Flags=tfVaultPrivate`, `DomainID`) | `tesSUCCESS` |
| Depot refuse sans attestation | `VaultDeposit` par un sujet sans credential | **`tecNO_AUTH`** |
| Attestation emise | `CredentialCreate` (emetteur -> sujet, `Expiration` a +90s) | `tesSUCCESS` |
| Attestation acceptee | `CredentialAccept` (sujet) | `tesSUCCESS` |
| Depot accepte avec attestation | meme `VaultDeposit`, rejoue | **`tesSUCCESS`** |
| Nouveau depot apres expiration | `VaultDeposit` (1 XRP) apres passage de `Expiration` | **`tecEXPIRED`** |
| Retrait des parts existantes apres expiration | `VaultWithdraw` des parts obtenues avant expiration | **`tesSUCCESS`** |

Cela couvre exactement LOAD-01 (refus sans attestation puis acceptation
avec attestation reconnue) et LOAD-03 (expiration observee, sortie des
parts existantes non bloquee — chapitre 29 : « Ne pas bloquer
arbitrairement la sortie »), avec des codes reseau distincts et
authentiques pour chaque cas (`tecNO_AUTH`, `tesSUCCESS`, `tecEXPIRED`).

**Decouverte de mapping de champ non documentee** : le champ `DomainID`
de `VaultCreate` n'apparait PAS sur l'entite ledger `Vault` elle-meme.
Verifie via `vault_info` et `ledger_entry` des deux cotes : `DomainID`
se retrouve sur l'objet `MPTokenIssuance` des **parts** du vault
(`vault.shares.DomainID`). Gater un vault par domaine revient en realite
a gater l'emission des parts (MPT) du vault, ce que `VaultDeposit`
exige ensuite implicitement. Ce n'est pas suppose depuis le CDC : c'est
observe directement sur ce build, conformement a AGENTS.md (« Les noms
de champs non verifies ne sont pas des contrats normatifs »).

**Friction reseau reelle rencontree et corrigee** : la toute premiere
tentative de `PermissionedDomainSet` est restee bloquee indefiniment
(`submit` preliminaire `tesSUCCESS`, jamais validee). Cause : le compte
venait d'etre finance par le faucet et `autofill` a lu son `Sequence`
avant que le paiement de financement lui-meme soit valide, choisissant
un `Sequence` desormais impossible a atteindre (le compte a demarre a
la sequence suivante). Corrige en attendant la confirmation du compte
sur le ledger valide (`account_info` avec `ledger_index:'validated'`)
avant toute premiere transaction depuis un compte fraichement finance.

`packages/xrpl/src/credentials-domains.ts` implemente desormais
`issueCredential`, `acceptCredential`, `bindDomainToVault` (via
`VaultSet`, cible sur un vault existant — non re-teste sous cette forme
precise cette session, contrairement au chemin `VaultCreate` ci-dessus
qui l'a ete integralement) et `evaluateDepositEligibility` (lecture
seule, verifie si le deposant detient une attestation acceptee et non
expiree correspondant au domaine du vault — pre-controle applicatif,
distinct du controle ledger que `VaultDeposit` applique de toute facon).

**`bindDomainToVault` via `VaultSet` sur un vault deja existant,
verifie reellement** (voir `docs/progress/augustin/evidence/
a4-vaultset-domain-binding.json`) : creer d'abord un vault PUBLIC
(sans `DomainID`) puis lui attacher un domaine par `VaultSet` a echoue
avec `tecNO_PERMISSION`. Isole la cause par un second essai : creer un
vault PRIVE (`Flags: tfVaultPrivate`) sans depot prealable, puis
`VaultSet` avec `DomainID` a reussi (`tesSUCCESS`), et un depot sans
attestation a ensuite ete refuse `tecNO_AUTH` comme attendu. Conclusion
verifiee (pas supposee) : attacher un domaine a un vault, que ce soit a
la creation ou via `VaultSet`, exige que le vault soit prive. L'effet
du depot prealable sur un `VaultSet` de domaine n'a pas ete isole
separement (variable non testee).

**Reste a faire sur A4** : multiples emetteurs/types acceptes sur un
meme domaine ; coordination avec S5 de Samet pour que la decision
d'eligibilite emprunteur (distincte de l'eligibilite deposant testee
ici) soit elle aussi separee ledger vs application (LOAD-02/AC-L06,
hors perimetre Augustin).

## A5 — Reconciliation et preuves : PARTIEL

Le refus `LoanSet` ci-dessus est deja un cas reconcilie (etat verifie
apres coup, pas de second essai automatique). Le registre de preuves
honnete est dans
`docs/progress/augustin/evidence/demo-evidence.run-2026-09-12.json`,
construit sur le meme schema que `docs/v2.2/demo-evidence.template.json`
(non modifie, conserve intact) mais rempli uniquement de resultats
reellement observes ; toutes les etapes non executees restent `not_run`.
Le contrat wallet avec Kevin (WAL-01) n'a pas encore ete discute.

## A6 — Extensions P1 : FAIT (SP0 et DID-01), reellement execute

Demarre seulement une fois A2/A3/A4/A5 securises, comme prevu par le
plan. Les deux volets P1 sont verifies pour de vrai.

### SP0 et sponsoring (SPON-01)

Voir `docs/progress/augustin/evidence/a6-sponsorship-sp0.json`. Un
`Payment` de 7 XRP soumis par un sponsee, avec ses frais entierement
pris en charge par un compte sponsor distinct :

- Construction/`autofill` normaux du `Payment` par le sponsee.
- `xrpl.addPreFundedSponsor(tx, sponsorAddress, SponsorFlags.spfSponsorFee)`
  ajoute les champs `Sponsor`/`SponsorFlags` **avant** signature (pas de
  `SponsorshipSet`/`SponsorshipTransfer` prealable necessaire pour ce
  parrainage de frais ponctuel).
- Le sponsee signe (`wallet.sign`, couvre aussi les champs sponsor).
- Le sponsor co-signe avec `xrpl.signAsSponsor` (meme mecanique que la
  co-signature `LoanSet`, mais pour `SponsorSignature`).
- Soumission : `tesSUCCESS`, hash
  `B186A401257646F0501DF3504806404BEFB40127B0D7F04A3B2CE121104B9AC5`.

Preuve verifiee par delta de solde, pas seulement par le statut de
soumission (chapitre 30 : « Une simple alimentation XRP depuis le
faucet n'est pas une preuve de sponsoring natif ») : le sponsor a perdu
exactement `12` drops (le frais reseau) et le sponsee a perdu
exactement `7000000` drops (le montant du paiement, **zero** frais
preleve sur son compte). C'est un vrai sponsoring de frais natif au
niveau protocole.

`quoteSponsoredOperation` (budget/plafond applicatif, SPON-02/SPON-03)
reste `unavailable` : cette politique vit dans PostgreSQL sous le S7 de
Samet, hors perimetre Augustin. Le sponsoring natif lui-meme
(`sponsorPaymentFee`) est verifie et implemente dans
`packages/xrpl/src/sponsorship.ts`.

### DID (DID-01, facultatif)

Voir `docs/progress/augustin/evidence/a6-did-resolution-and-replay.json`.
Cycle complet reel :

| Etape | Resultat |
| --- | --- |
| `DIDSet` (publication) | `tesSUCCESS` |
| Resolution (`ledger_entry` par `did:<adresse>`) | document identique a celui publie |
| Rejeu avec un `NetworkID` errone | **`telWRONG_NETWORK`** (rejete) |
| Rejeu signe par un compte tiers (mauvais signataire) | **`tefBAD_AUTH`** (rejete) |
| Etat du DID apres les deux rejets | toujours present, inchange |

Couvre exactement DID-01 : « Resolution valide ; replay mauvais reseau
et mauvais signataire refuses. » Un premier essai avec un document
W3C complet (`verificationMethod`, `@context`, etc.) a ete rejete
`temMALFORMED` : `DIDDocument`/`URI` sont des champs Blob a taille
maximale reelle limitee sur ce build (non documentee dans les types du
SDK), reduits a un document minimal qui passe. Aucun DID ne prouve a
lui seul une solvabilite ou une eligibilite (chapitre 17) ; cet
adaptateur ne fait que publier/resoudre.

`packages/xrpl/src/did.ts` (nouveau) implemente `publishDid` et
`resolveDid` sur cette base verifiee.

## Integration reelle proposee : `NetworkCapabilitiesPort` (pas une modification du fichier de Samet)

`main` a beaucoup avance depuis A6 : S1/S2 de Samet fusionnes,
K1-K6 de Kevin (dont un vrai K3 wallet d'apres `docs/progress/kevin.md`),
`packages/agents`/`packages/mcp` ajoutes. `packages/xrpl` est desormais
reference par le `tsconfig.json` racine et compile dans le graphe
complet (`npm run build`/`npm run ci` integralement verts, toutes les
suites de tests du monorepo comprises).

En inspectant `packages/application/src/ports/network-capabilities-port.ts`,
son propre commentaire dit : « L'adaptateur reel interroge XRPL apres
G0 (Augustin, A1) ». C'est desormais possible pour de vrai : ce port
attend un objet `NetworkCapabilities` (`@octro/contracts`) dont le champ
`capabilities` est un enum strict `verified | unverified | unsupported`
— mes valeurs precedentes dans `docs/v2.2/hackathon.config.json`
(chaines descriptives comme `"verified_full_cycle_..."`) ne validaient
PAS ce schema. Corrige : `capabilities` porte desormais l'enum strict,
le detail descriptif est deplace dans un nouveau champ
`capability_notes` (avec reference au fichier de preuve exact pour
chaque capacite), et un `checked_at` reel est ajoute.

Ajoute `packages/xrpl/src/contract-network-capabilities.ts` :
`toContractNetworkCapabilities()` (mapping pur) et
`loadVerifiedNetworkCapabilitiesFromFile()` (lit et valide
`docs/v2.2/hackathon.config.json` contre `NetworkCapabilitiesSchema`,
echoue fort plutot que silencieusement si le format derive). Verifie
reellement : execute contre le vrai fichier du depot, retourne un objet
valide (`network_id: 4001`, `sdk_version: "5.2.0"`, `ledger_verified:
true`, les six capacites a `"verified"`, `checked_at` reel).

**Proposition precise pour Samet** (pas une ecriture dans son fichier) :
dans `apps/api/src/composition.ts`, remplacer

```ts
const capabilities = new StaticNetworkCapabilitiesAdapter(UNVERIFIED_HACKATHON_CAPABILITIES);
```

par

```ts
import { loadVerifiedNetworkCapabilitiesFromFile } from "@octro/xrpl";
const capabilities = new StaticNetworkCapabilitiesAdapter(
  loadVerifiedNetworkCapabilitiesFromFile(
    path.resolve(import.meta.dirname, "../../../docs/v2.2/hackathon.config.json")
  )
);
```

`StaticNetworkCapabilitiesAdapter` n'a besoin d'aucun changement : il
retourne deja tel quel l'objet `NetworkCapabilities` qu'on lui passe au
constructeur. Effet sur les consommateurs : `ApproveFinancingActionUseCase`
(et `isCapabilityUsable`) verraient alors les capacites reellement
verifiees au lieu de l'etat `unverified` fige — exactement ce que
`NET-02` demande une fois G0 (et maintenant A2-A6) fait, sans jamais
fabriquer un succes.

`OptimizerPort.forecastPersonal` n'a pas d'equivalent propose : sa
forme (`Projection`, marche de solde deterministe) ne correspond pas a
la sortie de mon moteur A2 (`NoDebtPlan`/`NoDebtDiagnostic`, une
decision d'action, pas une marche de solde). Brancher reellement A2
demande soit un nouveau port cote application (proposition a faire a
Samet avec champs precis, pas une reecriture unilaterale), soit un
appel du Python depuis Node — non fait ici, notee comme prochaine
etape de coordination plutot que resolue seule.

## Ce qui est reellement bloque

- **Humain requis** : confirmation mentor que le reseau reste V1 pour
  les nouveaux prets (G0, chapitre 16). Seul point technique encore
  ouvert sur l'ensemble A1-A6.
- **Dependance externe, hors perimetre Augustin** : le vrai branchement
  d'`OptimizerPort` a A2 (necessite une decision de contrat cote
  Samet, pas juste un adaptateur), l'eligibilite emprunteur applicative
  (S5, Samet, LOAD-02) et le budget/plafond de sponsoring applicatif
  (SPON-02/03, Samet, S7).
- **Reste, priorite basse, non bloquant** : `tfLoanFullPayment` avec le
  montant non arrondi exact (A3) ; multiples emetteurs/types sur un
  meme domaine (A4).

## Fichiers changes

- `services/optimizer/octro_optimizer/` (nouveau) + `tests/` + `README.md`
- `packages/xrpl/src/` (nouveau, puis aligne au monorepo reel de Samet
  apres le merge de main : `tsconfig.json` etend `tsconfig.base.json`,
  `package.json` suit la convention des paquets freres, imports
  relatifs en `.js` pour la resolution `NodeNext`)
- `docs/v2.2/hackathon.config.json` (champs G0 puis capacites
  Credentials/Domains/Lending V1/Sponsorship/DID completes ; ensuite
  corrige pour respecter l'enum strict de `NetworkCapabilitiesSchema`
  de Samet, detail deplace dans `capability_notes`, `checked_at`
  ajoute — structure et decisions de perimetre inchangees)
- `packages/xrpl/src/contract-network-capabilities.ts` (nouveau) :
  mapping reel vers `@octro/contracts`, propose a Samet pour
  `apps/api/src/composition.ts` (aucun fichier de Samet modifie)
- `docs/progress/augustin.md` (ce fichier) et
  `docs/progress/augustin/evidence/*.json` (preuves reseau reelles,
  sans secret)

## Tests reellement executes

- `cd services/optimizer && python3 -m unittest discover -s tests -v`
  -> 26 tests, tous verts.
- `npx tsc -p packages/xrpl/tsconfig.json --noEmit` avec le
  `typescript@^5.6.3` reellement installe par le workspace racine (pas
  une copie isolee) -> aucune erreur de type.
- `npm run ci` a la racine apres le merge de main (S1/S2 Samet + K1-K6
  Kevin + agents/mcp) -> `npm run build` et les 5 suites de tests de
  l'ensemble du monorepo restent vertes.
- `loadVerifiedNetworkCapabilitiesFromFile()` execute reellement contre
  le vrai `docs/v2.2/hackathon.config.json` du depot -> objet
  `NetworkCapabilities` valide selon `NetworkCapabilitiesSchema` de
  Samet (verifie par `zod.parse`, pas seulement par inspection).
- `scripts/scan-secrets.sh` : signale toujours les memes faux positifs
  preexistants sur des hash `sha512-...` d'integrite npm dans
  `package-lock.json` (deja presents sur `main` avant ce lot, non
  introduits ici — signale a Samet separement, fichier hors perimetre
  Augustin).
- Transactions reseau listees ci-dessus, chacune avec son hash et son
  lien d'explorateur dans `docs/progress/augustin/evidence/`, y compris
  le cycle de pret complet (`a3-loan-full-cycle.json`), le calendrier
  de paiements multiples (`a3-multipayment-schedule.json`), le cycle
  Credentials/Domains complet (`a4-credentials-domains-full-cycle.json`),
  la liaison de domaine via `VaultSet` (`a4-vaultset-domain-binding.json`),
  le sponsoring SP0 (`a6-sponsorship-sp0.json`) et le cycle DID
  (`a6-did-resolution-and-replay.json`).

## Prochain lot pret

A1 (sauf confirmation mentor), A2, A3, A4, A5 (dans la mesure du
perimetre Augustin) et A6 sont maintenant complets et verifies
reellement — plus rien de nouveau, executable en solo, ne reste dans
`docs/TEAM_TASKS.md` section 5 pour Augustin. La suite naturelle est la
revue croisee, pas du nouveau travail reseau solo : avec Samet
(branchement reel de `packages/xrpl` derriere les ports de
`packages/application/`, coordination S5 pour LOAD-02, S7 pour
SPON-02/03) et avec Kevin (contrat wallet WAL-01, des que K3 demarre).
