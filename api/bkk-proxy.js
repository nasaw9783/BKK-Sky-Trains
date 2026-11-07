// api/bkk-proxy.js
// BKK SkyTrains - Universal Reverse Proxy & CORS Bypass for BTS Live Real-Time Transit APIs
// Production Serverless Handler for BKK SkyTrains Transit API
// Backed by Official BTS/EBM Live Transit OCC Backend discovered in th.btsc.theskytrains

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_UPSTREAM = process.env.UPSTREAM_BTS_API || 'https://www.ebm.co.th/mobapi-routemap/api';

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

// Station Key to StationId mapping for Official BTS/EBM Routing Engine
const STATION_KEY_TO_ID = {
  'CEN': 1, 'E1': 2, 'E2': 3, 'E3': 4, 'E4': 5, 'E5': 6, 'E6': 7, 'E7': 8, 'E8': 9, 'E9': 10,
  'E10': 11, 'E11': 12, 'E12': 13, 'E13': 14, 'E14': 15, 'E15': 16, 'E16': 17, 'E17': 18, 'E18': 19,
  'E19': 20, 'E20': 21, 'E21': 22, 'E22': 23, 'E23': 24, 'N1': 25, 'N2': 26, 'N3': 27, 'N4': 28,
  'N5': 29, 'N7': 30, 'N8': 31, 'N9': 64, 'N10': 65, 'N11': 66, 'N12': 67, 'N13': 68, 'N14': 69,
  'N15': 70, 'N16': 71, 'N17': 72, 'N18': 73, 'N19': 74, 'N20': 75, 'N21': 76, 'N22': 77, 'N23': 78,
  'N24': 79, 'W1': 32, 'S1': 33, 'S2': 34, 'S3': 35, 'S5': 36, 'S6': 37, 'S7': 38, 'S8': 39,
  'S9': 40, 'S10': 41, 'S11': 42, 'S12': 43, 'G1': 44, 'G2': 45, 'G3': 46,
  'YL01': 80, 'YL02': 81, 'YL03': 82, 'YL04': 83, 'YL05': 84, 'YL06': 85, 'YL07': 86, 'YL08': 87,
  'YL09': 88, 'YL10': 89, 'YL11': 90, 'YL12': 91, 'YL13': 92, 'YL14': 93, 'YL15': 94, 'YL16': 95,
  'YL17': 96, 'YL18': 97, 'YL19': 98, 'YL20': 99, 'YL21': 100, 'YL22': 101, 'YL23': 102,
  'PK01': 103, 'PK02': 104, 'PK03': 105, 'PK04': 106, 'PK05': 107, 'PK06': 108, 'PK07': 109, 'PK08': 110,
  'PK09': 111, 'PK10': 112, 'PK11': 113, 'PK12': 114, 'PK13': 115, 'PK14': 116, 'PK15': 117, 'PK16': 118,
  'PK17': 119, 'PK18': 120, 'PK19': 121, 'PK20': 122, 'PK21': 123, 'PK22': 124, 'PK23': 125, 'PK24': 126,
  'PK25': 127, 'PK26': 128, 'PK27': 129, 'PK28': 130, 'PK29': 131, 'PK30': 132, 'MT01': 133, 'MT02': 134
};

function resolveStationId(keyOrId) {
  if (typeof keyOrId === 'number') return keyOrId;
  if (!keyOrId) return 0;
  const str = String(keyOrId).trim().toUpperCase();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  return STATION_KEY_TO_ID[str] || 0;
}

