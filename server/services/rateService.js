const http = require('http');
const https = require('https');
const { URL } = require('url');

class RateService {
  constructor(apiUrl, ttlMs) {
    this.apiUrl = new URL(apiUrl);
    this.ttlMs = ttlMs;
    this.cache = { ts: 0, rates: [] };
  }

  appendUAH = (rates) => [
    ...rates,
    { ccy: 'UAH', base_ccy: 'UAH', buy: '1', sale: '1' },
  ];

  updateCache = (rates) => {
    this.cache = { ts: Date.now(), rates };
    return rates;
  };

  async fetchRates() {
    if (Date.now() - this.cache.ts < this.ttlMs) return this.cache.rates;
    const lib = this.apiUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      lib
        .get(this.apiUrl, (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(raw);
              const enriched = this.appendUAH(parsed);
              resolve(this.updateCache.call(this, enriched));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = new RateService(
  process.env.API_URL ||
    'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5',
  10 * 60 * 1000
);
