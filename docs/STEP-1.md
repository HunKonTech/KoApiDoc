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

## Helyi tesztelés a saját gépeden

A Forge app nem fut teljesen helyben: a kód az Atlassian felhőben fut, a saját gépedről a `forge tunnel` irányítja át a hívásokat. Ezért kell egy valódi (ingyenes) Confluence Cloud dev site.

### Előfeltételek
1. Atlassian fiók és ingyenes dev site: [go.atlassian.com/cloud-dev](https://go.atlassian.com/cloud-dev) (a Confluence terméket add hozzá).
2. Node.js (a Forge által támogatott LTS) és npm.
3. Forge CLI: `npm install -g @forge/cli`.
4. Atlassian API token ([id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)), majd `forge login`.
5. Docker: a `forge tunnel` régebbi CLI-verziókhoz Dockert kért. Az aktuális verzió követelményét a `forge tunnel` első futtatásakor és a Forge dokumentációban ellenőrizd.

### Egyszeri beállítás
```bash
git clone https://github.com/HunKonTech/KoApiDoc.git && cd KoApiDoc
npm install && (cd static/macro-ui && npm install)
forge register            # saját app-azonosító, mert a klón másik fejlesztőé
forge deploy -e development
forge install -e development   # Confluence + a dev site címe
```

### Napi fejlesztés
- Nézet/UI fejlesztés: a Vite dev szerver fut helyben, a `forge tunnel` erre irányítja a Custom UI-t (a manifest `tunnel` portját a sablon alapján kell beállítani, hot reload működik).
- Backend (resolver) módosításra a `forge tunnel` újratölti a kódot, nem kell `deploy`.
- Manifest- vagy scope-változás után kötelező `forge deploy`, és scope-változásnál `forge install --upgrade`.
- Logok: `forge logs`.

### Csatolmány-mód helyben (2. lépés, Atlassian nélkül)
`npm run dev:local`, majd a `local.html` fejlécében:
- **Spec → Page attachment** csoport: a nézet a mock oldal csatolmányát tölti be (`petstore.json`, `petstore.yaml`, `multi-tag-3.1.json`, `with-external-ref.json`, valamint egy törölt csatolmányra mutató config).
- **Mode = config** és **Page attachment** forrás: a lista csak a `.json/.yaml/.yml` fájlokat mutatja (névvel, mérettel); mentés után a „Saved from config” nézet a kiválasztott csatolmányt jeleníti meg.
- **Failure**: `forbidden`, `missing`, `toolarge`, `notext`, `slow` (20 s, a 15 s-os időkorlát után hibaüzenet). Mindegyik érthető angol hibaüzenetet ad.
- **External $ref**: figyelmeztetés látszik, a spec többi része megjelenik, külső kérés nincs.

### Teszt-forgatókönyv
1. A dev site-on hozz létre egy oldalt, és szúrd be a „KoApiDoc” makrót.
2. A beállításban illessz be egy Petstore JSON-t, majd egy YAML-t: mindkettő jelenjen meg.
3. Illessz be hibás szöveget: érthető hibaüzenetet kell látnod.
4. Próbáld sötét és világos témában, szerkesztő és megtekintő módban.

### Fontos
- Csak a `development` környezetbe telepíts: az éles (`production`) telepítés számlázást és valódi felhasználói hatást jelenthet.
- A helyi teszthez sem kell fizetni: a dev site és a Forge ingyenes keret elég.
