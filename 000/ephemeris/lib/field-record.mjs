// Schema 1: the daily, Earth-centered external-field data product.
// Shared by the browser and build preflight; keep this module free of UI code.
export const TRANSIT_LABELS = Object.freeze({
  crest: 'Crest', ebb: 'Ebb', concordance: 'Concordance', 'cross-current': 'Cross-current',
  emergence: 'Emergence', submergence: 'Submergence',
  'station-outward': 'Outward station', 'station-inward': 'Inward station'
});

const requireValue = (condition, message) => {
  if (!condition) throw new Error('Invalid field record: ' + message);
};
const finiteVector = (values, length) => Array.isArray(values) && values.length === length && values.every(Number.isFinite);
const close = (a, b) => Math.abs(a-b) <= Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE)*1e-8;
const text = value => typeof value === 'string' && value.trim().length > 0;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

export function validateFieldRecord(record) {
  const {metadata: m, samples, events, summary} = record || {};
  requireValue(m?.schema === 1, 'unsupported schema; expected 1');
  requireValue(day(m.start) && day(m.stop) && m.start < m.stop, 'date window');
  requireValue(m.time_scale === 'TDB' && m.cadence === '1 day at 00:00 TDB', 'time scale/cadence');
  for (const key of ['origin','frame','source','gm_source','retrieved_at_utc']) requireValue(text(m[key]), 'metadata.'+key);
  requireValue(Number.isFinite(m.sun_radius_km) && m.sun_radius_km > 0, 'solar radius');
  requireValue(Array.isArray(m.bodies) && m.bodies.length > 0, 'source bodies');
  const ids = new Set(), targets = new Set();
  for (const b of m.bodies) {
    requireValue(text(b.id) && text(b.label) && text(b.target) && !ids.has(b.id) && !targets.has(b.target), 'duplicate or incomplete body');
    requireValue(Number.isFinite(b.gm_km3_s2) && b.gm_km3_s2 > 0 && ['luminary','planet'].includes(b.group), 'body mass/group');
    ids.add(b.id); targets.add(b.target);
  }
  requireValue(!targets.has('3') && targets.has('10') && targets.has('301'), 'Sun/Moon mass accounting');
  requireValue(Array.isArray(m.sources) && m.sources.length === m.bodies.length+1, 'source manifest');
  const sourceIds = new Set();
  for (const source of m.sources) {
    requireValue(text(source.id) && !sourceIds.has(source.id) && /^[a-f0-9]{64}$/.test(source.sha256), 'source identity/hash');
    const url = new URL(source.url);
    requireValue(url.protocol === 'https:' && url.hostname === 'ssd.jpl.nasa.gov', 'source URL');
    sourceIds.add(source.id);
  }
  requireValue([...ids, 'solar-barycenter'].every(id => sourceIds.has(id)), 'source coverage');
  requireValue(Array.isArray(samples) && samples.length >= 2 && samples.length === m.sample_count, 'sample count');
  requireValue(samples[0].date === m.start && samples.at(-1).date === m.stop, 'sample endpoints');
  requireValue((Date.parse(m.stop)-Date.parse(m.start))/86400000 === samples.length-1, 'daily calendar span');
  samples.forEach((s,index)=>{
    validateFieldSample(s,m,index);
    if(index)requireValue(s.date>samples[index-1].date && close(s.jd_tdb-samples[index-1].jd_tdb,1),'epoch alignment at '+index);
  });
  requireValue(Array.isArray(events), 'transit catalog');
  const counts = {};
  const uniqueEvents = new Set();
  for (const event of events) {
    const key = event.kind+' / '+event.epoch_tdb;
    requireValue(Object.hasOwn(TRANSIT_LABELS,event.kind) && !uniqueEvents.has(key), 'transit kind/duplicate');
    requireValue(Number.isInteger(event.sample_index) && event.sample_index >= 0 && event.sample_index < samples.length && Number.isFinite(event.value), 'transit sample/value');
    requireValue(typeof event.epoch_tdb === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(event.epoch_tdb) && text(event.units) && text(event.timing), 'transit time/units');
    uniqueEvents.add(key); counts[event.kind] = (counts[event.kind] || 0)+1;
  }
  requireValue(summary?.samples === samples.length && summary.interval_days === samples.length-1, 'summary span');
  requireValue(Object.keys(summary.event_counts || {}).length === Object.keys(counts).length && Object.entries(counts).every(([kind,count]) => summary.event_counts[kind] === count), 'transit counts');
  for (const key of ['g_norm','planet_g_norm','tide_span','planet_tide_span','sun_moon_axis_deg','barycenter_km','barycenter_rdot_km_s']) {
    const range=summary.ranges?.[key];
    const low=samples.reduce((a,b)=>b[key]<a[key]?b:a), high=samples.reduce((a,b)=>b[key]>a[key]?b:a);
    requireValue(range && close(range.min,low[key]) && close(range.max,high[key]) && range.min_date === low.date && range.max_date === high.date, 'summary range '+key);
  }
  return record;
}

export function validateFieldSample(s, m, index="event") {
  const scalars = ['jd_tdb','g_norm','planet_g_norm','tide_span','planet_tide_span','sun_moon_axis_deg','barycenter_km','barycenter_rdot_km_s','axis_gap_fraction'];
  requireValue(day(s.date) && scalars.every(key => Number.isFinite(s[key])), 'sample values at '+index);
  requireValue(finiteVector(s.g,3) && finiteVector(s.tidal_tensor,6) && finiteVector(s.eigenvalues,3) && finiteVector(s.principal_axis,3), 'vector/tensor at '+index);
  requireValue(close(Math.hypot(...s.g),s.g_norm) && close(Math.hypot(...s.principal_axis),1), 'field magnitude/axis at '+index);
  const [lo, mid, hi] = s.eigenvalues;
  requireValue(lo <= mid && mid <= hi && lo < 0 && hi > 0 && close(hi-lo,s.tide_span), 'eigenvalue order/span at '+index);
  requireValue(s.sun_moon_axis_deg >= 0 && s.sun_moon_axis_deg <= 90 && s.axis_gap_fraction >= 0 && s.axis_gap_fraction <= 1, 'axis range at '+index);
  requireValue(s.barycenter_km > 0 && s.planet_tide_span >= 0 && s.planet_g_norm >= 0, 'distance/planet values at '+index);
  requireValue(Array.isArray(s.bodies) && s.bodies.length === m.bodies.length && s.bodies.every(v => finiteVector(v,3) && v.every(x => x > 0)), 'body values at '+index);
  return s;
}
