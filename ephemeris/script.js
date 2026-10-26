// Constants
const SUN_RADIUS_KM = 696340; // Sun's radius in kilometers
// Portfolio previews proxy to the existing standalone NASA service.
const portfolioPreview = location.hostname.endsWith('.netlify.app')
  && !/^(?:[a-z0-9-]+--)?kvnchpl-ephemeris\.netlify\.app$/.test(location.hostname);
const HORIZONS_API_ENDPOINT = new URL(portfolioPreview ? '/api/ephemeris/horizons' : '/.netlify/functions/horizons',
  location.hostname.endsWith('.netlify.app') || ['localhost', '127.0.0.1'].includes(location.hostname)
    ? location.origin : 'https://kvnchpl-ephemeris.netlify.app').href;
const chartTheme = {
  text: '#d6d6d6',
  muted: '#b8b8b8',
  grid: 'rgba(216, 180, 91, 0.18)',
  tooltipBg: 'rgba(0, 0, 0, 0.96)',
  tooltipBorder: 'rgba(216, 180, 91, 0.75)',
  gold: '#d8b45b',
  bone: '#b8b8b8',
  red: '#c44949',
  green: '#74b36a'
};

// DOM elements
const updateButton = document.getElementById('updateButton');
const barycenterStatus = document.getElementById('barycenterStatus');
const distanceFromSun = document.getElementById('distanceFromSun');
const lastUpdated = document.getElementById('lastUpdated');
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

function getLogTimestamp() {
  return new Date().toISOString().slice(11, 19);
}

function getHorizonsStepSize(stepSize) {
  const stepMap = {
    '1d': "'1 day'",
    '7d': "'7 days'",
    '1m': "'1 month'",
    '1y': "'1 year'"
  };

  return stepMap[stepSize] || stepSize;
}

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

