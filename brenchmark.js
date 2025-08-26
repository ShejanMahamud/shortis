const autocannon = require('autocannon');

const instance = autocannon({
  url: 'http://localhost:4545/v1/api/shortner/r/r8mR9H',
  connections: 50,
  duration: 20,
  pipelining: 10
});

// Track progress in the console
autocannon.track(instance, { renderProgressBar: true });

// Count 3xx as success
let successCount = 0;

instance.on('response', (client, statusCode, resBytes, responseTime) => {
  if (statusCode >= 200 && statusCode < 400) {
    successCount++;
  }
});

instance.on('done', () => {
  console.log(`Successful requests (2xx + 3xx): ${successCount}`);
});
