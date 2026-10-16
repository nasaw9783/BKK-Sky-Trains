// api/bts-proxy.js
// BKK SkyTrains - Universal Reverse Proxy & CORS Bypass for BTS Live Real-Time Transit APIs
// Exact functional clone of https://bkkskytrain.online/api/bts-proxy -> https://bkk-skytrains.vercel.app/api/bts-proxy

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_UPSTREAM = process.env.UPSTREAM_BTS_API || 'https://bkkskytrain.online/api/bts-proxy';

const ALLOWED_ENDPOINTS = [
  'tta',
  'arrivals',
  'station-list',
  'stations',
  'stationList',
  'journey',
  'route',
  'traffic'
];

/**
 * Universal Serverless Handler for Vercel & Node.js
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  // 1. CORS Headers matching clone specification
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authkey');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // 2. Preflight OPTIONS Handling
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // 3. Method Enforcement (Only POST allowed)
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end(`Method ${req.method} Not Allowed`);
  }

  // 4. Parse incoming URL & Query Parameters
  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  let endpoint = parsedUrl.searchParams.get('endpoint');

  // 5. Read incoming Body Buffer
  let rawBody = '';
  let bodyBuffer = Buffer.alloc(0);
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
      rawBody = bodyBuffer.toString('utf8');
    } else if (typeof req.body === 'object') {
      rawBody = JSON.stringify(req.body);
      bodyBuffer = Buffer.from(rawBody);
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
      bodyBuffer = Buffer.from(rawBody);
    }
  } else {
    try {
      bodyBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      rawBody = bodyBuffer.toString('utf8');
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Proxy setup error', details: 'Invalid body' }));
    }
  }

  // 6. Validate JSON if body provided
  let parsedBody = null;
  if (rawBody && rawBody.trim().length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (e) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Proxy setup error', details: 'Invalid JSON' }));
    }
  }

  // Fallback endpoint extraction from body if not in query
  if (!endpoint && parsedBody && parsedBody.endpoint) {
    endpoint = parsedBody.endpoint;
  }

  // 7. Validate Endpoint
  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      error: 'Proxy setup error',
      details: `Unknown proxy endpoint: ${endpoint || ''}. Allowed: ${ALLOWED_ENDPOINTS.join(', ')}`
    }));
  }

  // 8. Validate Authkey for TTA / Arrivals
  const authKey = req.headers['authkey'] || req.headers['Authkey'];
  if ((endpoint === 'tta' || endpoint === 'arrivals') && !authKey) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Missing Authkey header' }));
  }

  // 9. Construct Upstream Target URL
  const upstreamBase = new URL(DEFAULT_UPSTREAM);
  parsedUrl.searchParams.forEach((val, key) => {
    upstreamBase.searchParams.set(key, val);
  });

  const client = upstreamBase.protocol === 'http:' ? http : https;
  const forwardHeaders = {
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'accept': 'application/json, text/plain, */*'
  };

  if (authKey) {
    forwardHeaders['authkey'] = authKey;
  }
  if (bodyBuffer.length > 0) {
    forwardHeaders['content-length'] = bodyBuffer.length;
  }

  const upstreamReq = client.request(upstreamBase.toString(), {
    method: 'POST',
    headers: forwardHeaders,
    timeout: 10000
  }, upstreamRes => {
    res.statusCode = upstreamRes.statusCode || 200;
    res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    upstreamRes.pipe(res);
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy();
    if (!res.headersSent) {
      res.statusCode = 504;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ErrCode: 504, ErrMessage: 'Gateway timeout from upstream transit server' }));
    }
  });

  upstreamReq.on('error', err => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ErrCode: 502, ErrMessage: 'Proxy gateway error: ' + err.message }));
    }
  });

  if (bodyBuffer.length > 0) {
    upstreamReq.write(bodyBuffer);
  }
  upstreamReq.end();
};
