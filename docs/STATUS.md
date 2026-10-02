# KoApiDoc: állapot és útiterv a teljes programhoz

Frissítve: 2026-10-02, `main` @ `6b12543`. Alapelv: **az Atlassian felé semmi nem kerül** (nincs `forge register`, `deploy`, `install`, `tunnel`) addig, amíg te nem döntesz az első pushról egy közel kész állapotnál.

## Hol tartunk

| Lépés | Tartalom | Állapot |
|---|---|---|
| Tervezés | platform (Forge), licenc, stack, buktatók, fiók és költségek | kész (`PLAN.md`) |
| Licenc és repó-szabályok | saját source-available licenc, `CONTRIBUTING.md`, külső PR-eket záró workflow | kész |
| 1. lépés | Forge macro váz, beillesztett spec (JSON/YAML), Swagger UI, hiba- és üres állapot, téma, helyi mock | kész, ellenőrizve |
| 2. lépés | spec betöltése az oldal csatolmányából, `SpecSource` absztrakció, külső `$ref` kezelés, 92 teszt | kész, ellenőrizve (lent) |
| 3. lépés | megjelenítési beállítások, robusztusság, a11y, e2e tesztek | **megtervezve** (`STEP-3.md`) |
| 4. lépés | Marketplace-előkészítés (dokumentumok, listing, licencvizsgálat) | tervezés alatt (lent) |
| 5. lépés | az első Atlassian-ellenőrzés fejlesztői site-on | még nem indult, a te döntésedre vár |
| 6. lépés | Marketplace beküldés és kiadás | még nem indult |

## A 2. lépés ellenőrzésének eredménye

| Elem | Eredmény |
|---|---|
| `npm ci` (gyökér és UI) | OK |
| `typecheck`, `lint`, `prettier --check` | hibamentes |
| `npm test` | 92/92 zöld (6 fájl, komponenstesztekkel) |
| `npm run build` | OK; induló JS 370 KB (114 KB gzip), a Swagger UI lusta chunk (1,35 MB) |
| Mock-kód a production bundle-ben | nincs |
| Headless Chromium a mockon | csatolmány JSON, YAML (octet-stream), 3.1 többtagos, külső `$ref` figyelmeztetéssel, törölt/tiltott/hiányzó/túl nagy/nem szöveg/lassú (időtúllépés) mind érthető üzenetet ad, régi `{spec}` config működik, konfigurációs mód listázza a csatolmányokat |
| Külső hálózati kérés és kezeletlen kivétel | nincs, fehér képernyő nincs |
| Scope-nevek | a `readonly:content.attachment:confluence` érvényes Forge-scope (régi CLI-nél volt figyelmeztetés, a repó új CLI-t használ); a `read:attachment:confluence` név és az endpoint–scope megfelelés **még nem ellenőrzött** |

Nem ellenőrizhető Atlassian nélkül (szándékosan nem futtattam): `forge lint`, a valós Forge CSP, a valós makró-kontextus, a `requestConfluence` valós viselkedése (letöltés, átirányítás, bináris kezelés, jogosultság), az iframe magassága, a PDF-export.

Észrevételek, nem blokkolók:
- Nincs automata e2e teszt; a böngészős ellenőrzést kézzel futtatom. A 3. lépés ezt pótolja.
- A nagy spec teljesítménye csak az 1. lépésben volt mérve (135 KB kb. 1,6 s); a 3. lépés 8. feladata ezt rögzíti.
- Az `app.id` placeholder, és a Forge-oldali ellenőrzések a 5. lépésben jönnek.

## Hátralévő lépések a Marketplace-kiadásig

**3. lépés (megtervezve):** beállítások (kibontás, séma, szűrő, tag-szűrés, magasság), hibahatár, a11y, nagy spec mérés, e2e tesztek CI-ban.

**4. lépés (Marketplace-előkészítés, helyi, dokumentum- és tartalommunka):**
- Adatvédelmi nyilatkozat (privacy policy) és a végfelhasználói megállapodás (a saját licenc EULA-vá igazítva), támogatási elérhetőség, GDPR-nyilatkozat. Az app nem küld adatot külső félnek, ez a nyilatkozatban egyszerűen rögzíthető.
- Listing szövegek (angol), ikon, képernyőképek (a mockról elkészíthetők), rövid útmutató/GIF.
- Licencvizsgálat (`license-checker`), `THIRD_PARTY_NOTICES` véglegesítése.
- Biztonsági átnézés (a repó `security-review`-ja), függőségek frissítése és audit.
- A scope-lista és a manifest végleges átnézése (utólagos bővítés ügyfél-újrajóváhagyást igényel).

**5. lépés (az első Atlassian-ellenőrzés, a te jóváhagyásodra):** `forge register`, `forge lint`, `forge deploy -e development`, `forge install` a fejlesztői site-ra, majd a `STEP-2.md` ellenőrzőlistája: csatolmány-lista és letöltés valós Confluence-en, valós CSP, makró-konfiguráció mérete, szerkesztő/megtekintő mód, iframe magasság, PDF-export. Itt derül ki, ami a mockon nem látszik; várhatóan lesz javítási kör.

**6. lépés (beküldés és kiadás):** Marketplace partnerprofil (ingyenes), developer space publikálása, listing beküldése, az Atlassian ellenőrzése (általában kb. egy hét), kiadás. Utána: karbantartás, hibabejelentések issue-ban.

**Opcionális, kiadás után:** URL-ből töltés (egress, jelvény elvesztése), „Try it out”, Redoc-nézet, több spec egy oldalon, verzió-összehasonlítás, Data Center változat.

## Nyitott döntések tőled

1. „Try it out” kell-e az első kiadásba (javaslat: nem).
2. Mikor menjen az első push (5. lépés): a 3. lépés után, vagy a 4. lépéssel párhuzamosan (javaslat: a 3. lépés után, mert a Marketplace-előkészítéshez valós képernyőképek is kellenek).
3. A repóban a `LICENSE` jogi átnézése (javaslat: a beküldés előtt).
4. A GitHub-beállítások (a `main` védelme, collaborator lista) átállítása, ha még nem történt meg.
