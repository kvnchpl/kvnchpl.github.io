# kvnchpl.github.io

- Portfolio and creative brain-dump for Kevin Cunanan Chappelle  
- Exploring digital sacredness, experimental ecologies, and speculative design


<p align="center">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/deploy-GitHub%20Pages-blue?logo=github&style=flat-square">
  <img alt="Built with Jekyll" src="https://img.shields.io/badge/built%20with-Jekyll-orange?logo=ruby&style=flat-square">
  <img alt="Last Commit" src="https://img.shields.io/github/last-commit/kvnchpl/kvnchpl.github.io?style=flat-square">
  <img alt="Repo Size" src="https://img.shields.io/github/repo-size/kvnchpl/kvnchpl.github.io?style=flat-square">
  <img alt="License" src="https://img.shields.io/github/license/kvnchpl/kvnchpl.github.io?style=flat-square">
</p>

---

## Live Site

**[https://kvnchpl.github.io](https://kvnchpl.github.io)**


## Project Structure

```
.
├── _projects/         # Portfolio entries
├── _writings/         # Essays and creative writing
├── _readings/         # Annotated reference material
├── assets/            # Fonts, styles, images, scripts
├── _layouts/          # HTML layout templates
├── _includes/         # Head, footer, partials
├── _data/             # JSON/YAML structured content
├── index.md           # Homepage
├── contact.md         # Contact page
```

---

## Local Development

### Prerequisites

- Ruby 3.x (recommend: install via [`rbenv`](https://github.com/rbenv/rbenv))
- Bundler

```bash
gem install bundler
```

### Setup

```bash
bundle install
bundle exec jekyll serve --livereload
```

Visit [http://localhost:4000](http://localhost:4000)

---

## Deployment

This site is deployed via GitHub Pages using a custom Jekyll configuration.

### Notes:

- `_site/` is excluded from Git and rebuilt on deploy
- All routing is file-based (`.md`) using custom layouts
- SEO tags, favicons, and Open Graph metadata are defined in `_includes/head.html`

---

## Features

- Fully responsive layout
- Mobile nav with animated toggle & keyboard trap
- Dynamic hover overlays driven by `main.js`
- JSON/YAML-powered link rows and content
- Custom typography (Apolline Std)

---

## Credits

- Font: Apolline Std  
- Framework: [Jekyll](https://jekyllrb.com/)  
- Author: [@kvnchpl](https://github.com/kvnchpl)
