<!--
  Draft for the Marketplace listing (step 4). Must be reviewed by a lawyer before the
  submission (step 6). Keep in line with docs/MARKETPLACE-LISTING.md ("Privacy and security").
-->

# KoApiDoc for Confluence: privacy policy

Last updated: 2 October 2026

This policy explains what happens to data when you use **KoApiDoc for Confluence** ("KoApiDoc",
"the app"), a Confluence Cloud macro that displays OpenAPI and Swagger specifications. The app is
provided by Koncsik Benedek (HunKonTech), Hungary ("we", "us").

## Summary

KoApiDoc does not collect, store, sell or share personal data. It has no server of its own, does
not use cookies, analytics or tracking, and does not send any data to us or to third parties. Everything
it displays is read from your Confluence site and processed in the viewer's browser.

## What the app does with your data

**Macro configuration.** When someone adds the macro to a page, Confluence stores the macro's
configuration as part of the page: either the pasted specification text, or the ID and file name of
the chosen attachment, plus the display options (expansion, schemas, search box, tags, height). This
data is stored and controlled by Atlassian as part of your Confluence content. We cannot access it.

**Attachments.** When a page with the macro is viewed, the app asks Confluence for the chosen
attachment of that page, using the permissions of the person viewing the page. The file is read and
displayed in that person's browser. The app only reads attachments of the page that contains the
macro, never changes content, and keeps no copy.

**What the app does not do:**

- It does not send data outside Atlassian: the app has no external network access (no "egress")
  and runs entirely on the Atlassian Forge platform. The "Authorize" dialog of the API
  documentation is disabled, so nothing you type can be sent to addresses named in a
  specification.
- It does not load content from other servers. References to external files in a specification are
  not followed, and images that point to web addresses are blocked.
- It does not store anything in the app's own storage, in cookies or in the browser's storage.
- It does not use analytics, advertising or tracking tools.
- It does not read user profiles, e-mail addresses or other pages.

## Atlassian

The app runs on Atlassian's Forge platform. Atlassian processes your Confluence data, including the
pages and attachments the app reads, under its own terms and privacy policy
(<https://www.atlassian.com/legal/privacy-policy>). Atlassian may provide us, as the app's
developer, with information about installations of the app (for example the number of installations
and the sites where it is installed), and with technical logs and metrics of the app's operation. We
use such information only to operate, support and improve the app, and we do not sell or share it.

## Support requests

If you contact us, for example through the issue tracker on GitHub, we use the information you send
(such as your user name and the content of your message) only to answer and to fix the problem.
Issues on GitHub are public and are processed by GitHub under its own privacy statement: please do
not post confidential specifications or personal data there.

## Your rights

Because we do not hold personal data about the users of the app, requests about Confluence content
(access, correction, deletion) should be directed to your Confluence site administrator or to
Atlassian. If you believe we hold personal data about you, for example from a support request,
contact us and we will answer within 30 days. You also have the right to lodge a complaint with a
data protection authority; in Hungary this is the Nemzeti Adatvédelmi és Információszabadság
Hatóság (NAIH).

## Uninstalling

When the app is uninstalled, nothing remains with us. The macro configurations remain part of your
pages in Confluence until you remove them.

## Changes to this policy

We will publish changes in this document and update the date at the top. Significant changes will
also be noted in the [changelog](../CHANGELOG.md).

## Contact

Koncsik Benedek (HunKonTech), Hungary.
Issue tracker: <https://github.com/HunKonTech/KoApiDoc/issues>.
Security reports: see [SECURITY.md](../SECURITY.md).
