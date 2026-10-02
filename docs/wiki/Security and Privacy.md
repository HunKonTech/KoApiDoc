# Security and Privacy

- Runs on Atlassian Forge ("Runs on Atlassian"); no external network access is declared.
- Reads attachments **as the person viewing the page**. No access means an error message, never the content.
- Reads only attachments of the page containing the macro; never creates or changes content.
- The specification is processed in the reader's browser. Nothing is stored outside Confluence; no data is sent to the developer or third parties.
- A pasted specification is stored in the page (visible to editors, kept in page history).
- Remote images in descriptions are blocked.

Full texts: [Privacy policy](https://github.com/HunKonTech/KoApiDoc/blob/main/docs/PRIVACY.md), [Security policy](https://github.com/HunKonTech/KoApiDoc/blob/main/SECURITY.md). Report vulnerabilities privately through GitHub private vulnerability reporting.
