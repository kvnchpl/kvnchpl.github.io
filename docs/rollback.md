# Preview and rollback

The pre-redesign version is preserved at the annotated tag
`rollback/pre-redesign-2026-10-02`, resolving to
`878e3e1aebfdef090c2990d98413d00c69b8f49a`. The redesign is on
`redesign/site-2026-10-02`. Nothing in this workflow publishes the site.

## Preview

For a dependency-free local preview:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/` to browse the field. Python's standard server does
not resolve extensionless leaf URLs: use `.html` when opening those pages in
this preview. GitHub Pages continues to serve their existing extensionless URLs.
During implementation, a temporary server at `http://127.0.0.1:8766/` also
resolves extensionless links for browser checks.

Useful field URLs:

- `/?view=network#work-project-compiler-buddha`
- `/?view=index#work-writing-flex-space`
- `/projects.html?view=index`
- `/writings.html?view=index`

## Restore the exact baseline locally

First run `git status --short`. Commit or stash any later edits before switching.
Create a branch at the preserved tag:

```sh
git switch -c restore/pre-redesign rollback/pre-redesign-2026-10-02
```

This checks out the original tracked files and leaves the redesign commits on
their branch. If that restore branch already exists, use
`git switch restore/pre-redesign` instead.

Return to the redesign with:

```sh
git switch redesign/site-2026-10-02
```

No reset, deletion, or force push is needed. Independently managed projects and
their asset files have not been moved or rewritten.

## If a future deployed redesign needs to be undone

Use `git revert` on the implementation commit on the publishing branch, review
the resulting changes, run the checks, and publish that reviewed rollback through
the normal deployment process. Preserve subsequent unrelated work when choosing
the commits to revert. Switching a local branch alone does not change the live
website.

## Checks

```sh
node scripts/build-site.mjs
node --test scripts/field.test.mjs
node scripts/check-site.mjs
git diff --check
```

A second build should report zero updated files. Check Network, Index, direct
work URLs, browser back/forward, keyboard focus, a narrow viewport, and the static
index before publishing.
