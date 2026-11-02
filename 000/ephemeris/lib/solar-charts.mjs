import { generateCircleData } from './solar-model.mjs';

// Chart construction is independent of the solar controller's selection state.
export function createSolarCharts({Chart, chartTheme, stateTimeBandsPlugin, selectedDateMarkerPlugin, orbitVectorArrowsPlugin, selectedOrbitVectorsPlugin}) {
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
          label: (context) => `${context.dataset.label}: ${context.parsed.y !== 0 && Math.abs(context.parsed.y) < 0.001 ? context.parsed.y.toExponential(2) : context.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 3 })}`
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
            if (value !== 0 && Math.abs(value) < 0.001) return value.toExponential(1);
            if (Math.abs(value) >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            }
            if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(0)}k`;
            }
            return Number(value.toPrecision(4));
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
        borderWidth: 1.25,
        tension: 0.35
      }
    }
  };

  const positionChart = new Chart(document.getElementById('positionChart'), {
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

  const velocityChart = new Chart(document.getElementById('velocityChart'), {
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

  const orbitChart = new Chart(document.getElementById('orbitChart'), {
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
          label: 'Latest Plotted Epoch',
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


  const accelerationChart = new Chart(document.getElementById('accelerationChart'), {
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

  const radialStateChart = new Chart(document.getElementById('radialStateChart'), {
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
  return {positionChart, velocityChart, accelerationChart, orbitChart, radialStateChart};
}

