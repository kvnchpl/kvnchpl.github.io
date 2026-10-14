const {test} = require('node:test');
const assert = require('node:assert/strict');
const {handler: submit} = require('../each-all/netlify/functions/submitImage');
const {handler: horizons} = require('../ephemeris/netlify/functions/horizons');

test('migration pause rejects saves before repository access while retaining CORS', async () => {
  const previous = process.env.SUBMISSIONS_PAUSED;
  try {
    process.env.SUBMISSIONS_PAUSED = 'true';
    const result = await submit({httpMethod: 'POST', headers: {origin: 'https://kvnchpl.com'}, body: '{}'});
    assert.equal(result.statusCode, 503);
    assert.match(JSON.parse(result.body).error, /briefly paused/);
    assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://kvnchpl.com');
  } finally {
    if (previous === undefined) delete process.env.SUBMISSIONS_PAUSED;
    else process.env.SUBMISSIONS_PAUSED = previous;
  }
});

test('Pages can preflight submissions and read validation errors', async () => {
  for (const origin of ['https://kvnchpl.com', 'https://www.kvnchpl.com', 'https://kvnchpl.github.io', 'http://localhost:8080', 'https://deploy-preview-1--each-all.netlify.app']) {
    const preflight = await submit({httpMethod: 'OPTIONS', headers: {origin}});
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers['Access-Control-Allow-Origin'], origin);
    assert.equal(preflight.headers['Access-Control-Allow-Headers'], 'Content-Type');
    const rejected = await submit({httpMethod: 'POST', headers: {origin}, body: '{'});
    assert.equal(rejected.statusCode, 400);
    assert.equal(rejected.headers['Access-Control-Allow-Origin'], origin);
  }
  const forbidden = await submit({httpMethod: 'OPTIONS', headers: {origin: 'https://unrelated.example'}});
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.headers['Access-Control-Allow-Origin'], undefined);
});

test('NASA proxy returns readable errors and live data to the Pages frontend', async () => {
  const invalid = await horizons({httpMethod: 'GET', queryStringParameters: {}});
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.headers['Access-Control-Allow-Origin'], '*');
  const original = global.fetch;
  try {
    global.fetch = async (url, options) => {
      const params = new URL(url).searchParams;
      assert.equal(params.get('COMMAND'), '0');
      assert.equal(params.get('CENTER'), '@10');
      assert.ok(options.signal instanceof AbortSignal);
      return {ok: true, json: async () => ({result: '$$SOE\ndata\n$$EOE'})};
    };
    const result = await horizons({httpMethod: 'GET', queryStringParameters: {command: '0', startTime: '2026-10-14', stopTime: '2026-10-15'}});
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers['Access-Control-Allow-Origin'], '*');
    assert.ok(JSON.parse(result.body).result.includes('$$SOE'));
  } finally { global.fetch = original; }
});
