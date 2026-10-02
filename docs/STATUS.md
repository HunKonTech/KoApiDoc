# KoApiDoc: állapot és útiterv a teljes programhoz

Frissítve: 2026-10-02, `main` @ `805a349`. Alapelv: **az Atlassian felé semmi nem kerül** (nincs `forge register`, `deploy`, `install`, `tunnel`, nincs Marketplace-fiók vagy listing) addig, amíg te nem döntesz az első pushról egy közel kész állapotnál.

## Hol tartunk

| Lépés | Tartalom | Állapot |
|---|---|---|
| Tervezés | platform (Forge), licenc, stack, buktatók, fiók és költségek | kész (`PLAN.md`) |
| Licenc és repó-szabályok | saját source-available licenc, `CONTRIBUTING.md`, külső PR-eket záró workflow | kész |
| 1. lépés | Forge macro váz, beillesztett spec (JSON/YAML), Swagger UI, hiba- és üres állapot, téma, helyi mock | kész, ellenőrizve |
| 2. lépés | spec betöltése az oldal csatolmányából, `SpecSource` absztrakció, külső `$ref` kezelés | kész, ellenőrizve |
| 3. lépés | megjelenítési beállítások, tag-szűrés, kereső, hibahatár, a11y, nagy spec mérés, e2e tesztek CI-ban, licencvizsgálat | kész, ellenőrizve (lent) |
| 4. lépés | Marketplace-előkészítés (dokumentumok, listing-szövegek, képernyőképek, biztonsági átnézés, kiadási folyamat) | **megtervezve** (`STEP-4.md`) |
| 5. lépés | az első Atlassian-ellenőrzés fejlesztői site-on | nem indult, a te jóváhagyásodra vár |
| 6. lépés | Marketplace beküldés és kiadás | nem indult |

## A 3. lépés ellenőrzésének eredménye

| Elem | Eredmény |
|---|---|
| `npm ci` (gyökér és UI) | OK |
| `typecheck`, `lint`, `format:check` | hibamentes |
| `npm test` | 174/174 zöld (10 fájl) |
| `npm run build` | OK; induló JS 379 KB (117 KB gzip), Swagger UI lusta chunk 1,36 MB (380 KB gzip) |
| Mock-kód a production bundle-ben | nincs |
| E2E (Playwright, headless Chromium, mock production build) | 39/39 zöld: források és formátumok, hibaállapotok, kibontás, séma/kereső ki-be, tag-szűrő, fix és automatikus magasság, sötét téma, konfiguráció és élő előnézet, nagy spec, axe (hozzáférhetőség), nincs külső hálózati kérés |
| Nagy spec | 1500 végpont: első végpontok ~1,9 s; 2000 végpont: ~2,7 s (kereső ~0,1 s) |
| Hozzáférhetőség (axe) | kritikus és súlyos hiba nincs 9 nézeten |
| GitHub CI a `main`-en | zöld (lint, format, typecheck, tesztek, build, e2e) |
| Licencvizsgálat | a bundle-ben nincs GPL/LGPL/AGPL (`THIRD_PARTY_NOTICES` frissítve) |

Megjegyzés a futtatásról: ebben a környezetben a Playwright saját böngészőverziója nem volt telepítve, ezért az e2e-t a gépen lévő Chromiummal futtattam (ideiglenes konfigurációval, a repóba nem került). A CI a saját böngészőjét telepíti és zöld, tehát a repó nem érintett.

Nem ellenőrizhető Atlassian nélkül (szándékosan nem futtattam): `forge lint`, a valós Forge CSP, a valós makró-kontextus, a `requestConfluence` valós viselkedése (letöltés, átirányítás, bináris kezelés, jogosultság), az iframe automatikus magassága, a PDF-export, a makró-konfiguráció tényleges mérethatára. A `readonly:content.attachment:confluence` érvényes Forge-scope; a `read:attachment:confluence` név és az endpointok scope-megfelelése az 5. lépésben ellenőrzendő (`forge lint`).

Észrevételek, nem blokkolók:
- A Dependabot (ha bekapcsolod) PR-jeit a külső PR-eket záró workflow lezárná; a 4. lépés ezt rögzíti (kézi frissítés, vagy a bot engedélyezése).
- Az `app.id` még placeholder (`forge register` az 5. lépésben).

## Hátralévő lépések a Marketplace-kiadásig

**4. lépés (megtervezve):** felhasználói útmutató, privacy policy, listing-szövegek, képernyőképek és ikon, `SECURITY.md`, `CHANGELOG`, kiadási folyamat, `npm audit` és biztonsági átnézés, végleges licencvizsgálat. Részletek: `STEP-4.md`.

**5. lépés (az első Atlassian-ellenőrzés, a te jóváhagyásodra):** `forge register`, `forge lint`, `forge deploy -e development`, `forge install` a fejlesztői site-ra, majd az ellenőrzőlista: csatolmány-lista és letöltés valós Confluence-en, valós CSP, makró-konfiguráció mérete, szerkesztő és megtekintő mód, iframe magasság, PDF-export. Itt derül ki, ami a mockon nem látszik; várhatóan lesz javítási kör.

**6. lépés (beküldés és kiadás):** Marketplace partnerprofil (ingyenes), developer space publikálása, listing beküldése, az Atlassian ellenőrzése (általában kb. egy hét), kiadás. Utána: karbantartás, hibabejelentések issue-ban.

**Opcionális, kiadás után:** URL-ből töltés (egress, jelvény elvesztése), „Try it out”, Redoc-nézet, több spec egy oldalon, verzió-összehasonlítás, Data Center változat.

## Nyitott döntések tőled

1. Listing-név és vendor neve (javaslat: „KoApiDoc for Confluence”; vendor: a saját neved, vagy a „HunKonTech”, ha szervezetként is használhatod).
2. EULA: a saját licenc (jogász átnézése után) vagy az Atlassian szabványos EULA-ja (javaslat: a saját licenc).
3. Publikus URL-ek a privacy policy-hoz és az útmutatóhoz (javaslat: GitHub Pages, ezt neked kell bekapcsolnod).
4. Támogatási kapcsolat: GitHub Issues, és egy e-mail-cím a biztonsági bejelentéseknek; az Atlassian Developer Community-fiók regisztrálása.
5. Dependabot: kézi frissítés vagy a bot engedélyezése a workflow-ban.
6. „Try it out” az első kiadásba (javaslat: nem).
7. Mikor menjen az első push (5. lépés): a 4. lépés után, vagy már előtte (javaslat: már most is lehet, mert a Marketplace-előkészítés valós képernyőképeket kér, de a mock-képek is elégségesek lehetnek; a döntés tiéd).
8. A GitHub-beállítások (a `main` védelme, collaborator lista), ha még nem történt meg.