function getRadialComponentVector(vector, position) {
  const distanceSquared = position.x ** 2 + position.y ** 2 + position.z ** 2;
  if (!Number.isFinite(distanceSquared) || distanceSquared === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const projectionScale = dotProduct(vector, position) / distanceSquared;
  return {
    x: position.x * projectionScale,
    y: position.y * projectionScale,
    z: position.z * projectionScale
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
function initCharts() {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: chartTheme.text,
          font: {
            size: 12
          },
          boxWidth: 14
        }
      },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        titleColor: chartTheme.text,
        bodyColor: chartTheme.muted,
        borderColor: chartTheme.tooltipBorder,
        borderWidth: 1,
        cornerRadius: 0,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: chartTheme.muted,
          font: {
            size: 11
          },
          autoSkip: true,
          maxTicksLimit: 8,
          maxRotation: 0,
          minRotation: 0
        },
        grid: {
          color: chartTheme.grid
        }
      },
      y: {
        ticks: {
          color: chartTheme.muted,
          font: {
            size: 11
          },
          callback: (value) => {
            if (Math.abs(value) >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            }
            if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(0)}k`;
            }
            return value;
          }
        },
        grid: {
          color: chartTheme.grid
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4
      },
      line: {
        borderWidth: 2,
        tension: 0.35
      }
    }
  };

  positionChart = new Chart(document.getElementById('positionChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'X Position (km)',
          data: [],
          borderColor: chartTheme.gold,
          backgroundColor: 'rgba(185, 145, 69, 0.1)',
          tension: 0.4
        },
        {
          label: 'Y Position (km)',
          data: [],
          borderColor: chartTheme.bone,
          backgroundColor: 'rgba(215, 199, 164, 0.1)',
          tension: 0.4
        },
        {
          label: 'Z Position (km)',
          data: [],
          borderColor: chartTheme.red,
          backgroundColor: 'rgba(155, 47, 47, 0.1)',
          tension: 0.4
        }
      ]
    },
    plugins: [stateTimeBandsPlugin, selectedDateMarkerPlugin],
    options: chartOptions
  });

  velocityChart = new Chart(document.getElementById('velocityChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'X Velocity (km/s)',
          data: [],
          borderColor: chartTheme.gold,
          backgroundColor: 'rgba(185, 145, 69, 0.1)',
          tension: 0.4
        },
        {
          label: 'Y Velocity (km/s)',
          data: [],
          borderColor: chartTheme.bone,
          backgroundColor: 'rgba(215, 199, 164, 0.1)',
          tension: 0.4
        },
        {
          label: 'Z Velocity (km/s)',
          data: [],
          borderColor: chartTheme.red,
          backgroundColor: 'rgba(155, 47, 47, 0.1)',
          tension: 0.4
        }
      ]
    },
    plugins: [stateTimeBandsPlugin, selectedDateMarkerPlugin],
    options: chartOptions
  });

  orbitChart = new Chart(document.getElementById('orbitChart'), {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Sun Boundary (696,340 km)',
          data: generateCircleData(0.69634, 128),
          borderColor: chartTheme.gold,
          backgroundColor: 'rgba(185, 145, 69, 0.05)',
          showLine: true,
          fill: false,
          borderDash: [6, 6],
          pointRadius: 0,
          tension: 0.4
        },
        {
          label: 'Barycenter Path',
          data: [],
          borderColor: chartTheme.bone,
          backgroundColor: 'rgba(215, 199, 164, 0.22)',
          showLine: true,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: chartTheme.bone,
          tension: 0
        },
        {
          label: 'Current Barycenter',
          data: [],
          borderColor: chartTheme.red,
          backgroundColor: chartTheme.red,
          pointRadius: 6,
          showLine: false
        },
        {
          label: 'Selected Date',
          data: [],
          borderColor: chartTheme.gold,
          backgroundColor: chartTheme.gold,
          pointRadius: 8,
          pointStyle: 'rectRot',
          showLine: false
        }
      ]
    },
    plugins: [orbitVectorArrowsPlugin, selectedOrbitVectorsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10
        }
      },
      interaction: {
        mode: 'nearest',
        intersect: true
      },
      plugins: {
        legend: {
          labels: {
            color: chartTheme.text,
            font: {
              size: 12
            },
            boxWidth: 14
          }
        },
        tooltip: {
          backgroundColor: chartTheme.tooltipBg,
          titleColor: chartTheme.text,
          bodyColor: chartTheme.muted,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 0,
          padding: 10,
          callbacks: {
            label: (context) => {
              const label = context.raw?.date || context.dataset.label;
              return `${label}: (${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)}) million km`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'X (million km)',
            color: chartTheme.muted,
            font: { size: 12 }
          },
          ticks: {
            color: chartTheme.muted,
            font: { size: 11 }
          },
          grid: {
            color: chartTheme.grid
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Y (million km)',
            color: chartTheme.muted,
            font: { size: 12 }
          },
          ticks: {
            color: chartTheme.muted,
            font: { size: 11 }
          },
          grid: {
            color: chartTheme.grid
          }
        }
      }
    }
  });


  accelerationChart = new Chart(document.getElementById('accelerationChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'X Acceleration (km/s²)',
          data: [],
          borderColor: chartTheme.gold,
          backgroundColor: 'rgba(185, 145, 69, 0.1)',
          tension: 0.4
        },
        {
          label: 'Y Acceleration (km/s²)',
          data: [],
          borderColor: chartTheme.bone,
          backgroundColor: 'rgba(215, 199, 164, 0.1)',
          tension: 0.4
        },
        {
          label: 'Z Acceleration (km/s²)',
          data: [],
          borderColor: chartTheme.red,
          backgroundColor: 'rgba(155, 47, 47, 0.1)',
          tension: 0.4
        }
      ]
    },
    plugins: [stateTimeBandsPlugin, selectedDateMarkerPlugin],
    options: chartOptions
  });

  radialStateChart = new Chart(document.getElementById('radialStateChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Boundary',
          data: [],
          borderColor: chartTheme.gold,
          backgroundColor: chartTheme.gold,
          stepped: true,
          pointRadius: 4,
          tension: 0
        },
        {
          label: 'Velocity Direction',
          data: [],
          borderColor: chartTheme.bone,
          backgroundColor: chartTheme.bone,
          stepped: true,
          pointRadius: 4,
          tension: 0
        },
        {
          label: 'Acceleration Direction',
          data: [],
          borderColor: chartTheme.red,
          backgroundColor: chartTheme.red,
          stepped: true,
          pointRadius: 4,
          tension: 0
        }
      ]
    },
    plugins: [selectedDateMarkerPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: chartTheme.text,
            font: { size: 12 },
            boxWidth: 14
          }
        },
        tooltip: {
          backgroundColor: chartTheme.tooltipBg,
          titleColor: chartTheme.text,
          bodyColor: chartTheme.muted,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 0,
          padding: 10,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.raw?.state || ''}`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: chartTheme.muted,
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0
          },
          grid: { color: chartTheme.grid }
        },
        y: {
          min: 0.5,
          max: 3.5,
          ticks: {
            stepSize: 1,
            color: chartTheme.muted,
            callback: (value) => ({
              1: 'Boundary',
              2: 'Velocity',
              3: 'Acceleration'
            })[value] || ''
          },
          grid: { color: chartTheme.grid }
        }
      }
    }
  });
}

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
      method: 'GET'
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

