"""Regenerate the static index and review pages from data/albums.json (Python 3)."""
from pathlib import Path
from html import escape as esc
import json
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/albums.json').read_text())
albums=data['albums']
assert len({a['id'] for a in albums}) == len(albums), 'Duplicate album IDs'
for a in albums:
    assert all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in a['id']) and a['id']
    for score in (a.get('personal',{}).get('score'),a.get('pitchfork',{}).get('score')):
        assert score is None or 0 <= score <= 10

def head(title,prefix='./',description='Album scores and personal reviews by Kevin Cunanan Chappelle.'):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(title)} | kvnchpl</title><meta name="description" content="{esc(description,quote=True)}"><link rel="stylesheet" href="{prefix}styles.css"></head><body><a class="skip" href="#main">skip to content</a><div class="shell"><header class="topline"><a href="/">[←] kvnchpl.com</a><span>listening / a personal music archive</span></header>'''

def footer():
    return '<footer><span>Kevin Cunanan Chappelle</span><span>independent / unaffiliated with Pitchfork</span></footer></div></body></html>'

reviewlinks=''.join(f'<li><a href="reviews/{a["id"]}/">{esc(a["artist"])} — {esc(a["album"])}</a></li>' for a in albums if a.get('personal',{}).get('text'))
index=head('Pitchfork / listening')+'''<main id="main"><section class="hero"><div><div class="eyebrow">[♫] scores, notes & differences of opinion</div><h1>PITCHFORK</h1><p class="intro">An album index and a place for my own reviews.<br>Two sets of ears. Two sets of numbers.</p></div><aside class="hero-note"><strong id="total">06</strong> albums in this starter collection.<br>Search by artist or album; open a title to read my review.</aside></section>
<nav class="views" aria-label="archive views"><a id="view-index" href="?" aria-current="page">[01] score index</a><a id="view-reviews" href="?view=reviews">[02] my reviews</a></nav>
<fieldset id="controls" disabled style="border:0;padding:0;margin:0;min-width:0"><legend class="eyebrow" style="margin-bottom:12px">find an album</legend><div class="controls"><label>Artist / album<input id="q" type="search" placeholder="Sufjan Stevens, SWAG…" autocomplete="off"></label><label>PF min<input id="min" type="number" min="0" max="10" step="0.1" placeholder="0.0"></label><label>PF max<input id="max" type="number" min="0" max="10" step="0.1" placeholder="10.0"></label><label>Sort by<select id="sort"><option value="artist">artist / A–Z</option><option value="pitchfork">Pitchfork / highest</option><option value="kevin">Kevin / highest</option><option value="gap">Kevin − PF / largest</option></select></label></div><div class="control-bottom"><label class="check"><input id="only-reviews" type="checkbox">with my reviews</label><button class="text-button" id="reset" type="button">clear filters</button></div></fieldset>
<div class="section-line"><span id="count" role="status" aria-live="polite">Loading collection…</span><span>/ 10.0</span></div><p id="range-error" role="status" hidden>Minimum score must be less than or equal to maximum score.</p>
<div class="table-wrap" id="table-view" hidden><table><caption>Kevin’s ratings alongside supplied Pitchfork scores. *See source note below.</caption><thead><tr><th scope="col">Album / artist</th><th scope="col">Kevin</th><th scope="col">Pitchfork*</th><th class="delta-col" scope="col">Kevin − PF</th><th scope="col">Writing</th></tr></thead><tbody id="rows"></tbody></table></div>
<div id="review-view" class="cards" hidden></div><div class="empty" id="empty" hidden><h2>No matching albums.</h2><p>Try another artist, album title, or score range.</p></div>
<section class="coverage" aria-labelledby="coverage-heading"><h2 id="coverage-heading">[i] about this index</h2><p>Initial coverage: six albums from my personal review collection. This is not the full Pitchfork archive. More records can be added as the index grows.</p><p>*Pitchfork scores were supplied with my reviews and have not been independently verified. Each review page links to the original Pitchfork review. These are critic scores, separate from my personal ratings. Import date: November 2, 2026.</p><details><summary>Browse all personal reviews</summary><ul>'''+reviewlinks+'''</ul></details><p id="load-error" class="error" hidden>The searchable index is unavailable. Use the review links above.</p><noscript><p>Search requires JavaScript. All six reviews remain available through the links above.</p></noscript></section></main><script type="module" src="./app.mjs"></script>'''+footer()
(ROOT/'index.html').write_text(index)
for a in albums:
    p=a.get('personal')
    if not p or not p.get('text'):continue
    destination=ROOT/'reviews'/a['id'];destination.mkdir(parents=True,exist_ok=True)
    page=head(f'{a["artist"]} — {a["album"]}','../../')+f'''<main id="main" class="article"><a href="../../?view=reviews">[←] all reviews</a><div class="eyebrow" style="margin-top:36px">a review by Kevin Cunanan Chappelle</div><h1>{esc(a['album'])}</h1><div class="artist">{esc(a['artist'])}</div><div class="card-scores"><div class="score"><span>Kevin</span>{p['score']:.1f}</div><div class="score"><span>Pitchfork*</span>{a['pitchfork']['score']:.1f}</div></div><div class="prose">'''+''.join(f'<p>{esc(para)}</p>' for para in p['text'].split('\n\n'))+f'''</div><p><a href="{esc(a['pitchfork']['url'],quote=True)}">read the Pitchfork review ↗</a></p><p class="muted" style="font-size:12px">*Pitchfork score transcribed from the supplied review collection; independent verification pending.</p><nav class="article-nav" aria-label="other album reviews"><div class="eyebrow">keep listening</div>'''
    page+=''.join(f'<a href="../{other["id"]}/">{esc(other["artist"])} — {esc(other["album"])}</a>' for other in albums if other['id']!=a['id'] and other.get('personal',{}).get('text'))
    page+='</nav></main>'+footer()
    (destination/'index.html').write_text(page)
print(f'Built index + {sum(bool(a.get("personal",{}).get("text")) for a in albums)} review pages.')
