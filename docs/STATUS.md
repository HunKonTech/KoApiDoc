# KoApiDoc: állapot és útiterv a teljes programhoz

Frissítve: 2026-10-02, a 4. lépés után (`main` @ `e6aa27c` + a 4. lépés változásai). Alapelv: **az Atlassian felé semmi nem kerül** (nincs `forge register`, `deploy`, `install`, `tunnel`, nincs Marketplace-fiók vagy listing) addig, amíg te nem döntesz az első pushról egy közel kész állapotnál.

## Hol tartunk

| Lépés | Tartalom | Állapot |
|---|---|---|
| Tervezés | platform (Forge), licenc, stack, buktatók, fiók és költségek | kész (`PLAN.md`) |
| Licenc és repó-szabályok | saját source-available licenc, `CONTRIBUTING.md`, külső PR-eket záró workflow | kész |
| 1. lépés | Forge macro váz, beillesztett spec (JSON/YAML), Swagger UI, hiba- és üres állapot, téma, helyi mock | kész, ellenőrizve |
| 2. lépés | spec betöltése az oldal csatolmányából, `SpecSource` absztrakció, külső `$ref` kezelés | kész, ellenőrizve |
| 3. lépés | megjelenítési beállítások, tag-szűrés, kereső, hibahatár, a11y, nagy spec mérés, e2e tesztek CI-ban, licencvizsgálat | kész, ellenőrizve (lent) |
| 4. lépés | Marketplace-előkészítés (dokumentumok, listing-szövegek, képernyőképek, biztonsági átnézés, kiadási folyamat) | kész, ellenőrizve (lent és `STEP-4.md`) |
| 5. lépés | az első Atlassian-ellenőrzés fejlesztői site-on | nem indult, a te jóváhagyásodra vár |
| 6. lépés | Marketplace beküldés és kiadás | nem indult |

## A 4. lépés eredménye

| Elem | Eredmény |
|---|---|
| Felhasználói dokumentumok | `docs/USER-GUIDE.md`, `docs/PRIVACY.md`, `SECURITY.md`, `CHANGELOG.md` (angolul) |
| Beküldési anyag | `docs/MARKETPLACE-LISTING.md`: döntések (D1–D9), listing-szövegek mért hosszal, Privacy and Security válaszok, scope-indoklás, külső hosztok (nincs), Atlassian-oldali teendők listája |
| Kiadási folyamat | `docs/RELEASING.md` (semver, ellenőrzőlista, deploy, visszaállítás, audit-kivételek) |
| Grafika | `marketing/`: ikon, banner, 8 képernyőkép, egy paranccsal újragenerálható (`npm run marketing:capture`) |
| Biztonsági átnézés | 2 hiba javítva: külső képek a spec leírásában (CSP meta tag), YAML alias-bomba (értékszám-korlát a `parseSpec`-ben); XSS-próba tiszta; részletek a `STEP-4.md`-ben |
| `npm audit` | szállított kód: 0; fejlesztői eszközök: 31 találat a `@forge/cli` rögzített függőségeiben (indokolt kivétel) |
| Licencvizsgálat | 106 bundle-csomag, GPL/LGPL/AGPL nincs |
| Tesztek | 175 unit/komponens, 42/42 e2e (új: külső kép blokkolása, alias-bomba, hibahatár chunk-hibával) |
| Támogatás | issue-sablonok (hiba, ötlet), biztonsági bejelentés privát úton; a Dependabot PR-jeit a lezáró workflow átengedi |

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
- A Dependabot-kérdés a 4. lépésben rendezve (kézi frissítés; a workflow átengedi a botot).
- Az `app.id` még placeholder (`forge register` az 5. lépésben).

## Hátralévő lépések a Marketplace-kiadásig

**5. lépés (az első Atlassian-ellenőrzés, a te jóváhagyásodra):** `forge register`, `forge lint`, `forge deploy -e development`, `forge install` a fejlesztői site-ra, majd az ellenőrzőlista: csatolmány-lista és letöltés valós Confluence-en, valós CSP (a saját CSP meta taggel együtt), makró-konfiguráció mérete, szerkesztő és megtekintő mód, iframe magasság, PDF-export (és döntés az `adfExport` tartalékról). A teljes lista: `MARKETPLACE-LISTING.md` 5. szakasz. Itt derül ki, ami a mockon nem látszik; várhatóan lesz javítási kör.

**6. lépés (beküldés és kiadás):** a repó publikussá tétele (a dokumentum-URL-ek miatt), Marketplace partnerprofil (ingyenes), developer space publikálása, `forge deploy -e production`, listing beküldése a `MARKETPLACE-LISTING.md` anyagával, az Atlassian ellenőrzése (kb. egy hét, legfeljebb 10–15 munkanap), kiadás. Utána: karbantartás a `RELEASING.md` szerint, hibabejelentések issue-ban.

**Opcionális, kiadás után:** URL-ből töltés (egress, jelvény elvesztése), „Try it out”, Redoc-nézet, több spec egy oldalon, verzió-összehasonlítás, Data Center változat.

## Nyitott döntések tőled

A 4. lépés a javasolt alapértékeket rögzítette (`MARKETPLACE-LISTING.md` 1. szakasz); ezek maradnak, ha nem döntesz másképp:

1. **Vendor neve (D2):** „HunKonTech”, ha szervezetként használhatod; különben a saját neved (akkor a banner és a `PRIVACY.md` szövege változik).
2. **Publikus URL-ek (D4):** a repó most **privát**. Javaslat: publikussá tétel a beküldés előtt (az eredeti terv is ez volt), és GitHub-linkek; alternatíva a GitHub Pages (privát repónál fizetős).
3. **Atlassian Developer Community-fiók (D6):** a te regisztrációd kell.
4. **Jogász:** a `LICENSE` mint EULA és a `PRIVACY.md` átnézése a beküldés előtt.
5. **Biztonsági kapcsolat:** most csak GitHub private vulnerability reporting (publikus repó kell hozzá); ha szeretnél külön e-mail-címet, megadod és bekerül.
6. **`close-external-prs` runner:** kész, `ubuntu-latest` (KOA-05, `docs/security/REMEDIATION-PLAN.md`). A self-hosted runnert a repó beállításaiban le kell választani.
7. Mikor menjen az első push (5. lépés): a repó a beküldéshez szükséges anyaggal kész; a mock-képek elégségesek, valós képek az 5. lépés után opcionálisak.
8. A GitHub-beállítások (a `main` védelme, collaborator lista, private vulnerability reporting), ha még nem történt meg.
