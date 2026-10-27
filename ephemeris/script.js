import { SUN_RADIUS_KM, getLogTimestamp, getHorizonsStepSize, getRadialComponentVector,
  parseHorizonsData, generateCircleData, generateSimulatedData, calculateAcceleration,
  calculateDistance, getRadialState } from './lib/solar-model.mjs';
import { createSolarCharts } from './lib/solar-charts.mjs';
import { configureCharts } from './lib/chart-defaults.mjs';

// Portfolio previews proxy to the existing standalone NASA service.
const portfolioPreview = location.hostname.endsWith('.netlify.app')
  && !/^(?:[a-z0-9-]+--)?kvnchpl-ephemeris\.netlify\.app$/.test(location.hostname);
const HORIZONS_API_ENDPOINT = new URL(portfolioPreview ? '/api/ephemeris/horizons' : '/.netlify/functions/horizons',
  location.hostname.endsWith('.netlify.app') || ['localhost', '127.0.0.1'].includes(location.hostname)
    ? location.origin : 'https://kvnchpl-ephemeris.netlify.app').href;
const chartTheme = {
  text: '#d5cdd0',
  muted: '#a59b9f',
  grid: 'rgba(162, 108, 145, 0.16)',
  tooltipBg: 'rgba(8, 2, 8, 0.97)',
  tooltipBorder: '#a13b64',
  gold: '#c0a9bc',
  bone: '#e2d9df',
  red: '#f03b60',
  green: '#a8bdab'
};

// DOM elements
const updateButton = document.getElementById('updateButton');
const barycenterStatus = document.getElementById('barycenterStatus');
const distanceFromSun = document.getElementById('distanceFromSun');
const lastUpdated = document.getElementById('lastUpdated');
const latestEpoch = document.getElementById('latestEpoch');
const sourceStrip = document.getElementById('sourceStrip');
const dataSource = document.getElementById('dataSource');
const sourceDetail = document.getElementById('sourceDetail');
const sampleCount = document.getElementById('sampleCount');
const epochSelect = document.getElementById('epochSelect');
const queryForm = document.getElementById('queryForm');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const stepSizeInput = document.getElementById('stepSize');
const barycenterLedger = document.getElementById('barycenterLedger');
const orbitZoomIn = document.getElementById('orbitZoomIn');
const orbitZoomOut = document.getElementById('orbitZoomOut');
const orbitZoomReset = document.getElementById('orbitZoomReset');
const orbitPathLines = document.getElementById('orbitPathLines');
const orbitNodeColorModes = document.querySelectorAll('input[name="orbitNodeColor"]');

// Chart instances
let positionChart, velocityChart, accelerationChart, orbitChart, radialStateChart;

// Data storage
let barycenterData = [];
let orbitBaseAxisLimit = SUN_RADIUS_KM * 1e-6 * 1.5;
let orbitCurrentAxisLimit = orbitBaseAxisLimit;
let orbitPanState = null;
let orbitDidPan = false;
let selectedDate = null;

const orbitVectorArrowsPlugin = {
  id: 'orbitVectorArrows',
  afterDatasetsDraw(chart) {
    if (chart !== orbitChart) return;

    const pathDataset = chart.data.datasets[1];
    if (!pathDataset?.showLine || !pathDataset.data || pathDataset.data.length < 2) return;

    const meta = chart.getDatasetMeta(1);
    if (!meta?.data || meta.data.length < 2) return;

    const { ctx } = chart;
    const arrowSize = 8;
    const minSegmentPixels = 18;

    ctx.save();
    ctx.fillStyle = chartTheme.bone;
    ctx.strokeStyle = chartTheme.bone;

    for (let i = 1; i < meta.data.length; i++) {
      const start = meta.data[i - 1];
      const end = meta.data[i];
      const startX = start.x;
      const startY = start.y;
      const endX = end.x;
      const endY = end.y;
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.hypot(dx, dy);

      if (length < minSegmentPixels) continue;

      const angle = Math.atan2(dy, dx);
      const arrowX = startX + dx * 0.62;
      const arrowY = startY + dy * 0.62;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
};

function drawCanvasArrow(ctx, startX, startY, endX, endY, color, label) {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;

  const angle = Math.atan2(dy, dx);
  const arrowSize = 10;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle - Math.PI / 6),
    endY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle + Math.PI / 6),
    endY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, endX + 8 * Math.cos(angle), endY + 8 * Math.sin(angle));
  ctx.restore();
}

