# 3. fejlesztési lépés: megjelenítési beállítások és robusztusság (helyi mock-first)

Előzmény: az 1. és 2. lépés kész, a 2. lépés ellenőrzése a [`docs/STATUS.md`](STATUS.md)-ben van. Az alapelv változatlan: **semmi nem kerül az Atlassian felé** (`forge register`, `deploy`, `install`, `tunnel` nincs). Minden a helyi mockon (`npm run dev:local`) készül és tesztelődik.

## Cél

A makró használható legyen valós, nagy és rendetlen specekkel is, és a szerkesztő beállíthassa, hogyan jelenjen meg. A lépés végére az app funkcionálisan teljes az MVP-hez; ami hátra van, az Atlassian-oldali ellenőrzés és a Marketplace-előkészítés.

Nincs benne: URL-betöltés (külső hívás, `external` egress), „Try it out”, Redoc, másik oldal csatolmánya, Data Center.

## Döntések a lépés elején

| Kérdés | Javaslat | Miért |
|---|---|---|
| „Try it out” kell-e | **Nem ebben a lépésben** (kapcsolható beállításként később, ha kell) | Külső hívás kell hozzá: `external` egress, ami elveszi a „Runs on Atlassian” jelvényt, és CORS/CSP-gondokat hoz |
| Hány beállítás | Kevés, jól választott (lent) | Minden beállítás egy tesztelendő állapot |
| Hol tárolódik | A makró konfigurációjában, a forrás mellett | Nincs külön tároló, nincs backend |

## Beállítások (makró-konfiguráció)

A config bővül egy `options` objektummal, a régi alakok (`{spec}`, `{source, ...}`) változatlanul olvashatók maradnak.

| Beállítás | Értékek | Alapérték |
|---|---|---|
| Kibontás | összecsukva, tagek nyitva, minden nyitva | tagek nyitva |
| Sémák (Schemas) szakasz | látszik / rejtve | látszik |
| Szűrő mező (keresés végpontok között) | be / ki | be |
| Tag-szűrés | egy vagy több tag kiválasztása, vagy mind | mind |
| Magasság | automatikus / fix (px) a hosszú specekhez, belső görgetéssel | automatikus |

A régi config új mezők nélkül is ugyanúgy jelenik meg, mint most.

## Robusztusság

- **Hibahatár (error boundary)** a Swagger UI körül: ha a renderelő elbukik egy furcsa speccel, érthető hibaüzenet jelenik meg, nem üres felület.
- **Nagy spec védelem:** a 2 MB-os korlát megmarad; felette az érdemi renderelési idő mérése és figyelmeztetés (pl. 1000+ végpont esetén ajánlás tag-szűrésre).
- **Hozzáférhetőség (a11y):** billentyűzetes használat, fókusz a hibaüzeneteknél, `role`/`aria` ellenőrzés (axe automata teszt a mockon).
- **Téma:** világos és sötét ellenőrzése az új beállításokkal is.
- **Magasság és átméretezés:** a Forge Custom UI iframe magasságának kezelése (automatikus méretezés vagy fix). A pontos bridge-API-t (`view.resize` vagy a manifest beállításai) a Forge dokumentációjában kell ellenőrizni; helyben a mock szimulálja.
- **Nyomtatás/PDF-export:** a Confluence exportja nem futtat Custom UI-t. Itt a teendő a hatókör eldöntése: statikus tartalék (pl. a makró helyett rövid szöveg a spec címével és verziójával) vagy csak dokumentált korlát. Javaslat: dokumentált korlát most, statikus tartalék a Marketplace-előkészítésben, ha a Forge ezt a makrónál támogatja.

## Repó-változások

```
static/macro-ui/src/
  lib/options.ts            # beállítások típusa, alapértékek, parse/migráció
  lib/specFilter.ts         # tag-szűrés a spec másolatán (az eredeti nem módosul)
  ErrorBoundary.tsx
  ConfigMacro.tsx           # beállítások űrlap (kibontás, séma, szűrő, tagek, magasság)
  SwaggerView.tsx           # beállítások átadása a Swagger UI-nak
tests/
  options.test.ts           # migráció, érvénytelen értékek
  specFilter.test.ts        # tag-szűrés, hivatkozások épsége
  components/ErrorBoundary.test.tsx
  fixtures/large-1000.json  # generált, több ezer végpontos teszt-spec (generátor script, nem commitolt nagy fájl)
e2e/
  playwright.config.ts      # a vite --mode mock szerverre
  macro.spec.ts             # headless böngészős tesztek (lásd lent)
.github/workflows/ci.yml    # e2e lépés hozzáadása
```

## Feladatok sorrendben

