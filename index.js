const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const API_URL =
  process.env.API_URL ||
  'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5';
const API_KEY = process.env.API_KEY || 'mySuperSecretToken';

const send = (res, code, payload) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};
const addCORS = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
};
const authed = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') && h.slice(7) === API_KEY;
};
const bodyJSON = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // FIX: better readability
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });

// FIX: обмеження історії
const MAX_HISTORY_LENGTH = 100;
let cache = { ts: 0, rates: [] };
const HISTORY = [];
const CACHE_TTL = 10 * 60 * 1e3;

const fetchRates = () =>
  new Promise((resolve, reject) => {
    if (Date.now() - cache.ts < CACHE_TTL) return resolve(cache.rates);
    const u = new URL(API_URL);
    const lib = u.protocol === 'https:' ? https : http;

    lib
      .get(u, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const arr = JSON.parse(raw);
            const extra = { ccy: 'UAH', base_ccy: 'UAH', buy: '1', sale: '1' };
            const rates = [...arr, extra];
            cache = { ts: Date.now(), rates };
            resolve(rates);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });

// FIX: розділення логіки обробки
const routes = {
  '/api/rates': async (req, res) => {
    if (req.method !== 'GET')
      return send(res, 405, { error: 'Method Not Allowed' });
    try {
      const rates = await fetchRates();
      send(res, 200, rates);
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  },

  '/api/history': (req, res) => {
    if (req.method !== 'GET')
      return send(res, 405, { error: 'Method Not Allowed' });
    send(res, 200, HISTORY);
  },

  '/api/convert': async (req, res) => {
    if (req.method !== 'POST')
      return send(res, 405, { error: 'Method Not Allowed' });

    try {
      const body = await bodyJSON(req);
      const batch = Array.isArray(body.conversions)
        ? body.conversions
        : body.from && body.to && body.amount
        ? [body]
        : null;

      if (!batch) return send(res, 400, { error: 'Bad input format' });

      const rates = await fetchRates();
      const results = batch.map(({ from, to, amount }) => {
        const rFrom = rates.find((r) => r.ccy === from);
        const rTo = rates.find((r) => r.ccy === to);
        if (!rFrom || !rTo) throw new Error(`Invalid currency: ${from}|${to}`);

        const converted = (amount * +rFrom.sale) / +rTo.sale;
        const item = {
          time: new Date().toISOString(),
          from,
          to,
          amount: +amount,
          converted: +converted.toFixed(2),
        };

        HISTORY.push(item);
        if (HISTORY.length > MAX_HISTORY_LENGTH) HISTORY.shift(); // FIX

        return item;
      });

      send(res, 200, { results });
    } catch (e) {
      const code = /Invalid currency/.test(e.message) ? 400 : 500;
      send(res, code, { error: e.message });
    }
  },
};

// HTTP-сервер з роутінгом
const server = http.createServer(async (req, res) => {
  addCORS(res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.url.startsWith('/api/') && !authed(req))
    return send(res, 401, { error: 'Unauthorized' });

  const handler = routes[req.url];
  if (handler) {
    return handler(req, res);
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 API ready on http://localhost:${PORT}`);
});