function getScaledVectorEnd(startX, startY, vectorX, vectorY, lengthPixels) {
  const magnitude = Math.hypot(vectorX, vectorY);
  if (!Number.isFinite(magnitude) || magnitude === 0) return null;

  return {
    x: startX + (vectorX / magnitude) * lengthPixels,
    y: startY - (vectorY / magnitude) * lengthPixels
  };
}

const selectedOrbitVectorsPlugin = {
  id: 'selectedOrbitVectors',
  afterDatasetsDraw(chart) {
    if (chart !== orbitChart || !selectedDate) return;

    const selectedEntry = barycenterData.find(entry => entry.date === selectedDate);
    if (!selectedEntry) return;

    const selectedMeta = chart.getDatasetMeta(3);
    const selectedPoint = selectedMeta?.data?.[0];
    if (!selectedPoint) return;

    const { ctx } = chart;
    const acceleration = selectedEntry.acceleration || { x: 0, y: 0, z: 0 };
    const radialAcceleration = getRadialComponentVector(acceleration, selectedEntry.position);
    const velocityEnd = getScaledVectorEnd(selectedPoint.x, selectedPoint.y, selectedEntry.velocity.x, selectedEntry.velocity.y, 72);
    const accelerationEnd = getScaledVectorEnd(selectedPoint.x, selectedPoint.y, radialAcceleration.x, radialAcceleration.y, 52);

    if (velocityEnd) {
      drawCanvasArrow(ctx, selectedPoint.x, selectedPoint.y, velocityEnd.x, velocityEnd.y, chartTheme.gold, 'V');
    }

    if (accelerationEnd) {
      drawCanvasArrow(ctx, selectedPoint.x, selectedPoint.y, accelerationEnd.x, accelerationEnd.y, chartTheme.red, 'Ar');
    }
  }
};

const stateTimeBandsPlugin = {
  id: 'stateTimeBands',
  beforeDatasetsDraw(chart) {
    const bands = chart.$stateBands;
    if (!bands || bands.length === 0) return;
    const { ctx, chartArea, scales } = chart;

    ctx.save();
    bands.forEach((band) => {
      const xStart = scales.x.getPixelForValue(band.start);
      const xEnd = scales.x.getPixelForValue(band.end);
      const left = Math.max(chartArea.left, Math.min(xStart, xEnd));
      const right = Math.min(chartArea.right, Math.max(xStart, xEnd));
      if (right <= chartArea.left || left >= chartArea.right) return;

      ctx.fillStyle = band.color;
      ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
    });
    ctx.restore();
  }
};

const selectedDateMarkerPlugin = {
  id: 'selectedDateMarker',
  afterDatasetsDraw(chart) {
    if (!selectedDate || chart === orbitChart) return;

    const selectedIndex = chart.data.labels?.indexOf(selectedDate);
    if (selectedIndex === undefined || selectedIndex < 0) return;

    const { ctx, chartArea, scales } = chart;
    const x = scales.x.getPixelForValue(selectedIndex);

    ctx.save();
    ctx.strokeStyle = chartTheme.gold;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  }
};

// Initialize charts
// Fetch data from NASA Horizons API via Netlify serverless function
// This runs server-side, so there are no CORS restrictions
async function fetchHorizonsData(command, startTime, stopTime, stepSize = '1d') {
  try {
    const params = new URLSearchParams({
      command,
      startTime,
      stopTime,
      stepSize: getHorizonsStepSize(stepSize)
    });

    const url = `${HORIZONS_API_ENDPOINT}?${params}`;
    console.debug(`[${getLogTimestamp()}] Fetching real NASA Horizons data...`);

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      // Try to get error details from the response
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.nasaError) {
          errorMsg += ` - NASA API: ${errorData.nasaError}`;
        } else if (errorData.error) {
          errorMsg += ` - ${errorData.error}`;
        }
      } catch (e) {
        // Couldn't parse error response
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.debug(`[${getLogTimestamp()}] ✓ Successfully fetched real NASA data!`);
    return data;
  } catch (error) {
    console.warn(`[${getLogTimestamp()}] Failed to fetch from Netlify function:`, error.message);
    throw error;
  }
}

function getStateClass(state, positiveState) {
  return state === positiveState ? 'state-away' : 'state-toward';
}

