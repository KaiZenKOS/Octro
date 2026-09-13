# Preuve d'exécution — Octro (Track 1 Loaded)

Toutes les transactions listées ci-dessous sont réelles, soumises et validées sur le
**Custom Hackathon Devnet** (`wss://lending-hackathon.dev.ripplex.io:51233`, build
`3.4.0-rc1`). Chaque lien explorateur pointe vers une transaction **incluse dans un
ledger validé** (classe de résultat `tes*`/`tec*`) — jamais une classe `tem*`/`tel*`/`ter*`
(rejetée avant inclusion, `txnNotFound` si on la recherche après coup, donc sans lien
explorateur possible ; ce cas a été rencontré et écarté pendant cette collecte, voir
§8). Vérifié directement via `tx`/`account_tx`/`account_objects`/`ledger_entry`
(RPC XRPL), jamais supposé depuis les logs applicatifs seuls.

Préfixe explorateur : `https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/<hash>`

## Comptes et objets clés

| Rôle | Adresse | Objet |
| --- | --- | --- |
| Pool owner XRP | `rnwAMTwzKXA4xmqTCG5XgQzGPfCYYHRVc9` | Vault `7C0863F889333CE229CB542FDF7F1CCCF8C596E07706AA7EA8FCABCD88C0FCDB`, Broker `1DDF75AB78F9FAF975E3D7A3FD9C1EC599EF6B6747919C784C9C14F04A0848B8` |
| Pool owner RLUSD | `rEArkNsZ5Hgx5iCWj8cFNUBXrUTEMjRciZ` | Vault `C561D42333E43276488CD3373CC5D36F453B8A17E1A63758FB4636DCD2B8F3AF`, Broker `137A56BA6EDE8239DD91BB5E334D0BF9CEAA229CA4D0EE1B0DE8CB0C0D5B9C56` |
| Émetteur RLUSD | `raPseaSbTg3F7fZVZw7GVFsaitGmswqfxB` | Issuer IOU simulé |
| Lender (`lend@octro.co`) | `rGwseC6hdi3ZuqdaDYNDSenS1ga7te1XPK` | Compte applicatif réel |
| Borrower (`borrow@octro.co`) | `r4nwPMiZGLuvcghGf9k6VPkreAoCvHWN3o` | Compte applicatif réel |
| Wallet buffer / sponsor / émetteur de credential plateforme | `rESwf8WNEdjPdC2ovcDnrAw3aiknsjNQyq` | Rôle plateforme unique (SEC-04, seed en `.env`) |

## Sommaire — barre minimale du hackathon

| # | Cas d'usage | Statut | Preuve |
| --- | --- | --- | --- |
| 1 | Créer un vault mono-actif ouvert (open-ended) | ✅ | §1 |
| 2 | Dépôt d'au moins un lender | ✅ | §2 |
| 3 | Loan broker + un prêt originé et accepté par un borrower | ✅ | §3 |
| 4 | Exécuter un drawdown | ✅ | §4 |
| 5 | Traiter au moins un remboursement | ✅ | §5 |
| 6 | Retirer capital + rendement accumulé | ✅ | §6 |
| 7 | Une garde-fou protocolaire qui rejette une transaction | ✅ (3 exemples réels) | §7 |

---

## 1. Vault ouvert mono-actif (Track 1)

Le vault reste ouvert aux dépôts/retraits toute sa durée de vie — seuls les prêts ont un
terme (`docs/v2.2/hackathon.config.json`, `"vault": "open-ended"`). Deux vaults réels,
un par actif :

| Actif | Tx | Résultat | Lien |
| --- | --- | --- | --- |
| XRP | `3B1DFA0A88BC7CE14C2B4F9890B32A905B719A61B51C87D4978262B9D340A108` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/3B1DFA0A88BC7CE14C2B4F9890B32A905B719A61B51C87D4978262B9D340A108) |
| RLUSD (IOU simulé) | `684DF616D903788C6C27CD80E471403F9A39491D3892B6D88CDE3BD8CD9C84E1` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/684DF616D903788C6C27CD80E471403F9A39491D3892B6D88CDE3BD8CD9C84E1) |

Loan broker attaché à chaque vault :

| Actif | Tx | Résultat | Lien |
| --- | --- | --- | --- |
| XRP | `8AE4426FF87810D8F4F223424CC29E0E7BEFC86FAA99645B9E14CC2BACC6C93D` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/8AE4426FF87810D8F4F223424CC29E0E7BEFC86FAA99645B9E14CC2BACC6C93D) |
| RLUSD | `960575D7CFCB55D108AC84F148C883BB0993DBE2F9E010E6AE602F63664DCB44` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/960575D7CFCB55D108AC84F148C883BB0993DBE2F9E010E6AE602F63664DCB44) |

