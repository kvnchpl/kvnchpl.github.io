# Pitchfork microsite

Self-contained, dependency-free static microsite for `https://kvnchpl.com/pitchfork/`.

## Included

- Artist/album search, sorting, an expandable Pitchfork score range, and all-albums / my-reviews views.
- Artist, Pitchfork score, Kevin score, and signed score difference sorting.
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

Only artist, title, release year, primary genre, review date, and score are extracted. No review prose, artwork, Spotify features, or record labels are imported. Unknown fields stay empty. The dataset omits original review URLs; the shared source notes link to Zenodo instead of fabricating review links. Scores retain `verifiedAt: null`. Review dates span 1999-01-05 to 2019-12-31; coverage is incomplete and excludes newer reviews except supplied personal entries. The browser displays 100 index rows per page and searches/sorts the whole catalog; shared filters apply to the whole collection.

Browser validation covers desktop (1440px) and mobile (390px and 320px), including search, pagination, view switching, review navigation, overflow, and page errors.

## Interface conventions

The index and permanent review pages share the main site's inner-page header: the exact `site-identity` div/link/SVG/accessibility markup, its responsive placement, and home, collection, about, and thoughts links with their existing codes, destinations, and uppercase-to-lowercase hover/focus behavior. Keep these aligned with the main site's canonical navigation. The microsite remains unlisted; its header links outward without adding a main-site entry.

Keep the default index compact: one introduction, all albums / my reviews, search, and sorting. Score bounds expand under Score range; incoming min/max parameters open them and active bounds are indicated even when collapsed. Historical `mine=1` URLs open my reviews and normalize to `view=reviews`. Source attribution, coverage limits, and verification notes remain available under About this index & sources. Personal album titles link to the permanent reviews; source links are consolidated below the results.

The index hero follows the collection heading’s responsive insets, heading size, line height, and margins, with normal letter spacing on both. Keep this parity when changing either layout.