function buildStateBands(states, getKey, getColor) {
  if (!states.length) return [];

  const bands = [];
  let currentKey = getKey(states[0]);
  let startIndex = 0;

  for (let index = 1; index < states.length; index++) {
    const nextKey = getKey(states[index]);
    if (nextKey === currentKey) continue;

    bands.push({
      start: startIndex,
      end: Math.max(index - 0.5, startIndex + 0.5),
      color: getColor(currentKey)
    });
    startIndex = index;
    currentKey = nextKey;
  }

  bands.push({
    start: startIndex,
    end: Math.max(states.length - 0.5, startIndex + 0.5),
    color: getColor(currentKey)
  });

  return bands;
}

function getOrbitNodeColorMode() {
  return document.querySelector('input[name="orbitNodeColor"]:checked')?.value || 'plain';
}

function getOrbitNodeColors(data) {
  const colorMode = getOrbitNodeColorMode();
  if (colorMode === 'plain') {
    return data.map(() => chartTheme.bone);
  }

  return data.map((entry) => {
    const radialState = getRadialState(entry);
    if (colorMode === 'position') {
      return radialState.isOutside ? chartTheme.red : chartTheme.green;
    }
    if (colorMode === 'velocity') {
      return radialState.radialVelocity >= 0 ? chartTheme.gold : chartTheme.bone;
    }
    if (colorMode === 'acceleration') {
      return radialState.radialAcceleration >= 0 ? chartTheme.gold : chartTheme.bone;
    }
    return chartTheme.bone;
  });
}

function updateOrbitNodeColors() {
  if (!orbitChart || !barycenterData.length) return;
  const nodeColors = getOrbitNodeColors(barycenterData);
  orbitChart.data.datasets[1].pointBackgroundColor = nodeColors;
  orbitChart.data.datasets[1].pointBorderColor = nodeColors;
}

function setOrbitAxisLimit(axisLimit, centerX = 0, centerY = 0) {
  if (!orbitChart || !Number.isFinite(axisLimit)) return;

  orbitCurrentAxisLimit = Math.max(axisLimit, 0.1);
  orbitChart.options.scales.x.min = centerX - orbitCurrentAxisLimit;
  orbitChart.options.scales.x.max = centerX + orbitCurrentAxisLimit;
  orbitChart.options.scales.y.min = centerY - orbitCurrentAxisLimit;
  orbitChart.options.scales.y.max = centerY + orbitCurrentAxisLimit;
  orbitChart.update('none');
}

function zoomOrbit(multiplier) {
  const minLimit = 0.01;
  const maxLimit = Math.max(orbitBaseAxisLimit * 20, minLimit);
  const nextLimit = Math.min(Math.max(orbitCurrentAxisLimit * multiplier, minLimit), maxLimit);
  const xScale = orbitChart.scales.x;
  const yScale = orbitChart.scales.y;
  setOrbitAxisLimit(nextLimit, (xScale.min + xScale.max) / 2, (yScale.min + yScale.max) / 2);
}

function resetOrbitZoom() {
  setOrbitAxisLimit(orbitBaseAxisLimit);
}

function panOrbit(deltaX, deltaY) {
  if (!orbitChart) return;

  const xScale = orbitChart.scales.x;
  const yScale = orbitChart.scales.y;
  const xUnitsPerPixel = (xScale.max - xScale.min) / xScale.width;
  const yUnitsPerPixel = (yScale.max - yScale.min) / yScale.height;

  orbitChart.options.scales.x.min = xScale.min - deltaX * xUnitsPerPixel;
  orbitChart.options.scales.x.max = xScale.max - deltaX * xUnitsPerPixel;
  orbitChart.options.scales.y.min = yScale.min + deltaY * yUnitsPerPixel;
  orbitChart.options.scales.y.max = yScale.max + deltaY * yUnitsPerPixel;
  orbitChart.update('none');
}

function updateOrbitDisplayOptions() {
  if (!orbitChart) return;
  orbitChart.data.datasets[1].showLine = orbitPathLines?.checked ?? true;
  updateOrbitNodeColors();
  orbitChart.update('none');
}

