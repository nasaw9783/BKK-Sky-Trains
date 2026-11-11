// api/bkk-proxy.js
// BKK SkyTrains - Universal Reverse Proxy & Transit Gateway
// Production Serverless Handler for BKK SkyTrains Transit API

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Runtime Obfuscation & Security Decoder (Prevents plain text discovery in repository)
const _k = 0x5a;
function _dc(s) {
  return Buffer.from(s, 'base64').map(b => b ^ _k).toString('utf8');
}

// Obfuscated Upstream Gateway (fallback decoded in memory only)
const DEFAULT_UPSTREAM = process.env.UPSTREAM_BTS_API || _dc('Mi4uKilgdXUtLS10Pzg3dDk1dC4ydTc1ODsqM3coNS8uPzc7KnU7KjM=');

// Obfuscated internal routes
const _P = {
  tta: _dc('dQ4OG3UOKDszNA4zNz8bKCgzLDs2'),
  stations: _dc('dQg1Ly4/FzsqdQkuOy4zNTQWMyku'),
  traffic: _dc('dQg1Ly4/FzsqdRc7MzQ='),
  journey: _dc('dQg1Ly4/FzsqdT0/Lgg1Ly4/CS8qPygPNi4zNzsuPx0oNS8q')
};

// Opaque action and legacy endpoint mapping
const ACTION_MAP = {
  't1': 'tta',
  'tta': 'tta',
  'arrivals': 'tta',
  's2': 'station-list',
  'station-list': 'station-list',
  'stations': 'station-list',
  'stationList': 'station-list',
  'f3': 'traffic',
  'traffic': 'traffic',
  'r4': 'journey',
  'journey': 'journey',
  'route': 'journey'
};

const ALLOWED_ENDPOINTS = Object.keys(ACTION_MAP);

// Station Key to StationId mapping for Transit Routing Engine
const STATION_KEY_TO_ID = {
  'N24': 79, 'N23': 78, 'N22': 77, 'N21': 76, 'N20': 75, 'N19': 74, 'N18': 73, 'N17': 69, 'N16': 68,
  'N15': 67, 'N14': 66, 'N13': 62, 'N12': 61, 'N11': 60, 'N10': 59, 'N9': 54, 'N8': 1, 'N7': 2,
  'N5': 3, 'N4': 4, 'N3': 5, 'N2': 6, 'N1': 7, 'CEN': 8, 'E1': 9, 'E2': 10, 'E3': 11,
  'E4': 12, 'E5': 13, 'E6': 14, 'E7': 15, 'E8': 16, 'E9': 17, 'E10': 18, 'E11': 19, 'E12': 20,
  'E13': 21, 'E14': 22, 'E15': 23, 'E16': 46, 'E17': 47, 'E18': 48, 'E19': 49, 'E20': 50,
  'E21': 51, 'E22': 52, 'E23': 53, 'W1': 26, 'S1': 28, 'S2': 29, 'S3': 30, 'S4': 80,
  'S5': 31, 'S6': 32, 'S7': 33, 'S8': 34, 'S9': 35, 'S10': 36, 'S11': 37, 'S12': 38,
  'G1': 70, 'G2': 71, 'G3': 72,
  'YL01': 81, 'YL02': 82, 'YL03': 83, 'YL04': 84, 'YL05': 85, 'YL06': 87, 'YL07': 86, 'YL08': 88,
  'YL09': 89, 'YL10': 90, 'YL11': 91, 'YL12': 92, 'YL13': 93, 'YL14': 94, 'YL15': 95, 'YL16': 96,
  'YL17': 97, 'YL18': 98, 'YL19': 99, 'YL20': 100, 'YL21': 101, 'YL22': 102, 'YL23': 103,
  'PK01': 134, 'PK02': 135, 'PK03': 136, 'PK04': 137, 'PK05': 138, 'PK06': 139, 'PK07': 140, 'PK08': 141,
  'PK09': 142, 'PK10': 143, 'MT01': 164, 'MT02': 165, 'PK11': 144, 'PK12': 145, 'PK13': 146, 'PK14': 147,
  'PK15': 148, 'PK16': 149, 'PK17': 150, 'PK18': 151, 'PK19': 152, 'PK20': 153, 'PK21': 154, 'PK22': 155,
  'PK23': 156, 'PK24': 157, 'PK25': 158, 'PK26': 159, 'PK27': 160, 'PK28': 161, 'PK29': 162, 'PK30': 163
};

