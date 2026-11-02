"""Regenerate the static index and review pages from data/albums.json (Python 3)."""
from pathlib import Path
from html import escape as esc
import json
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/albums.json').read_text())
albums=data['albums']
def date_label(value):
    return esc(str(value).replace('-', '.')) if value else 'unknown'
assert len({a['id'] for a in albums}) == len(albums), 'Duplicate album IDs'
for a in albums:
    assert all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in a['id']) and a['id']
    for score in (a.get('personal',{}).get('score'),a.get('pitchfork',{}).get('score')):
        assert score is None or 0 <= score <= 10

def head(title,prefix='./',description='Album scores and personal reviews by Kevin Cunanan Chappelle.'):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>{esc(title.upper())}</title><meta name="description" content="{esc(description,quote=True)}"><link rel="stylesheet" href="{prefix}styles.css"><script type="module">if(location.pathname.startsWith('/000/'))import('/js/work-navigation.js');</script></head><body><a class="skip" href="#main">skip to content</a><div class="shell"><header class="site-header page-header"><div class="site-identity"><a href="/" data-view-link="home" aria-label="KEVIN CUNANAN CHAPPELLE"><svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><text x="0" y="350" font-size="400" textLength="1200" lengthAdjust="spacingAndGlyphs">KEVIN CUNANAN CHAPPELLE</text></svg><span class="visually-hidden">KEVIN CUNANAN CHAPPELLE</span></a></div><nav class="site-nav" aria-label="primary"><a href="/"><span class="nav-code" aria-hidden="true">[=]</span><span>home</span></a><a href="/?view=unlisted" data-collection-return><span class="nav-code" aria-hidden="true">[*]</span><span>collection</span></a><a href="/?view=about"><span class="nav-code" aria-hidden="true">[?]</span><span>about</span></a><a href="https://kvnchpl-thoughts.tumblr.com/"><span class="nav-code" aria-hidden="true">???</span><span>thoughts</span></a></nav></header>'''

def end_document():
    return '</div></body></html>'

reviewlinks=''.join(f'<li><a href="reviews/{a["id"]}/">{esc(a["artist"])} — {esc(a["album"])}</a></li>' for a in albums if a.get('personal',{}).get('text'))
index=head('Pitchfork')+'''<main id="main"><section class="hero collection-heading"><h1>PITCHFORK</h1><p>Album scores alongside my own ratings and reviews.</p></section><div class="archive-content">
<nav class="views" aria-label="archive views"><a id="view-index" href="?" aria-current="page">all albums</a><a id="view-reviews" href="?view=reviews">my reviews</a></nav>
<fieldset id="controls" disabled><legend class="visually-hidden">Find an album</legend><div class="controls"><label>Search albums<input id="q" type="search" placeholder="Artist or album" autocomplete="off"></label><label>Sort by<select id="sort"><option value="artist">artist / a–z</option><option value="artist-desc">artist / z–a</option><option value="pitchfork">pitchfork / highest</option><option value="pitchfork-asc">pitchfork / lowest</option><option value="kevin">kevin / highest</option><option value="kevin-asc">kevin / lowest</option><option value="review">review date / newest</option><option value="review-asc">review date / oldest</option><option value="release">release date / newest</option><option value="release-asc">release date / oldest</option></select></label></div><div class="control-bottom"><details id="score-filters"><summary>Score range<span id="filter-indicator"></span></summary><div class="score-filters"><label>Pitchfork minimum<input id="min" type="number" min="0" max="10" step="0.1" placeholder="0.0"></label><label>Pitchfork maximum<input id="max" type="number" min="0" max="10" step="0.1" placeholder="10.0"></label></div></details><button class="text-button" id="reset" type="button">reset</button></div></fieldset>
<div class="section-line"><span id="count" role="status" aria-live="polite">Loading collection…</span></div><p id="range-error" role="status" hidden>Minimum score must be less than or equal to maximum score.</p>
<div class="table-wrap" id="table-view" hidden><table><caption class="visually-hidden">Album ratings out of ten. Source details follow the results.</caption><thead><tr><th scope="col">Album / artist</th><th scope="col">Kevin</th><th scope="col">Pitchfork</th></tr></thead><tbody id="rows"></tbody></table></div>
<nav id="pagination" aria-label="result pages" hidden><button id="previous" type="button">← previous</button> <span id="page-status" role="status"></span> <button id="next" type="button">next →</button></nav><div id="review-view" class="cards" hidden></div><div class="empty" id="empty" hidden><h2>No matching albums.</h2><p>Try another artist, album title, or score range.</p></div>
<section class="coverage" aria-label="About this index"><details><summary>About this index &amp; sources</summary><div class="source-notes"> <p>The index is a historical snapshot of reviews from 1999–2019, with a few newer albums I’ve written about.</p> <p>Catalog data is adapted from <a href="https://zenodo.org/records/3603330">P4KxSpotify</a> by Anthony T. Pinter, Jacob M. Paul, Jessie Smith, and Jed R. Brubaker (2020), under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, with duplicate entries removed and my reviews added. Review and artist links were recovered from the authors’ archive and <a href="https://github.com/olievans123/The-Fork">The Fork</a>. This is an independent project, unaffiliated with Pitchfork.</p> </div></details><p id="load-error" class="error" hidden>The searchable index is unavailable. Reload the page to try again.</p><noscript><p>Search requires JavaScript. My reviews:</p><ul>'''+reviewlinks+'''</ul></noscript></section></div></main><script type="module" src="./app.mjs"></script>'''+end_document()
(ROOT/'index.html').write_text(index)
for a in albums:
    p=a.get('personal')
    if not p or not p.get('text'):continue
    destination=ROOT/'reviews'/a['id'];destination.mkdir(parents=True,exist_ok=True)
    personal_date=f'<time datetime="{esc(p["publishedAt"],quote=True)}">{date_label(p["publishedAt"])}</time>' if p.get('publishedAt') else 'undated'
    page=head(a['album'],'../../')+f'''<main id="main" class="article"><a href="../../?view=reviews">all reviews</a><div class="eyebrow" style="margin-top:36px">a review by Kevin Cunanan Chappelle · {personal_date}</div><h1>{esc(a['album'])}</h1><div class="artist">{esc(a['artist'])}</div><small class="album-dates">released {date_label(a.get('releaseDate') or a.get('releaseYear'))} · pitchfork review {date_label(a['pitchfork'].get('reviewDate'))}</small><div class="card-scores"><div class="score"><span>Kevin</span>{p['score']:.1f}</div><div class="score"><span>Pitchfork</span>{a['pitchfork']['score']:.1f}</div></div><div class="prose">'''+''.join(f'<p>{esc(para)}</p>' for para in p['text'].split('\n\n'))+f'''</div><p><a href="{esc(a['pitchfork']['url'],quote=True)}" target="_blank" rel="noopener noreferrer">read the Pitchfork review ↗</a></p></main>'''+end_document()
    (destination/'index.html').write_text(page)
print(f'Built index + {sum(bool(a.get("personal",{}).get("text")) for a in albums)} review pages.')
