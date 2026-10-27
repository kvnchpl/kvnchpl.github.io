import { validateFieldRecord, TRANSIT_LABELS as names } from './lib/field-record.mjs';
import { configureCharts, setupChartDisclosures } from './lib/chart-defaults.mjs';
import { validateFieldTimings } from './lib/field-timings.mjs';
import { readFieldDay, readFieldEvent } from './lib/field-reading.mjs';

// The fixed year record is generated from cached NASA vectors by the local
// research calculator. This module presents it; it never invents missing data.
(() => {

  let record, active = 0, activeEvent=null, timings=null, sourceDigest, charts = [], loading = false, timingLoading=false;
  const el = id => document.getElementById(id);
  const number = (value, digits = 3) => Number.isFinite(value) ? value.toExponential(digits) : '—';
  const cell = (row, text, tag = 'td') => { const node = document.createElement(tag); node.textContent = text; row.append(node); return node; };
  const marker = {
    id: 'fieldEpochMarker',
    afterDraw(chart) {
      const {ctx, chartArea, scales} = chart;
      if (!chartArea || !record) return;
      const x = scales.x.getPixelForValue(activeEvent?.offset_days ?? active);
      ctx.save(); ctx.strokeStyle = '#ed6c99'; ctx.setLineDash([3,3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x,chartArea.top); ctx.lineTo(x,chartArea.bottom); ctx.stroke(); ctx.restore();
    }
  };

  function setDay(index, {remember=true,event=null}={}) {
    if (!record) return;
    if (!Number.isInteger(Number(index))) return;
    active = Math.max(0, Math.min(record.samples.length-1, Number(index)));
    activeEvent=event;
    const sample = event?.snapshot || record.samples[active];
    const reading=event?readFieldEvent(record,event):readFieldDay(record,active);
    const stamp=event?event.epoch_tdb+' TDB / estimated':sample.date+' / 00:00 TDB';
    el('fieldEpoch').value = String(active);
    el('fieldPrevious').disabled = active === 0;
    el('fieldNext').disabled = active === record.samples.length-1;
    el('fieldReadingDate').textContent = stamp;
    el('fieldEpochRelation').textContent=event?'Timed event selected. Daily trace cursor: '+record.samples[active].date+' / 00:00 TDB.':'Daily sample selected / 00:00 TDB.';
    el('fieldMeasures').querySelector('summary').textContent=event?'measurements at the estimated event time':'measurements at this daily epoch';
    el('fieldAcceleration').textContent = number(sample.g_norm)+' m/s²';
    el('fieldStretch').textContent = number(sample.eigenvalues[2])+' s⁻²';
    el('fieldCompression').textContent = number(sample.eigenvalues[0])+' s⁻²';
    el('fieldPlanetSpan').textContent = number(sample.planet_tide_span)+' s⁻²';
    el('fieldAngle').textContent = sample.sun_moon_axis_deg.toFixed(2)+'°';
    el('fieldBarycenter').textContent = sample.barycenter_km.toLocaleString('en-US',{maximumFractionDigits:0})+' km';
    const events = reading.events;
    el('fieldDayEvents').textContent = events.length ? (timings && !event?'Daily marker / ':'')+events.map(item=>names[item.kind] || item.kind).join(' / ') : 'Between marked transits';
    el('fieldDelineation').textContent=events.length?reading.delineation:reading.delineation.replace(/^Between marked transits\. /,'');
    el('fieldCursor').classList.toggle('is-transit',events.length>0);
    el('entryEpoch').textContent=stamp;
    el('entryEpoch').dateTime=event?event.epoch_tdb.replace(' ','T'):sample.date;
    el('entryCondition').textContent=reading.condition;
    el('entryDelineation').textContent=reading.delineation;
    updateTransitControls();
    const link=new URL(location.href);link.searchParams.set('field',record.samples[active].date);
    if(event)link.searchParams.set('transit',event.id);else link.searchParams.delete('transit');
    link.hash='field-year';el('fieldPermalink').href=link.href;
    if (remember) {
      link.hash=location.hash;
      try {history.replaceState(history.state,'',link);} catch { /* permalink remains available */ }
      el('fieldLinkNotice').hidden=true;
    }
    const rows = record.metadata.bodies.map((body,index)=>({body,values:sample.bodies[index]})).sort((a,b)=>b.values[2]-a.values[2]);
    el('fieldContributors').replaceChildren(...rows.map(({body,values})=>{
      const row=document.createElement('tr');
      cell(row,body.label,'th').scope='row';
      cell(row,values[0].toLocaleString('en-US',{maximumFractionDigits:0}));
      cell(row,number(values[1]));cell(row,number(values[2]));
      return row;
    }));
    el('fieldAxis').textContent = sample.principal_axis.map(value=>value.toFixed(4)).join(' / ');
    el('fieldAxisState').textContent = sample.axis_gap_fraction < .1 ? 'Stretching directions nearly degenerate at this epoch.' : 'Principal stretching line / ecliptic X, Y, Z';
    charts.forEach(chart=>chart.update('none'));
    document.querySelectorAll('#fieldTransits tr[data-index]').forEach(row=>{
      const selected=timings?row.dataset.eventId===activeEvent?.id:Number(row.dataset.index)===active;row.classList.toggle('is-selected',selected);
      const button=row.querySelector('button');
      if(selected)button.setAttribute('aria-current','date');else button.removeAttribute('aria-current');
    });
  }

  function restoreDay() {
    if(!record)return;
    const params=new URL(location.href).searchParams;
    const requested=params.get('transit');
    if(requested && timings){
      const event=timings.events.find(e=>e.id===requested);
      if(event){el('fieldLinkNotice').hidden=true;setDay(event.nearest_sample_index,{remember:false,event});return;}
    }
    const date=params.get('field');
    const index=record.samples.findIndex(s=>s.date===date);
    const badDate=date && index<0, badEvent=requested && (timings || !timingLoading);
    el('fieldLinkNotice').hidden=!badDate && !badEvent;
    el('fieldLinkNotice').textContent=badEvent?'That timed transit is not available in this record. Showing a daily epoch.':'That date is outside this record. Showing its final epoch, '+record.metadata.stop+'.';
    setDay(index>=0?index:record.samples.length-1,{remember:false});
  }

  function updateTransitControls() {
    if(timings){
      const index=activeEvent?timings.events.indexOf(activeEvent):-1;
      el('fieldPreviousTransit').disabled=activeEvent?index===0:!timings.events.some(e=>e.offset_days<active);
      el('fieldNextTransit').disabled=activeEvent?index===timings.events.length-1:!timings.events.some(e=>e.offset_days>active);
    }else{
      const days=record.events.map(e=>e.sample_index);
      el('fieldPreviousTransit').disabled=!days.some(i=>i<active);
      el('fieldNextTransit').disabled=!days.some(i=>i>active);
    }
  }

  function nextTransit(direction) {
    if(timings){
      const events=timings.events;
      const event=activeEvent?events[events.indexOf(activeEvent)+direction]:direction>0?events.find(e=>e.offset_days>active):[...events].reverse().find(e=>e.offset_days<active);
      if(event)setDay(event.nearest_sample_index,{event});
    }else{
      const days=[...new Set(record.events.map(e=>e.sample_index))].sort((a,b)=>a-b);
      const index=direction>0?days.find(i=>i>active):days.reverse().find(i=>i<active);
      if(index!==undefined)setDay(index);
    }
  }

  function renderTransits() {
    const events=timings?.events || record.events;
    el('fieldTransitMethod').textContent=timings?'Crest / ebb: turning points of total tidal span. Concordance: closest axes within 12°. Cross-current: perpendicular axes. Select a time to read it.':'Crest / ebb: daily extrema of total tidal span. Concordance: daily axis minimum within 12°. Cross-current: daily maximum at least 80°. Select a daily marker to follow it.';
    el('fieldTransitCount').textContent=events.length+(timings?' timed transits':' daily markers');
    el('fieldTransits').replaceChildren(...events.map(event=>{
      const row=document.createElement('tr');
      const index=timings?event.nearest_sample_index:event.sample_index;
      row.dataset.index=String(index);if(timings)row.dataset.eventId=event.id;
      const when=cell(row,'');const button=document.createElement('button');button.type='button';button.className='field-event';
      button.textContent=timings?event.epoch_tdb:event.epoch_tdb.slice(0,10);button.title=event.epoch_tdb+' TDB'+(timings?' / estimated':' / daily marker');
      button.dataset.index=String(index);if(timings)button.dataset.eventId=event.id;
      when.append(button);cell(row,names[event.kind] || event.kind);
      cell(row,event.units==='deg'?event.value.toFixed(2)+'°':number(event.value)+' '+event.units);
      return row;
    }));
  }

  async function loadTimings() {
    if(timingLoading || !record)return;
    timingLoading=true;el('fieldTimingRetry').hidden=true;el('fieldTimingStatus').dataset.state='loading';
    el('fieldTimingStatus').textContent='Opening the timed ledger… Daily markers are available below.';
    try {
      const response=await fetch(new URL('field-transits.json',document.baseURI),{signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      timings=validateFieldTimings(await response.json(),record,sourceDigest);
      renderTransits();
      el('fieldTimingStatus').textContent='Estimated event times / TDB, rounded to the minute. Curves retain their daily cadence.';
      el('fieldTimingStatus').dataset.state='ready';
    }catch(error){
      timings=null;renderTransits();el('fieldTimingStatus').dataset.state='error';
      el('fieldTimingStatus').textContent='Timed ledger unavailable. Daily markers are shown.';
      el('fieldTimingRetry').hidden=false;console.warn('Timed field record unavailable:',error.message);
    }finally{timingLoading=false;restoreDay();}
  }

  function makeChart(id, series, yTitle) {
    const color = ['#ded3dc','#ee4b7e','#a795b9'];
    const chart = new Chart(el(id), {
      type:'line',
      data:{labels:record.samples.map(s=>s.date),datasets:series.map((item,index)=>({
        label:item.label,data:record.samples.map(item.get),borderColor:color[index],
        borderDash:index===1?[5,3]:[],borderWidth:1.25,pointRadius:0,pointHoverRadius:3,tension:0
      }))},
      plugins:[marker],
      options:{responsive:true,maintainAspectRatio:false,animation:false,
        interaction:{mode:'index',intersect:false},
        onClick(event,items,chart){
          if(event.x<chart.chartArea.left || event.x>chart.chartArea.right || event.y<chart.chartArea.top || event.y>chart.chartArea.bottom)return;
          const index=Math.round(chart.scales.x.getValueForPixel(event.x));setDay(index);
        },
        onResize(chart,size){chart.options.scales.x.ticks.maxTicksLimit=size.width<500?3:7;},
        plugins:{legend:{display:series.length>1,labels:{color:'#c6afbf',font:{family:'Courier New',size:11},boxWidth:12}},
          tooltip:{backgroundColor:'#10070e',borderColor:'#854360',borderWidth:1,cornerRadius:0,
            callbacks:{title:items=>items[0]?.label+' / 00:00 TDB',label:context=>context.dataset.label+': '+(Math.abs(context.parsed.y)<.001?number(context.parsed.y):context.parsed.y.toLocaleString('en-US',{maximumFractionDigits:2}))}}},
        scales:{x:{grid:{color:'#39202c'},ticks:{color:'#ad92a3',font:{family:'Courier New',size:11},maxTicksLimit:7,maxRotation:0,callback(value){return record.samples[value]?.date.slice(5);}}},
          y:{title:{display:true,text:yTitle,color:'#ae8fa4',font:{family:'Courier New',size:11}},grid:{color:'#39202c'},ticks:{color:'#ad92a3',font:{family:'Courier New',size:11},maxTicksLimit:4,
            callback(value){return Math.abs(value)>0 && Math.abs(value)<.001?value.toExponential(1):Math.abs(value)>=1000?(value/1000).toFixed(0)+'k':Number(value.toPrecision(3));}}}}
      }
    });
    charts.push(chart);
  }

  async function load() {
    if (loading) return;
    loading = true; el('fieldRetry').hidden = true;
    el('fieldStatus').textContent = 'Opening the year record…';
    try {
      const response=await fetch(new URL('field-year.json',document.baseURI),{signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const raw=await response.text();record=validateFieldRecord(JSON.parse(raw));
      sourceDigest=null;
      if(globalThis.crypto?.subtle)try{sourceDigest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');}catch{ /* daily record remains usable */ }
      charts.forEach(chart=>chart.destroy());charts=[];
      el('fieldEpoch').replaceChildren(...record.samples.map((sample,index)=>new Option(sample.date,String(index))));
      el('fieldEpoch').disabled=false;
      el('fieldStatus').textContent = record.metadata.source+' / '+record.metadata.sample_count+' aligned epochs / '+record.metadata.start+' → '+record.metadata.stop;
      el('fieldStatus').dataset.state='ready';
      renderTransits();
      el('fieldRecord').hidden=false;
      if(typeof Chart!=='undefined'){
        configureCharts(Chart);
        el('fieldCharts').hidden=false;
        makeChart('fieldAccelerationChart',[{label:'External acceleration',get:s=>s.g_norm}],'m/s²');
        makeChart('fieldTideChart',[{label:'Stretching',get:s=>s.eigenvalues[2]},{label:'Compression',get:s=>s.eigenvalues[0]}],'s⁻²');
        makeChart('fieldPlanetChart',[{label:'Planetary tidal span',get:s=>s.planet_tide_span}],'s⁻²');
        makeChart('fieldAngleChart',[{label:'Sun–Moon acute axis angle',get:s=>s.sun_moon_axis_deg}],'degrees');
        makeChart('fieldBarycenterChart',[{label:'SSB distance from Sun',get:s=>s.barycenter_km}],'km');
      }else{
        el('fieldCharts').hidden=true;
        el('fieldStatus').textContent+=' / charts unavailable; epoch and coordinate tables remain available';
      }
      restoreDay();
      loadTimings();
    }catch(error){
      el('fieldStatus').dataset.state='error';
      el('fieldStatus').textContent='The year record could not be opened. Retry to receive the field.';
      el('fieldRetry').hidden=false;
      el('fieldRecord').hidden=true;
      el('entryEpoch').textContent='record unavailable';el('entryEpoch').removeAttribute('datetime');
      el('entryCondition').textContent='The field record could not be received.';
      el('entryDelineation').textContent='Open the field instrument below to retry.';
      console.warn('Field year record unavailable:',error.message);
    }finally{loading=false;}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    el('fieldEpoch').addEventListener('change',()=>setDay(el('fieldEpoch').value));
    el('fieldPrevious').addEventListener('click',()=>setDay(active-1));
    el('fieldNext').addEventListener('click',()=>setDay(active+1));
    el('fieldPreviousTransit').addEventListener('click',()=>nextTransit(-1));
    el('fieldNextTransit').addEventListener('click',()=>nextTransit(1));
    window.addEventListener('popstate',restoreDay);
    el('fieldRetry').addEventListener('click',load);
    el('fieldTimingRetry').addEventListener('click',loadTimings);
    el('fieldTransits').addEventListener('click',event=>{
      const button=event.target.closest('button[data-index]');
      if(!button)return;
      const selected=timings?.events.find(e=>e.id===button.dataset.eventId);
      setDay(button.dataset.index,{event:selected || null});
    });
    setupChartDisclosures(()=>charts);
    load();
  });
})();
