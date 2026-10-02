# 2. fejlesztési lépés: spec betöltése csatolmányból (helyi mock-first)

Előzmény: az 1. lépés kész, ellenőrzése lent. Alapelv a 2. lépésre: **semmi nem kerül az Atlassian felé** (`forge register`, `deploy`, `install`, `tunnel` nincs). Mindent a helyi mock-környezetben (`npm run dev:local`) fejlesztünk és tesztelünk. Az első Atlassian-push egy közel kész állapotnál lesz.

## 1. lépés ellenőrzése (2026-10-01, `main` @ `601b0fd`)

| Elem | Eredmény |
|---|---|
| `npm ci` (gyökér és `static/macro-ui`) | OK |
| `npm run typecheck`, `npm run lint`, `prettier --check` | hibamentes |
| `npm test` | 13/13 teszt zöld (`parseSpec`) |
| `npm run build` | OK, a Swagger UI külön, lusta chunk (1,35 MB, 379 KB gzip), az induló JS 360 KB (111 KB gzip) |
| Mock nem kerül a production bundle-be | OK (a build kimenetében nincs `bridge-mock`) |
| Headless Chromium a helyi mockon | Petstore JSON és YAML megjelenik; hibás spec érthető hibát ad; üres makró útmutatót mutat; config mód „Valid openapi-3.0 document”; sötét téma rendben; „Try it out” gomb 0 db |
| Külső hálózati kérés | 0 (a böngésző saját Google-kérései nem az appból jönnek) |
| XSS a `description`-ben (`<img onerror>`) | nem fut le (Swagger UI szanitizál) |
| Nagy spec (135 KB, 1500 végpont) | első megjelenítés kb. 1,6 s |
| `forge lint` | **nem futtattam**: Forge-bejelentkezést igényel, és az `app.id` még placeholder |
| Valós Forge CSP, valós makró-kontextus (`extension.macro.isConfiguring`) | **nem ellenőrizhető** Atlassian nélkül, az első pushnál kell |

Észrevételek (nem blokkolók):
- A tesztek csak a `parseSpec`-et fedik; nincs komponensteszt (Config/View/App).
- A fixture-ök kicsik (1 végpont); a 2. lépésben kell egy több-tagos, `$ref`-es, 3.1-es fixture.
- A vitest-konfig figyelmeztet (`vitest.config.ts` ESM, de nincs `"type": "module"`); átnevezhető `.mts`-re.
- Külső `$ref` (http URL) a specben: a Swagger UI megpróbálhatja feloldani. Éles Forge CSP alatt ez tiltott lesz. Tudatos kezelés kell (lásd 5. feladat).
- A makró-konfiguráció mérete Confluence oldalon korlátos lehet; ezt az Atlassian-oldalon kell mérni, a csatolmány-támogatás pont ezt kerüli meg.

## Cél

A makró forrása kiválasztható: **beillesztett szöveg** (megvan) vagy **az oldal csatolmánya** (új). Csatolmány esetén a szerkesztő legördülőből választ egy `.json`, `.yaml` vagy `.yml` fájlt, és a nézet a csatolmány aktuális tartalmát jeleníti meg (új verzió feltöltése után frissül).

Nincs benne: URL-betöltés, „Try it out”, Redoc, másik oldal csatolmánya, Marketplace.

## Tervezés: forrás-absztrakció

A UI ne tudjon Confluence-ről, csak egy `SpecSource` interfészről:

```ts
// static/macro-ui/src/lib/specSource.ts
export type SpecRef =
  | { kind: 'inline'; spec: string }
  | { kind: 'attachment'; attachmentId: string; title: string };

export interface SpecSource {
  listAttachments(pageId: string): Promise<{ id: string; title: string; mediaType: string; fileSize: number }[]>;
  loadAttachment(pageId: string, attachmentId: string): Promise<string>; // szöveg
}
```

- `ConfluenceSpecSource`: `@forge/bridge` `requestConfluence`-t használ (a felhasználó jogosultságával fut).
- `MockSpecSource`: fixture-ökből dolgozik, hibákat is tud szimulálni (nincs jogosultság, törölt csatolmány, túl nagy fájl, nem szöveg).
- A mock-ot a már meglévő `vite --mode mock` alias választja ki, a production build nem tartalmazza.

A config JSON alakja: `{ source: 'inline', spec }` vagy `{ source: 'attachment', attachmentId, title }`. A régi `{ spec }` alak továbbra is olvasható (visszafelé kompatibilis, mert a 2. lépés előtt senki nem telepítette).

