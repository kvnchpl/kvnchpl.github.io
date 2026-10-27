// Apply explicitly in each instrument; neither controller depends on load order.
export function configureCharts(Chart) {
  Chart.defaults.font.family = '"Courier New", Courier, monospace';
  Chart.defaults.animation = false;
  Chart.defaults.elements.line.borderWidth = 1.25;
  Chart.defaults.onResize = (chart, size) => {
    if (chart.config.type === 'line') {
      chart.options.scales.x.ticks.maxTicksLimit = size.width < 500 ? 3 : 8;
    }
  };
}

// Native disclosures can contain canvases initially measured at zero width.
export function setupChartDisclosures(getCharts) {
  document.querySelectorAll('details[data-chart-disclosure]').forEach(details=>{
    details.addEventListener('toggle',()=>{
      if (details.open) requestAnimationFrame(()=>getCharts().filter(chart=>details.contains(chart.canvas)).forEach(chart=>chart.resize()));
    });
  });
  const openTarget=()=>{
    let target;
    try {target=document.getElementById(decodeURIComponent(location.hash.slice(1)));} catch {return;}
    for (let node=target;node;node=node.parentElement) if (node.tagName==='DETAILS') node.open=true;
  };
  window.addEventListener('hashchange',openTarget);
  openTarget();
}