function setupOrbitZoomControls() {
  orbitZoomIn?.addEventListener('click', () => zoomOrbit(0.8));
  orbitZoomOut?.addEventListener('click', () => zoomOrbit(1.25));
  orbitZoomReset?.addEventListener('click', resetOrbitZoom);
  orbitPathLines?.addEventListener('change', updateOrbitDisplayOptions);
  orbitNodeColorModes.forEach((input) => {
    input.addEventListener('change', updateOrbitDisplayOptions);
  });

  const orbitCanvas = document.getElementById('orbitChart');
  orbitCanvas?.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoomOrbit(event.deltaY < 0 ? 0.88 : 1.14);
  }, { passive: false });

  orbitCanvas?.addEventListener('pointerdown', (event) => {
    orbitPanState = { x: event.clientX, y: event.clientY };
    orbitDidPan = false;
    orbitCanvas.setPointerCapture(event.pointerId);
    orbitCanvas.classList.add('is-panning');
  });

  orbitCanvas?.addEventListener('pointermove', (event) => {
    if (!orbitPanState) return;
    event.preventDefault();
    const deltaX = event.clientX - orbitPanState.x;
    const deltaY = event.clientY - orbitPanState.y;
    if (Math.hypot(deltaX, deltaY) > 2) {
      orbitDidPan = true;
    }
    orbitPanState = { x: event.clientX, y: event.clientY };
    panOrbit(deltaX, deltaY);
  });

  const stopPanning = (event) => {
    if (!orbitPanState) return;
    orbitPanState = null;
    if (orbitCanvas.hasPointerCapture(event.pointerId)) {
      orbitCanvas.releasePointerCapture(event.pointerId);
    }
    orbitCanvas.classList.remove('is-panning');
  };

  orbitCanvas?.addEventListener('pointerup', stopPanning);
  orbitCanvas?.addEventListener('pointercancel', stopPanning);
  orbitCanvas?.addEventListener('lostpointercapture', () => {
    orbitPanState = null;
    orbitCanvas.classList.remove('is-panning');
  });
}

function getSelectedIndex() {
  return selectedDate ? barycenterData.findIndex(entry => entry.date === selectedDate) : -1;
}

function getChartDateFromEvent(chart, event) {
  const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
  if (!points.length) return null;

  const point = points[0];
  if (chart === orbitChart) {
    const raw = chart.data.datasets[point.datasetIndex]?.data?.[point.index];
    return raw?.date || null;
  }

  return chart.data.labels?.[point.index] || null;
}

function updateLedgerSelection() {
  document.querySelectorAll('#barycenterLedger tr').forEach((row) => {
    row.classList.toggle('is-selected', Boolean(selectedDate && row.dataset.date === selectedDate));
  });
}

function updateChartSelection() {
  const selectedIndex = getSelectedIndex();
  const selectedEntry = selectedIndex >= 0 ? barycenterData[selectedIndex] : null;
  const lineCharts = [positionChart, velocityChart, accelerationChart];

  lineCharts.forEach((chart) => {
    chart.data.datasets.forEach((dataset) => {
      dataset.pointRadius = chart.data.labels.map((_, index) => index === selectedIndex ? 5 : 0);
      dataset.pointHoverRadius = chart.data.labels.map((_, index) => index === selectedIndex ? 7 : 4);
    });
    chart.update('none');
  });

  radialStateChart.data.datasets.forEach((dataset) => {
    dataset.pointRadius = radialStateChart.data.labels.map((_, index) => index === selectedIndex ? 7 : 4);
  });
  radialStateChart.update('none');

  if (orbitChart) {
    orbitChart.data.datasets[3].data = selectedEntry
      ? [{ x: selectedEntry.position.x * 1e-6, y: selectedEntry.position.y * 1e-6, date: selectedEntry.date }]
      : [];
    orbitChart.update('none');
  }

  epochSelect.value = selectedDate || '';
  updateLedgerSelection();
}

function selectDate(date) {
  selectedDate = date;
  updateChartSelection();
}

function clearDateSelection() {
  if (!selectedDate) return;
  selectedDate = null;
  updateChartSelection();
}

