# Pitchfork microsite

Self-contained, dependency-free static microsite for `https://kvnchpl.com/pitchfork/`.

## Included

- Artist/album search, sorting, an expandable Pitchfork score range, and all-albums / my-reviews views.
- Artist, Pitchfork score, and Kevin score sorting in both directions.
- Score index and review-card views, with shareable URL filter state.
- Six permanent, server-rendered review pages; writing preserved from the supplied text file.
- Responsive black/white design using the existing site's Roboto Mono font.
- Source and coverage notes. 18,395 records including the historical P4KxSpotify metadata snapshot. This is **not the complete or current Pitchfork index**.

## Content

Edit `data/albums.json`, then run from the repository root:

```sh
python3 pitchfork/scripts/build.py
```

Commit both the JSON and regenerated HTML. No installation or runtime build required. Netlify packages the allowed runtime files through `hosting/projects.json` and `hosting/build.mjs`; Pitchfork remains unlisted, with `noindex, nofollow` headers and no main-navigation entry. Preview using any static HTTP server at the repository root (ES modules and fetch require HTTP rather than file://).

Each album has a stable `id`, `artist`, `album`, optional `releaseYear`, `genres`, a `pitchfork` object, and an optional `personal` object. Scores must be 0–10 or null. An album without personal writing can still appear in the score index; unknown scores display a dash and sort last. Keep IDs stable after publication to preserve review links. The build script does not remove old pages when IDs change.

`personal.text` is Kevin's writing. `pitchfork.score` is a separate critic rating, never a reader score. The supplied scores remain marked unverified; URLs were located on Pitchfork but numeric scores were not independently confirmed. Mark verification only after checking the source. Missing release years, genres, and dates remain empty rather than inferred.

## Expanding the index

Import metadata into `data/albums.json` using the same schema, retaining source information and original-review URLs. Update `coverage` and the source note in `scripts/build.py` when adding an external dataset. Establish its provenance, permitted reuse, date range, and duplicates/reissues before importing. Store only album metadata and scores; link to Pitchfork's writing. No scraping, automatic updates, cover downloads, or external API dependencies are configured.

Review URLs: `/pitchfork/reviews/<stable-id>/`.

## Checks

```sh
node --check pitchfork/app.mjs
node --test pitchfork/scripts/search.test.mjs
python3 pitchfork/scripts/build.py
```

## Historical catalog import

Source: [P4KxSpotify v1.0](https://zenodo.org/records/3603330), Anthony T. Pinter, Jacob M. Paul, Jessie Smith, and Jed R. Brubaker (2020), [paper](https://doi.org/10.1609/icwsm.v14i1.7355). The authors state the dataset is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) in their paper. Attribution and modifications are shown on the index. This is a third-party historical snapshot, not an official or independently verified Pitchfork feed.

The original `output-data.csv` is kept locally at `.private/sources/output-data.csv` (not published). Version 1.0 MD5: `ef1de60923bc1ee13d946c6a05e54a0d`. The importer checks the checksum before writing. To reproduce from the repository root:

```sh
python3 pitchfork/scripts/import_catalog.py pitchfork/.private/sources/output-data.csv
python3 pitchfork/scripts/import_catalog_test.py
python3 pitchfork/scripts/build.py
```

Of 18,403 source rows, ten share the same artist, title, date, score, release year, and genre and are collapsed (some differ only in unused record-label metadata). One row without an artist is omitted. Three explicit associations in the importer connect Illinois, Planetarium, and The Age of Adz to existing IDs, producing 18,395 total records including the six personal reviews. Matching never uses fuzzy artist/title similarity. Associations preserve supplied metadata and verification status; dataset corroboration is stored separately as `catalogEvidence`.

Imported IDs hash artist, title, and review date. Different review dates remain separate records, including possible reissues; edition labels are not guessed. Conflicting duplicate metadata stops the import. Reimporting replaces only records from this source, keeping curated records and personal writing intact. Changed upstream identities require deliberate migration to keep links stable.

Only artist, title, release year, primary genre, review date, and score are extracted. No review prose, artwork, Spotify features, or record labels are imported. Unknown fields stay empty. The base CSV omits original URLs; the separate link-enrichment workflow below adds source-confirmed review and artist URLs without changing scores. Scores retain `verifiedAt: null`. Review dates span 1999-01-05 to 2019-12-31; coverage is incomplete and excludes newer reviews except supplied personal entries. The browser displays 100 index rows per page and searches/sorts the whole catalog; shared filters apply to the whole collection.

Browser validation covers desktop (1440px) and mobile (390px and 320px), including search, pagination, view switching, review navigation, overflow, and page errors.

## Interface conventions

The index and permanent review pages share the main site's inner-page header: the exact `site-identity` div/link/SVG/accessibility markup, its responsive placement, and home, collection, about, and thoughts links with their existing codes, destinations, and uppercase-to-lowercase hover/focus behavior. Keep these aligned with the main site's canonical navigation. The microsite remains unlisted; its header links outward without adding a main-site entry.

Keep the default index compact: one introduction, all albums / my reviews, search, and sorting. Score bounds expand under Score range; incoming min/max parameters open them and active bounds are indicated even when collapsed. Historical `mine=1` URLs open my reviews and normalize to `view=reviews`. Source attribution, coverage limits, and verification notes remain available under About this index & sources. Album titles in the score index link to the original Pitchfork review; artist names link to Pitchfork artist pages when present in the source. A separate my review link opens the permanent personal review.

The index hero follows the collection heading’s responsive insets, heading size, line height, and margins, with normal letter spacing on both. Keep this parity when changing either layout.

The mirrored header explicitly uses `line-height: normal`, white text, and `.15em` link underline offsets to avoid inheriting the archive body’s looser reading styles. Browser parity checks must compare all navigation links (including wrapped rows), their computed typography and underlines, and identity/heading geometry after fonts load.

Browser-tab titles follow the main site's short uppercase titles: `PITCHFORK`, `MY REVIEWS`, and the album title for each permanent review. Ordinary interface and review text displays lowercase through CSS; identity, page headings, and primary navigation are the uppercase exceptions. Keep authored review text unchanged in the data and HTML. Retain the four established primary-navigation codes only; do not add decorative codes to back links or section labels. Review pages end after the original Pitchfork link, without a footer, related-review list, asterisk, or score footnote. Verification state remains in the data and maintenance records.

## Links, dates, and reversible sorting

The score index has album / artist, Kevin, and Pitchfork columns. Artist sorting supports a–z and z–a; each rating sort supports highest and lowest. Missing ratings remain last in both directions. Existing `sort=artist`, `sort=pitchfork`, and `sort=kevin` links retain their defaults; reverse values are `artist-desc`, `pitchfork-asc`, and `kevin-asc`. Removed `sort=gap` links normalize to artist sorting.

Each result displays release information and Pitchfork review date. `releaseDate` is optional, with `releaseYear` as a year-precision fallback. Missing values read unknown; never turn a year into an invented month/day. Dates refer to the reviewed edition as recorded in the source, not a guessed original release. Personal-review cards also display these dates. The original personal-review wording and scores stay intact.

`scripts/enrich_links.py` extracts canonical review URLs, primary-artist URLs, release years, and review dates from the authors' archived HTML in `.private/sources/objectively-reviewed/` at revision `d50d9f81162632c591fd011f203d58edfcde6001`. Its small metadata cache and audit live beside the source archive. Exact artist/title/review-date and score matches or an existing URL/score association are required. Conflicting matches remain unresolved. Various Artists has no individual artist page in the archive; its name stays plain text. The renderer accepts only HTTPS pitchfork.com review/artist paths.

```sh
python3 pitchfork/scripts/enrich_links.py pitchfork/.private/sources/objectively-reviewed
python3 pitchfork/scripts/enrich_links_test.py
```

Remaining links are discovered from the public The-Fork album index and checked against the official Pitchfork page title and artist before use. `.private/tools/recover_live_links.py` retains this bounded, cached recovery workflow; `.private/sources/live-link-results.json` records outcomes and source URLs. Neither third-party review prose nor enrichment scores are published. Existing scores and dates are not overwritten, and link checking never sets score `verifiedAt`. Metadata with known spreadsheet/encoding damage is compared using documented exact identity evidence while preserving the original catalog text. Coverage records the archive revision and live-check date. Historical archive URLs may redirect or have been removed since capture.

Reimporting the original CSV preserves enriched URLs for the same stable IDs. Regenerate pages after enrichment. In all-albums results, the album title leads to Pitchfork and the separate my review link leads to Kevin's page; the my-reviews view continues to open Kevin's writing. Browser checks cover both sort directions, URL persistence, release/review dates, external link destinations, and personal-review access at desktop and mobile widths.

Current link audit: 17,784 archive matches plus 611 official-page checks supply review and artist URLs for all 18,395 records. Five renamed-artist associations are explicit in the local recovery tool. Exact component titles may identify an album within a bundled review; no personal writing is attached by these matches. Review dates and release years for the six personal entries are now filled from source metadata; their scores and writing are unchanged.

Review and release date sorts have newest/oldest directions (`review`, `review-asc`, `release`, `release-asc`), with unknown dates last. Review sorting uses Pitchfork dates in the score index and `personal.publishedAt` in my reviews. The six supplied personal reviews are labelled 2025.12.04 at the owner's direction; Pitchfork review dates remain separate and unchanged. Release-year-only values sort by year, before exact dates within that year in ascending order; no month/day is added to display.

Store dates as ISO `YYYY-MM-DD` and display full dates as `YYYY.MM.DD`; retain year-only precision where that is all the source provides. All links to Pitchfork open in a new tab with `noopener noreferrer`; personal-review and site-navigation links retain their existing behavior. The bottom notes provide concise scope and source attribution, without the import audit or duplicate personal-review browsing section. A direct-link fallback remains inside noscript for readers without JavaScript.
