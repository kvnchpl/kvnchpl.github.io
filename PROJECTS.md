# Consolidated portfolio projects

Six former repositories now live as ordinary directories in `kvnchpl.github.io`.
`project-migrations.json` records their original repository URLs, imported commit
IDs, and visibility. Original repositories and their histories are preserved;
this migration imports their current tracked files, not their Git histories.
No environment files, installed dependencies, or nested Git repositories were copied.

| Directory / public URL | Portfolio visibility | Runtime |
| --- | --- | --- |
| `/jungle/` | Listed; existing portfolio link | GitHub Pages |
| `/each-all/` | Listed; replaces the old redirect | Pages frontend, existing Netlify submission service |
| `/exp/` | Unlisted, `noindex, nofollow` on every HTML page | GitHub Pages |
| `/trellis/` | Unlisted, `noindex, nofollow` | GitHub Pages |
| `/desire-path/` | Unlisted, `noindex, nofollow` | GitHub Pages |
| `/ephemeris/` | Unlisted, `noindex, nofollow` | Pages frontend, existing Netlify NASA proxy |

The Desire Path map keeps `/desire-path/`. The existing writing **Desire Path
(Vol. 1)** keeps its catalog entry and `/a/desire-path_vol-1.pdf` destination.
Neither its name nor its URL changes.

Unlisted projects are accessible by direct URL, but absent from the portfolio,
navigation JSON, and sitemap. Their HTML asks crawlers not to index them. This
does not restrict access or make source files private. Do not add them to the
portfolio catalogs until they are ready. To launch one, change its manifest
visibility to `listed`, remove its robots metadata, and add the portfolio entry.

Each project retains its styles, assets, and relative paths. The existing flat
portfolio structure still applies outside these project directories. The Pages
configuration excludes project documentation, authoring tools, dependency
manifests, installed dependencies, Netlify functions, tests, generated build
folders, and the map's authoring CSV. Leaflet remains a published runtime asset.

## Verification

From this repository root:

```sh
node project-tools/check-projects.mjs
node --test project-tools/*.test.cjs
npm ci --prefix each-all/netlify/functions
npm --prefix each-all test
npm --prefix desire-path test
node each-all/scripts/build.cjs
node ephemeris/scripts/build.cjs
```

The root GitHub Actions workflow runs these checks on pushes and pull requests.
The map requires Python 3.10+; backend tests require Node.js 22+. The local
portfolio check (`npm --prefix .private run check`) also checks project links and
visibility. Its build skips standalone project trees so it cannot rewrite their
designs or metadata. The `.private/` maintenance folder remains locally backed up.

## Production cutover

The migration branch is `migrate/portfolio-projects`. Local preparation does not
publish it or change existing hosting. GitHub Pages currently builds `main` from
the repository root using Jekyll.

1. Push the migration branch and let the project checks pass. Keep the original
   repos and current production deployments available during verification.
2. Relink the existing **Each All** and **Ephemeris** Netlify projects to
   `kvnchpl/kvnchpl.github.io`, retaining their existing site names and domains.
   Select the migration branch while testing. Set both the base and package
   directories to `each-all` or `ephemeris`, respectively; each directory contains
   its own `netlify.toml`. The configuration sets the build and publish paths.
   Netlify supports separate configurations in a monorepo:
   <https://docs.netlify.com/build/configure-builds/monorepos/>.
3. Before accepting Each All submissions from the migrated deployment, set its
   function environment to `GITHUB_USER=kvnchpl`,
   `REPO_NAME=kvnchpl.github.io`, `GITHUB_PATH=each-all`,
   `SITE_URL=https://kvnchpl.com/each-all/`, and the branch being tested.
   Retain `GITHUB_TOKEN`, `RESEND_API_KEY`, `NOTIFY_EMAIL`, and any existing
   `FROM_EMAIL` securely in Netlify. Its GitHub token needs Contents read/write
   access to the main repo. These are function environment variables in Netlify,
   not values supplied through `netlify.toml`.
4. At final switchover, set `SUBMISSIONS_PAUSED=true` in Netlify and deploy the pause-enabled function, then import any submissions
   added to the old repo after the recorded source commit, and verify images,
   prompt JSON, and counts together. Clear `SUBMISSIONS_PAUSED` and redeploy only once the frontend, backend write
   target, and publishing branch agree. The checked import matches the old
   remote's main commit as of this preparation.
5. Merge the verified migration, select `main` as both Netlify projects'
   production branch, set `GITHUB_BRANCH=main`, and redeploy the functions.
   Publish the Pages change only once the cross-origin functions are ready.
   Existing project Pages sites may still own their original URL prefixes;
   disable their Pages publishing at cutover and verify that the main site's
   copies serve those URLs. Keep the original repositories for rollback.
6. Check `/jungle/` and a nested zine page, `/each-all/` and its prompt boards,
   a controlled submission, each unlisted URL, and real Ephemeris data.
   Confirm the four unfinished projects stay absent from the portfolio and
   sitemap, and retain `noindex` in their deployed HTML.

Each All's new handler writes image blobs, submission JSON, and counts beneath
`each-all/` in one non-forced commit, preserving concurrent edits elsewhere in
the repo. Stored `imagePath` values remain project-relative. Its function enables
CORS for the portfolio and local development, including preflights and errors.
The frontend uses `each-all.netlify.app` for its API when hosted on Pages.

Ephemeris uses `kvnchpl-ephemeris.netlify.app` for its read-only NASA proxy when
hosted on Pages. The proxy returns CORS headers; its Netlify build publishes only
the four frontend files and adds a noindex response header. A plain local static
server has no function endpoints: use Netlify Dev for backend integration.

Do not publish the new Each All frontend against the old backend configuration:
it would lack cross-origin support and still write into the previous repo.
Archiving the old repos is a later cleanup after production verification.