1. **Fixture-ök és tesztek előbb:** `options.test.ts`, `specFilter.test.ts`, nagy spec generátor.
2. **`options.ts`:** típus, alapértékek, migráció; a `config.ts` bővítése úgy, hogy a régi alakok érintetlenek.
3. **`specFilter.ts`:** tag-szűrés a spec másolatán; a nem használt `components` kezelése (megtartjuk, a hivatkozások ne törjenek); teszt `$ref`-es specekkel.
4. **`ErrorBoundary.tsx`** és beépítése a `SwaggerView` köré.
5. **`SwaggerView.tsx`:** az opciók átadása (`docExpansion`, `defaultModelsExpandDepth`, `filter`), a sémák elrejtése, a magasság kezelése.
6. **`ConfigMacro.tsx`:** a beállítások űrlapja, a változás élő előnézettel a konfigurációs ablakban, ha a mérete engedi (különben csak mentés után).
7. **Mock bővítése:** a `local.html`-ben a beállítások kapcsolói; a nagy spec betölthető mintaként.
8. **Teljesítmény-mérés a mockon:** a 135 KB-os (1500 végpont) és a 2 MB-os határesetű spec renderelési ideje; küszöb rögzítése a dokumentumban; ha a lassú eset gyakori, tag-szűrésre irányító figyelmeztetés.
9. **a11y:** axe-core automata ellenőrzés a nézeten és a konfiguráción; a kritikus hibák javítása.
10. **E2E tesztek (Playwright, headless):** a 2. lépés ellenőrzésénél kézzel futtatott forgatókönyvek automatizálása: JSON/YAML/3.1/külső `$ref`/hibaüzemmódok/régi config/sötét téma; külső hálózati kérés nincs (a teszt ezt is ellenőrzi).
11. **CI:** e2e lépés, a Playwright böngésző telepítésével; a futásidő figyelése.
12. **Dokumentáció:** README és a helyi tesztelés szakasz frissítése; a `THIRD_PARTY_NOTICES` licencvizsgálata (`license-checker`) és frissítése.

## Elfogadási feltételek (mind helyben, Atlassian nélkül)

- `npm run lint`, `typecheck`, `test`, `build`, `prettier --check` hibamentes, az e2e tesztek zöldek helyben és CI-ban.
- Minden beállítás hatása látszik a mockon; a régi config (`{spec}`, `{source: 'attachment', ...}`) beállítások nélkül ugyanúgy működik.
- Egy szándékosan elromlott speccel (pl. rosszul formált, de parse-olható struktúra) a hibahatár üzenetet mutat, nem üres képernyőt.
- A nagy spec renderelési ideje mérve és dokumentálva; a 2 MB feletti fájl továbbra is érthető hibát ad.
- Az axe ellenőrzés nem talál kritikus vagy súlyos hibát.
- A production build nem tartalmaz mock-kódot, és nincs külső hálózati kérés.

## Kockázatok

- A Swagger UI belső viselkedése (szűrő, kibontás) verziófüggő; a beállításokat a bundle-ölt verzióhoz kell tesztelni, és a frissítésnél újra ellenőrizni.
- A tag-szűrés a spec másolatán dolgozik; hibás szűrés törhet `$ref`-eket. Ezért a `components` érintetlen marad.
- A magasság/átméretezés a valós Forge iframe-ben másképp viselkedhet, mint a mockon; ez az első Atlassian-ellenőrzés (STEP-5) tárgya.
- Az e2e tesztek a CI-ban lassíthatják a futást; ha szükséges, külön job.

## Állapot (2026-10-02): elkészült, helyben ellenőrizve

| Elfogadási feltétel | Eredmény |
|---|---|
| `lint`, `format:check`, `typecheck`, `test`, `build` | hibamentes; 174 unit/komponens teszt (10 fájl: options, specFilter, operationSearch, config, specSource, externalRefs, parseSpec, ConfigMacro, ViewMacro, ErrorBoundary) |
| E2E (Playwright, headless Chromium) | 39/39 zöld helyben (kb. 11 s); CI-ban külön `e2e` job |
| Minden beállítás hatása látszik a mockon | kibontás (3 mód), Schemas be/ki, keresőmező be/ki és keresés, tag-szűrés, fix magasság belső görgetéssel, sötét téma: mind e2e teszttel |
| Régi config beállítások nélkül | `{spec}` és `{source: 'attachment', ...}` az alapértékekkel, változatlanul jelenik meg (unit és e2e) |
| Elromlott spec → hibahatár | az önmagára hivatkozó YAML-anchor (`broken-structure` minta) érthető, fókuszált hibaüzenetet ad, nem üres képernyőt |
| Nagy spec mérve, 2 MB felett érthető hiba | lent a mérés; a `too-large.json` (2,6 MB) „larger than the 2.0 MB limit” üzenetet ad |
| axe | 9 nézet (világos/sötét, config, hibák): 0 kritikus és 0 súlyos hiba |
| Production build | nincs benne mock-kód; induló JS 379 KB (117 KB gzip), a Swagger UI lusta chunk 1,36 MB |
| Külső hálózati kérés | 0 (minden e2e teszt ellenőrzi), kezeletlen kivétel 0 |

### Teljesítmény-mérés (mock, production build, headless Chromium, Apple Silicon)

| Spec | Méret | Első műveletek láthatók | Swagger UI kész | Keresés (1 találat) |
|---|---|---|---|---|
| `large-1500.json`, 1500 művelet | 460 KB | 0,9–1,1 s | kb. 0,46 s | kb. 40 ms |
| `large-2mb.json`, 2000 művelet | 1,9 MB | 1,2–1,4 s | kb. 0,54 s | kb. 30 ms |
| `large-1500.json`, minden kibontva | 460 KB | 1,05 s | 0,46 s | |
| `large-2mb.json`, 1 tag (100 művelet) | 1,9 MB | 0,87 s | 0,37 s | |