// Parse Horizons response
function parseHorizonsData(data) {
  try {
    // Handle different response formats
    let result;
    if (typeof data === 'string') {
      // If data is a string, try to parse it as JSON
      const parsed = JSON.parse(data);
      result = parsed.result;
    } else if (data.result) {
      // Direct API response
      result = data.result;
    } else {
      console.error(`[${getLogTimestamp()}] Unexpected data format. Keys:`, Object.keys(data));
      throw new Error('Unexpected data format');
    }

    if (typeof result !== 'string') {
      console.error(`[${getLogTimestamp()}] Result is not a string, type is:`, typeof result);
      throw new Error('Result is not a string');
    }

    // Check for ephemeris markers
    if (!result.includes('$$SOE')) {
      console.warn(`[${getLogTimestamp()}] Warning: No $$SOE marker found in result`);
      console.debug(`[${getLogTimestamp()}] Result preview:`, result.substring(0, 300));
    }

    const lines = result.split('\n');

    let dataStart = false;
    let foundMarker = false;
    const parsedData = [];

    // Track current epoch being parsed
    let currentEpoch = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('$$SOE')) {
        dataStart = true;
        foundMarker = true;
        continue;
      }
      if (line.includes('$$EOE')) {
        // Save last epoch if it exists
        if (currentEpoch && currentEpoch.position && currentEpoch.velocity) {
          parsedData.push(currentEpoch);
        }
        break;
      }

      if (!dataStart || !line) continue;

      // Parse JD/date line: "2461119.500000000 = A.D. 2026-Mar-20 00:00:00.0000 TDB"
      if (line.includes('=') && line.includes('A.D.') && line.includes('TDB')) {
        // Save previous epoch if it exists
        if (currentEpoch && currentEpoch.position && currentEpoch.velocity) {
          parsedData.push(currentEpoch);
        }

        const jd = parseFloat(line.split('=')[0].trim());
        // Extract date between "A.D." and "TDB"
        const adIndex = line.indexOf('A.D.');
        const tdbIndex = line.indexOf('TDB');
        const dateStr = line.substring(adIndex + 4, tdbIndex).trim();
        const formattedDate = formatEpochDate(dateStr);

        currentEpoch = {
          jd,
          date: formattedDate,
          position: {},
          velocity: {}
        };
        continue;
      }

      // Parse position line: "X =-4.002731823062956E+08 Y = 1.720270951480588E+08 Z =-5.480371773623922E+07"
      if (line.startsWith('X') && line.includes('Y') && line.includes('Z') && !line.includes('VX')) {
        if (currentEpoch) {
          // Extract X value
          let xMatch = line.match(/X\s*=\s*([-+]?[\d.E+-]+)/i);
          let yMatch = line.match(/Y\s*=\s*([-+]?[\d.E+-]+)/i);
          let zMatch = line.match(/Z\s*=\s*([-+]?[\d.E+-]+)/i);

          if (xMatch) currentEpoch.position.x = parseFloat(xMatch[1]);
          if (yMatch) currentEpoch.position.y = parseFloat(yMatch[1]);
          if (zMatch) currentEpoch.position.z = parseFloat(zMatch[1]);

          if (currentEpoch.position.x !== undefined && currentEpoch.position.y !== undefined && currentEpoch.position.z !== undefined) {
            // Parsed position values successfully
          }
        }
        continue;
      }

      // Parse velocity line: "VX=-7.318994659721848E+00 VY=-1.438720625315857E+01 VZ=-2.029914370915722E+00"
      if (line.startsWith('VX') || line.includes('VX=')) {
        if (currentEpoch) {
          let vxMatch = line.match(/VX\s*=\s*([-+]?[\d.E+-]+)/i);
          let vyMatch = line.match(/VY\s*=\s*([-+]?[\d.E+-]+)/i);
          let vzMatch = line.match(/VZ\s*=\s*([-+]?[\d.E+-]+)/i);

          if (vxMatch) currentEpoch.velocity.x = parseFloat(vxMatch[1]);
          if (vyMatch) currentEpoch.velocity.y = parseFloat(vyMatch[1]);
          if (vzMatch) currentEpoch.velocity.z = parseFloat(vzMatch[1]);

          if (currentEpoch.velocity.x !== undefined && currentEpoch.velocity.y !== undefined && currentEpoch.velocity.z !== undefined) {
            // Parsed velocity values successfully
          }
        }
        continue;
      }
    }

    console.debug(`[${getLogTimestamp()}] Successfully parsed ${parsedData.length} ephemeris epochs from NASA Horizons data`);

    return parsedData;
  } catch (error) {
    console.error(`[${getLogTimestamp()}] Error parsing Horizons data:`, error);
    throw error;
  }
}

