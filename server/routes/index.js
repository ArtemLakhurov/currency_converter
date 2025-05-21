const convertRoute = require('./convert');
const ratesRoute = require('./rates');
const historyRoute = require('./history');

module.exports = {
  '/api/convert': convertRoute,
  '/api/rates': ratesRoute,
  '/api/history': historyRoute,
};
