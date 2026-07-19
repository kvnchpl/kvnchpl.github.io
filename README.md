# kvnchpl.github.io (kvnchpl.com)

**Portfolio and brain dump for Kevin Cunanan Chappelle, creator of multimedia projects and performances. Based in New
York City.**

Hosted via [GitHub Pages](https://pages.github.com/).

## Structure

- `json/nav.json`, `json/projects.json`, `json/readings.json`, and `json/writings.json` hold the editable site content.
- `scripts/build-site.mjs` renders shared navigation, collection links, project sections, SEO metadata, the sitemap, and asset version hashes into the HTML files.
- `js/main.js` only enhances the generated HTML with randomized sky thumbnails, project slideshows, and navigation for the separately hosted Tumblr theme.
- Individual content pages use two layouts: `project-layout` for ordered media/text sections and `writing-layout` for writing.
- `css/main.css` owns the black background, monospace styling, the two responsive layouts, and project slideshows.

## Updating the site

1. Edit the relevant JSON file or writing HTML.
2. Run `node scripts/build-site.mjs` from the repository root.
3. Review and commit both the source data and generated HTML changes.

Content between `generated:*` comments is replaced by the build script and should not be edited directly. The generated files remain committed so GitHub Pages can serve them without a custom deployment process and visitors receive complete pages before JavaScript runs.

Projects use ordered `sections`, each of which may contain `images`, `text`, or both:

```json
{
    "sections": [
        {
            "images": ["project_1", "project_2"],
            "text": "Project description."
        }
    ]
}
```

Every project has an explicit `thumbnail` path. Link destination and browsing behavior are independent: `external` describes project ownership, while `newTab` controls whether its link opens a new tab. Set `sitemap` to `true` for separately managed same-domain projects, such as JUNGLE, that should appear in the root sitemap.

For project galleries, `small` images are 600 pixels wide and `medium` images are 1280 pixels wide. Set `fullWidth` to the actual width of the corresponding `full` images; full images wider than 1920 pixels should be resized to 1920 pixels before being added.
