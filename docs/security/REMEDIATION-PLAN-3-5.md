# KoApiDoc – részletes javítási terv: 3–5. lépés

A [`REMEDIATION-PLAN.md`](REMEDIATION-PLAN.md) 3., 4. és 5. lépésének kidolgozása. Az 1. és a 2.
lépés kész (PR #15). Állapot: terv, kód még nem változott. Atlassian site-ra semmi nem települ.

Sorrend és forma:

| #   | Lépés              | Forma                          | Függ                          |
| --- | ------------------ | ------------------------------ | ----------------------------- |
| A   | Bemenetkezelés     | 1 PR, találatonként 1 commit   | –                             |
| B   | Repóbeállítások    | kézi, GitHub UI (admin)        | – (a #15 már a `main`-en van) |
| C   | Dokumentáció       | az A PR utolsó commitja        | A                             |

Minden commit előtt: `npm run lint`, `format:check`, `typecheck`, `test`; a PR előtt `build` és
`test:e2e` is.

## A. Bemenetkezelés

### A1. KOA-08 – méret- és komplexitáskorlát minden specre (először, mert A2 erre épít)

Hely: `static/macro-ui/src/lib/parseSpec.ts`, `ConfigMacro.tsx`.

- `parseSpec` elején: ha `new TextEncoder().encode(raw).byteLength > MAX_SPEC_BYTES` → új
  hibakód `too-large`, üzenet: „The specification is larger than the 2.0 MB limit.”
  (`formatBytes`-szal). Így az inline spec a nézetben és a konfiguráció előnézetében is ugyanígy
  jár el, mint az attachment.
- Az `exceedsNodes` ne csak YAML-re fusson: `if (exceedsNodes(doc, MAX_NODES))` minden
  dokumentumra. A konstans neve `MAX_YAML_NODES` → `MAX_NODES` (a régi név exportja megmarad
  aliasként, ha a tesztek importálják). JSON-nál a hibaszöveg ne az aliasokról szóljon:
  „The specification has more than 2,000,000 values.”
- `ConfigMacro`: ha a `check` eredménye `too-large` vagy `too-complex`, a mentés gomb legyen
  tiltva (`canSave`), és a meglévő hibaüzenet-helyen jelenjen meg az ok.
- Tesztek (`tests/parseSpec.test.ts`): 2 MB + 1 bájt → `too-large`; pontosan 2 MB → nem
  `too-large`; JSON 2 000 001 értékkel → `too-complex`; több bájtos UTF-8 karakterek a határon.
  `tests/components/ConfigMacro.test.tsx`: túl nagy inline spec → mentés tiltva.

### A2. KOA-06 – külső `$ref` csere mélységkorlát nélkül

Hely: `static/macro-ui/src/lib/externalRefs.ts`.

- A rekurzív `walk` helyett iteratív bejárás explicit veremmel, `MAX_DEPTH` nélkül. Mivel az A1
  után minden dokumentum legfeljebb 2 000 000 értékű, a bejárás korlátos, és nincs stack overflow
  20 000 szintnél sem.
- Viselkedés változatlan: a bemenet nem módosul; ha nincs külső `$ref`, az eredeti objektum jön
  vissza; a csere szövege ugyanaz.
- A másolatba írás A5 szerint (`defineProperty`), hogy a két javítás ne ütközzön.
- Tesztek (`tests/externalRefs.test.ts`): 205 és 5 000 szint mélyen lévő külső `$ref` → cserélve,
  `refs` tartalmazza; tömbben lévő `$ref`; lokális `#/...` érintetlen; a bemenet nem változik.
- e2e: új fixture `tests/fixtures/malicious/deep-external-ref.json` (generálva, kis méretű) →
  megjelenik a „External references are not supported” figyelmeztetés, nincs kimenő kérés.

### A3. KOA-07 – attachment-tulajdonos ellenőrzése

Hely: `confluenceSpecSource.ts:57-58`.

- Tulajdonos = `meta.pageId ?? meta.blogPostId ?? meta.customContentId`.
- Ha egyik sincs, vagy `String(owner) !== pageId` → `SpecSourceError('missing')`. (Most hiányzó
  `pageId` esetén átengedi.)
- A mock (`dev/bridge-mock.ts`) már ad `pageId`-t, nem kell változtatni.
- Tesztek (`tests/specSource.test.ts`, a meglévő „on another page” sor mellé): `pageId` nélkül →
  `missing`; `blogPostId: '123'` (egyezik) → betölt; `blogPostId: '999'` → `missing`;
  `customContentId` ugyanígy; szám típusú `pageId: 123` → betölt.
- Kockázat: ha a Confluence v2 valamelyik válaszában mégsem szerepel a tulajdonos, a betöltés
  elbukik. Ezt a 6. lépésben (élő dev site) ellenőrizni kell.

### A4. KOA-09 – méretkorlát letöltés közben

Hely: `confluenceSpecSource.ts:60-67, 134-142`.

- Metaadat: a betöltésnél a nyers `meta.fileSize` legyen nem negatív szám, különben
  `SpecSourceError('failed', 'Confluence did not report the attachment size.')`. A lista
  (`toAttachmentInfo`) viselkedése nem változik.
- Letöltés: ha van `Content-Length` fejléc és nagyobb, mint `MAX_SPEC_BYTES` → `too-large`
  olvasás előtt.
- `readBytes(response, limit)`: ha van `response.body?.getReader()`, darabonként olvas és a
  limit átlépésekor `reader.cancel()` + `too-large`. Ha nincs, marad az `arrayBuffer()` /
  `text()` út, a mostani utólagos ellenőrzéssel. (Hogy a `requestConfluence` válasza ad-e
  `body`-t, élőben derül ki; a kód mindkét esetet kezeli.)
- Tesztek: `fileSize` hiányzik / szöveg / negatív → hiba; `Content-Length: 3000000` → `too-large`,
  a `body` nem olvasódik; stream, ami 2 MB után is küld → `too-large` és `cancel` meghívva; stream
  a limit alatt → betölt.

### A5. KOA-14 – `__proto__` kulcsok biztonságos másolása

Hely: `externalRefs.ts` (A2 után), `specFilter.ts` (`filterSection`: `out[key]`, `copy[field]`).

- Közös segédfüggvény `lib/json.ts`: `setOwn(obj, key, value)` =
  `Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true })`.
- Minden `out[key] = …` / `copy[field] = …` helyén ez. A `{ ...spec }` spread biztonságos, marad.
- Tesztek: `JSON.parse('{"openapi":"3.0.3",…,"paths":{"__proto__":{"get":{…}}}}')` szűrés és
  `$ref`-csere után: a kimenet saját `__proto__` kulcsa megvan, `Object.getPrototypeOf(out)` ===
  `Object.prototype`, `({}).polluted === undefined`.

### A6. KOA-15 – lapozási link normalizálása

Hely: `confluenceSpecSource.ts:43-44`.

- `new URL(next, 'https://confluence.invalid')`; elfogadva csak, ha az origin változatlan
  (`https://confluence.invalid`), és a `pathname` (a `..` feloldása után) `/wiki/api/v2/`-vel kezdődik.
  A követett útvonal `pathname + search` legyen.
- Tesztek: `/wiki/api/v2/../../rest/x` → leáll; `//evil.example.com/wiki/api/v2/x` → leáll;
  `/wiki/api/v2/%2e%2e/%2e%2e/rest/x` → leáll; a meglévő érvényes `cursor` link → követi.

### A PR elfogadási feltételei

- Minden új teszt elbukik a javítás nélkül (commitonként ellenőrizve), és átmegy vele.
- A meglévő 175 unit és 47 e2e teszt zöld, a nagy spec teljesítményteszt nem lassul.
- A malicious fixture-ök a `tests/fixtures/malicious/` mappában.

## B. Repóbeállítások (KOA-11 + a 2. lépés maradéka) – kézi, admin jog kell

Mind a GitHubon, `HunKonTech/KoApiDoc` → **Settings**. Javasolt sorrend:

1. **Actions → Runners:** a self-hosted runner eltávolítása (Remove), vagy ha szervezeti
   runner: Organization → Settings → Actions → Runner groups → a csoportból a repó kivétele,
   „Allow public repositories” kikapcsolása.
2. **Actions → General → Actions permissions:** „Allow HunKonTech, and select non-HunKonTech,
   actions” + „Allow actions created by GitHub”; **„Require actions to be pinned to a
   full-length commit SHA”** bekapcsolása. (A workflow-k a #15 óta pinelve vannak.)
3. **Advanced Security (Code security):**
   - Secret scanning → **Push protection: Enable**.
   - Code scanning → **CodeQL analysis → Set up → Default** (nyelvek: JavaScript/TypeScript,
     GitHub Actions).
   - Dependabot security updates: maradhat kikapcsolva (a `RELEASING.md` szerint az npm kézi).
4. **Dependabot csak az actionökre:** ez fájl, nem beállítás – `.github/dependabot.yml` a
   `github-actions` ökoszisztémával, havi ütemezéssel. Javaslat: az A PR-be kerüljön
   (C lépés), mert a pinelt SHA-k frissítését így nem kell kézzel követni. A
   `close-external-prs.yml` a `dependabot[bot]`-ot már engedi.
5. **Rules → Rulesets → „Protect main”:**
   - Bypass list: az admin szerep módja **Always → For pull requests only**.
   - Javaslat (döntés kell): „Require approvals” 1, ha van második ember, aki jóváhagy; egy
     fős repónál marad 0, mert különben a saját PR nem merge-elhető.
6. Ellenőrzés: a `close-external-prs` futása egy teszt-PR-en (vagy a következő `claude/*` PR-en)
   `ubuntu-latest` runneren; a CI zöld a SHA-pinning kötelezővé tétele után.

## C. Dokumentáció (KOA-13 + státuszok) – az A PR utolsó commitja

- `SECURITY.md`:
  - „attachments of other pages are rejected” → „attachments of other pages, blog posts or
    custom content are rejected; an attachment without an owner is rejected” (A3).
  - „`$ref`s to other files or URLs are never fetched; they are replaced” – A2 után igaz, csak
    ellenőrizni.
  - Új pont: a 2 MB korlát a beillesztett specre is vonatkozik, és a JSON-ra is a 2 000 000 értékes
    korlát (A1).
  - Az „Authorize”/CSP rész a #15-ben már frissült.
- `docs/PRIVACY.md`: „It does not send data outside Atlassian” – a #15 óta igaz; egy mondat, hogy
  az „Authorize” ablak le van tiltva.
- `docs/MARKETPLACE-LISTING.md`: a biztonsági állítások összevetése a `SECURITY.md`-vel.
- `docs/GITHUB-SETUP.md`: a B lépés beállításai (push protection, CodeQL, bypass mód, SHA
  pinning) a lista frissítésével; a `dependabot.yml` megemlítése.
- `docs/RELEASING.md`: a „Known audit exceptions” (KOA-10) dátummal frissítve; kiadás előtti
  ellenőrzőlistába: `zizmor .github/workflows`.
- `docs/security/SECURITY-AUDIT-2026-10-02.md`: státusz találatonként (javítva + PR link /
  elfogadott kockázat: KOA-10, KOA-16, KOA-17 / kézi: KOA-11).
- `docs/security/REMEDIATION-PLAN.md`: lépések státusza.

## Nyitott döntések

1. „Require approvals” a `main`-en: 0 marad (egy fős repó) vagy 1. Javaslat: 0, amíg nincs
   második karbantartó.
2. `.github/dependabot.yml` csak `github-actions`-re: javaslat igen.