A Swagger UI 5.33 a hosszú műveletlistát virtualizálja (csak a látható elemek kerülnek a DOM-ba), ezért a 2 MB-os határig sem lassú. Küszöb: **1000 művelet** (`LARGE_SPEC_OPERATIONS`). E fölött a konfiguráció javasolja a tag-szűrést; az olvasóknak nem jelenik meg figyelmeztetés, mert a mérés szerint nincs érdemi lassulás, és ők a makrót amúgy sem szerkeszthetik. Lassabb gépen az idők többszörösek lehetnek; ezt az 5. lépésben valós Confluence-ben érdemes ránézni.

### Megvalósítási döntések és eltérések a tervtől

- **Config:** `{ source, ..., options }`; az `options` mezőnként validált (`parseOptions`), érvénytelen érték csak a saját mezőjét állítja alapértékre. A Swagger UI saját nevei (`none`/`list`/`full`) is olvashatók.
- **Keresőmező:** a Swagger UI beépített szűrője csak tag-névre szűr és nincs címkéje (axe-hiba). Saját `FilterContainer` és `opsFilter` plugin váltja: útvonal, metódus, összefoglaló, operation ID és tag szerint keres (szavanként, kis-/nagybetű-független). A webhookokra a Swagger UI nem alkalmazza a szűrőt.
- **Tag-szűrés:** a spec másolatán; a `components`/`definitions` érintetlen, a `$ref`-es path item egészben marad, ha minden művelete illeszkedik, különben kifejtve kerül be. A tag nélküli műveletek a Swagger UI-hoz igazodva `default` tagként választhatók. Ismeretlen (pl. átnevezett) tag esetén figyelmeztetés.
- **Sötét téma:** a korábbi `filter: invert` helyett a Swagger UI 5 saját sötét módja (`html.dark-mode`), így az axe valós színeket mér. A világos témában néhány Swagger-szín (metódus-címkék, verzió-jelvény, link) sötétebb árnyalatot kapott a WCAG AA kontraszt miatt.
- **Hibahatár:** a Swagger UI komponensenként saját hibahatárt használ („Could not render …”), ezért a legtöbb furcsa struktúra (pl. `get: "oops"`) részleges megjelenítést ad, nem összeomlást. A mi hibahatárunk azt fogja meg, ami a tetejéig jut (körkörös YAML-anchor, a lusta chunk betöltési hibája), fókuszt kap és `role="alert"`.
- **Magasság:** a `@forge/bridge` 7.1-ben nincs resize-hívás; a Forge host a Custom UI keret magasságát a tartalomhoz igazítja. Automatikus módban nem teszünk semmit, fix módban a makró a megadott magasságú, billentyűzettel elérhető (`role="region"`, `tabIndex=0`) görgethető doboz. A mock (`local.html`, „Size frame to content”) ezt szimulálja. Valós ellenőrzés: 5. lépés.
- **Élő előnézet:** a konfigurációban „Show preview” gombbal, a beállítások minden változására újrarajzol (a Swagger UI a beállításait csak indításkor olvassa, ezért újraindul).
- **Nyomtatás/PDF-export:** dokumentált korlát (README); statikus tartalék a 4. lépésben, ha a Forge támogatja.
- **E2E:** a Playwright nem a `vite` dev szerverre, hanem a mock production buildjére (`vite build --mode mock` + `vite preview`) fut: ugyanaz a bundle, mint élesben (csak a bridge mock), és reális időket mér. Az axe-ből a lap-szintű szabályok (`region`, `landmark-one-main`, `page-has-heading-one`) ki vannak kapcsolva, mert a makró egy Confluence-oldal része; a megmaradt közepes súlyú jelzések (`heading-order`, `landmark-unique`) a Swagger UI belső szerkezetéből jönnek.
- **Nagy spec fixture-ök:** `tests/fixtures/largeSpec.ts` generálja (a terv `large-1000.json` helyett `large-1500`, `large-2mb`, `too-large`); `npm run fixtures:large` fájlba írja (git-ignored), a mock csatolmányként kínálja.
- **Licenc:** a bundle 106 csomagja (source mapből) license-checkerrel átnézve, `THIRD_PARTY_NOTICES` frissítve; GPL/LGPL/AGPL nincs. `npm run licenses` ismételhető.
- **Lockfile:** a `package-lock.json` nem volt szinkronban (`@colors/colors` hiányzott, az npm 11 `npm ci` elutasította); javítva.

### Nyitott kérdések az 5. lépésre

- A keret magassága valós Confluence-ben (automatikus és fix mód, szerkesztő és megtekintő nézet).
- A Swagger UI sötét módja a Confluence sötét témájával együtt (színek, design tokenek).
- Nagy spec ideje valós környezetben, lassabb gépen.
- A makró-konfiguráció mérethatára beállításokkal együtt (a tag-lista max. 200 elem).
