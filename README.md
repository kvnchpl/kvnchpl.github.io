# kvnchpl.github.io (kvnchpl.com)

**A field of images, texts, and passages by Kevin Cunanan Chappelle.**

Hosted via [GitHub Pages](https://pages.github.com/).

## Structure

- `json/nav.json`, `json/projects.json`, and `json/writings.json` hold the editable site content.
- `json/field.json` holds the authored order, map positions, symbolic marks, short notes, writing excerpts, optional account sections, and connections between works. Work identity uses `project:key` or `writing:key`, independently of display titles and URLs.
- `scripts/field.mjs` validates that every catalog entry is present, resolves relationships, and renders both views. `scripts/build-site.mjs` renders the field, work passages, shared navigation, project sections, SEO metadata, the sitemap, and asset version hashes into the HTML files.
- `js/field.js` enhances the static index with map selection, connected-path highlighting, view preference, retracing, and browser history. Selection and view are encoded in the URL; no server or database is required. Without JavaScript the complete index and ordinary work links remain usable.
- `css/field.css` styles the two views and the shared frame around work pages. Symbol shapes are inline SVG, avoiding platform-dependent glyph rendering.
- `js/main.js` only enhances the generated HTML with randomized sky thumbnails, project slideshows, and navigation for the separately hosted Tumblr theme.
- Individual content pages use two layouts: `project-layout` for ordered media/text sections and `writing-layout` for writing.
- `css/main.css` owns the black background, monospace styling, the two responsive layouts, and project slideshows.

## Updating the site

1. Edit the relevant JSON file or writing HTML.
2. Run `node scripts/build-site.mjs` from the repository root.
3. Review and commit both the source data and generated HTML changes.

Run `node --test scripts/field.test.mjs` to check catalog coverage, relationship integrity, escaping, and both collections. Run `node scripts/check-site.mjs` to verify local references and generated asset versions. GitHub Actions also checks JavaScript syntax and confirms that generated files are current on every push and pull request.

To add a work, add its record to the appropriate catalog and its stable identifier to `json/field.json`. Add only deliberate connections; isolated works remain accessible in both views. Each connection is bidirectional and has one shared short phrase. The node order controls the index and numbering, while `start` controls the initial selection.

Each node has a `position: [x, y]` in percentages, with both coordinates between 5 and 95. Positions are authored independently of catalog order and relationship data. Network draws those relationships as SVG lines behind ordinary HTML links. The diagram uses browser scrolling on narrow screens, with a locate button to return to the selected mark. There is no layout engine, animation loop, map library, or new dependency.

Presentation is deliberately uneven. Optional `size` (70–230 pixels, default 112), `tilt` (−15–15 degrees, default 0), and `echo` (boolean) set the scale, angle, and torn duplicate image strip for each map node. These settings affect only previews. Poetry fragments appear among the images, with full work text available at its original URL. The layout is authored and repeatable: links do not move when you try to select them, and generated files stay deterministic. Hover, keyboard focus, and selection raise a node above overlapping fragments. The Index keeps its logical order with uneven visual spacing.

The six marks are `mercury`, `sulfur`, `salt`, `saturn`, `vessel`, and `seal`. The vocabulary mixes alchemical and astrological forms with an invented compound seal; marks are visual punctuation rather than classifications of the work. Their shapes live in one SVG vocabulary in `scripts/field.mjs`.

An optional `inscription` names a node with an existing `fragment` to show at the site's threshold. It links to that writing and follows the same navigation as other passages. The recurring original sigil and faint diagram rings are decorative, static SVG in the shared renderer; they add no navigation logic or dependencies.

`note` and `fragment` are optional. `accountSections` explicitly names project section indexes whose explanatory text should appear in a native, initially closed “Read the account” disclosure. The complete original text remains in the project catalog and generated page. Poems remain authored in their existing HTML files.

Shared typography renders prose, navigation, and controls lowercase, with uppercase headings and selected labels. Only `pre.writing-content` preserves its authored casing, including nested links. Original poem text is never rewritten by the generator. Compiler Buddha's displayed source follows the lowercase display rule; its executable source remains unchanged. The separately hosted Thoughts template applies the same casing policy, preserving preformatted writing.

The design brief is in [docs/redesign.md](docs/redesign.md). Rollback and preview instructions are in [docs/rollback.md](docs/rollback.md). Development stays on `redesign/site-2026-10-02`; publishing has not been requested.

Content between `generated:*` comments is replaced by the build script and should not be edited directly. The generated files remain committed so GitHub Pages can serve them without a custom deployment process and visitors receive complete pages before JavaScript runs.

Projects use ordered `sections`, each of which may contain `images`, `text`, or both:

```json
{
    "sections": [
        {
            "images": [
                { "file": "project_1", "alt": "A literal description of the first image." },
                { "file": "project_2", "alt": "A literal description of the second image." }
            ],
            "text": "Project description."
        }
    ]
}
```

Each gallery image requires its own `alt` description, used both in the initial HTML and when changing slides. Describe visible forms and installation views rather than repeating the title or filename. Collection thumbnails have empty alt text because their links already contain the work’s title.

Every project has an explicit `thumbnail` path. Link destination and browsing behavior are independent: `external` describes project ownership, while `newTab` controls whether its link opens a new tab. Set `sitemap` to `true` for separately managed same-domain projects, such as JUNGLE, that should appear in the root sitemap.

For project galleries, `small` images are 600 pixels wide and `medium` images are 1280 pixels wide. Set `fullWidth` to the actual width of the corresponding `full` images; full images wider than 1920 pixels should be resized to 1920 pixels before being added.