## Repó-változások

```
static/macro-ui/src/
  lib/specSource.ts            # interfész + típusok
  lib/confluenceSpecSource.ts  # requestConfluence implementáció (helyben nem futtatható)
  lib/mockSpecSource.ts        # mock implementáció
  lib/config.ts                # config (de)szerializálás + régi alak migrálása
  ConfigMacro.tsx              # forrásválasztó (Beillesztett | Csatolmány) + lista
  ViewMacro.tsx                # betöltés állapotai: töltés, hiba, siker
  lib/limits.ts                # MAX_SPEC_BYTES, kiterjesztés/MIME ellenőrzés
tests/
  config.test.ts               # migrálás, érvénytelen config
  specSource.test.ts           # mock + hibaesetek
  fixtures/multi-tag-3.1.json  # több tag, $ref, 3.1
  fixtures/with-external-ref.json
static/macro-ui/dev/
  bridge-mock.ts               # bővítés: attachment lista/tartalom, hibaüzemmód (?fail=...)
  local.html                   # új vezérlők: forrás, hibaüzemmód
manifest.yml                   # lásd lent, helyben csak szöveges változás
```

## Manifest és jogosultságok (döntés most, push később)

A csatolmány-olvasáshoz Confluence scope kell. A scope-lista **az első telepítés előtt** legyen végleges, mert telepítés utáni scope-bővítés a Forge-ban új főverziót és admin-jóváhagyást (újraengedélyezést) jelent az ügyfeleknél. Ezért a scope-okat most felvesszük a manifestbe, de nem deployoljuk.

Jelölt scope-ok (a pontos nevek **ellenőrzendők** a Forge Confluence-scope oldalán, mert a granuláris és a klasszikus nevek keverednek, és közösségi szálak szerint a letöltési végpont körül volt gond):
- csatolmányok listázása oldalon: v2 `GET /wiki/api/v2/pages/{id}/attachments` (granuláris `read:attachment:confluence`)
- csatolmány tartalmának letöltése: a v1 `…/child/attachment/{attId}/download` végpont, a hozzá tartozó olvasási scope-pal

Elv: a legszűkebb olvasási scope-ok, írási scope nincs, `external` (egress) szekció továbbra sincs.

## Feladatok sorrendben

1. **Fixture-ök és tesztvázlat:** `multi-tag-3.1.json`, `with-external-ref.json`, `config.test.ts` (előbb a teszt, piros).
2. **`config.ts`:** config típus, `parseConfig` (régi `{spec}` alak és az új alakok), érvénytelen bemenetnél biztonságos alapértelmezés. Tesztek zöldek.
3. **`specSource.ts` + `mockSpecSource.ts` + `limits.ts`:** interfész, mock, határértékek (javaslat: 2 MB felső korlát, csak `.json/.yaml/.yml`, szövegként dekódolható).
4. **`bridge-mock.ts` és `local.html` bővítése:** a mock oldalon legyen választható csatolmánylista, és hibaüzemmód (`?fail=forbidden|missing|toolarge|notext|slow`).
5. **Külső `$ref` kezelése:** a nézet előfeldolgozza a specet: ha http(s) URL-re mutató `$ref` van benne, nem hagyjuk a Swagger UI-ra, hanem érthető figyelmeztetést mutatunk („külső hivatkozás nem támogatott”), a többi része jelenjen meg. Teszt hozzá.
6. **`ConfigMacro.tsx`:** forrásválasztó, csatolmánylista (név, méret), üres lista és hiba állapotok, mentés az új config alakkal.
7. **`ViewMacro.tsx`:** betöltési állapotok (töltés, hiba: nincs jog, a csatolmány törölve, túl nagy, nem szöveg), a hibaüzenetek érthetőek és angolul egységesek.
8. **`confluenceSpecSource.ts`:** `requestConfluence` hívások, a válaszok validálása, időkorlát. Helyben csak típus- és egységszinten tesztelhető (a `requestConfluence` mockolva); az éles viselkedés az első pushnál ellenőrzendő.
9. **Komponensszintű tesztek** (Vitest + jsdom + Testing Library): ConfigMacro, ViewMacro főbb állapotok. Új dev-függőségek jönnek, ezeket felvenni a `THIRD_PARTY_NOTICES`-ba, ha szállított kód lenne (dev-only, ezért csak megjegyzés).
10. **CI és dokumentáció:** a meglévő CI-lépések zöldek; README és `docs/STEP-1.md` helyi tesztelés szakasz frissítése a csatolmány-módról.