function generateCircleData(radius, segments = 64) {
  const data = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (Math.PI * 2 * i) / segments;
    data.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });
  }
  return data;
}

function formatEpochDate(dateStr) {
  const dateMatch = dateStr.match(/(\d{4}-[A-Za-z]{3}-\d{2})/);
  if (!dateMatch) return dateStr;

  const parts = dateMatch[1].split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const monthNames = {
    Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'May', Jun: 'Jun',
    Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dec'
  };

  return `${year} ${monthNames[month] || month} ${parseInt(day, 10)}`;
}

function addStepToDate(date, stepSize) {
  const next = new Date(date);
  if (stepSize === '7d') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (stepSize === '1m') {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else if (stepSize === '1y') {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function generateDateSequence(startTime, stopTime, stepSize) {
  const start = new Date(`${startTime}T00:00:00Z`);
  const stop = new Date(`${stopTime}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(stop.getTime()) || start > stop) {
    return [];
  }

  const dates = [];
  let current = start;
  while (current <= stop && dates.length < 1000) {
    dates.push(new Date(current));
    current = addStepToDate(current, stepSize);
  }

  return dates;
}

// Fallback: Generate simulated barycenter data for demonstration
function generateSimulatedData(startTime, stopTime, stepSize = '1d') {
  const data = [];
  const dates = generateDateSequence(startTime, stopTime, stepSize);

  // Approximate barycenter motion - simplified orbital mechanics
  // In reality, this is much more complex with multiple planetary influences
  for (let i = 0; i < dates.length; i++) {
    // Simplified sinusoidal motion representing Jupiter's influence
    // Real barycenter motion is more complex
    const t = i * 0.1; // Time parameter
    const amplitude = 1000000; // ~1 million km amplitude (simplified)
    const period = 12; // ~12 day period (simplified)

    const x = amplitude * Math.sin(2 * Math.PI * t / period) * Math.cos(t * 0.1);
    const y = amplitude * Math.cos(2 * Math.PI * t / period) * Math.sin(t * 0.1);
    const z = amplitude * 0.3 * Math.sin(t * 0.05); // Smaller Z component

    // Velocity (derivative of position)
    const vx = amplitude * 2 * Math.PI / period * Math.cos(2 * Math.PI * t / period) * Math.cos(t * 0.1)
               - amplitude * Math.sin(2 * Math.PI * t / period) * 0.1 * Math.sin(t * 0.1);
    const vy = -amplitude * 2 * Math.PI / period * Math.sin(2 * Math.PI * t / period) * Math.sin(t * 0.1)
               + amplitude * Math.cos(2 * Math.PI * t / period) * 0.1 * Math.cos(t * 0.1);
    const vz = amplitude * 0.3 * 0.05 * Math.cos(t * 0.05);
    const dayOffset = (dates[i].getTime() - dates[0].getTime()) / 86400000;

    data.push({
      jd: 2460000 + dayOffset, // Approximate JD
      date: dates[i].toISOString().split('T')[0],
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz }
    });
  }

  return data;
}

// Calculate acceleration from velocity data
function calculateAcceleration(data) {
  if (data.length < 2) return data;

  const getDeltaSeconds = (start, end) => {
    if (Number.isFinite(start.jd) && Number.isFinite(end.jd)) {
      return Math.max((end.jd - start.jd) * 86400, 1);
    }

    const startDate = new Date(start.date);
    const endDate = new Date(end.date);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      return Math.max((endDate.getTime() - startDate.getTime()) / 1000, 1);
    }

    return 86400;
  };

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const next = data[i + 1];
    const dt = getDeltaSeconds(prev, next);

    // Central difference for acceleration
    data[i].acceleration = {
      x: (next.velocity.x - prev.velocity.x) / dt,
      y: (next.velocity.y - prev.velocity.y) / dt,
      z: (next.velocity.z - prev.velocity.z) / dt
    };
  }

  // Forward/backward differences for endpoints
  if (data.length >= 2) {
    const firstDt = getDeltaSeconds(data[0], data[1]);
    data[0].acceleration = {
      x: (data[1].velocity.x - data[0].velocity.x) / firstDt,
      y: (data[1].velocity.y - data[0].velocity.y) / firstDt,
      z: (data[1].velocity.z - data[0].velocity.z) / firstDt
    };

    const last = data.length - 1;
    const lastDt = getDeltaSeconds(data[last - 1], data[last]);
    data[last].acceleration = {
      x: (data[last].velocity.x - data[last - 1].velocity.x) / lastDt,
      y: (data[last].velocity.y - data[last - 1].velocity.y) / lastDt,
      z: (data[last].velocity.z - data[last - 1].velocity.z) / lastDt
    };
  }

  return data;
}

// Calculate distance from origin (Sun's center)
function calculateDistance(position) {
  return Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
}

function dotProduct(vectorA, vectorB) {
  return vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
}

function getRadialState(entry) {
  const acceleration = entry.acceleration || { x: 0, y: 0, z: 0 };
  const distance = calculateDistance(entry.position);
  const radialVelocity = distance === 0 ? 0 : dotProduct(entry.position, entry.velocity) / distance;
  const radialAcceleration = distance === 0 ? 0 : dotProduct(entry.position, acceleration) / distance;

  return {
    distance,
    isOutside: distance > SUN_RADIUS_KM,
    radialVelocity,
    radialAcceleration,
    boundaryLabel: distance > SUN_RADIUS_KM ? 'Outside' : 'Inside',
    velocityLabel: radialVelocity >= 0 ? 'Away' : 'Toward',
    accelerationLabel: radialAcceleration >= 0 ? 'Away' : 'Toward'
  };
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

  const now = new Date();
  lastUpdated.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
  const insideColor = 'rgba(116, 179, 106, 0.14)';
  const outsideColor = 'rgba(196, 73, 73, 0.14)';
  const towardColor = 'rgba(184, 184, 184, 0.12)';
  const awayColor = 'rgba(216, 180, 91, 0.14)';

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

// Main update function
async function updateBarycenterData() {
  try {
    updateButton.disabled = true;
    updateButton.textContent = 'Loading...';

    const startTime = startDateInput.value || '1900-01-01';
    const stopTime = endDateInput.value || new Date().toISOString().split('T')[0];
    const stepSize = stepSizeInput.value || '1y';

    // Use simulated data as a safe fallback before attempting real data
    barycenterData = generateSimulatedData(startTime, stopTime, stepSize);

    // Try to fetch real data as enhancement (may fail due to CORS)
    // Use a timeout so the app doesn't hang if all proxies are slow
    try {
      const barycenterResponse = await fetchHorizonsData('0', startTime, stopTime, stepSize);
      console.debug(`[${getLogTimestamp()}] Raw API response received, parsing...`);

      const realData = parseHorizonsData(barycenterResponse);
      console.debug(`[${getLogTimestamp()}] Parsed real data points:`, realData.length);

      if (realData && realData.length > 0) {
        barycenterData = realData;
        console.log(`[${getLogTimestamp()}] ✓ Successfully loaded real NASA Horizons data!`);
      } else {
        console.log(`[${getLogTimestamp()}] Parsed data was empty, using simulated data`);
      }
    } catch (apiError) {
      console.log(`[${getLogTimestamp()}] ✗ Real NASA data unavailable (Netlify function error), using simulated data:`, apiError.message);
    }

    barycenterData = calculateAcceleration(barycenterData);

    // Update UI
    updateBarycenterStatus(barycenterData);
    updateCharts(barycenterData);
    renderBarycenterLedger(barycenterData);

    updateButton.textContent = 'Update Ephemeris';
    updateButton.disabled = false;

  } catch (error) {
    console.error(`[${getLogTimestamp()}] Error updating data:`, error);
    barycenterStatus.textContent = 'Unable to load data';
    barycenterStatus.style.color = chartTheme.red;
    updateButton.textContent = 'Retry';
    updateButton.disabled = false;
  }
}

// Initialize on page load
function setDefaultDateControls() {
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];

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
  initCharts();
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
updateButton.addEventListener('click', updateBarycenterData);
