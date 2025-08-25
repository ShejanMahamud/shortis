const autocannon = require('autocannon');

const instance = autocannon({
  url: 'http://localhost:4545/v1/api/shortner/748b3891-5e02-4ca1-b7a2-b9a3b98de9af',
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
