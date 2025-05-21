const MAX_HISTORY_LENGTH = 100;

class HistoryService {
  history = [];

  constructor() {
    this.history = [];
  }

  add(entry) {
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY_LENGTH) this.history.shift();
  }

  getAll() {
    console.log(this.history);
    return this.history;
  }
}

module.exports = new HistoryService();
