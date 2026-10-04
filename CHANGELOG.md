# Changelog

All notable changes to KoApiDoc for Confluence. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/) (see `docs/RELEASING.md` (private repository)).

## [0.1.0] - unreleased

First Marketplace release (Confluence Cloud, Forge).

### Added

- Confluence macro that renders Swagger 2.0, OpenAPI 3.0 and OpenAPI 3.1 specifications (JSON or
  YAML) with Swagger UI, read-only.
- Sources: text pasted into the macro, or a `.json` / `.yaml` / `.yml` attachment of the same page
  (always its latest version, up to 2 MB), read with the permissions of the viewer.
- Display options: expansion on load, Schemas section, search box, tags to show, automatic or fixed
  height; live preview in the configuration.
- Search across path, method, summary, operation ID and tag.
- Light and dark theme following Confluence.
- Readable messages for invalid specifications, missing or unreadable attachments, files above the
  limit, timeouts and specifications that break the renderer.
- References to external files are not loaded; they are shown as placeholders with a note.
- Remote images in descriptions are blocked (Content Security Policy).
- Specifications above 2 MB (pasted text as well as attachments) and documents with more than
  2,000,000 values (for example YAML alias bombs) are rejected with a message instead of freezing
  the browser; the configuration does not save pasted text above these limits.

### Known limitations

- No "Try it out"; PDF / Word export and printing do not include the macro; external `$ref`s are
  not supported. See [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md#limitations).