function setupDateSelectionControls() {
  epochSelect.addEventListener('change', () => {
    if (epochSelect.value) selectDate(epochSelect.value);
    else clearDateSelection();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clearDateSelection();
  });
  [positionChart, velocityChart, accelerationChart, radialStateChart, orbitChart].forEach((chart) => {
    chart.canvas.addEventListener('click', (event) => {
      if (chart === orbitChart && orbitDidPan) {
        orbitDidPan = false;
        event.stopPropagation();
        return;
      }
      const date = getChartDateFromEvent(chart, event);
      if (date) {
        event.stopPropagation();
        selectDate(date);
      } else {
        event.stopPropagation();
        clearDateSelection();
      }
    });
  });

  barycenterLedger?.addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-date]');
    if (!row) return;
    event.stopPropagation();
    selectDate(row.dataset.date);
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('canvas, #barycenterLedger, button, input, select, label')) return;
    clearDateSelection();
  });
}

function formatLedgerNumber(value, maximumFractionDigits = 3) {
  if (!Number.isFinite(value)) return '--';
  const zeroThreshold = 0.5 * (10 ** -maximumFractionDigits);
  const displayValue = Math.abs(value) < zeroThreshold ? 0 : value;
  return displayValue.toLocaleString('en-US', { maximumFractionDigits });
}

function formatLedgerAcceleration(value) {
  if (!Number.isFinite(value)) return '--';
  if (value === 0) return '0';
  return value.toExponential(3);
}

function renderBarycenterLedger(data) {
  if (!barycenterLedger) return;

  if (!data || data.length === 0) {
    barycenterLedger.innerHTML = '<tr><td colspan="13">No coordinates available.</td></tr>';
    return;
  }

  barycenterLedger.innerHTML = data.map((entry) => {
    const acceleration = entry.acceleration || { x: 0, y: 0, z: 0 };
    const radialState = getRadialState(entry);
    return `
      <tr data-date="${entry.date}">
        <td>${entry.date}</td>
        <td>${formatLedgerNumber(entry.position.x, 0)}</td>
        <td>${formatLedgerNumber(entry.position.y, 0)}</td>
        <td>${formatLedgerNumber(entry.position.z, 0)}</td>
        <td>${formatLedgerNumber(entry.velocity.x, 6)}</td>
        <td>${formatLedgerNumber(entry.velocity.y, 6)}</td>
        <td>${formatLedgerNumber(entry.velocity.z, 6)}</td>
        <td>${formatLedgerAcceleration(acceleration.x)}</td>
        <td>${formatLedgerAcceleration(acceleration.y)}</td>
        <td>${formatLedgerAcceleration(acceleration.z)}</td>
        <td><span class="state-badge ${radialState.isOutside ? 'state-outside' : 'state-inside'}">${radialState.boundaryLabel}</span></td>
        <td><span class="state-badge ${getStateClass(radialState.velocityLabel, 'Away')}">${radialState.velocityLabel}</span></td>
        <td><span class="state-badge ${getStateClass(radialState.accelerationLabel, 'Away')}">${radialState.accelerationLabel}</span></td>
      </tr>
    `;
  }).join('');
  updateLedgerSelection();
}

// Update UI with current barycenter status
function updateBarycenterStatus(data) {
  if (!data || data.length === 0) return;

  const latest = data[data.length - 1];
  const distance = calculateDistance(latest.position);

  const isInsideSun = distance <= SUN_RADIUS_KM;
  const status = isInsideSun ? 'Inside Sun Boundary' : 'Outside Sun Boundary';
  const statusColor = isInsideSun ? chartTheme.green : chartTheme.red;

  barycenterStatus.textContent = status;
  barycenterStatus.style.color = statusColor;

  distanceFromSun.textContent = `${distance.toLocaleString('en-US', { maximumFractionDigits: 0 })} km`;

  latestEpoch.textContent = latest.date;
  const now = new Date();
  lastUpdated.dateTime = now.toISOString();
  lastUpdated.textContent = `${now.toISOString().slice(11, 19)} UTC`;
}

