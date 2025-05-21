const allowOnly = (method, res) => {
  return (req) => {
    if (req.method !== method) {
      send(res, 405, { error: 'Method Not Allowed' });
      return false;
    }
    return true;
  };
};

module.exports = { allowOnly };