Cover déposé par le broker owner (RLUSD, first-loss cover) :
[`E383348EECB1251BD768262B3D2F7D799A0DCF5DF1DEB62C5076DE5AFD37EF9A`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/E383348EECB1251BD768262B3D2F7D799A0DCF5DF1DEB62C5076DE5AFD37EF9A)
— `tesSUCCESS`.

## 2. Dépôt lender

| Actif | Montant | Tx | Résultat | Lien |
| --- | --- | --- | --- | --- |
| XRP | 50 XRP | `6FA00F1328E0A9CD86519B1BBB94050E5A5BAF8D0A791724798B09ED6F5F015B` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/6FA00F1328E0A9CD86519B1BBB94050E5A5BAF8D0A791724798B09ED6F5F015B) |
| XRP (top-up avant test de retrait) | 30 XRP | `D5A8880DF9F0B02FFDC79863CD91515867A4B11FCAB8B3DA7D10AFC6D61A252E` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/D5A8880DF9F0B02FFDC79863CD91515867A4B11FCAB8B3DA7D10AFC6D61A252E) |
| RLUSD | 50 RLUSD | `B9471D4CC5A9B2E37F6874D00AE309826D3D99F41C910DBE72483377F066FAA4` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B9471D4CC5A9B2E37F6874D00AE309826D3D99F41C910DBE72483377F066FAA4) |

Parts de vault (MPToken, XLS-33) : visibles côté client sur `/transactions` (Wallet
Overview → "Parts de vault"), lues directement depuis le MPTokenIssuance du vault.

## 3. Origination et acceptation d'un prêt

5 prêts réels ont été originés au fil de la session (le borrower a un seul compte
persistant, donc plusieurs `Loan` objects s'accumulent — c'est d'ailleurs ce qui a révélé
le bug §9a) :

| Prêt (`LoanID`) | Actif | Principal | Tx `LoanSet` | Statut actuel | Lien |
| --- | --- | --- | --- | --- | --- |
| `82162493CA3C5A28…` | XRP | 10 XRP | `BBC472FD0A44E7C527A687D776E4D101FAF74C62BED82795CA5225A3CFD2C646` | remboursé | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BBC472FD0A44E7C527A687D776E4D101FAF74C62BED82795CA5225A3CFD2C646) |
| `346D9A26C6047EDB…` | XRP | 20 XRP | `896C3BFCC0D964AD97F464F5785BC304EB3E0017951B74CD5D3602FA88295A6D` | remboursé | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/896C3BFCC0D964AD97F464F5785BC304EB3E0017951B74CD5D3602FA88295A6D) |
| `673A9023D50F22B8…` | RLUSD | 10 RLUSD | `E209D5508BA6E643D8D84F2C1444079ADAFCC4B005E1AF5FD220886BFB145AD2` | actif | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/E209D5508BA6E643D8D84F2C1444079ADAFCC4B005E1AF5FD220886BFB145AD2) |
| `86B6DC8ED34DFFF4…` | XRP | 20 XRP | `6EA0A470CEDA3FB3A979CE0CF432D879DC6C5902C8DC150EF17067BE98EFEE81` | actif | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/6EA0A470CEDA3FB3A979CE0CF432D879DC6C5902C8DC150EF17067BE98EFEE81) |
| `5382E06E16C01FB2…` | XRP | 5 XRP | `139DF1E449F68730A6036839AFDA56ECDCE4E37A26E431652C4F18EEA61D7FCE` | actif (cible du test §7c) | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/139DF1E449F68730A6036839AFDA56ECDCE4E37A26E431652C4F18EEA61D7FCE) |

Chaque `LoanSet` ci-dessus est une transaction **coordonnée** (signature du borrower +
contre-signature du propriétaire du broker), donc l'acceptation par le borrower et
l'origination par le broker sont la même transaction validée.

## 4. Drawdown

Comme documenté par Augustin (`docs/progress/augustin/evidence/demo-evidence.run-2026-09-12.json`,
étape `drawdown`) : ce build ne produit pas de transaction `Drawdown` séparée. Le
décaissement est confirmé par les deltas de solde sur le `LoanSet` lui-même : le
borrower reçoit le principal (moins les frais réseau), le vault voit son
`AssetsAvailable` diminuer du même montant pendant que `AssetsTotal` reste inchangé (le
principal reste compté comme un actif du vault tant que le prêt est en cours). Vérifié
sur le prêt `86B6DC8ED34DFFF4…` : solde borrower +20 XRP (± frais) au ledger de la
transaction `6EA0A470CEDA3FB3A979CE0CF432D879DC6C5902C8DC150EF17067BE98EFEE81`.

