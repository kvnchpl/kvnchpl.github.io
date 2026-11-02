"""Regenerate the static index and review pages from data/albums.json (Python 3)."""
from pathlib import Path
from html import escape as esc
import json
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/albums.json').read_text())
albums=data['albums']
coverage=data['coverage']
assert len({a['id'] for a in albums}) == len(albums), 'Duplicate album IDs'
for a in albums:
    assert all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in a['id']) and a['id']
    for score in (a.get('personal',{}).get('score'),a.get('pitchfork',{}).get('score')):
        assert score is None or 0 <= score <= 10

def head(title,prefix='./',description='Album scores and personal reviews by Kevin Cunanan Chappelle.'):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(title)} | kvnchpl</title><meta name="description" content="{esc(description,quote=True)}"><link rel="stylesheet" href="{prefix}styles.css"></head><body><a class="skip" href="#main">skip to content</a><div class="shell"><header class="site-header"><a class="site-identity" href="/" aria-label="Kevin Cunanan Chappelle"><svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><text x="0" y="350" font-size="400" textLength="1200" lengthAdjust="spacingAndGlyphs">KEVIN CUNANAN CHAPPELLE</text></svg></a><nav class="site-nav" aria-label="primary"><a href="/"><span class="nav-code" aria-hidden="true">[=]</span><span>home</span></a><a href="/?view=collection"><span class="nav-code" aria-hidden="true">[*]</span><span>collection</span></a><a href="/?view=about"><span class="nav-code" aria-hidden="true">[?]</span><span>about</span></a><a href="https://kvnchpl-thoughts.tumblr.com/"><span class="nav-code" aria-hidden="true">???</span><span>thoughts</span></a></nav></header>'''

def footer():
    return '<footer><span>Kevin Cunanan Chappelle</span><span>independent / unaffiliated with Pitchfork</span></footer></div></body></html>'

reviewlinks=''.join(f'<li><a href="reviews/{a["id"]}/">{esc(a["artist"])} — {esc(a["album"])}</a></li>' for a in albums if a.get('personal',{}).get('text'))
index=head('Pitchfork / listening')+'''<main id="main"><section class="hero"><h1>PITCHFORK</h1><p>Album scores alongside my own ratings and reviews.</p></section>
<nav class="views" aria-label="archive views"><a id="view-index" href="?" aria-current="page">all albums</a><a id="view-reviews" href="?view=reviews">my reviews</a></nav>
<fieldset id="controls" disabled><legend class="visually-hidden">Find an album</legend><div class="controls"><label>Search albums<input id="q" type="search" placeholder="Artist or album" autocomplete="off"></label><label>Sort by<select id="sort"><option value="artist">artist / A–Z</option><option value="pitchfork">Pitchfork / highest</option><option value="kevin">Kevin / highest</option><option value="gap">Kevin − Pitchfork / largest</option></select></label></div><div class="control-bottom"><details id="score-filters"><summary>Score range<span id="filter-indicator"></span></summary><div class="score-filters"><label>Pitchfork minimum<input id="min" type="number" min="0" max="10" step="0.1" placeholder="0.0"></label><label>Pitchfork maximum<input id="max" type="number" min="0" max="10" step="0.1" placeholder="10.0"></label></div></details><button class="text-button" id="reset" type="button">reset</button></div></fieldset>
<div class="section-line"><span id="count" role="status" aria-live="polite">Loading collection…</span><span>scores / 10</span></div><p id="range-error" role="status" hidden>Minimum score must be less than or equal to maximum score.</p>
<div class="table-wrap" id="table-view" hidden><table><caption class="visually-hidden">Album ratings out of ten. Source and verification details follow the results.</caption><thead><tr><th scope="col">Album / artist</th><th scope="col">Kevin</th><th scope="col">Pitchfork*</th><th class="delta-col" scope="col">Kevin − PF</th></tr></thead><tbody id="rows"></tbody></table></div>
<nav id="pagination" aria-label="result pages" hidden><button id="previous" type="button">← previous</button> <span id="page-status" role="status"></span> <button id="next" type="button">next →</button></nav><div id="review-view" class="cards" hidden></div><div class="empty" id="empty" hidden><h2>No matching albums.</h2><p>Try another artist, album title, or score range.</p></div>
<section class="coverage" aria-label="About this index"><details><summary>About this index &amp; sources</summary><div class="source-notes"><p>Historical snapshot: P4KxSpotify review metadata dated 1999–2019, alongside six personal reviews. This is not the complete or current Pitchfork archive. Separate review dates remain separate records; edition labels are not inferred.</p><p>*Scores have not been independently verified against Pitchfork. The six personal reviews retain their supplied scores and original review links. Other scores come from <a href="https://zenodo.org/records/3603330">P4KxSpotify v1.0</a>, by Anthony T. Pinter, Jacob M. Paul, Jessie Smith, and Jed R. Brubaker (2020), used under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Changes: metadata extraction, duplicate removal, and association with personal reviews. The dataset has no original review URLs; imported records link to their dataset source. No Pitchfork writing or artwork is reproduced. Import date: November 2, 2026.</p><p>Import audit: '''+str(coverage.get('sourceRows',0))+''' source rows; '''+str(coverage.get('metadataDuplicatesSkipped',0))+''' duplicate metadata rows collapsed; '''+str(coverage.get('missingIdentitySkipped',0))+''' row missing an artist omitted. Three explicitly matched records retain their personal-review identities.</p></div></details><details><summary>Browse all personal reviews</summary><ul>'''+reviewlinks+'''</ul></details><p id="load-error" class="error" hidden>The searchable index is unavailable. Use the review links above.</p><noscript><p>Search requires JavaScript. All six reviews remain available through the links above.</p></noscript></section></main><script type="module" src="./app.mjs"></script>'''+footer()
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
