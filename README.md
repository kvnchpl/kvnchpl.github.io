# kvnchpl.com

Static portfolio hosted by GitHub Pages. No application dependencies or server-side runtime.

## Maintain

Edit project and writing records in `json/projects.json` and `json/writings.json`. Edit map positions, symbols, notes, and connections in `json/field.json`. Writing bodies remain authored in `writings/*.html`; profile copy lives in `about.html` and is reused in its popup.

The `landing` record in `json/field.json` sets the entrance's featured work and image. The image is displayed in grayscale on the entrance; its original asset is preserved.

Run these commands after editing content or shared code:

```sh
node scripts/build-site.mjs
node --test scripts/field.test.mjs
node scripts/check-site.mjs
git diff --check
```

Commit both sources and generated HTML. A second build should report zero updated files. Content inside `generated:*` comments is replaced by the generator.

## Structure

- `scripts/field.mjs` validates catalog relationships and renders the entrance, index, map, and previews.
- `js/field.js` manages native dialogs, URL history, map selection, and discrete color compositions.
- `css/field.css` styles the entrance, popup windows, and shared work-page frame.
- `js/main.js` handles galleries and video playback.
- Actual media and complete work pages stay in `img`, `vid`, `pdf`, `projects`, and `writings`.

The entrance has no automatic animation. Color controls alter static blocks. Browsing and preview state use `view=index`, `view=network`, `peek=1`, `about=1`, and stable work hashes. Native dialogs provide keyboard focus handling; Escape and close controls dismiss them. Without JavaScript, a complete index appears below the entrance and ordinary links reach the full works.

Visible interface text is lowercase or uppercase. Authored preformatted poetry preserves its casing. The nameplate uses SVG text; symbolic marks share one inline SVG vocabulary.

## Public files and local archive

`_config.yml` excludes maintenance sources and verification output from the GitHub Pages build. `json/nav.json` remains public because the separately hosted Thoughts theme fetches it. Catalog JSON is compiled into HTML and does not need to be served.

`.archive/` is ignored and excluded from deployment. It contains local historical documentation, the undeployed Tumblr template, and unused assets. Development reports, logs, caches, and screenshots belong in ignored `qa/`, `artifacts/`, or temporary directories. Git history also preserves previous tracked versions.

## Restore a checkpoint

Commit or stash current work, then create a branch at an existing tag:

```sh
git switch -c restore/checkpoint rollback/pre-reference-redesign-2026-10-07
```

This restores the previous sparse map and popup design locally. The original site is preserved at `rollback/pre-redesign-2026-10-02`. Return with `git switch redesign/site-2026-10-02`. Switching branches does not publish a website.
