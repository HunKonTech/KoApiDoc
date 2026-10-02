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
