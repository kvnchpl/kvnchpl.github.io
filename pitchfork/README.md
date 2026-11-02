# Pitchfork microsite

Self-contained, dependency-free static microsite for `https://kvnchpl.com/pitchfork/`.

## Included

- Artist/album search, Pitchfork score range, personal-review filter.
- Artist, Pitchfork score, Kevin score, and signed score difference sorting.
- Score index and review-card views, with shareable URL filter state.
- Six permanent, server-rendered review pages; writing preserved from the supplied text file.
- Responsive black/white design using the existing site's Roboto Mono font.
- Source and coverage notes. This starter is **not the complete Pitchfork index**.

## Content

Edit `data/albums.json`, then run from the repository root:

```sh
python3 pitchfork/scripts/build.py
```

Commit both the JSON and regenerated HTML. No installation or runtime build required. GitHub Pages serves the folder directly. Preview using any static HTTP server at the repository root (ES modules and fetch require HTTP rather than file://).

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
