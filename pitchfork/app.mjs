import {selectAlbums} from './search.mjs';
const $=id=>document.getElementById(id);
const fmt=n=>n==null?'—':n.toFixed(1);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);
let albums=[],view=(params.get('view')==='reviews'||params.get('mine')==='1')?'reviews':'index';
for(const key of ['q','min','max','sort'])if(params.has(key))$(key).value=params.get(key);
if(params.get('min')||params.get('max'))$('score-filters').open=true;
let page=1;
const pageSize=100;
function render(){
  const min=$('min').value,max=$('max').value;
  const invalid=min!==''&&max!==''&&Number(min)>Number(max);
  $('range-error').hidden=!invalid;
  const matches=invalid?[]:selectAlbums(albums,{query:$('q').value,min,max,sort:$('sort').value,onlyReviews:view==='reviews'});
  $('count').textContent=`${matches.length.toLocaleString()} ${matches.length===1?'album':'albums'} / ${albums.length.toLocaleString()} total`;
  const next=new URLSearchParams();
  for(const key of ['q','min','max','sort'])if($(key).value&&!(key==='sort'&&$(key).value==='artist'))next.set(key,$(key).value);
  if(view==='reviews')next.set('view','reviews');
  $('filter-indicator').textContent=min!==''||max!==''?' (active)':'';
  history.replaceState(null,'',location.pathname+(next.size?'?'+next.toString():'')+location.hash);
  for(const id of ['index','reviews']){
    const link=$(`view-${id}`),p=new URLSearchParams(next);
    if(id==='reviews')p.set('view',id);else p.delete('view');
    link.href='?'+p.toString();
    if(view===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  $('table-view').hidden=view!=='index'||!matches.length;
  $('review-view').hidden=view!=='reviews'||!matches.length;
  $('empty').hidden=Boolean(matches.length)||invalid;
  const scores=a=>`<div class="card-scores"><div class="score"><span>Kevin</span>${fmt(a.personal?.score)}</div><div class="score"><span>Pitchfork*</span>${fmt(a.pitchfork?.score)}</div></div>`;
  const pages=Math.max(1,Math.ceil(matches.length/pageSize));
  page=Math.min(page,pages);
  $('pagination').hidden=view!=='index'||pages===1;
  $('previous').disabled=page===1;$('next').disabled=page===pages;
  $('page-status').textContent=`Page ${page} of ${pages}`;
  const visible=matches.slice((page-1)*pageSize,page*pageSize);
  $('rows').innerHTML=visible.map(a=>{
    const url=`reviews/${encodeURIComponent(a.id)}/`,delta=a.personal?.score!=null&&a.pitchfork?.score!=null?a.personal.score-a.pitchfork.score:null;
    return `<tr><td>${a.personal?.text?`<a class="album-link" href="${url}">${escape(a.album)}</a>`:`<span class="album-link">${escape(a.album)}</span>`}<span class="artist">${escape(a.artist)}</span>${a.pitchfork?.reviewDate?`<small>reviewed ${escape(a.pitchfork.reviewDate)}</small>`:''}</td><td class="score">${fmt(a.personal?.score)}</td><td class="score">${fmt(a.pitchfork?.score)}</td><td class="delta delta-col">${delta==null?'—':`${delta>=0?'+':''}${delta.toFixed(1)}`}</td></tr>`;
  }).join('');
  $('review-view').innerHTML=matches.filter(a=>a.personal?.text).map(a=>`<article class="card"><div class="eyebrow">${escape(a.artist)}</div><h2><a href="reviews/${encodeURIComponent(a.id)}/">${escape(a.album)}</a></h2>${scores(a)}<p>${escape(a.personal.text.split(/\s+/).slice(0,38).join(' '))}…</p><a class="review-link" href="reviews/${encodeURIComponent(a.id)}/">read full review ↗</a></article>`).join('');
}
for(const id of ['q','min','max','sort'])$(id).addEventListener('input',()=>{page=1;render()});
$('previous').addEventListener('click',()=>{page--;render()});
$('next').addEventListener('click',()=>{page++;render()});
for(const id of ['index','reviews'])$(`view-${id}`).addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();view=id;page=1;render()});
$('reset').addEventListener('click',()=>{page=1;for(const id of ['q','min','max'])$(id).value='';$('sort').value='artist';$('score-filters').open=false;render();$('q').focus()});
try{
  const response=await fetch('./data/albums.json');
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  albums=(await response.json()).albums;
  render();$('controls').disabled=false;
}catch(error){$('count').textContent='The index could not load. Reload the page to try again; the review links below remain available.';$('load-error').hidden=false;console.error(error)}
