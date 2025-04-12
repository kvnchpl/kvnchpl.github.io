# kvnchpl.github.io

> Portfolio and creative brain-dump for Kevin Cunanan Chappelle  
> Exploring digital sacredness, experimental ecologies, and speculative design

<p align="center">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/deploy-GitHub%20Pages-blue?logo=github&style=flat-square">
  <img alt="Built with Jekyll" src="https://img.shields.io/badge/built%20with-Jekyll-orange?logo=ruby&style=flat-square">
  <img alt="Last Commit" src="https://img.shields.io/github/last-commit/kvnchpl/kvnchpl.github.io?style=flat-square">
  <img alt="Repo Size" src="https://img.shields.io/github/repo-size/kvnchpl/kvnchpl.github.io?style=flat-square">
  <img alt="License" src="https://img.shields.io/github/license/kvnchpl/kvnchpl.github.io?style=flat-square">
</p>

---

## Live Site

Visit: [https://kvnchpl.github.io](https://kvnchpl.github.io)

---

## 🖼 Preview

<p align="center">
  <img src="/assets/images/og-image.jpg" alt="Site preview" width="700">
</p>

---

## Project Structure
.
├── _projects/         # Portfolio projects
├── _writings/         # Essays and texts
├── _readings/         # Annotated readings and references
├── assets/            # Fonts, CSS, JS, images
├── _layouts/          # Custom layouts
├── _includes/         # Head, footer, partials
├── _data/             # JSON/YAML used to populate pages
├── index.md           # Homepage
├── contact.md         # Contact page
├── …                # More markdown-based routes

---

## Development Setup

### 1. Prerequisites

- Ruby 3.x (use [`rbenv`](https://github.com/rbenv/rbenv) recommended)
- Bundler

```bash
gem install bundler
bundle install
bundle exec jekyll serve --livereload

Site will be available at http://localhost:4000

---

## Deployment

This site is hosted via GitHub Pages using the default Jekyll build process.

Important notes:
	•	The _site/ folder is excluded and not committed.
	•	Favicon and SEO metadata are set via _includes/head.html.
	•	The site uses custom layouts — not a prebuilt Jekyll theme.

## Features

	•	Mobile-first, accessible navigation with animated toggle
	•	Custom project and writing layouts
	•	Sky image hover overlays & scroll logic (see main.js)
	•	JSON/YAML-powered content
	•	Fully responsive & deployable via GitHub Pages

## Credits

Fonts: Apolline Std
Built with: Jekyll
Maintained by: @kvnchpl