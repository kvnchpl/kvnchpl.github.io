export const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export function selectAlbums(albums, {query='',min='',max='',onlyReviews=false,sort='artist'}={}) {
  const words=normalize(query).trim().split(/\s+/).filter(Boolean);
  const results=albums.filter(a=>words.every(w=>normalize(`${a.artist} ${a.album}`).includes(w))
    && (min==='' || (a.pitchfork?.score!=null && a.pitchfork.score>=Number(min)))
    && (max==='' || (a.pitchfork?.score!=null && a.pitchfork.score<=Number(max)))
    && (!onlyReviews || Boolean(a.personal?.text)));
  const alphabet=(a,b)=>a.artist.localeCompare(b.artist)||a.album.localeCompare(b.album);
  const descending=(value)=>(a,b)=>{const x=value(a),y=value(b);return x==null?(y==null?alphabet(a,b):1):y==null?-1:y-x||alphabet(a,b)};
  const orders={artist:alphabet,pitchfork:descending(a=>a.pitchfork?.score),kevin:descending(a=>a.personal?.score),gap:descending(a=>a.personal?.score!=null&&a.pitchfork?.score!=null?a.personal.score-a.pitchfork.score:null)};
  return results.sort(orders[sort]||alphabet);
}
