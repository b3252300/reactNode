const mongoose = require('mongoose');
const app = require('./app');
const { getConfig } = require('./config');

async function start() {
  const config = getConfig();
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => {
    console.log(`API server listening on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API server:', error.message);
  process.exitCode = 1;
});
