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
