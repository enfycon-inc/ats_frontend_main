const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/market-segments',
  method: 'GET',
  headers: {
    // We need an auth token. Let's just see if it returns 401.
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', error => console.error(error));
req.end();