## Elfogadási feltételek (mind helyben, Atlassian nélkül)

- `npm run lint`, `typecheck`, `test`, `build`, `prettier --check` hibamentes.
- A `dev:local` oldalon: csatolmányforrás kiválasztható, a lista megjelenik, a kiválasztott JSON és YAML csatolmány megjelenik Swagger UI-ban.
- Minden hibaüzemmód (`forbidden`, `missing`, `toolarge`, `notext`, `slow`) érthető üzenetet ad, nincs kezeletlen kivétel és nincs üres fehér képernyő.
- A régi `{ spec }` alakú config továbbra is megjelenik.
- Külső `$ref` esetén figyelmeztetés látszik, nincs külső hálózati kérés (Playwright ellenőrzi, mint az 1. lépés vizsgálatánál).
- A production build nem tartalmaz mock-kódot.

## Az első Atlassian-push előtti ellenőrzőlista (a 2. lépés nem csinálja meg)

Ezeket csak akkor kell elvégezni, amikor te úgy döntesz, hogy mehet az első push egy dev site-ra:
1. Scope-nevek ellenőrzése a Forge dokumentációban és a manifest véglegesítése.
2. `forge register`, `forge lint`, `forge deploy -e development`, `forge install`.
3. Csatolmány lista és letöltés valós Confluence-en (különösen: átirányítás a letöltésnél, nagy fájl, a felhasználó nincs jogosultsága).
4. Valós CSP: a Swagger UI stílusa és scriptje, konzolhibák.
5. A makró-konfiguráció tényleges mérethatára.
6. Szerkesztő és megtekintő mód, oldal exportja (PDF).

## Kockázatok

- A `requestConfluence` csatolmány-letöltése Forge-ban ismerten kényes (átirányítás, bináris kezelés). Emiatt a 8. feladat az első valós pushig csak részben bizonyítható; a mock-first kialakítás ezt a kockázatot a `SpecSource` mögé szorítja.
- A scope-lista véglegesítése az első telepítés előtt kötelező; utólagos bővítés ügyfél-újrajóváhagyást igényel.
- A felhasználó jogosultságával olvasunk (`requestConfluence`), ezért egy oldal nézője csak azt a csatolmányt látja, amihez jogosult; ez szándékos, de hibaüzenetben kezelni kell.

## Állapot (2026-10-02): elkészült, helyben ellenőrizve

| Elfogadási feltétel | Eredmény |
|---|---|
| `lint`, `typecheck`, `test`, `build`, `prettier --check` | hibamentes; 92 teszt (config, specSource, limits, externalRefs, parseSpec, ConfigMacro, ViewMacro) |
| `dev:local` csatolmány-mód | a lista megjelenik (a PNG rejtve), a JSON, YAML és 3.1-es csatolmány megjelenik Swagger UI-ban; config mentés → nézet |
| Hibaüzemmódok | `forbidden`, `missing`, `toolarge`, `notext`, `slow` (15 s időkorlát) és törölt csatolmány: érthető angol üzenet, 0 oldalhiba |
| Régi `{ spec }` config | megjelenik („Petstore JSON (step 1 config)” minta) |
| Külső `$ref` | figyelmeztetés, a többi rész megjelenik, headless Chromiumban 0 külső kérés |
| Production build | nincs benne mock-kód |

Megvalósítási megjegyzések:
- A helyi mock a `requestConfluence` REST-végpontjait emulálja (`dev/bridge-mock.ts`), így a `ConfluenceSpecSource` is fut helyben; a `MockSpecSource` a teszteké.
- A betöltés előbb a metaadatot kéri le (`GET /wiki/api/v2/attachments/{id}`), és csak megfelelő méretű, kiterjesztésű, ugyanazon oldalhoz tartozó csatolmányt tölt le; a letöltött tartalom szigorú UTF-8 dekódoláson megy át.
- Külső hivatkozásnak minden nem `#`-kal kezdődő `$ref` számít (relatív fájl is), mert azt is a Swagger UI töltené le.
- Scope-ok a manifestben: `read:attachment:confluence`, `readonly:content.attachment:confluence` (az első push előtt ellenőrizendő).
- Nyitott kérdés az első pushra: a `view.submit` pontos payload-alakja a Custom UI makró-confighoz (az 1. lépés óta a config objektumot adjuk át közvetlenül).
