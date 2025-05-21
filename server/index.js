const http = require('http');
const { URL } = require('url');
const addCORS = require('./utils/cors');
const { send } = require('./utils/response');
const { authed } = require('./utils/auth');
const routes = require('./routes');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  addCORS(res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.url.startsWith('/api/') && !authed(req)) {
    return send(res, 401, { error: 'Unauthorized' });
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[url.pathname];
  if (handler) return handler(req, res);
  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\u{1F680} API ready on http://localhost:${PORT}`);
});
