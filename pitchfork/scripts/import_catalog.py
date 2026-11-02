"""Import the pinned P4KxSpotify metadata snapshot; no network access or prose import."""
import argparse
import copy
import csv
import hashlib
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://zenodo.org/records/3603330'
CHECKSUM = 'ef1de60923bc1ee13d946c6a05e54a0d'
# Explicit associations: spelling/title normalization must never attach personal writing.
ASSOCIATIONS = {
    ('Sufjan Stevens', 'Illinois', '2005-07-04'): 'sufjan-stevens-illinois',
    ('Sufjan Stevens', 'Planetarium', '2017-06-13'): 'sufjan-stevens-planetarium',
    ('Sufjan Stevens', 'The Age of Adz', '2010-10-12'): 'sufjan-stevens-age-of-adz',
}

def merge(data, rows):
    result = copy.deepcopy(data)
    # Replacing this source's prior import makes reruns idempotent; curated records survive.
    albums = [a for a in result['albums'] if a.get('catalogSource') != SOURCE]
    by_id = {a['id']: a for a in albums}
    seen = {}
    duplicates = 0
    rejected = 0
    dates = []
    for row in rows:
        artist, title = row['artist'].strip(), row['album'].strip()
        date = datetime.strptime(row['reviewdate'], '%B %d %Y').date().isoformat()
        score = float(row['score'])
        if not artist or not title:
            rejected += 1
            continue
        if not 0 <= score <= 10:
            raise ValueError('Invalid score')
        identity = (artist, title, date)
        if identity in seen:
            if any(seen[identity][k] != row[k] for k in ('artist', 'album', 'reviewdate', 'score', 'releaseyear', 'genre')):
                raise ValueError(f'Conflicting duplicate: {identity}')
            duplicates += 1
            continue
        seen[identity] = row
        dates.append(date)
        association = ASSOCIATIONS.get(identity)
        if association:
            a = by_id[association]
            # Preserve all supplied values and verification status, including unknowns.
            a['catalogEvidence'] = {'source': SOURCE, 'score': score, 'reviewDate': date}
            continue
        stable_id = 'p4k-' + hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode()).hexdigest()[:20]
        if stable_id in by_id:
            raise ValueError(f'ID collision: {stable_id}')
        year = row['releaseyear'].strip()
        release_year = int(float(year)) if year else None
        if year and float(year) != release_year:
            raise ValueError('Non-integral release year')
        genre = row['genre'].strip()
        a = {'id': stable_id, 'artist': artist, 'album': title,
             'releaseYear': release_year, 'genres': [] if genre.lower() in ('', 'none') else [genre],
             'catalogSource': SOURCE,
             'pitchfork': {'score': score, 'url': None, 'scoreSource': SOURCE,
                          'verifiedAt': None, 'reviewDate': date}}
        albums.append(a)
        by_id[stable_id] = a
    result['albums'] = albums
    result['coverage'] = {
        'description': 'Historical P4KxSpotify metadata snapshot plus six personal reviews; not the complete or current Pitchfork archive.',
        'importedAt': '2026-11-02', 'source': SOURCE,
        'attribution': 'Anthony T. Pinter, Jacob M. Paul, Jessie Smith, and Jed R. Brubaker (2020), P4KxSpotify, version 1.0.',
        'license': 'https://creativecommons.org/licenses/by/4.0/',
        'sourceRows': len(rows), 'metadataDuplicatesSkipped': duplicates, 'missingIdentitySkipped': rejected,
        'reviewDateRange': [min(dates), max(dates)],
        'sourceMD5': CHECKSUM,
        'limitations': 'Metadata and scores only; no prose, artwork, or Spotify features. Primary genre only. Original review URLs absent. Distinct review dates retained, without inferred edition labels. Dataset scores not independently verified.'}
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT/'data/albums.json')
    args = parser.parse_args()
    if hashlib.md5(args.csv.read_bytes()).hexdigest() != CHECKSUM:
        parser.error('CSV does not match the pinned Zenodo version 1.0 checksum')
    data = json.loads((ROOT/'data/albums.json').read_text())
    with args.csv.open(newline='') as source:
        result = merge(data, list(csv.DictReader(source)))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(f"Imported {len(result['albums'])} records; {result['coverage']['metadataDuplicatesSkipped']} metadata duplicates skipped.")
