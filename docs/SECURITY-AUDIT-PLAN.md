# KoApiDoc – kiberbiztonsági audit terv

Állapot: az audit lefutott 2026-10-02-án (`main` @ `50950cf`), eredmény:
[`docs/security/SECURITY-AUDIT-2026-10-02.md`](security/SECURITY-AUDIT-2026-10-02.md). A terv alapja: `main` @ `3d48421`. Atlassian felé semmi nem települ; minden ellenőrzés lokálisan / a repón fut.

## 1. Cél és scope

Cél: az alkalmazás minden biztonsági problémájának feltárása és priorizálása, javítási javaslattal.

Scope:
- Forge app: `manifest.yml`, `src/index.ts` (resolver)
- Custom UI: `static/macro-ui/src/**` (spec betöltés, parse, szűrés, renderelés, config)
- Build/dev: Vite config, mock/bridge (`dev/bridge-mock.ts`, `local.html`), `dist` tartalma
- Függőségek: mindkét `package-lock.json`
- CI/CD: `.github/workflows/*`, issue sablonok
- Repo/GitHub beállítások, titkok, git history
- Dokumentáció állításai (`SECURITY.md`, `docs/PRIVACY.md`, Marketplace listing) vs. valós működés

Nincs scope-ban: Atlassian/Forge platform, Swagger UI upstream kódja (csak a mi használatunk), éles site-ok.

## 2. Módszertan

1. **Threat model** (STRIDE, röviden): szereplők = oldal szerkesztő (rosszindulatú spec feltöltő), olvasó, külső PR-küldő, kompromittált csomag. Bizalmi határok: spec → böngésző, Confluence REST → UI, PR → CI runner.
2. **Automata eszközök**: `npm audit` (mindkét lock), OSV-Scanner, `gitleaks` (teljes history), Semgrep (JS/TS + React szabályok), `zizmor`/`actionlint` a workflow-kra, `forge lint` (ha van login), `license-checker`.
3. **Manuális kódreview** a 3. pont területei szerint.
4. **Dinamikus teszt** a lokális mockon (Playwright): rosszindulatú spec-fixture-ök (XSS payloadok, YAML bomba, óriás/mély spec, külső `$ref`, rosszul formált ID-k).
5. **Ellenőrzés**: minden találat reprodukálva (PoC vagy kód-hivatkozás), hamis pozitívok kiszűrve.

## 3. Ellenőrzési területek

### A. Forge manifest és jogosultságok
- Scope-ok minimálisak-e (`read:attachment:confluence`, `readonly:content.attachment:confluence`); kell-e mindkettő.
- Nincs `external` egress – megmarad-e, CSP/`permissions.content` beállítások.
- `requestConfluence` valóban a néző jogaival fut-e; nincs `asApp` hívás.
- Resolver: üres, de exportált handler – támadási felület, jövőbeli definíciók.
- `app.id` placeholder; runtime verzió.

### B. Spec renderelés / XSS (legkritikusabb)
- Swagger UI: Markdown/HTML sanitizálás (DOMPurify verzió, konfig), `javascript:`/`data:` linkek, SVG, `x-` extension mezők, `externalDocs.url`, `servers.url`, `info.contact`/`license.url`.
- "Try it out" valóban tiltva-e minden úton (pl. `supportedSubmitMethods`, plugins).
- Saját kód: nincs `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`; React-en kívüli DOM-írás.
- CSP (`index.html`): hiányzó direktívák (`script-src`, `style-src`, `connect-src`, `frame-src`, `form-action`); a Forge CSP-vel együtt mi az effektív policy.
- Kattintható linkek `target=_blank` + `rel=noopener`.
- Prototype pollution a parse/szűrés során (`__proto__`, `constructor` kulcsok a specben, `specFilter.ts`, `options.ts`).