## 5. Remboursement

| Prêt | Montant réel remboursé | Tx `LoanPay` | Résultat | Lien |
| --- | --- | --- | --- | --- |
| `82162493CA3C5A28…` (10 XRP) | 10.320548 XRP | `025B1C28FDB82FA9C79AE790AF2A13D35F273E8F7FCA6425FDAA9FF58A9DB589` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/025B1C28FDB82FA9C79AE790AF2A13D35F273E8F7FCA6425FDAA9FF58A9DB589) |
| `346D9A26C6047EDB…` (20 XRP) | 20.213699 XRP | `F8F46BB4C9864A8D7E81BA79E970F03217DE7C03962257D74CD50B45BC1EB4DA` | `tesSUCCESS` | [voir](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/F8F46BB4C9864A8D7E81BA79E970F03217DE7C03962257D74CD50B45BC1EB4DA) |

Le montant remboursé n'est jamais saisi côté client : il est relu depuis
`TotalValueOutstanding` juste avant de soumettre (`GET /v1/lending/loans/outstanding`),
seul montant qui fonctionne pour clore le prêt.

## 6. Retrait — capital + rendement, vault et buffer

**a) Retrait financé directement par le vault** (10 XRP + rendement réel) :
[`B256C37609F0398DAF127AB47BF967B02093536994DCCBF34BD1E9EAAC47EF82`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B256C37609F0398DAF127AB47BF967B02093536994DCCBF34BD1E9EAAC47EF82)
— `tesSUCCESS`.

**b) Retrait avancé par le buffer de liquidité** (le vault n'a pas encore assez de
liquidité, PER-11/Phase F) : le `VaultWithdraw` est d'abord rejeté par le protocole
(`tecINSUFFICIENT_FUNDS`, voir §7a), puis le buffer avance le montant demandé (35 XRP)
depuis son propre wallet :
[`48AD546C88F48D21854CF8B4E8C7A3E6BE1C50B0D360D70B394C855DF663D5F5`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/48AD546C88F48D21854CF8B4E8C7A3E6BE1C50B0D360D70B394C855DF663D5F5)
— `tesSUCCESS`, `Payment` de `rESwf8WNEdjPdC2ovcDnrAw3aiknsjNQyq` vers
`rGwseC6hdi3ZuqdaDYNDSenS1ga7te1XPK`, confirmé et lié en base
(`withdrawal_requests.funded_from = "buffer"`, `buffer_ledger` correspondant).

## 7. Garde-fous protocolaires (transaction rejetée)

