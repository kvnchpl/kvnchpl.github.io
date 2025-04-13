# kvnchpl.github.io

- portfolio and creative brain-dump for kevin cunanan chappelle  
- exploring digital sacredness, experimental ecologies, and speculative design

<p align="center">
  <img alt="github pages" src="https://img.shields.io/badge/deploy-github%20pages-blue?logo=github&style=flat-square">
  <img alt="built with jekyll" src="https://img.shields.io/badge/built%20with-jekyll-orange?logo=ruby&style=flat-square">
  <img alt="last commit" src="https://img.shields.io/github/last-commit/kvnchpl/kvnchpl.github.io?style=flat-square">
  <img alt="repo size" src="https://img.shields.io/github/repo-size/kvnchpl/kvnchpl.github.io?style=flat-square">
  <img alt="license" src="https://img.shields.io/github/license/kvnchpl/kvnchpl.github.io?style=flat-square">
</p>

---

## live site

**[https://kvnchpl.github.io](https://kvnchpl.github.io)**


## project structure

```
├── _projects/         # portfolio entries
├── _writings/         # essays and creative writing
├── _readings/         # annotated reference material
├── assets/            # fonts, styles, images, scripts
├── _layouts/          # html layout templates
├── _includes/         # head, footer, partials
├── data/             # json/yaml structured content
├── index.md           # homepage
├── contact.md         # contact page
```

---

## local development

### prerequisites

- ruby 3.x (recommend: install via [`rbenv`](https://github.com/rbenv/rbenv))
- bundler

```bash
gem install bundler
```

### setup

```bash
bundle install
bundle exec jekyll serve --livereload
```

visit [http://localhost:4000](http://localhost:4000)

---

## deployment

this site is deployed via github pages using a custom jekyll configuration.

### notes:

- `_site/` is excluded from git and rebuilt on deploy
- all routing is file-based (`.md`) using custom layouts
- seo tags, favicons, and open graph metadata are defined in `_includes/head.html`

---

## features

- fully responsive layout
- mobile nav with animated toggle & keyboard trap
- dynamic hover overlays driven by `main.js`
- json/yaml-powered link rows and content
- custom typography (apolline std)

---

## credits

- font: apolline std  
- framework: [jekyll](https://jekyllrb.com/)  
- author: [@kvnchpl](https://github.com/kvnchpl)
