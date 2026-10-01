# 1. fejlesztési lépés: MVP-váz (beillesztett spec megjelenítése)

Cél: egy Forge Custom UI Confluence makró, amely egy a makró beállításában beillesztett OpenAPI/Swagger specifikációt (JSON vagy YAML) Swagger UI-val megjelenít egy oldalon. Csak megtervezett lépés, a megvalósítás Claude Code-ban történik.

## Hatókör

Benne van:
- Forge app váz, Custom UI, TypeScript.
- Makró beállítás: szövegmező, ide kerül a spec (JSON vagy YAML).
- Makró nézet: parse + Swagger UI megjelenítés.
- Hibás spec esetén olvasható hibaüzenet, üres makrónál útmutató szöveg.
- Világos/sötét téma követése (alap szinten).
- Telepítés és tesztelés a saját **fejlesztői** Confluence site-on.

Nincs benne (későbbi lépés): csatolmányból és URL-ből töltés, „Try it out”, Redoc, Marketplace listing.

## Előfeltételek

1. Atlassian fiók és ingyenes dev site: lásd `docs/PLAN.md`, „Fiók és költségek”.
2. Node.js LTS (a Forge támogatott verziója), npm.
3. `npm install -g @forge/cli`, majd `forge login` (API token az Atlassian fiókból).

## Javasolt repó-szerkezet

```
manifest.yml
package.json                # gyökér: Forge függőségek (@forge/resolver, @forge/api)
tsconfig.json
src/                        # backend (Forge function)
  index.ts                  # resolver: exportálja a handlert
static/
  macro-ui/                 # Custom UI (Vite + React + TS), saját package.json
    index.html
    src/
      main.tsx              # belépő, @forge/bridge view.getContext()
      App.tsx               # nézet vs. beállítás módválasztás
      ViewMacro.tsx         # parse + Swagger UI
      ConfigMacro.tsx       # textarea + mentés (view.submit)
      lib/parseSpec.ts      # JSON/YAML -> objektum, hibakezelés
      lib/theme.ts          # téma-követés
    vite.config.ts
tests/                      # Vitest (parseSpec, hibaesetek)
docs/
LICENSE, CONTRIBUTING.md, THIRD_PARTY_NOTICES
.github/workflows/ci.yml    # lint + test + build
```

## Manifest (vázlat)

A pontos kulcsokat és a runtime nevet a `forge create` által generált sablon adja, azt kell alapul venni és ellenőrizni (a Forge manifest sémája változik).

```yaml
modules:
  macro:
    - key: koapidoc-macro
      title: KoApiDoc
      description: OpenAPI / Swagger specifikáció megjelenítése
      resource: macro-ui
      resolver:
        function: resolver
      config:
        resource: macro-ui     # ugyanaz a bundle, App.tsx dönti el a módot
        openOnInsert: true
  function:
    - key: resolver
      handler: index.handler
resources:
  - key: macro-ui
    path: static/macro-ui/dist
permissions:
  scopes: []                   # nincs szükség Confluence API-ra az 1. lépésben
  content:
    styles: ['unsafe-inline']  # csak ha a Swagger UI CSS-e megköveteli; ellenőrizni
app:
  runtime:
    name: nodejs22.x           # a sablon szerint
```

Szabályok: nincs `external` / egress szekció (nincs külső hívás), scope-ok minimálisak, hogy a „Runs on Atlassian” később elérhető maradjon.

## Függőségek

- `react`, `react-dom`, `@forge/bridge`
- `swagger-ui-react` (és annak CSS-e, bundle-ölve, nem CDN-ről)
- `js-yaml` (YAML parse), `@apidevtools/swagger-parser` (validáció)
- fejlesztői: `vite`, `typescript`, `vitest`, `eslint`, `prettier`

Minden új függőség licencét felvenni a `THIRD_PARTY_NOTICES` fájlba.

## Feladatok sorrendben

1. `forge create` (Custom UI macro sablon), a váz commitja; `forge deploy`, `forge install` a dev site-ra; a „hello world” makró látszik egy oldalon.
2. A Custom UI Vite + React + TS-re állítása, `npm run build` a `static/macro-ui/dist` mappába.
3. `parseSpec.ts`: JSON/YAML felismerés, alapvalidáció (`openapi` vagy `swagger` mező), érthető hibák; egységtesztek.
4. `ConfigMacro.tsx`: textarea, mentés `view.submit({ spec })`.
5. `ViewMacro.tsx`: a mentett spec beolvasása a `view.getContext()` `extension.config` mezőjéből, Swagger UI render, hibanézet.
6. CSP/stílus finomhangolás, bundle méret ellenőrzés (cél: lassú gépen is gyorsan betöltődik, kód-split a Swagger UI-ra).
7. Téma követés (világos/sötét).
8. CI (GitHub Actions): `npm ci`, lint, typecheck, test, build, `forge lint`.
9. README rövid fejlesztői leírással.

## Elfogadási feltételek

- Egy Confluence oldalon beszúrható a „KoApiDoc” makró, a beállításban beillesztett példa spec (pl. Petstore 3.0 JSON és YAML) szépen megjelenik, a végpontok nyithatók.
- Hibás vagy üres spec nem dob kivételt, hanem érthető hibaüzenetet mutat.
- Konzolban nincs CSP-hiba, nincs külső hálózati kérés.
- `npm test`, `npm run lint`, `npm run build`, `forge lint` hibamentes.
- Az app a dev site-on telepítve működik szerkesztő és megtekintő módban is.

## Parancsok (vázlat)

```bash
npm install -g @forge/cli
forge login
forge create                       # Custom UI macro sablon
npm install && (cd static/macro-ui && npm install)
(cd static/macro-ui && npm run build)
forge deploy
forge install                      # Confluence, dev site
forge tunnel                       # élő fejlesztés (előtte tunnel-kompatibilis build)
npm test && npm run lint
forge lint
```

## Kockázatok az 1. lépésben

- A Custom UI CSP miatt a Swagger UI stílusa vagy scriptje elromolhat: ezt a 6. feladatban kell megoldani, ha kell, a manifest `content.styles` beállításával.
- A macro config módban és nézet módban ugyanaz a bundle fut: a módot az extension context alapján kell megkülönböztetni.
- A makró-paraméterek mérete korlátos lehet: nagy spec beillesztésénél ez problémát okozhat, ezért kerül a 2. lépésbe a csatolmány-támogatás.
- A `forge deploy` development környezetbe megy, éles telepítést ne végezz.
