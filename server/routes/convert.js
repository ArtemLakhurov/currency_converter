const { send, bodyJSON } = require('../utils/response');
const RateService = require('../services/rateService');
const HistoryService = require('../services/historyService');

const convertSingle = (rates, conversion) => {
  const { from, to, amount } = conversion;
  const rFrom = rates.find((r) => r.ccy === from);
  const rTo = rates.find((r) => r.ccy === to);

  if (!rFrom || !rTo) throw new Error(`Invalid currency: ${from}|${to}`);

  const converted = (amount * +rFrom.sale) / +rTo.sale;
  return {
    time: new Date().toISOString(),
    from,
    to,
    amount: +amount,
    converted: +converted.toFixed(2),
  };
};

const isSingleConversion = (b) => b.from && b.to && b.amount;

module.exports = async (req, res) => {
  if (req.method !== 'POST')
    return send(res, 405, { error: 'Method Not Allowed' });

  try {
    const body = await bodyJSON(req);
    const batch = Array.isArray(body.conversions)
      ? body.conversions
      : isSingleConversion(body)
      ? [body]
      : null;

    if (!batch) return send(res, 400, { error: 'Bad input format' });

    const rates = await RateService.fetchRates();
    const results = batch.map((conversion) => {
      const item = convertSingle(rates, conversion);
      HistoryService.add(item);
      return item;
    });

    send(res, 200, { results });
  } catch (e) {
    const code = /Invalid currency/.test(e.message) ? 400 : 500;
    send(res, code, { error: e.message });
  }
};
