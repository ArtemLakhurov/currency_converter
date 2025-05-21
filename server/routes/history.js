const { send } = require('../utils/response');
const HistoryService = require('../services/historyService');

module.exports = (req, res) => {
  if (req.method !== 'GET')
    return send(res, 405, { error: 'Method Not Allowed' });
  send(res, 200, HistoryService.getAll());
};
