// Solar measurement functions. No DOM, Chart.js, or network dependencies.
export const SUN_RADIUS_KM = 696340;

export function getLogTimestamp() {
  return new Date().toISOString().slice(11, 19);
}

export function getHorizonsStepSize(stepSize) {
  const stepMap = {
    '1d': "'1 day'",
    '7d': "'7 days'",
    '1m': "'1 month'",
    '1y': "'1 year'"
  };

  return stepMap[stepSize] || stepSize;
}

export function getRadialComponentVector(vector, position) {
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

// Parse Horizons response
export function parseHorizonsData(data) {
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

export function generateCircleData(radius, segments = 64) {
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
export function generateSimulatedData(startTime, stopTime, stepSize = '1d') {
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
export function calculateAcceleration(data) {
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
export function calculateDistance(position) {
  return Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
}

export function dotProduct(vectorA, vectorB) {
  return vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z;
}

export function getRadialState(entry) {
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