Trois garde-fous réels et distincts, chacun validé sur un ledger (classe `tec*`, donc
avec un vrai lien explorateur — voir l'avertissement en tête de document sur les rejets
`tem*` qui n'en ont pas).

### a) Liquidité insuffisante du vault

Un retrait est demandé alors que le vault n'a pas encore assez de liquidité
disponible (le borrower ne l'a pas encore remboursé) :
[`C6050B4637509EF9DBC552B9DD8C8ECF343A579B170544B87B70389AF85D60B4`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/C6050B4637509EF9DBC552B9DD8C8ECF343A579B170544B87B70389AF85D60B4)
— `VaultWithdraw` → `tecINSUFFICIENT_FUNDS`. C'est précisément ce rejet qui déclenche le
repli buffer (§6b) — un `PortResult` non-`"ready"` n'est **jamais** interprété comme un
succès côté application.

### b) Loan broker avec obligations en cours

Tentative de suppression du loan broker XRP alors qu'il porte encore des prêts actifs :
[`F097E794CB82A01CC1FC0A7A00E2CF5331E9DECF49DCDD385FBB4A35F99C831A`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/F097E794CB82A01CC1FC0A7A00E2CF5331E9DECF49DCDD385FBB4A35F99C831A)
— `LoanBrokerDelete` → `tecHAS_OBLIGATIONS`.

### c) Wallet non certifié par Octro interagissant avec un prêt (demande explicite)

Un wallet **fraîchement généré, jamais passé par l'inscription/KYC/évaluation de
crédit Octro** — donc sans `Credential` on-chain ni relation applicative avec le prêt —
tente de rembourser (`LoanPay`) un prêt actif qui appartient à un autre borrower
(`borrow@octro.co`, prêt `5382E06E16C01FB2…`, 5 XRP) :

- Wallet non certifié : `raDqz1DAa4n38k9g17QUN97VGWG3dmtz2f` (généré pour ce test,
  financé avec 15 XRP par relais depuis le wallet buffer uniquement pour pouvoir
  signer — aucune inscription, aucun KYC, aucun credential émis pour cette adresse).
- Transaction : `LoanPay` sur `LoanID = 5382E06E16C01FB2787F7C97B5DF336167DB6D27675EE43DF6CBBEEB57AE065C`
- Résultat : **`tecNO_PERMISSION`** — *"No permission to perform requested operation."*
- Validé au ledger `82708`.
- Lien : [`A12CCE231CD63BCFAF5E07F554F46D9E58AC303043A1C8D80ADF1668AA043DC3`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/A12CCE231CD63BCFAF5E07F554F46D9E58AC303043A1C8D80ADF1668AA043DC3)

Le protocole XRPL lui-même refuse l'opération (le wallet n'est ni le borrower du prêt,
ni un compte reconnu par le loan broker) — le refus est appliqué par le ledger, pas
seulement par l'application Octro.

*(Une première tentative, un `LoanSet` solo sans contre-signature, avait été rejetée
`temBAD_SIGNER` — mais confirmée `txnNotFound` ensuite : une transaction de classe
`tem*` n'entre jamais dans un ledger validé, donc pas de lien explorateur possible. Le
test ci-dessus (`LoanPay` contre un prêt existant) a été choisi précisément parce qu'il
produit un rejet `tec*`, validé et lié.)*

## 8. Extensions Loaded déjà vérifiées en réel

### Credentials + Permissioned Domains (LOAD-01, LOAD-03)

- `CredentialCreate` (KYC simulé → attestation on-chain, lender) :
  [`C091BD1B35C1F8F34CC7551FDB02DF9C7E8BEB40C12AEAD2F4340FD0EC908E50`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/C091BD1B35C1F8F34CC7551FDB02DF9C7E8BEB40C12AEAD2F4340FD0EC908E50) — `tesSUCCESS`
- `CredentialAccept` (lender) :
  [`34B7EF4F994100F3E95F05BD5A1EFC8F17D7080F87BA01398A8BEC002AA4C893`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/34B7EF4F994100F3E95F05BD5A1EFC8F17D7080F87BA01398A8BEC002AA4C893) — `tesSUCCESS`
- `CredentialCreate` (borrower, corrigé le 2026-09-13 — voir §9c) :
  [`BE0C4F3F72B42A0504599593BF9D9D370E74AADABB8D8AD80286D1622AE56A5C`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BE0C4F3F72B42A0504599593BF9D9D370E74AADABB8D8AD80286D1622AE56A5C) — `tesSUCCESS`
- `CredentialAccept` (borrower) :
  [`BFD74AD08ABBCEE0B6DE18057C131AF19E2CCFDA1EF77E2D00E7946A6344250E`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BFD74AD08ABBCEE0B6DE18057C131AF19E2CCFDA1EF77E2D00E7946A6344250E) — `tesSUCCESS`
- `PermissionedDomainSet` (domaine créé, `AcceptedCredentials` renseigné) :
  [`0D2183F8C76E91A25EE8672B3384ADFBFDFE4A48BAF1E7F238995EFEE440AFA6`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/0D2183F8C76E91A25EE8672B3384ADFBFDFE4A48BAF1E7F238995EFEE440AFA6) — `tesSUCCESS`

Décision actée : le domaine n'est jamais rattaché au vault partagé de production
(`bindDomainToVault` n'est appelé par aucun use-case sur ce vault) — préserve
`"vault": "open-ended"`.

### Sponsorship (XLS-68/69)

TrustSet dont la réserve **et** les frais sont pris en charge par le sponsor
(`SponsorFlags.spfSponsorReserve | spfSponsorFee = 3`), pour un holder financé au strict
minimum (aucune marge) :
[`CC496D9627167D36980136EABE1614B3AC36C1EB2E4AE2BF642BD0995E7AF7DE`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/CC496D9627167D36980136EABE1614B3AC36C1EB2E4AE2BF642BD0995E7AF7DE)
— `tesSUCCESS`, holder `rsYbYib9QmMhXgExevDd4ye3nTjWkHUH2p`, sponsor = wallet buffer.

### Activation automatique du wallet à l'inscription

Correctif du 2026-09-13 (voir §9c) : un nouveau compte reçoit désormais un `Payment`
best-effort du wallet buffer à l'inscription (13 XRP = 10 XRP de réserve de base + 2 XRP
de réserve incrémentale du premier `Credential` possédé + 1 XRP de marge frais — valeurs
vérifiées via `server_state` sur ce devnet précis, pas supposées depuis le mainnet).
Démontré de bout en bout sur un compte de test jetable (adresse et lignes Postgres
supprimées après vérification, la trace on-chain reste publique) :

- `Payment` d'activation (13 XRP) :
  [`4E1C4498417A31B6D58F4BCD0646D133449D6DB2A38DE9BF434C2F622B833483`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/4E1C4498417A31B6D58F4BCD0646D133449D6DB2A38DE9BF434C2F622B833483) — `tesSUCCESS`
- `CredentialCreate` consécutif (KYC simulé "valid" juste après) :
  [`B1849CEB3B12470DBCA5738C0673741A135E0D4DDE21E30B7E59782F449E051D`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/B1849CEB3B12470DBCA5738C0673741A135E0D4DDE21E30B7E59782F449E051D) — `tesSUCCESS`
- `CredentialAccept` consécutif :
  [`BBB638C9F1B6DD59F925202B57D4C30DC904BFDD5D7BA6BB6152E9F8242988FB`](https://custom.xrpl.org/lending-hackathon.dev.ripplex.io:51233/transactions/BBB638C9F1B6DD59F925202B57D4C30DC904BFDD5D7BA6BB6152E9F8242988FB) — `tesSUCCESS`

## 9. Bugs réels trouvés et corrigés pendant cette session (transparence)

Trouvés en exerçant les flux pour de vrai contre le devnet et Postgres réels (pas en
test unitaire) :

**a) `account_objects[0]` non déterministe** — un deuxième prêt pour le même borrower
pouvait récupérer le mauvais `loan_id` en base (le lookup prenait le premier objet du
bon type au lieu de celui créé par *cette* transaction). Corrigé en lisant
`CreatedNode.LedgerIndex` depuis les `AffectedNodes` de la transaction elle-même
(`lending-v1.ts`, `credentials-domains.ts`). Une ligne déjà corrompue a été réparée
manuellement en base après vérification croisée avec les 5 `Loan` objects réels du
compte.

**b) Écriture `buffer_ledger` avant `withdrawal_requests`** — violait la contrainte de
clé étrangère `buffer_ledger_withdrawal_request_id_fkey` (jamais exercé avant contre la
vraie Postgres, seulement contre des doublures en mémoire sans contrainte). En
corrigeant ce bug, une conséquence réelle a été découverte pendant cette collecte de
preuves : les **deux tentatives échouées avant le correctif ont chacune déjà envoyé un
vrai `Payment` de 35 XRP** depuis le buffer avant de planter sur la contrainte —
`45A1155F59FA3971104C667D528CA2E5874B0EB51347406B5300E809CF0963C3` et
`B155420844E205E03FEF3B1ACE102AC1B45C41AE56A91B27CD4B5296D67990C8`, en plus du
`48AD546C88F48D21854CF8B4E8C7A3E6BE1C50B0D360D70B394C855DF663D5F5` finalement persisté
(§6b). Le buffer a donc réellement décaissé 105 XRP pour une seule demande de retrait de
35 XRP ; seule la dernière écriture existe dans `withdrawal_requests`/`buffer_ledger`.
**Non réconcilié** — à corriger avant toute réutilisation au-delà du hackathon (le
`bufferLedger.getCurrentBalance()` applicatif est donc actuellement en avance de 70 XRP
sur le solde réel du wallet buffer).

**c) Activation de wallet manquante** — un nouveau compte n'était jamais financé sur le
ledger (`actNotFound`), donc `CredentialAccept` échouait silencieusement (chemin
best-effort, §8) dès que le KYC passait "valid" avant que l'utilisateur n'ait par
ailleurs été financé par un autre flux. Corrigé par le `Payment` d'activation
automatique décrit en §8. Le compte `borrow@octro.co` (déjà existant, financé
après-coup par d'autres tests) a été réparé manuellement en relançant la simulation KYC
une fois son wallet financé — voir `CredentialCreate`/`CredentialAccept` du §8.

## 10. Limites documentées (non des bugs)

- Le solde retirable de chaque lender est calculé uniquement depuis Postgres (dépôts
  confirmés − retraits honorés) — `LendingV1Port` n'expose aucune lecture de la part
  réelle d'un lender dans le vault partagé (limite actée, voir ADR).
- Le buffer n'existe qu'en XRP natif : une avance pour un vault IOU (RLUSD) est
  plafonnée à 0 par manque de solde compatible.
- Le point 9b ci-dessus reste un écart de réconciliation ouvert, pas silencieux.
