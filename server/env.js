const { config } = require('dotenv');

let hasLoadedLocalEnv = false;

function loadLocalApiEnv() {
  if (hasLoadedLocalEnv) {
    return;
  }

  hasLoadedLocalEnv = true;

  // Load local files without overriding real environment variables.
  config({ path: '.env.local', override: false, quiet: true });
  config({ path: '.env', override: false, quiet: true });
}

module.exports = {
  loadLocalApiEnv
};
