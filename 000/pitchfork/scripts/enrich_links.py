"""Extract exact review/artist links from the P4KxSpotify authors' archived HTML.
No prose or media are copied. Match artist/title/review date and score, or an
existing canonical URL. Ambiguous matches are retained in the local audit.
"""
from pathlib import Path
import argparse
import hashlib
from html import unescape
import json
import re
import subprocess
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
def text(value):
    return unescape(re.sub('<[^>]*>', '', value)).strip()
def key(value):
    return ' '.join(value.split()).casefold()
def extract(page):
    url = re.search(r'<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"', page)
    title = re.search(r'<h1\b[^>]*class="[^"]*single-album-tombstone__review-title[^"]*"[^>]*>(.*?)</h1>', page, re.S)
    artists = re.search(r'<ul\b[^>]*class="[^"]*artist-links[^"]*"[^>]*>(.*?)</ul>', page, re.S)
    date = re.search(r'<time\b[^>]*class="pub-date"[^>]*dateTime="(\d{4}-\d{2}-\d{2})', page)
    score = re.search(r'<span class="score">([\d.]+)</span>', page)
    year = re.search(r'<span class="single-album-tombstone__meta-year">(.*?)</span>', page, re.S)
    if not all((url,title,artists,date,score)):
        return None
    links = re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', artists[1], re.S)
    links = [(text(n), 'https://pitchfork.com'+u if u.startswith('/') else u) for u,n in links]
    if not url[1].startswith('https://pitchfork.com/reviews/albums/'):
        return None
    years = re.findall(r'\b\d{4}\b', text(year[1])) if year else []
    return {'url':unescape(url[1]), 'album':text(title[1]), 'artist':links[0][0] if links else text(artists[1]),
            'artistUrl':links[0][1] if links else None, 'reviewDate':date[1], 'score':float(score[1]),
            'releaseYear':int(years[0]) if len(years)==1 else None}

def enrich(data, records):
    by_key=defaultdict(dict); by_url={}
    for r in records:
        for artist in {r['artist'], r['artist'].replace('/','')}:
            by_key[(key(artist),key(r['album']),r['reviewDate'])][r['url']]=r
        by_url[r['url']]=r
    matched=0;unmatched=[]
    for a in data['albums']:
        pf=a['pitchfork']
        candidates=by_key.get((key(a['artist']),key(a['album']),pf.get('reviewDate') or a.get('catalogEvidence',{}).get('reviewDate')), {})
        if pf.get('linkSource','').startswith('pitchfork-live-'):
            continue
        r=by_url.get(pf.get('url'))
        if not r and len(candidates)==1:r=next(iter(candidates.values()))
        if not r or r['score']!=pf['score']:
            unmatched.append(a['id']);continue
        pf['url']=r['url'];pf['artistUrl']=r['artistUrl']
        pf['reviewDate']=pf.get('reviewDate') or r['reviewDate']
        pf['linkSource']='p4kxspotify-archive'
        if a.get('releaseYear') is None:a['releaseYear']=r['releaseYear']
        matched+=1
    return matched,unmatched

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path);parser.add_argument('--cache',action='store_true');args=parser.parse_args()
    records=[];failed=[]
    if args.cache:
        records=json.loads((ROOT/'.private/sources/archive-links.json').read_text())
    else:
        for path in sorted((args.archive/'pitchfork-scrape/raw-html').glob('*.html')):
            r=extract(path.read_text(errors='replace'))
            if r:records.append(r)
            else:failed.append(path.name)
    data=json.loads((ROOT/'data/albums.json').read_text())
    count,unmatched=enrich(data,records)
    revision=subprocess.check_output(['git','-C',str(args.archive),'rev-parse','HEAD'],text=True).strip()
    source={'repository':'https://github.com/cuinfoscience/objectively-reviewed','revision':revision,'matched':count,'unmatched':len(unmatched),'method':'Exact artist/title/review date and score, or existing canonical URL and score; original links extracted from archived HTML. No live-link guarantee. Release years retain year precision.'}
    data['coverage']['linkEnrichment']=source
    audit={**source,'unmatchedIds':unmatched,'unparsedFiles':failed}
    audit_path=ROOT/'.private/sources/link-audit.json';audit_path.write_text(json.dumps(audit,indent=2)+'\n')
    # Small metadata-only cache makes reruns possible without parsing the archive.
    (ROOT/'.private/sources/archive-links.json').write_text(json.dumps(records,ensure_ascii=False)+'\n')
    (ROOT/'data/albums.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(source));print('Audit:',audit_path)
