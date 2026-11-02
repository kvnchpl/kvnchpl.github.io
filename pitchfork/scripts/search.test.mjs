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
 assert.deepEqual(selectAlbums(albums.filter(a=>a.personal),{min:'7.0',max:'7.3',sort:'pitchfork'}).map(a=>a.album),['SWAG','The Ascension']);

});
test('unreviewed records and missing scores remain usable',()=>{
 const unknown={id:'unknown',artist:'AAAA',album:'Unknown',pitchfork:{score:null}};
 const all=[unknown,...albums];
 assert.equal(selectAlbums(all,{onlyReviews:true}).length,6);
 assert.equal(selectAlbums(all,{min:'0'}).length,albums.length);
 assert.equal(selectAlbums(all,{sort:'pitchfork'}).at(-1),unknown);
});

test('both sort directions preserve numeric order and put unknown scores last',()=>{
 const rows=[{id:'a',artist:'A',album:'First',pitchfork:{score:2},personal:{score:9}},
 {id:'b',artist:'B',album:'Second',pitchfork:{score:10},personal:{score:1}},
 {id:'c',artist:'C',album:'Unknown',pitchfork:{score:null}}];
 const ids=sort=>selectAlbums(rows,{sort}).map(a=>a.id);
 assert.deepEqual(ids('artist'),['a','b','c']);assert.deepEqual(ids('artist-desc'),['c','b','a']);
 assert.deepEqual(ids('pitchfork'),['b','a','c']);assert.deepEqual(ids('pitchfork-asc'),['a','b','c']);
 assert.deepEqual(ids('kevin'),['a','b','c']);assert.deepEqual(ids('kevin-asc'),['b','a','c']);
 assert.deepEqual(ids('gap'),ids('artist'));
});
