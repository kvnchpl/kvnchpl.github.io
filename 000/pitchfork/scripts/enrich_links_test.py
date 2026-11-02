import unittest
from enrich_links import enrich, extract
class LinkTests(unittest.TestCase):
 def test_exact_review_identity_and_reissue_date(self):
  record=dict(artist='Example',album='Record',reviewDate='2000-01-01',score=8,url='https://pitchfork.com/reviews/albums/original/',artistUrl='https://pitchfork.com/artists/example/',releaseYear=1999)
  data={'albums':[{'id':'first','artist':'Example','album':'Record','releaseYear':None,'pitchfork':{'score':8,'reviewDate':'2000-01-01','verifiedAt':None}}, {'id':'reissue','artist':'Example','album':'Record','pitchfork':{'score':8,'reviewDate':'2010-01-01'}}]}
  n,missing=enrich(data,[record]);self.assertEqual(n,1);self.assertEqual(missing,['reissue'])
  self.assertEqual(data['albums'][0]['pitchfork']['url'],record['url']);self.assertEqual(data['albums'][0]['releaseYear'],1999)
  self.assertIsNone(data['albums'][0]['pitchfork']['verifiedAt'])
 def test_conflicting_urls_are_not_guessed(self):
  record=dict(artist='Example',album='Record',reviewDate='2000-01-01',score=8,url='https://pitchfork.com/reviews/albums/one/',artistUrl=None,releaseYear=None)
  data={'albums':[{'id':'a','artist':'Example','album':'Record','pitchfork':{'score':8,'reviewDate':'2000-01-01'}}]}
  self.assertEqual(enrich(data,[record,dict(record,url='https://pitchfork.com/reviews/albums/two/')])[0],0)
 def test_extracts_metadata_without_artist_page(self):
  page='<link rel="canonical" href="https://pitchfork.com/reviews/albums/compilation/"><h1 class="single-album-tombstone__review-title">A &amp; B</h1><ul class="artist-links"><li>Various Artists</li></ul><time class="pub-date" dateTime="2000-01-01T00:00:00"></time><span class="score">8.0</span><span class="single-album-tombstone__meta-year">1999</span>'
  r=extract(page);self.assertEqual(r['album'],'A & B');self.assertIsNone(r['artistUrl']);self.assertEqual(r['releaseYear'],1999)
if __name__=='__main__':unittest.main()
