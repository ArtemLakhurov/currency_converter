class BaseCacheService {
  constructor() {
    this.cache = { ts: 0, data: null };
  }

  isCacheValid(ttlMs) {
    return Date.now() - this.cache.ts < ttlMs;
  }

  updateCache(data) {
    this.cache = { ts: Date.now(), data };
    return data;
  }

  getCached() {
    return this.cache.data;
  }
}

module.exports = BaseCacheService;
