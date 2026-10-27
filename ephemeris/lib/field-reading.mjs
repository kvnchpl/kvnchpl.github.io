// Authored delineations, kept distinct from the numerical record.
export const DELINEATIONS = Object.freeze({
  crest: 'Gathering and intensification. Differences take a sharper contour.',
  ebb: 'Release and redistribution. Established forms begin to loosen.',
  concordance: 'Relations gather along a common line. Coherence joins forces or sharpens polarity.',
  'cross-current': 'Pressure across the prevailing course. Competing directions call for adjustment.',
  emergence: 'The center passes beyond the solar boundary. A relation becomes exterior.',
  submergence: 'The center returns within the solar boundary. A relation folds inward.',
  'station-outward': 'The inward passage turns. Distance begins to open.',
  'station-inward': 'The outward passage turns. Distance begins to close.'
});

export function readFieldDay(record, index) {
  const sample=record.samples[index];
  if (!sample) throw new RangeError('No field epoch at this index');
  const previous=record.samples[index-1];
  const change=previous ? sample.tide_span-previous.tide_span : null;
  const tide=change===null?'Here the year record begins.':change>0?'Tidal stretching and compression are drawing further apart.':change<0?'Tidal stretching and compression are drawing closer together.':'The daily tidal span holds steady.';
  const events=record.events.filter(e=>e.sample_index===index);
  return {
    condition:boundaryReading(sample,record.metadata.sun_radius_km)+' '+tide,
    delineation:events.length?events.map(e=>DELINEATIONS[e.kind]).join(' '):'Between marked transits. Attend to what gathers, and what gives way.',
    events
  };
}

function boundaryReading(sample,radius) {
  const boundary=sample.barycenter_km>radius?'beyond':'within';
  const motion=sample.barycenter_rdot_km_s<0?'drawing inward':sample.barycenter_rdot_km_s>0?'moving outward':'at a radial standstill';
  return `The system’s center of mass lies ${boundary} the Sun’s surface, ${motion}.`;
}

export function readFieldEvent(record,event) {
  return {condition:boundaryReading(event.snapshot,record.metadata.sun_radius_km),delineation:DELINEATIONS[event.kind],events:[event]};
}