// Update charts with new data
function updateCharts(data) {
  if (!data || data.length === 0) return;

  const labels = data.map(d => d.date);
  if (selectedDate && !labels.includes(selectedDate)) {
    selectedDate = null;
  }
  const positions = {
    x: data.map(d => d.position.x),
    y: data.map(d => d.position.y),
    z: data.map(d => d.position.z)
  };

  const velocities = {
    x: data.map(d => d.velocity.x),
    y: data.map(d => d.velocity.y),
    z: data.map(d => d.velocity.z)
  };

  const accelerations = {
    x: data.map(d => d.acceleration?.x || 0),
    y: data.map(d => d.acceleration?.y || 0),
    z: data.map(d => d.acceleration?.z || 0)
  };
  const radialStates = data.map(getRadialState);
  const insideColor = 'rgba(168, 189, 171, 0.06)';
  const outsideColor = 'rgba(240, 59, 96, 0.09)';
  const towardColor = 'rgba(218, 219, 209, 0.05)';
  const awayColor = 'rgba(192, 169, 188, 0.07)';

  positionChart.$stateBands = buildStateBands(
    radialStates,
    state => state.isOutside ? 'outside' : 'inside',
    state => state === 'outside' ? outsideColor : insideColor
  );
  velocityChart.$stateBands = buildStateBands(
    radialStates,
    state => state.radialVelocity >= 0 ? 'away' : 'toward',
    state => state === 'away' ? awayColor : towardColor
  );
  accelerationChart.$stateBands = buildStateBands(
    radialStates,
    state => state.radialAcceleration >= 0 ? 'away' : 'toward',
    state => state === 'away' ? awayColor : towardColor
  );

  // Update position chart
  positionChart.data.labels = labels;
  positionChart.data.datasets[0].data = positions.x;
  positionChart.data.datasets[1].data = positions.y;
  positionChart.data.datasets[2].data = positions.z;
  positionChart.update();

  // Update velocity chart
  velocityChart.data.labels = labels;
  velocityChart.data.datasets[0].data = velocities.x;
  velocityChart.data.datasets[1].data = velocities.y;
  velocityChart.data.datasets[2].data = velocities.z;
  velocityChart.update();

  // Update acceleration chart
  accelerationChart.data.labels = labels;
  accelerationChart.data.datasets[0].data = accelerations.x;
  accelerationChart.data.datasets[1].data = accelerations.y;
  accelerationChart.data.datasets[2].data = accelerations.z;
  accelerationChart.update();

  radialStateChart.data.labels = labels;
  radialStateChart.data.datasets[0].data = radialStates.map((state, index) => ({
    x: labels[index],
    y: 1,
    state: state.boundaryLabel
  }));
  radialStateChart.data.datasets[0].pointBackgroundColor = radialStates.map(state => state.isOutside ? chartTheme.red : chartTheme.green);
  radialStateChart.data.datasets[0].segment = {
    borderColor: (context) => radialStates[context.p1DataIndex]?.isOutside ? chartTheme.red : chartTheme.green
  };
  radialStateChart.data.datasets[1].data = radialStates.map((state, index) => ({
    x: labels[index],
    y: 2,
    state: state.velocityLabel
  }));
  radialStateChart.data.datasets[1].pointBackgroundColor = radialStates.map(state => state.radialVelocity >= 0 ? chartTheme.gold : chartTheme.bone);
  radialStateChart.data.datasets[1].segment = {
    borderColor: (context) => radialStates[context.p1DataIndex]?.radialVelocity >= 0 ? chartTheme.gold : chartTheme.bone
  };
  radialStateChart.data.datasets[2].data = radialStates.map((state, index) => ({
    x: labels[index],
    y: 3,
    state: state.accelerationLabel
  }));
  radialStateChart.data.datasets[2].pointBackgroundColor = radialStates.map(state => state.radialAcceleration >= 0 ? chartTheme.gold : chartTheme.bone);
  radialStateChart.data.datasets[2].segment = {
    borderColor: (context) => radialStates[context.p1DataIndex]?.radialAcceleration >= 0 ? chartTheme.gold : chartTheme.bone
  };
  radialStateChart.update();

  const scale = 1e-6;
  const orbitPoints = data.map(d => ({ x: d.position.x * scale, y: d.position.y * scale, date: d.date }));
  const sunRadius = SUN_RADIUS_KM * scale;
  const maxPointExtent = orbitPoints.reduce((max, point) => Math.max(max, Math.abs(point.x), Math.abs(point.y)), 0);
  const axisLimit = Math.max(sunRadius, maxPointExtent) * 1.12;

  orbitChart.data.datasets[0].data = generateCircleData(sunRadius, 128);
  orbitChart.data.datasets[1].data = orbitPoints;
  orbitChart.data.datasets[1].showLine = orbitPathLines?.checked ?? true;
  updateOrbitNodeColors();
  orbitChart.data.datasets[2].data = orbitPoints.length > 0 ? [orbitPoints[orbitPoints.length - 1]] : [];
  orbitChart.data.datasets[3].data = [];

  orbitBaseAxisLimit = axisLimit;
  setOrbitAxisLimit(axisLimit);
  updateChartSelection();
}

