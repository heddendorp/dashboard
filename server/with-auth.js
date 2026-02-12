const { isAuthorizedRequest, respondUnauthorized } = require('./auth');
const { loadLocalApiEnv } = require('./env');

function withApiAuth(handler) {
  return async (req, res) => {
    loadLocalApiEnv();

    if (!isAuthorizedRequest(req)) {
      respondUnauthorized(res);
      return;
    }

    await handler(req, res);
  };
}

module.exports = {
  withApiAuth
};