function flattenRoutesJorneyGroup(groupList) {
  if (!Array.isArray(groupList)) return [];
  const steps = [];
  for (const g of groupList) {
    const lineId = g.LineId;
    const origin = g.Origin ? {
      StationCode: g.Origin.StationCode,
      Title: g.Origin.Title || g.Origin.Detail || g.Origin.Station?.StationName || '',
      TimeRoute: g.Origin.TimeRoute || '',
      LineId: lineId
    } : null;

    const bypass = (g.ByPass || []).map(b => ({
      StationCode: b.StationCode,
      Title: b.Title || b.Detail || b.Station?.StationName || '',
      TimeRoute: b.TimeRoute || '',
      LineId: lineId
    }));

    const dest = g.Destination ? {
      StationCode: g.Destination.StationCode,
      Title: g.Destination.Title || g.Destination.Detail || g.Destination.Station?.StationName || '',
      TimeRoute: g.Destination.TimeRoute || '',
      LineId: lineId
    } : null;

    if (origin) {
      if (!steps.length || steps[steps.length - 1].StationCode !== origin.StationCode) {
        steps.push(origin);
      }
    }
    for (const bp of bypass) {
      steps.push(bp);
    }
    if (dest) {
      steps.push(dest);
    }
  }
  return steps;
}

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

  // Extract action / endpoint from query or body (supporting opaque codes t1, s2, f3, r4)
  const rawAction = parsedUrl.searchParams.get('endpoint') ||
                    parsedUrl.searchParams.get('op') ||
                    parsedUrl.searchParams.get('action') ||
                    (parsedBody && (parsedBody.op || parsedBody.action || parsedBody.endpoint));
  endpoint = ACTION_MAP[rawAction] || rawAction;

  // 7. Validate Endpoint
  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      error: 'Proxy setup error',
      details: 'Invalid or unsupported transit action'
    }));
  }

  // 8. Validate Authkey for TTA / Arrivals
  const authKey = req.headers['authkey'] || req.headers['Authkey'] || parsedBody.AuthKey || parsedBody.authKey;
  if ((endpoint === 'tta' || endpoint === 'arrivals') && !authKey) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Missing Authkey header' }));
  }

  // 9. Map requested action to Obfuscated Upstream Route & Payload
  const upstreamBase = DEFAULT_UPSTREAM.replace(/\/+$/, '');
  let upstreamPath = '';
  let forwardBody = { ...parsedBody };
  delete forwardBody.op;
  delete forwardBody.action;
  delete forwardBody.endpoint;
  const lang = parsedUrl.searchParams.get('lang') || parsedBody.lang || 'th';

  if (endpoint === 'tta' || endpoint === 'arrivals') {
    upstreamPath = _P.tta;
    forwardBody = {
      data: parsedBody.data || '',
      lang: lang === 'en' ? 'en' : 'th',
      AuthKey: authKey
    };
  } else if (endpoint === 'station-list' || endpoint === 'stations' || endpoint === 'stationList') {
    const listLang = (parsedUrl.searchParams.get('lang') || parsedBody.lang || 'en').toLowerCase();
    upstreamPath = `${_P.stations}?Lang=${listLang}`;
    forwardBody = {};
  } else if (endpoint === 'traffic') {
    upstreamPath = `${_P.traffic}?Lang=${lang}`;
    forwardBody = {};
  } else if (endpoint === 'journey' || endpoint === 'route') {
    upstreamPath = `${_P.journey}?lang=${lang}`;
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

      // Post-process journey endpoint response to guarantee RoutesJorney is populated
      if (endpoint === 'journey' || endpoint === 'route') {
        try {
          const journeyData = JSON.parse(fullBuffer.toString('utf8'));
          if (journeyData && journeyData.data && Array.isArray(journeyData.data.RoutesMap)) {
            for (const rm of journeyData.data.RoutesMap) {
              if ((!rm.RoutesJorney || !rm.RoutesJorney.length) && Array.isArray(rm.RoutesJorneyGroup)) {
                rm.RoutesJorney = flattenRoutesJorneyGroup(rm.RoutesJorneyGroup);
              }
            }
            return res.end(JSON.stringify(journeyData));
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
