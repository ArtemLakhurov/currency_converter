const { send } = require('../utils/response');
const RateService = require('../services/rateService');

module.exports = async (req, res) => {
  if (!allowOnly('GET', res)(req))
    return send(res, 405, { error: 'Method Not Allowed' });
  try {
    const rates = await RateService.fetchRates();
    send(res, 200, rates);
  } catch (e) {
    send(res, 500, { error: e.message });
  }
};
