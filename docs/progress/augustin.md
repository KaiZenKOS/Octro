# Progress — Augustin (Octro v2.2)

Branche : `augustin`. Reference : `docs/TEAM_TASKS.md` section 5.

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

## A3 — Cycle Lending V1 : PARTIEL, execute reellement, pas complet

Meme reseau, comptes finances par le faucet, transactions reelles
signees et soumises (voir
`docs/progress/augustin/evidence/a3-vault-broker-loanset-attempt.json`
et `a3-vault-withdraw.json`) :

| Etape | Transaction | Resultat |
| --- | --- | --- |
| Vault ouvert cree | `VaultCreate` (Asset XRP) | `tesSUCCESS`, hash `04FA0A2F...0255` |
| Depot preteur | `VaultDeposit` 50 XRP | `tesSUCCESS`, hash `B21D001B...96D` |
| Courtier configure | `LoanBrokerSet` | `tesSUCCESS`, hash `A1337FEE...86E` |
| Retrait de capital | `VaultWithdraw` 10 XRP | `tesSUCCESS`, hash `72752DB4...F69` |
| Pret accepte | `LoanSet` (emprunteur seul, sans co-signature courtier) | **rejete avant inclusion**, `temBAD_SIGNER` |

Le rejet du `LoanSet` est un vrai refus protocolaire (HACK-03/AC-L04) :
verifie apres coup qu'aucun objet `Loan` n'existe et que le solde de
l'emprunteur est rest identique (1000000000 drops avant/apres). C'est
une preuve honnete de protection du protocole, pas une simulation.

**Non fait, bloque sur du travail restant (pas sur un acces
manquant)** : `LoanSet` necessite la co-signature du proprietaire du
courtier (`CounterpartySignature`, xrpl.js 5.2.0 expose
`signLoanSetByCounterparty` / `combineLoanSetCounterpartySigners` pour
cela) ; ce flux multi-parties n'a pas ete construit. Sans pret accepte,
`LoanPay` (remboursement) et le retrait avec rendement ne peuvent pas
etre exerces honnetement — je ne les ai pas simules. Prochaine etape
concrete : construire le payload `LoanSet` canonique avec expiration,
faire signer par l'emprunteur puis co-signer par le proprietaire du
courtier via l'helper SDK, soumettre, puis rejouer `LoanPay` et
`VaultWithdraw` avec rendement observe.

`packages/xrpl/src/lending-v1.ts` reflete exactement cet etat :
`createVault`, `depositToVault`, `setLoanBroker`, `withdrawFromVault`
sont des adaptateurs verifies ; `acceptLoan`/`repayLoan` retournent
`{ outcome: "unsupported" }` avec la raison ci-dessus au lieu de
pretendre fonctionner.

## A4 — Credentials et Domains : NON EXECUTE (bloque, identifie)

G0 confirme les amendements `Credentials`, `PermissionedDomains` et
`SingleAssetVault` actifs, et que xrpl.js 5.2.0 expose
`CredentialCreate`, `CredentialAccept`, `PermissionedDomainSet`. Le
cycle refus/acceptation/expiration (chapitre 29, AC-L05/L06/L07) n'a
pas ete execute : il faut un compte emetteur dedie et la coordination
avec l'eligibilite applicative de Samet (S5), qui n'existe pas encore
dans ce depot. `packages/xrpl/src/credentials-domains.ts` retourne
`unavailable` avec une raison explicite sur chaque methode plutot que
d'inventer un resultat.

## A5 — Reconciliation et preuves : PARTIEL

Le refus `LoanSet` ci-dessus est deja un cas reconcilie (etat verifie
apres coup, pas de second essai automatique). Le registre de preuves
honnete est dans
`docs/progress/augustin/evidence/demo-evidence.run-2026-09-12.json`,
construit sur le meme schema que `docs/v2.2/demo-evidence.template.json`
(non modifie, conserve intact) mais rempli uniquement de resultats
reellement observes ; toutes les etapes non executees restent `not_run`.
Le contrat wallet avec Kevin (WAL-01) n'a pas encore ete discute.

## A6 — Extensions P1 : NON DEMARRE, comme prevu

DID et sponsoring restent P1. G0 confirme les amendements `Sponsor` et
`DID` actifs, mais SP0 (test reel de sponsoring) n'a pas ete lance —
conformement au plan, A2/A3/A4/A5 restent prioritaires. Non fait pour
ne pas retarder le reste.

## Ce qui est reellement bloque

- **Humain requis** : confirmation mentor que le reseau reste V1 pour
  les nouveaux prets (G0, chapitre 16).
- **Travail restant, pas un acces manquant** : coordination
  multi-signature `LoanSet` (A3), compte emetteur + eligibilite
  applicative pour Credentials/Domains (A4, depend aussi de S5 chez
  Samet), SP0 sponsoring (A6, P1).
- **Dependance externe** : le port de calcul reel depuis
  `packages/application/` (S3) et le contrat wallet avec Kevin (K3)
  ne sont pas dans mon perimetre d'ecriture.

## Fichiers changes

- `services/optimizer/octro_optimizer/` (nouveau) + `tests/` + `README.md`
- `packages/xrpl/src/` (nouveau) + `package.json` + `tsconfig.json`
- `docs/v2.2/hackathon.config.json` (champs G0 completes, structure et
  decisions de perimetre inchangees)
- `docs/progress/augustin.md` (ce fichier) et
  `docs/progress/augustin/evidence/*.json` (preuves reseau reelles,
  sans secret)

## Tests reellement executes

- `cd services/optimizer && python3 -m unittest discover -s tests -v`
  -> 26 tests, tous verts.
- `npx tsc --noEmit` sur `packages/xrpl/src` avec `xrpl@5.2.0` installe
  a titre de verification (hors depot, pas de lockfile ajoute) -> aucune
  erreur de type.
- Transactions reseau listees ci-dessus, chacune avec son hash et son
  lien d'explorateur dans `docs/progress/augustin/evidence/`.

## Prochain lot pret

Construire la co-signature `LoanSet` (A3) pour obtenir un prêt reellement
accepte, decaisse, rembourse et retire avec rendement, ce qui debloquera
aussi le retrait avec rendement de `HACK-02`/`AC-L03`. En parallele,
demarrer A4 des qu'un compte emetteur de test est disponible.
