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

## Állapot (2026-10-02): elkészült, helyben ellenőrizve

| Elfogadási feltétel | Eredmény |
|---|---|
| Dokumentumok (angolul, a valós működéssel egyezően) | `docs/USER-GUIDE.md`, `docs/PRIVACY.md`, `docs/MARKETPLACE-LISTING.md`, `docs/RELEASING.md`, `SECURITY.md`, `CHANGELOG.md` kész; a felhasználói útmutató képernyőképekkel, a korlátok külön szakaszban |
| Képernyőképek egy paranccsal | `npm run marketing:capture`: ikon (144×144), banner (1120×548 és 560×274), 8 képernyőkép (1840×900) a mock production buildjéről; a repóban vannak |
| `npm audit` | a szállított UI (`static/macro-ui`, `--omit=dev`) és a gyökér production-függőségei: 0 sebezhetőség. A gyökér fejlesztői eszközei: 31 találat (2 kritikus, 14 magas), mind a `@forge/cli` 14.1.0 saját `npm-shrinkwrap.json`-jában rögzített függőség; `npm audit fix` nem tudja frissíteni, nem kerül a bundle-be. Indokolt kivételként a `RELEASING.md`-ben |
| Licencvizsgálat | a production build source mapjeiből 106 csomag, GPL/LGPL/AGPL nincs; `THIRD_PARTY_NOTICES` véglegesítve (verziók, a nem szállított csomagok külön) |
| Döntések és Atlassian-oldali teendők | `MARKETPLACE-LISTING.md` 1. szakasz (D1–D9) és 5. szakasz (5. és 6. lépés teendői) |
| `lint`, `typecheck`, `test`, `build`, `format:check`, `test:e2e` | hibamentes; 175 unit/komponens teszt, 42/42 e2e; a production buildben nincs mock-kód |

### Biztonsági átnézés (az egész repó, kézzel és böngészős próbával)

| Terület | Eredmény |
|---|---|
| XSS a spec leírásaiban | próbaspec `<script>`, `<iframe>`, `<svg onload>`, `javascript:` linkekkel (Markdownban, HTML-ben, `termsOfService`, `contact.url`, `license.url`, `externalDocs.url` mezőkben): semmi nem fut le, a szkriptek és keretek eltűnnek, a `javascript:` linkek `about:blank`-ra cserélődnek vagy kimaradnak (Swagger UI: DOMPurify, `sanitizeUrl`). A saját kód csak React-szövegként renderel (nincs `dangerouslySetInnerHTML`). |
| **Talált hiba 1: külső képek** | a leírásba írt `![](https://…)` / `<img src="https://…">` betöltődött: a spec szerzője követőpixellel láthatta volna az olvasók IP-címét. **Javítva:** CSP meta tag az `index.html`-ben (`img-src 'self' data: blob:; object-src 'none'; base-uri 'self'`), a Forge CSP mellé; e2e teszt (`remote-content` minta) igazolja, hogy a kérés el sem indul. Élesben a Forge CSP valószínűleg amúgy is blokkolná; ez védelmi réteg, és a valós Forge-környezetben az 5. lépésben ellenőrizendő, hogy nem ütközik semmivel. |
| **Talált hiba 2: YAML alias-bomba** | egy kb. 500 bájtos YAML egymásba ágyazott aliasokkal („billion laughs”) exponenciálisan nagy fát ad; a `stripExternalRefs` bejárása 7 szintnél 2,5 s, 8-nál kb. 25 s, és a Swagger UI is elakadna. Aki a lapot szerkesztheti, minden olvasó (és a szerkesztő előnézete) böngészőjét lefagyaszthatta volna. **Javítva:** a `parseSpec` YAML esetén megszámolja a kifejtett értékeket, és 2 000 000 felett érthető hibát ad (egy 2 MB-os valós spec kb. 40 000 érték). Unit teszt (5^13 értékű bomba ms alatt elutasítva) és e2e. Mellékhatás: az önmagára hivatkozó YAML-anchor (a korábbi `broken-structure` minta, most `circular-anchor`) is ide fut, a hibahatár helyett érthetőbb üzenettel; a hibahatár e2e tesztje ezért a Swagger UI lusta chunkjának letöltési hibájával fut. |
| `$ref` kezelés | külső hivatkozást semmi nem tölt le (helyőrző); a helyi pointerek feloldása (`specFilter`) csak olvas; a `stripExternalRefs` mélységkorlátja 200. |
| Azonosítók az URL-ekben | oldal- és csatolmány-ID regexszel ellenőrzött, mielőtt REST-útvonalba kerül; a lapozás csak `/wiki/api/v2/` kezdetű linket követ; más oldal csatolmánya elutasítva (metaadat `pageId`). Megjegyzés: a `_links.next` relatív `..` szegmenseket nem szűr, de a hívás a felhasználó jogosultságával, csak olvasó scope-okkal, ugyanarra a site-ra megy; kockázat nem látszik. |
| Böngésző-tárolás, sütik | a production bundle nem használ `localStorage`-t, `sessionStorage`-t, sütit, IndexedDB-t (böngészőben ellenőrizve); a `localStorage` csak a mockban van. |
| Mock kizárása a buildből | a `dist`-ben nincs `bridge-mock`, `koapidoc-local-config`, mock-minta (grep); a `RELEASING.md` kiadási listáján is szerepel. |
| Függőségek | lásd `npm audit` fent. |
| Nyitott pontok (nem blokkolók) | (1) A `close-external-prs` workflow `self-hosted` runneren fut `pull_request_target`-re: nem futtat PR-kódot és a bemenetet env-ben kapja, tehát injekció nem látszik, de publikus repónál a GitHub nem javasol self-hosted runnert (bárki indíthat rajta jobot egy PR-rel). Javaslat a repó publikussá tétele előtt: `ubuntu-latest`. A te döntésed. (2) A Forge valós CSP-je és a Swagger UI inline stílusai: 5. lépés. (3) A `@forge/resolver` függvény üres és nincs hívva; maradhat (a manifest kéri a függvényt), vagy az 5. lépésben eltávolítható. |

