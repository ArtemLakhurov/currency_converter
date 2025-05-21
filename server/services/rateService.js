const BaseCacheService = require('./baseService');

class RateService extends BaseCacheService {
  constructor(apiUrl, ttlMs) {
    super();
    this.apiUrl = new URL(apiUrl);
    this.ttlMs = ttlMs;
  }

  async fetchRates() {
    if (this.isCacheValid(this.ttlMs)) return this.getCached();

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
              resolve(this.updateCache(rates));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = RateService;