### C. Bemenetkezelés és DoS
- `parseSpec.ts`: js-yaml séma (nincs custom tag), alias-limit (2M) helyessége, mélység, JSON méret.
- `limits.ts`: 2 MB limit letöltés előtt és után; bináris detektálás.
- `confluenceSpecSource.ts`: page/attachment ID validálás, path injection, paginációs link ugyanazon API-n marad-e, másik oldal attachmentje elutasítva.
- `externalRefs.ts`: minden külső `$ref` formáció (relatív, `//host`, URL-encoded, `file:`) lecserélve-e.
- Regex-ek ReDoS-ra (`operationSearch.ts`, `specFilter.ts`).
- Config (`config.ts`, `ConfigMacro.tsx`): macro config tartalmának validálása, méret, típus.

### D. Függőségek / supply chain
- Ismert CVE-k (audit, OSV), elavult/karbantartatlan csomagok (swagger-ui tranzitív fája).
- Lockfile integritás, `npm ci` használat, install scriptek.
- Dev-only kód (mock bridge) nem kerül a production bundle-be – `dist` ellenőrzés.
- Licencek.

### E. CI / GitHub Actions
- `close-external-prs.yml`: `pull_request_target` **self-hosted** runneren – runner izoláció, token jog, `if` feltétel megkerülhetősége (`author_association`, `claude/*` ág).
- Actions nincsenek SHA-ra pinelve (`actions/checkout@v4` stb.).
- `ci.yml`: Forge titkok job-szintű env-ben; fork PR-en elérhetők-e; `forge settings` lépés.
- `npx playwright install --with-deps`, artifact feltöltés tartalma (trace-ben érzékeny adat).
- Workflow `permissions` minden jobon.

### F. Titkok
- `gitleaks` a teljes historyn; `.gitignore` (`.env`, `.forge/`) lefedettség.
- Marketing/PDF/screenshotok nem tartalmaznak-e belső URL-t, tokent, személyes adatot.

### G. Adatkezelés / adatvédelem
- Nincs storage/cookie/localStorage (állítás ellenőrzése).
- Spec tartalom nem kerül logba, hibaüzenetbe, telemetriába.
- `PRIVACY.md` és `SECURITY.md` állításai egyeznek-e a kóddal (Marketplace megfelelés).

### H. Repo beállítások (GitHub)
- Branch protection `main`-en, kötelező review/CI, force-push tiltás.
- Secret scanning, push protection, Dependabot alerts, private vulnerability reporting bekapcsolva.
- Collaborator/hozzáférési lista, self-hosted runner csoport hozzárendelés.
- Hiányzó/hivatkozott fájlok (pl. `CONTRIBUTING.md`).

## 4. Priorizálás

Súlyosság: CVSS 3.1 alap + kontextus.
- **Kritikus**: kódfuttatás olvasó böngészőjében (XSS), runner/CI kompromittálás, titok kiszivárgás.
- **Magas**: jogosultság-túllépés (más oldal attachmentje), adatkiszivárgás egress-en, ismert kihasználható CVE.
- **Közepes**: DoS (fagyó oldal), hiányzó CSP direktíva, nem pinelt action.
- **Alacsony / info**: hardening, dokumentációs eltérés.

Sorrend: B → E → C → A → D → F → G → H.

## 5. Kimenet

- `docs/SECURITY-AUDIT.md` a repóban (PR-ben):
  - vezetői összefoglaló (találatok száma súlyosság szerint),
  - találat-táblázat: ID, cím, súlyosság, terület, hely (`fájl:sor`), leírás, PoC/reprodukció, javítás, státusz,
  - eszköz-kimenetek összefoglalója, hamis pozitívok listája.
- Kritikus/magas találatokra külön javító PR-ek (vagy GitHub Security Advisory, ha nyilvános repo).
- Új regressziós tesztek a rosszindulatú fixture-ökkel (`tests/fixtures/malicious/*`).

## 6. Végrehajtás lépései (Claude Code-ban)

1. Eszközök telepítése, automata scanek futtatása.
2. Manuális review A–H.
3. Dinamikus tesztek a mockon.
4. Riport megírása, priorizálás.
5. Javító PR-ek kritikus → alacsony sorrendben.
