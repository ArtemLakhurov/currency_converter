const API_KEY = process.env.API_KEY || 'mySuperSecretToken';

const authed = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') && h.slice(7) === API_KEY;
};

module.exports = { authed };
