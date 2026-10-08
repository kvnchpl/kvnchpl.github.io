# kvnchpl.com

Static portfolio hosted by GitHub Pages. No application dependencies or server-side runtime.

## Add a project

From the repository root:

```sh
node scripts/add-work.mjs project my-project "My Project" --image /path/to/artwork.webp --alt "Describe the artwork" --date 2026-10-07
```

The command copies the image, adds a catalog record, and creates the standard page. It refuses to overwrite an existing work. Edit the new record in `json/projects.json` to add images, sections, optional copy, and dates. A gallery section looks like this:

```json
{
    "images": [
        { "src": "/img/projects/my-project/artwork.webp", "alt": "Describe the first image" },
        { "src": "/img/projects/my-project/second.webp", "alt": "Describe the second image" }
    ],
    "text": "Optional section copy."
}
```

One image per file is enough. Existing projects using `file` names and small/medium/full WebP exports continue to work. `thumbnail` is optional; the first image is used when it is absent. Entries without images receive a stable cloud placeholder from the original site, stored in `img/placeholders`. For a project without images, omit `--image` and add its content before building. Optional `note` adds a short introduction, also used for search and sharing. Section descriptions always render in full on the project page. Optional `displayTitle` adds editorial line breaks to the large project title (for example, `"VIEW\nFINDER"`); the regular `title` remains its catalog and sharing name. Title size adjusts to longer names. Catalog and page dates use `YYYY.MM`; a record without a known month keeps only the year, and missing dates display `undated`.

## Add a writing

Put the text in a UTF-8 file, then run:

```sh
node scripts/add-work.mjs writing my-poem "My Poem" --body /path/to/poem.txt --date 2026-10-07
```

The command adds its catalog record and creates `writings/my-poem.html`. Line breaks, indentation, and capitalization are preserved inside `pre.writing-content`. Edit that body directly for later revisions; text outside `generated:*` comments remains authored. The helper never rewrites an existing writing.

For a PDF or independently hosted work, first put the PDF in `pdf/`, or use its website URL:

```sh
node scripts/add-work.mjs writing my-zine "My Zine" --url /pdf/my-zine.pdf
node scripts/add-work.mjs project my-site "My Site" --url https://example.com/
```

`--date` is optional and defaults to today. Titles are displayed in lowercase or uppercase; preformatted poetry keeps its casing. `node scripts/add-work.mjs --help` lists the options.

## Build and check

```sh
node scripts/build-site.mjs
node --test scripts/*.test.mjs
node scripts/check-site.mjs
git diff --check
```

Commit sources, copied media, and generated HTML together. Building again should report zero updated files. New catalog entries appear automatically in the atlas, category filters, collection pages, and sitemap. The atlas uses growing grid rows with uneven offsets; it has no fixed work count, map coordinates, relationship records, or manually positioned nodes to maintain. Each record has one `category`: `image` (image series and collages), `space` (installations, performance, and environments), `interface` (interactive and code-based work), or `writing` (poetry and publications). Use `--category space` when adding a project, or edit its catalog record later. Defaults are `image` for projects and `writing` for writings. The public label is “collection”; `/projects` shows the entire catalog; `/writings` opens the writing filter. The internal project/writing file types remain the same.

## Structure

- `json/projects.json` and `json/writings.json`: catalog records and project sections.
- `json/field.json`: the entrance's featured work, optional image, and optional local link destination (`href`). The current portrait opens about.
- `scripts/build-site.mjs`: shared metadata, galleries, catalog views, and sitemap.
- `scripts/field.mjs`: catalog validation and atlas/about markup.
- `scripts/work-page.mjs`: one standard shell for new works.
- `scripts/add-work.mjs`: content scaffolding, with no dependencies.
- `js/field.js`: fullscreen atlas/about screens, view history, and stochastic color interventions.
- `js/main.js`: galleries and video playback.
- `css/field.css`: entrance, atlas, fullscreen screens, and color room pages.
- `projects`, `writings`, `img`, `vid`, `pdf`: full pages and actual media.

Work links are ordinary links to complete pages, PDFs, or external projects. There are no work previews or passage links. Atlas/about screens use borderless, full-viewport native dialogs with focus containment, Escape, and browser history. A work's return link opens its location in the atlas. Without JavaScript, the linked atlas and standalone about page remain usable. Old `?view=network` and `?view=index` links resolve to the atlas.

The interface palette is black, white, red, green, blue, cyan, magenta, and yellow. The atlas’s color rectangles belong to the screen rather than to thumbnails. Its eight-color swatch panel toggles each color independently, with at least one selected and all eight available at once. Each active color contributes a rectangle. Shapes and positions are freshly randomized when toggling a color or entering a screen, without animation; the entrance and atlas keep separate selections. Rectangles sit above images and text while allowing pointer events through to the catalog links. Artwork retains its own colors. Profile copy lives in `about.html` and is reused in the about screen. All eight entrance links share a two-column, four-row grid and one text size. About, the collection, and work pages share the navigation component in `scripts/field.mjs`. Navigation codes are defined once in `scripts/field.mjs`; each is three ASCII characters, followed by a readable label. Typography uses Roboto Mono with a monospace fallback. Atlas previews reserve a fixed height and may distort images to fill their frames; titles below retain uppercase-to-lowercase hover. The entrance image also fills its frame from the top edge of the screen. Project-page art preserves its proportions, with right-aligned uppercase titles and dates, left-aligned descriptions below the art, and a return link at the content’s left edge. Categories remain in the collection; work-page headers display only the date. Every page has a black background; color rectangles interrupt it without animating the layout. Artwork colors and preformatted poetry are preserved.

## Public files and local archive

`_config.yml` excludes maintenance sources, catalog JSON, and verification output from the GitHub Pages build. `json/nav.json` remains public because the separately hosted Thoughts theme fetches it.

`.archive/` is ignored and excluded from deployment. It contains historical documentation, unused assets, and local design studies. Verification output belongs in ignored archive or temporary directories. Git history preserves previous tracked versions.

## Restore a checkpoint

Commit or stash current work, then create a branch at the checkpoint:

```sh
git switch -c restore/published-site rollback/pre-fullscreen-2026-10-08
```

This restores the published site before the fullscreen and color room revision. The original site is preserved at `rollback/pre-redesign-2026-10-02`. Return with `git switch redesign/fullscreen-color-room-2026-10-08`. Switching branches does not publish the website.
