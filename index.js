// pure-node-api.js
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const API_URL =
  process.env.API_URL ||
  'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5';
const API_KEY = process.env.API_KEY || 'mySuperSecretToken';

/* ────────────── утиліти ────────────── */
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
  new Promise((ok, bad) => {
    let data = '';
    req.on('data', (c) => (data += c) > 1e6 && req.destroy());
    req.on('end', () => {
      try {
        ok(data ? JSON.parse(data) : {});
      } catch (e) {
        bad(e);
      }
    });
  });

/* ────── кеш курсів + історія конвертацій ────── */
let cache = { ts: 0, rates: [] }; // 10-хвилинний кеш
const HISTORY = []; // [{time, from,to,amount,converted}]
const CACHE_TTL = 10 * 60 * 1e3; // 10 хв.

const fetchRates = () =>
  new Promise((ok, bad) => {
    if (Date.now() - cache.ts < CACHE_TTL) return ok(cache.rates);

    const u = new URL(API_URL);
    const lib = u.protocol === 'https:' ? https : http;
    lib
      .get(u, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const arr = JSON.parse(raw); // API ПриватБанку
            const extra = { ccy: 'UAH', base_ccy: 'UAH', buy: '1', sale: '1' };
            const rates = [...arr, extra];
            cache = { ts: Date.now(), rates };
            ok(rates);
          } catch (e) {
            bad(e);
          }
        });
      })
      .on('error', bad);
  });

/* ───────────── HTTP-сервер ───────────── */
const server = http.createServer(async (req, res) => {
  addCORS(res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  // захищені ендпоїнти
  if (req.url.startsWith('/api/') && !authed(req))
    return send(res, 401, { error: 'Unauthorized' });

  /* GET /api/rates */
  if (req.method === 'GET' && req.url === '/api/rates') {
    try {
      return send(res, 200, await fetchRates());
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }

  /* GET /api/history */
  if (req.method === 'GET' && req.url === '/api/history')
    return send(res, 200, HISTORY);

  /* POST /api/convert */
  if (req.method === 'POST' && req.url === '/api/convert') {
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
        return item;
      });
      return send(res, 200, { results });
    } catch (e) {
      const code = /Invalid currency/.test(e.message) ? 400 : 500;
      return send(res, code, { error: e.message });
    }
  }

  /* 404 */
  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () =>
  console.log(`🚀  API ready on http://localhost:${PORT}`)
);
