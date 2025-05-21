const { send } = require('../utils/response');
const HistoryService = require('../services/historyService');
const { allowOnly } = require('../utils/methodCheck');

module.exports = (req, res) => {
  if (!allowOnly('GET', res)(req))
    return send(res, 405, { error: 'Method Not Allowed' });
  send(res, 200, HistoryService.getAll());
};
