# kvnchpl.com

Static portfolio hosted by GitHub Pages. Requires Node.js 22 or newer for maintenance; no dependencies to install.

## Folder structure

```text
kvnchpl.github.io/
├── assets/       images, responsive exports, videos, PDFs, and fonts
├── css/          styles
├── js/           browser behavior
├── json/         catalogs, homepage settings, and public navigation data
├── projects/     project pages
├── writings/     authored writing pages
├── scripts/      build, validation, content helper, and tests
├── each-all/     existing external-work redirect
├── specter/      existing external-work redirect
├── .archive/     ignored local-history ZIP; never deployed
├── .github/workflows/  required location for GitHub Actions
└── root pages, hosting configuration, README, and package.json
```

Every source and asset folder is flat. The only nested infrastructure folders are `.git/` (managed by Git) and `.github/workflows/` (GitHub's required workflow location). Temporary verification output belongs outside the repository. The local archive, former Jekyll cache, and ignored system files are preserved in `.archive/local-history-2026-10-08.zip`.

`assets/` is the one media directory. Use a unique, work-prefixed filename such as `my-project-01.webp` or `my-zine.pdf`. Existing responsive exports use `image-name--small.webp`, `image-name--medium.webp`, and `image-name--full.webp`. No per-project or per-format media subfolders are needed. The root `favicon.ico` remains in its conventional location.

Page URLs are unchanged. Raw media URLs moved from `/img/`, `/vid/`, `/pdf/`, and `/fonts/` to `/assets/`; old direct media URLs and third-party embeds must be updated. Historical direct media links are not redirected by this migration.

## Add a project

From the repository root:

```sh
npm run add -- project my-project "My Project" --image /path/to/artwork.webp --alt "Describe the artwork" --date 2026-10-08 --tags belief,desire
```

This copies the image to `assets/my-project-artwork.webp`, adds a record in `json/projects.json`, and creates `projects/my-project.html`. Existing pages and assets are never overwritten. Edit the catalog record for its description, additional images, or sections, then run `npm run check`.

```json
"sections": [
    {
        "images": [
            { "src": "/assets/my-project-artwork.webp", "alt": "Describe the first image" },
            { "src": "/assets/my-project-02.webp", "alt": "Describe the second image" }
        ],
        "text": "First paragraph.\nSecond paragraph."
    }
]
```

Copy additional images directly into `assets/`. One file per image is enough; multiple images in a section automatically become a slideshow. Existing records with `"file": "image-name"` still use the three responsive exports. `thumbnail` is optional; the first image or a stable cloud placeholder is used when it is absent. Omit `--image` for a text-only project and add its sections before building. Descriptions always render in full. Optional `displayTitle` inserts editorial line breaks, for example `"VIEW\nFINDER"`.

## Add a writing or PDF

Save the text in a UTF-8 file:

```sh
npm run add -- writing my-poem "My Poem" --body /path/to/poem.txt --date 2026-10-08 --tags desire
```

The helper adds its catalog record and creates `writings/my-poem.html`. Revise the writing body in that HTML file; its line breaks, indentation, and capitalization are preserved. Text outside `generated:*` comments stays authored.

For a PDF, first copy it to `assets/`. For an independently hosted work, use its URL:

```sh
npm run add -- writing my-zine "My Zine" --url /assets/my-zine.pdf --tags belief,desire
npm run add -- project my-site "My Site" --url https://example.com/ --tags free
```

`--date` defaults to today. Each work has one category: `image` (displayed as “images”), `space`, `interface`, or `writing`. Defaults are `image` for projects and `writing` for writings; use `--category space` to change it. Every work requires at least one of `belief`, `desire`, `truth`, `fire`, or `free`. Tags are filtering metadata, never visible on work pages. Dates display as `YYYY.MM`. Run `npm run add -- --help` for all options.

## Build and verify

```sh
npm run check
```

This builds the pages, runs the behavioral tests, and verifies local links, responsive images, fonts, runtime asset paths, catalog paths, cache versions, and folder depth. `npm run build` and `npm test` are also available separately. Building again should report zero updated files.

Commit the catalogs, authored content, copied assets, and generated HTML together. New entries automatically appear in the collection, category/tag filters, and sitemap; no separate map or menu records need editing. Review before pushing; local changes do not publish the site.

## Where to edit

- `json/projects.json`: project metadata and page sections.
- `json/writings.json`: writing metadata and destinations.
- `json/field.json`: homepage image and its destination.
- `about.html`: profile copy, also reused by the fullscreen about screen.
- `scripts/field.mjs`: shared navigation codes, categories, tags, and collection markup.
- `scripts/build-site.mjs`: metadata, galleries, generated regions, and sitemap.
- `scripts/work-page.mjs`: standard shell for new work pages.
- `css/field.css`: homepage, collection, about, and work layouts.
- `js/field.js`: navigation, filters, and color swatches.
- `js/main.js`: slideshows and video playback.

`_config.yml` excludes maintenance sources, catalog JSON, and local archives from deployment. `json/nav.json` stays at its existing public URL because the separately hosted Thoughts theme reads it. The site remains static, with ordinary links, no-JavaScript navigation fallbacks, proportional project artwork, and the current interactive behavior.

## Rollback

The pre-restructure site is preserved at `rollback/pre-flat-assets-2026-10-08`. Commit or stash later work before restoring it:

```sh
git switch -c restore/pre-flat-assets rollback/pre-flat-assets-2026-10-08
```

Return with `git switch refactor/flat-assets-2026-10-08`. Switching branches does not publish. The original design remains at `rollback/pre-redesign-2026-10-02`. The ignored archive ZIP remains available across branch switches.
