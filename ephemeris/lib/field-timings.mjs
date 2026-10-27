import {validateFieldSample} from './field-record.mjs';
const check=(condition,message)=>{if(!condition)throw new Error('Invalid timed transit record: '+message);};
const finite=value=>Number.isFinite(value);
const close=(a,b)=>Math.abs(a-b)<=Math.max(Math.abs(a),Math.abs(b),Number.MIN_VALUE)*1e-8;

export function validateFieldTimings(product,daily,digest) {
  const {metadata:m,events,summary}=product || {};
  check(m?.schema===1 && m.product==='field-transits','schema');
  check(/^[a-f0-9]{64}$/.test(m.daily_record_sha256) && m.daily_record_sha256===digest,'daily record fingerprint');
  check(m.time_scale==='TDB' && m.start===daily.metadata.start && m.stop===daily.metadata.stop && m.frame===daily.metadata.frame && m.origin===daily.metadata.origin,'frame/window');
  check(m.source_cadence_hours===1 && m.comparison_cadence_hours===6 && finite(m.root_tolerance_seconds) && m.root_tolerance_seconds>0,'cadence/tolerance');
  check(JSON.stringify(m.body_ids)===JSON.stringify(daily.metadata.bodies.map(b=>b.id)),'body membership/order');
  check(m.gm_source===daily.metadata.gm_source && JSON.stringify(m.transit_rules)===JSON.stringify(daily.metadata.transit_rules),'model/rules');
  for(const sources of [m.sources,m.comparison_sources]) {
    check(Array.isArray(sources) && sources.length===daily.metadata.sources.length,'input manifest');
    check(new Set(sources.map(s=>s.id)).size===sources.length,'duplicate input');
    for(const source of sources) {
      check(daily.metadata.sources.some(s=>s.id===source.id) && /^[a-f0-9]{64}$/.test(source.sha256),'input hash/identity');
      const url=new URL(source.url);check(url.protocol==='https:' && url.hostname==='ssd.jpl.nasa.gov','input URL');
    }
  }
  check(Array.isArray(events) && events.length>0 && events.length===summary?.event_count,'event count');
  const ids=new Set(),matched=new Set(),counts={};let last=-Infinity,largestDelta=0;
  for(const event of events) {
    check(['crest','ebb','concordance','cross-current'].includes(event.kind),'event kind');
    check(typeof event.id==='string' && /^[a-z-]+-\d{4}-\d{2}-\d{2}$/.test(event.id) && !ids.has(event.id),'event identity');ids.add(event.id);
    check(finite(event.offset_days) && event.offset_days>0 && event.offset_days<daily.samples.length-1 && event.offset_days>=last,'event sequence');last=event.offset_days;
    check(finite(event.jd_tdb) && Math.abs((event.jd_tdb-daily.samples[0].jd_tdb-event.offset_days)*86400)<.1,'event Julian date');
    const rounded=new Date(Date.parse(m.start)+Math.round(event.offset_days*1440)*60000).toISOString().slice(0,16).replace('T',' ');
    check(event.epoch_tdb===rounded,'rounded TDB calendar label');
    check(event.id===event.kind+'-'+event.epoch_tdb.slice(0,10),'event ID date');
    check(event.nearest_sample_index===Math.floor(event.offset_days+.5),'daily cursor');
    check(finite(event.comparison_delta_seconds) && event.comparison_delta_seconds>=0 && event.comparison_delta_seconds<=30,'cadence comparison');
    largestDelta=Math.max(largestDelta,event.comparison_delta_seconds);
    check(finite(event.value) && event.value>=0,'measure');
    validateFieldSample(event.snapshot,daily.metadata,event.id);
    check(event.snapshot.date===event.epoch_tdb.slice(0,10) && Math.abs(event.snapshot.jd_tdb-event.jd_tdb)<1e-9,'snapshot epoch');
    check(close(event.value,event.kind==='crest' || event.kind==='ebb'?event.snapshot.tide_span:event.snapshot.sun_moon_axis_deg),'event/snapshot measure');
    if(event.kind==='concordance')check(event.value<=m.transit_rules.concordance_max_degrees && event.units==='deg','concordance');
    if(event.kind==='cross-current')check(Math.abs(event.value-90)<.001 && event.units==='deg','perpendicular axes');
    if(['crest','ebb'].includes(event.kind))check(event.units==='s^-2','tidal units');
    if(event.daily_event_index!==null) {
      const legacy=daily.events[event.daily_event_index];
      check(legacy && !matched.has(event.daily_event_index) && legacy.kind===event.kind && legacy.epoch_tdb===event.daily_epoch_tdb && Math.abs(legacy.sample_index-event.offset_days)<=1,'daily association');
      matched.add(event.daily_event_index);
    }
    counts[event.kind]=(counts[event.kind] || 0)+1;
  }
  check(JSON.stringify(Object.entries(counts).sort())===JSON.stringify(Object.entries(summary.event_counts || {}).sort()),'count summary');
  check(summary.daily_event_count===daily.events.length && summary.matched_daily_events===matched.size && close(largestDelta,summary.max_comparison_delta_seconds),'comparison summary');
  return product;
}
