# 4. fejlesztési lépés: Marketplace-előkészítés (helyi, dokumentum- és tartalommunka)

Előzmény: az 1., 2. és 3. lépés kész és ellenőrzött (lásd [`STATUS.md`](STATUS.md)). Az alapelv változatlan: **semmi nem kerül az Atlassian felé** (`forge register`, `deploy`, `install`, `tunnel`, Marketplace-fiók/listing létrehozása nincs). Ez a lépés mindent előkészít, hogy az 5. (első Atlassian-ellenőrzés) és a 6. lépés (beküldés) gyorsan menjen.

## Cél

Minden szöveg, kép és dokumentum, amit a Marketplace beküldése kér, kész és a repóban van, plusz a kiadási folyamat leírva. A lépés végén a kód nem változik érdemben (legfeljebb apró javítások), a repó „kiadásra előkészített” állapotú.

Nincs benne: a partnerprofil és a listing létrehozása az Atlassiannél, a deploy, a beküldés.

## Amit az Atlassian kér (az ellenőrzött források alapján)

Forrás: [App approval guidelines](https://developer.atlassian.com/platform/marketplace/app-approval-guidelines/), [Listing Forge apps](https://developer.atlassian.com/platform/marketplace/listing-forge-apps/), [Marketplace Partner Agreement](https://www.atlassian.com/licensing/marketplace/partneragreement).

| Követelmény | Teendő a repóban | Állapot |
|---|---|---|
| App neve: „App X for Confluence”, nem „Confluence App X” (védjegy) | Listing-név: **KoApiDoc for Confluence** | döntés kell (lent) |
| Védjegyek (Confluence, Atlassian, Swagger/SmartBear, OpenAPI) | Leírásban semleges megfogalmazás („OpenAPI / Swagger compatible”), „nem az X hivatalos terméke” sor | szöveg készül |
| Logó, banner, képernyőképek | `marketing/` mappa: ikon, banner, képernyőképek a mockról (Playwright-szkript generálja) | készül |
| Telepítési és használati dokumentáció a listingből hivatkozva | `docs/USER-GUIDE.md` (publikus URL kell) | készül |
| Támogatás: legalább egy kapcsolattartó az Atlassian Developer Community-ben | GitHub Issues + SECURITY.md; a Community-fiók regisztrálása a te teendőd | döntés kell |
| Adatvédelmi nyilatkozat (privacy policy) | `docs/PRIVACY.md`, publikus URL kell | készül |
| „Privacy and Security” fül tartalma, DPA, ha adatfeldolgozó vagyunk | `docs/MARKETPLACE-LISTING.md` szakasz: nem gyűjtünk adatot; DPA valószínűleg nem szükséges, ellenőrizni a beküldő felületen | készül |
| Scope-ok indoklása, külső hosztok listája | `docs/MARKETPLACE-LISTING.md`: 2 csatolmány-olvasó scope, külső hoszt nincs | készül |
| EULA: a saját licenc vagy az Atlassian szabványos, testreszabható EULA-ja | döntés kell (lent) | döntés kell |
| Funkció egyezzen a hirdetettel; ne rontsa a Confluence-t | listing csak a valós funkciókat ígéri (csatolmány/beillesztett spec, Swagger UI, nincs „Try it out”) | szöveg készül |
| Marketplace Partner Agreement elfogadása | a partnerprofil létrehozásakor (6. lépés), a te teendőd | később |

## Döntések a lépés elején

| Kérdés | Javaslat | Miért |
|---|---|---|
| Listing-név | **KoApiDoc for Confluence** | megfelel a névszabálynak |
| Vendor neve a listingen | magánszemélyként a neved, vagy a „HunKonTech” név, ha az szervezetként is használható | a partnerprofil ezt kéri; a szervezet nevével való fellépéshez jogosultság kell |
| EULA | a saját `LICENSE` (jogász átnézése után) vagy az Atlassian testreszabható EULA-ja | a saját licenc adja a „módosítás csak engedéllyel” feltételt; az Atlassian-féle EULA ezt nem tartalmazza |
| Publikus dokumentum-URL-ek (privacy, user guide) | GitHub Pages vagy a repó `docs/` mappájának GitHub-linkje | a listing publikus URL-t kér |
| Támogatási csatorna | GitHub Issues, és egy e-mail-cím a biztonsági bejelentéseknek | külső PR-t nem fogadunk, issue igen |
| Dependabot | **kézi frissítés** vagy a workflow-ban a `dependabot[bot]` engedélyezése | a külső PR-eket záró workflow most a bot PR-jét is lezárná |

## Repó-változások

```
docs/
  USER-GUIDE.md              # telepítés, makró beszúrása, forrás-választás, beállítások, hibaelhárítás (angol)
  PRIVACY.md                 # adatvédelmi nyilatkozat (angol)
  MARKETPLACE-LISTING.md     # minden beküldéshez kért szöveg egy helyen
  RELEASING.md               # kiadási folyamat lépésről lépésre (5. és 6. lépéshez)
marketing/
  README.md                  # mi mihez kell, méretek az Atlassian aktuális előírása szerint
  screenshots/               # a mockról generált képek
  capture.mts                # Playwright-szkript a képernyőképekhez
SECURITY.md                  # sebezhetőség bejelentése
CHANGELOG.md                 # 0.1.0 első kiadás
.github/ISSUE_TEMPLATE/      # hibabejelentés sablon (verzió, böngésző, spec mintával)
THIRD_PARTY_NOTICES          # a kiadás előtti végleges licencvizsgálat
```

## Feladatok sorrendben

1. **Döntések rögzítése** (név, vendor, EULA, URL-ek, támogatás) a `MARKETPLACE-LISTING.md` elején.
2. **Képernyőképek:** a `capture.mts` Playwright-szkript a mockról készít képeket (világos és sötét téma, konfigurációs ablak, hibaüzenet, több tag, külső `$ref` figyelmeztetés). Méretek és formátum az Atlassian aktuális előírása szerint (ellenőrizni a „Building your presence on Marketplace” oldalon).
3. **Ikon és banner:** egyszerű, saját készítésű grafika (SVG forrás a repóban), védjegyes logók nélkül.
4. **`USER-GUIDE.md`:** a valós funkciókat írja le, képernyőképekkel; a korlátokat (nincs „Try it out”, külső `$ref` nem támogatott, 2 MB felső korlát, PDF-export) nyíltan felsorolja.
5. **`PRIVACY.md`:** mit nem gyűjtünk (nincs külső hívás, nincs analitika, a csatolmány a felhasználó jogosultságával a böngészőben kerül feldolgozásra, nincs adat tárolása az app oldalán), kapcsolattartó, változások kezelése. Jogász átnézése a beküldés előtt.
6. **`MARKETPLACE-LISTING.md`:** név, szlogen, rövid és hosszú leírás, funkciók, kategóriák és címkék, scope-indoklás („csak olvasás, csak az aktuális oldal csatolmányai”), külső hosztok („nincs”), támogatási és biztonsági elérhetőség, ismert korlátok, védjegy-nyilatkozat.
7. **Biztonsági átnézés:** a `security-review` az egész repón (XSS a leírásokban, `$ref` kezelés, azonosítók az URL-ekben, a mock kizárása a buildből), `npm audit` mindkét csomagon, eredmények és a nyitott pontok a `SECURITY.md`/a lépés dokumentumában.
8. **Licencvizsgálat:** `npm run licenses` újrafuttatása, a `THIRD_PARTY_NOTICES` véglegesítése; a bundle-ben GPL/LGPL/AGPL nincs (ezt az ellenőrzés újra igazolja).
9. **`RELEASING.md`:** verziószámozás (semver, a `package.json` és a `CHANGELOG`), kiadási lista: CI zöld, `forge lint`, fejlesztői site ellenőrzés, `forge deploy -e production`, a Marketplace-listing új verziója. A pontos Forge/Marketplace parancsokat az 5–6. lépésben, élő dokumentáció alapján kell megerősíteni.
10. **Hiba- és támogatási sablonok:** `SECURITY.md`, issue sablon; a `close-external-prs` workflow és a Dependabot-döntés összehangolása.
11. **Kód-karbantartás, ha kiderül:** apró javítások, amelyek a képernyőképek vagy a dokumentáció írása közben kiderülnek (csak hibajavítás, új funkció nincs).

## Elfogadási feltételek (mind helyben, Atlassian nélkül)

- A `docs/USER-GUIDE.md`, `PRIVACY.md`, `MARKETPLACE-LISTING.md`, `RELEASING.md`, `SECURITY.md`, `CHANGELOG.md` megvan, angol nyelvű, és a valós működéssel egyezik (nincs benne olyan funkció, ami nincs).
- A képernyőképek újragenerálhatók egy paranccsal a mockról, és a repóban vannak.
- `npm audit` eredménye rögzítve; magas és kritikus sebezhetőség nincs, vagy indokolt kivétellel szerepel.
- `THIRD_PARTY_NOTICES` a friss vizsgálat szerint; GPL/LGPL/AGPL a bundle-ben nincs.
- Az összes nyitott döntés (név, vendor, EULA, URL-ek, támogatás) rögzítve van, és minden Atlassian-oldali teendő külön listában szerepel, hogy az 5–6. lépésben ne maradjon váratlan.
- `lint`, `typecheck`, `test`, `build`, `format:check`, `test:e2e` továbbra is zöld; a production build nem tartalmaz mock-kódot.

## Kockázatok

- A Marketplace követelményei változhatnak; a méreteket és a mezőket a beküldés előtt az élő dokumentáció szerint kell megerősíteni.
- A jogi szövegek (EULA, privacy) nem helyettesítik a jogász átnézését.
- A vendor-név és a szervezet („HunKonTech”) használata jogosultság és számlázási adatok kérdése; ezt te tudod eldönteni.
- A privacy policy publikus URL-jét csak a repó/Pages beállítása után lehet a listingbe írni.
