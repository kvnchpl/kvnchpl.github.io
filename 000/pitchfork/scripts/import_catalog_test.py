"""Regression checks for import identity, preservation, and duplicate handling."""
import copy
import json
import unittest
from pathlib import Path
from import_catalog import merge, SOURCE

class ImportTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((Path(__file__).resolve().parents[1]/'data/albums.json').read_text())
        self.row = dict(artist='Example', album='Album', reviewdate='January 1 2000', score='8.0', releaseyear='', genre='None')

    def test_repeat_and_preservation(self):
        before = copy.deepcopy([a for a in self.data['albums'] if a.get('personal')])
        result = merge(self.data, [self.row])
        self.assertEqual(before, [a for a in result['albums'] if a.get('personal')])
        self.assertEqual(result, merge(result, [self.row]))
        imported = [a for a in result['albums'] if a.get('catalogSource') == SOURCE]
        self.assertEqual(len(imported), 1)
        self.assertIsNone(imported[0]['pitchfork']['url'])
        self.assertIsNone(imported[0]['releaseYear'])

    def test_refresh_keeps_enriched_links_and_release_precision(self):
        result = merge(self.data, [self.row])
        imported = next(a for a in result['albums'] if a.get('catalogSource') == SOURCE)
        imported['pitchfork'].update(url='https://pitchfork.com/reviews/albums/example/', artistUrl='https://pitchfork.com/artists/example/', linkSource='pitchfork-live-2026-11-02')
        imported['releaseYear'] = 1999
        imported['releaseDate'] = '1999-05-01'
        again = merge(result, [self.row])
        refreshed = next(a for a in again['albums'] if a['id'] == imported['id'])
        self.assertEqual(imported, refreshed)

    def test_duplicate_and_distinct_review_dates(self):
        later = dict(self.row, reviewdate='January 1 2010')
        result = merge(self.data, [self.row, self.row, later])
        self.assertEqual(result['coverage']['metadataDuplicatesSkipped'], 1)
        imported = [a for a in result['albums'] if a.get('catalogSource') == SOURCE]
        self.assertEqual(len({a['id'] for a in imported}), 2)
        with self.assertRaises(ValueError):
            merge(self.data, [self.row, dict(self.row, score='7.0')])

    def test_explicit_association(self):
        row = dict(self.row, artist='Sufjan Stevens', album='The Age of Adz', reviewdate='October 12 2010', score='8.4')
        result = merge(self.data, [row])
        self.assertFalse(any(a.get('catalogSource') == SOURCE for a in result['albums']))
        matched = next(a for a in result['albums'] if a['id']=='sufjan-stevens-age-of-adz')
        self.assertIsNone(matched['pitchfork']['verifiedAt'])
        self.assertEqual(matched['catalogEvidence']['score'], 8.4)

if __name__ == '__main__':
    unittest.main()
