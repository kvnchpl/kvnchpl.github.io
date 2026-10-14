/**
 * Netlify serverless function to fetch NASA Horizons data
 * This runs server-side, so no CORS restrictions apply
 */

async function horizons(event) {
  try {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Extract query parameters
    const { command, startTime, stopTime, stepSize = '1d' } = event.queryStringParameters || {};

    if (!command || !startTime || !stopTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required parameters: command, startTime, stopTime' 
        })
      };
    }

    const horizonsStepSize = /\s/.test(stepSize) && !/^'.*'$/.test(stepSize)
      ? `'${stepSize}'`
      : stepSize;

    // Build NASA Horizons API URL.
    // For the solar system barycenter relative to the Sun:
    // COMMAND='0' is the SSB target, CENTER='@10' is the Sun center.
    const params = new URLSearchParams({
      format: 'json',
      COMMAND: command, // Don't add quotes - URLSearchParams handles encoding
      OBJ_DATA: 'NO',
      MAKE_EPHEM: 'YES',
      EPHEM_TYPE: 'VECTORS',
      CENTER: '@10',
      START_TIME: startTime,
      STOP_TIME: stopTime,
      STEP_SIZE: horizonsStepSize,
      VEC_TABLE: '2', // Position and velocity
      OUT_UNITS: 'KM-S' // Kilometers and seconds
    });

    const horizonsUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;

    console.log(`Fetching NASA Horizons data for COMMAND=${command}, CENTER=@10`);
    console.log(`Full URL: ${horizonsUrl}`);

    // Fetch from NASA (no CORS issues from server-side)
    const response = await fetch(horizonsUrl, {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `NASA API error: ${response.status} ${response.statusText}` 
        })
      };
    }

    const data = await response.json();
    
    // Validate that we got proper ephemeris data
    if (!data.result) {
      console.error('No result field in NASA response:', data);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid NASA API response: missing result field',
          received: Object.keys(data)
        })
      };
    }
    
    // Check if result contains ephemeris markers
    const resultStr = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
    if (!resultStr.includes('$$SOE')) {
      console.warn('No ephemeris data found in result (missing $$SOE marker)');
      console.log('Error from NASA API:', resultStr.substring(0, 1000));
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'No ephemeris data in response',
          nasaError: resultStr.substring(0, 500)
        })
      };
    }
    
    // Log ephemeris data for debugging
    const soeIndex = resultStr.indexOf('$$SOE');
    const eoeIndex = resultStr.indexOf('$$EOE');
    if (soeIndex !== -1 && eoeIndex !== -1) {
      const ephemerisData = resultStr.substring(soeIndex, Math.min(eoeIndex + 50, soeIndex + 1000));
      console.log('Ephemeris data sample (first 500 chars):');
      console.log(ephemerisData.substring(0, 500));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Horizons function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch NASA data',
        message: error.message 
      })
    };
  }
}
exports.handler = async event => {
  const result = await horizons(event);
  // Public read-only NASA proxy; no credentials or cookies are used.
  return { ...result, headers: { 'Content-Type': 'application/json', ...result.headers, 'Access-Control-Allow-Origin': '*' } };
};
