# ephemeris

> This project is consolidated into `kvnchpl.github.io/ephemeris/`. See
> [the migration and deployment guide](../PROJECTS.md) for current hosting,
> verification commands, and the production cutover.

A real-time solar system barycenter tracking application hosted on Netlify at `https://kvnchpl-ephemeris.netlify.app`.

## What is the Solar System Barycenter?

The barycenter is the center of mass of the solar system. Due to the gravitational influence of Jupiter and other massive planets, this point is not always at the center of the Sun. When the barycenter is outside the Sun's boundaries (radius ≈ 696,340 km), the Sun actually wobbles around this point in space.

## Features

- **Real-time Barycenter Tracking**: Monitor the solar system's center of mass position relative to the Sun
- **Inside/Outside Sun Detection**: Visual indicator showing whether the barycenter is within or beyond the Sun's boundaries
- **Position Charts**: 3D position tracking (X, Y, Z coordinates in km)
- **Velocity Charts**: Velocity components over time (km/s)
- **Acceleration Charts**: Acceleration components calculated from velocity data (km/s²)
- **Live NASA Data**: Fetches real ephemeris data from NASA JPL Horizons API via Netlify serverless functions

## Technology

- **Data Source**: NASA JPL Horizons API
- **Backend**: Netlify serverless functions (no CORS issues)
- **Visualization**: Chart.js for interactive charts
- **Styling**: Custom CSS with dark theme
- **Deployment**: Netlify

## Data Source

The application fetches **real NASA Horizons ephemeris data** via a Netlify serverless function. This eliminates CORS issues since the function runs server-side, which has full access to external APIs.

**Fallback**: If the NASA API is temporarily unavailable, the application automatically uses simulated astronomical data for demonstration purposes.

## Deployment

This site is deployed on **Netlify** at [kvnchpl-ephemeris.netlify.app](https://kvnchpl-ephemeris.netlify.app).

### How to Deploy:

1. Push your changes to the `main` branch
2. Netlify automatically builds and deploys from the repository
3. The serverless function in `netlify/functions/horizons.js` handles NASA API requests

### How to Update:

1. Edit `index.html`, `styles.css`, or `script.js`
2. Modify the serverless function in `netlify/functions/horizons.js` if needed
3. Commit your changes
4. Push to `main`
5. Netlify will automatically redeploy

## Local Development

To run locally with full functionality:

1. Clone the repository
2. Install Netlify CLI: `npm install -g netlify-cli`
3. Run `netlify dev` in the project directory
4. Open `http://localhost:8888` in your browser

This will start both the static site and the serverless functions locally, allowing you to test the full NASA API integration.

For a basic local test without functions:
1. Open `index.html` in a web browser
2. The application will attempt to use the serverless function endpoint (which won't work locally without `netlify dev`)
3. It will fall back to simulated data for demonstration