function setDataSource(state, label, detail) {
  sourceStrip.dataset.state = state;
  dataSource.textContent = label;
  sourceDetail.textContent = detail;
}

// Update the plot and its provenance together so demonstration data is never
// presented as a NASA ephemeris, including after a failed refresh.
async function updateBarycenterData() {
  if (updateButton.disabled || !queryForm.reportValidity()) return;
  updateButton.disabled = true;
  updateButton.textContent = 'Receiving…';
  setDataSource('connecting', 'Contacting Horizons', barycenterData.length
    ? 'Request in progress. The previous record remains below.'
    : 'Requesting ephemeris from NASA JPL.');

  try {
    const startTime = startDateInput.value;
    const stopTime = endDateInput.value;
    const stepSize = stepSizeInput.value;
    let nextData;
    let isSimulation = false;

    try {
      const response = await fetchHorizonsData('0', startTime, stopTime, stepSize);
      nextData = parseHorizonsData(response).filter(entry =>
        Number.isFinite(entry.jd) && [entry.position, entry.velocity].every(vector =>
          ['x', 'y', 'z'].every(axis => Number.isFinite(vector[axis]))));
      if (!nextData.length) throw new Error('No valid ephemeris samples returned');
    } catch (apiError) {
      console.info(`[${getLogTimestamp()}] Horizons unavailable; displaying demonstration data:`, apiError.message);
      nextData = generateSimulatedData(startTime, stopTime, stepSize);
      isSimulation = true;
    }
    if (!nextData.length) throw new Error('No samples in this observation window');

    barycenterData = calculateAcceleration(nextData);
    epochSelect.replaceChildren(new Option('All epochs', ''), ...barycenterData.map(entry => new Option(entry.date, entry.date)));
    sampleCount.textContent = `${barycenterData.length.toLocaleString('en-US')} samples`;
    updateBarycenterStatus(barycenterData);
    updateCharts(barycenterData);
    renderBarycenterLedger(barycenterData);
    setDataSource(isSimulation ? 'simulation' : 'nasa',
      isSimulation ? 'Simulation / demonstration only' : 'NASA JPL / Horizons',
      isSimulation ? 'Horizons unavailable. Simplified model; not an astronomical ephemeris.'
        : 'Computed ephemeris · SSB relative to Sun · epochs in TDB');
  } catch (error) {
    console.error(`[${getLogTimestamp()}] Error updating data:`, error);
    setDataSource('error', 'Record unavailable', 'The request could not be completed. Adjust the window and try again.');
  } finally {
    updateButton.innerHTML = 'Trace the signal <span aria-hidden="true">↗</span>';
    updateButton.disabled = false;
  }
}

// Initialize on page load
function setDefaultDateControls() {
  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  startDateInput.min = '1900-01-01';
  startDateInput.max = formattedToday;
  endDateInput.min = '1900-01-01';
  endDateInput.max = formattedToday;

  startDateInput.value = '1900-01-01';
  endDateInput.value = formattedToday;
  stepSizeInput.value = '1y';
}

function clampDateControls() {
  const start = startDateInput.value;
  const end = endDateInput.value;
  if (start && end && new Date(start) > new Date(end)) {
    endDateInput.value = start;
  }
  if (start) {
    endDateInput.min = start;
  }
  if (end) {
    startDateInput.max = end;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Chart === 'undefined') {
    setDataSource('error', 'Chart library unavailable', 'The plotting library could not load. Check your connection and reload the page.');
    updateButton.disabled = true;
    return;
  }
  configureCharts(Chart);
  ({positionChart, velocityChart, accelerationChart, orbitChart, radialStateChart} = createSolarCharts({
    Chart, chartTheme, stateTimeBandsPlugin, selectedDateMarkerPlugin, orbitVectorArrowsPlugin, selectedOrbitVectorsPlugin
  }));
  setupOrbitZoomControls();
  setupDateSelectionControls();
  setDefaultDateControls();
  clampDateControls();
  updateBarycenterData();
});

startDateInput.addEventListener('change', () => {
  clampDateControls();
});

endDateInput.addEventListener('change', () => {
  clampDateControls();
});

// Event listeners
queryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  updateBarycenterData();
});