/**
 * Universal Serverless Handler for Vercel & Node.js
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  // 1. CORS Headers matching clone specification
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authkey, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // 2. Preflight OPTIONS Handling
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // 3. Method Enforcement (Allow POST and GET for health-check)
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end(`Method ${req.method} Not Allowed`);
  }

  // 4. Parse incoming URL & Query Parameters
  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  let endpoint = parsedUrl.searchParams.get('endpoint');

  // Handle simple root GET: redirect browsers to web app root or return minimal health status
  if (req.method === 'GET' && !endpoint) {
    const acceptHeader = req.headers['accept'] || '';
    if (acceptHeader.includes('text/html')) {
      res.statusCode = 302;
      res.setHeader('Location', '/');
      return res.end();
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      status: 'active'
    }));
  }

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
        let totalSize = 0;
        const MAX_BODY_SIZE = 1024 * 1024; // 1 MB limit
        req.on('data', chunk => {
          totalSize += chunk.length;
          if (totalSize > MAX_BODY_SIZE) {
            req.destroy();
            reject(new Error('PAYLOAD_TOO_LARGE'));
          } else {
            chunks.push(chunk);
          }
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
      rawBody = bodyBuffer.toString('utf8');
    } catch (err) {
      if (err && err.message === 'PAYLOAD_TOO_LARGE') {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({ error: 'Payload Too Large', details: 'Request body exceeds 1MB limit' }));
      }
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Proxy setup error', details: 'Invalid body' }));
    }
  }

  // 6. Validate JSON if body provided
  let parsedBody = {};
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
  const authKey = req.headers['authkey'] || req.headers['Authkey'] || parsedBody.AuthKey || parsedBody.authKey;
  if ((endpoint === 'tta' || endpoint === 'arrivals') && !authKey) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Missing Authkey header' }));
  }

  // 9. Map requested endpoint to Official BTS/EBM Upstream Path & Payload
  const upstreamBase = DEFAULT_UPSTREAM.replace(/\/+$/, '');
  let upstreamPath = '';
  let forwardBody = { ...parsedBody };
  const lang = parsedUrl.searchParams.get('lang') || parsedBody.lang || 'th';

  if (endpoint === 'tta' || endpoint === 'arrivals') {
    upstreamPath = '/TTA/TrainTimeArrival';
    forwardBody = {
      data: parsedBody.data || '',
      lang: lang === 'en' ? 'en' : 'th',
      AuthKey: authKey
    };
  } else if (endpoint === 'station-list' || endpoint === 'stations' || endpoint === 'stationList') {
    const listLang = (parsedUrl.searchParams.get('lang') || parsedBody.lang || 'en').toLowerCase();
    upstreamPath = `/RouteMap/StationList?Lang=${listLang}`;
    forwardBody = {};
  } else if (endpoint === 'traffic') {
    // RouteMap/Main provides comprehensive MainLineStatus across 5 lines
    upstreamPath = `/RouteMap/Main?Lang=${lang}`;
    forwardBody = {};
  } else if (endpoint === 'journey' || endpoint === 'route') {
    upstreamPath = `/RouteMap/getRouteSuperUltimateGroup?lang=${lang}`;
    const origId = resolveStationId(parsedBody.Origin || parsedBody.from);
    const destId = resolveStationId(parsedBody.Destination || parsedBody.to);
    forwardBody = {
      Origin: origId,
      Destination: destId,
      Origin_Location: parsedBody.Origin_Location || 0,
      Destination_Location: parsedBody.Destination_Location || 0
    };
  }

  const targetUrl = new URL(upstreamBase + upstreamPath);
  const client = targetUrl.protocol === 'http:' ? http : https;
  const serializedBody = Buffer.from(JSON.stringify(forwardBody));

  const forwardHeaders = {
    'content-type': 'application/json',
    'content-length': serializedBody.length,
    'user-agent': 'Dart/3.1 (dart:io)',
    'accept': 'application/json, text/plain, */*'
  };

  if (authKey) {
    forwardHeaders['Authkey'] = authKey;
  }

  const upstreamReq = client.request(targetUrl.toString(), {
    method: 'POST',
    headers: forwardHeaders,
    timeout: 10000
  }, upstreamRes => {
    let chunks = [];
    upstreamRes.on('data', c => chunks.push(c));
    upstreamRes.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);
      res.statusCode = upstreamRes.statusCode || 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Post-process traffic endpoint response to guarantee structure compatibility
      if (endpoint === 'traffic') {
        try {
          const mainData = JSON.parse(fullBuffer.toString('utf8'));
          if (mainData && mainData.data && Array.isArray(mainData.data.MainLineStatus)) {
            const normalized = {
              ErrCode: 0,
              IsSuccess: true,
              ErrMessage: 'Success',
              TrafficInfoTime: new Date().toISOString(),
              MainLineStatus: mainData.data.MainLineStatus,
              TrafficAlerList: []
            };
            return res.end(JSON.stringify(normalized));
          }
        } catch (_) {}
      }

      res.end(fullBuffer);
    });
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy();
    if (!res.headersSent) {
      res.statusCode = 504;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ErrCode: 504, ErrMessage: 'Gateway timeout' }));
    }
  });

  upstreamReq.on('error', err => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ErrCode: 502, ErrMessage: 'Service temporarily unavailable' }));
    }
  });

  if (serializedBody.length > 0) {
    upstreamReq.write(serializedBody);
  }
  upstreamReq.end();
};
