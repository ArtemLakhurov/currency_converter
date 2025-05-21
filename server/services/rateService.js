const http = require('http');
const https = require('https');
const { URL } = require('url');

class RateService {
  constructor(apiUrl, ttlMs) {
    this.apiUrl = new URL(apiUrl);
    this.ttlMs = ttlMs;
    this.cache = { ts: 0, rates: [] };
  }

  isCacheValid() {
    return Date.now() - this.cache.ts < this.ttlMs;
  }

  async fetchRates() {
    if (this.isCacheValid()) return this.cache.rates;
    const lib = this.apiUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      lib
        .get(this.apiUrl, (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try {
              const arr = JSON.parse(raw);
              const extra = {
                ccy: 'UAH',
                base_ccy: 'UAH',
                buy: '1',
                sale: '1',
              };
              const rates = [...arr, extra];
              this.cache = { ts: Date.now(), rates };
              resolve(rates);
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
