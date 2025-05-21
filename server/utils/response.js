const send = (res, code, payload) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const bodyJSON = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });

module.exports = { send, bodyJSON };
