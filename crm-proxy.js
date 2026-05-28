const https = require('https');
const http = require('http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { crmHost, payload } = parsed;

  if (!crmHost || !payload) {
    return { statusCode: 400, body: 'Missing crmHost or payload' };
  }

  const url = new URL('/jsonrpc', crmHost);
  const bodyStr = JSON.stringify(payload);
  const lib = url.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: data,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        statusCode: 502,
        body: JSON.stringify({ error: err.message }),
      });
    });

    req.write(bodyStr);
    req.end();
  });
};