### Megvalósítási döntések és eltérések a tervtől

- **Döntések:** a javasolt alapértékek rögzítve (`MARKETPLACE-LISTING.md` D1–D9); nyitott, csak általad eldönthető: a vendor neve (D2), a publikus URL-ek (D4: **a repó most privát**, a GitHub-linkek csak a publikussá tétel után működnek; privát repóhoz a GitHub Pages fizetős csomagot kér), a Developer Community-fiók (D6), a jogász átnézése (`LICENSE` mint EULA, `PRIVACY.md`).
- **Biztonsági bejelentés:** GitHub private vulnerability reporting (ez is publikus repót igényel, és a beállításokban be kell kapcsolni). E-mail-címet nem tettem a repóba; ha szeretnél külön címet, a `SECURITY.md`-be és a listingbe kerül.
- **Dependabot:** kézi frissítés a `RELEASING.md` szerint; a `close-external-prs` workflow már átengedi a `dependabot[bot]` PR-jeit, így később csak a repó-beállítás kell. A lezáró üzenet angolul és magyarul.
- **Listing-szövegek:** a mezőhosszok mérve, mind a korláton belül (More details 976/1000, ezért a védjegy-nyilatkozat a dokumentációba és a partneroldalra kerül, nem a leírásba). A brand guideline szerint a névben nincs „app”, „plugin”, „Atlassian”.
- **Grafika:** saját rajz (dokumentum JSON-zárójelekkel, sötétkék és borostyán), nincs benne Atlassian-, Swagger- vagy OpenAPI-logó, és nem Atlassian-kék. A banner a „by HunKonTech” szöveget hordozza (D2 szerint változhat).
- **Képernyőképek:** csak a makró, Confluence-keret nélkül (nem utánozzuk a Confluence felületét); 1380×675 CSS-pixel 4/3-os skálával = 1840×900. A `multi-tag-3.1.json` fixture leírása emiatt valósághűbb szöveget kapott (a tesztek nem függnek tőle).
- **PDF-export:** dokumentált korlát marad. A Forge makró `adfExport` függvénnyel adhatna statikus tartalékot (pl. API címe és verziója), de ez új funkció és csak valós Confluence-en tesztelhető; az 5. lépés után dönthető el.
- **`RELEASING.md`:** a Forge/Marketplace parancsok „(confirm)” jelöléssel, mert még egyszer sem futottak; a dokumentáció szerint a production deploy után a Marketplace magától létrehozza az új verziót, a scope-változás Forge major verzió és admin-jóváhagyást kér.
