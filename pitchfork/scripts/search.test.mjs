import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAlbums} from '../search.mjs';
import {readFileSync} from 'node:fs';
const {albums}=JSON.parse(readFileSync(new URL('../data/albums.json',import.meta.url)));
test('multiword search matches artist and album regardless of case',()=>{
 assert.equal(selectAlbums(albums,{query:'SUFJAN adz'})[0].album,'Age of Adz');
 assert.equal(selectAlbums(albums,{query:'nonexistent'}).length,0);
});
test('score boundaries are inclusive and sort is numeric',()=>{
 assert.deepEqual(selectAlbums(albums,{min:'7.0',max:'7.3',sort:'pitchfork'}).map(a=>a.album),['SWAG','The Ascension']);
 assert.equal(selectAlbums(albums,{sort:'gap'})[0].album,'Planetarium');
});
test('unreviewed records and missing scores remain usable',()=>{
 const unknown={id:'unknown',artist:'AAAA',album:'Unknown',pitchfork:{score:null}};
 const all=[unknown,...albums];
 assert.equal(selectAlbums(all,{onlyReviews:true}).length,6);
 assert.equal(selectAlbums(all,{min:'0'}).length,6);
 assert.equal(selectAlbums(all,{sort:'pitchfork'}).at(-1),unknown);
});
