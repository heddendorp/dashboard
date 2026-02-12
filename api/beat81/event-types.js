const { handleRoute } = require('../../server/routes');
const { withApiAuth } = require('../../server/with-auth');

module.exports = withApiAuth(async (req, res) => {
  await handleRoute(req, res, ['beat81', 'event-types']);
});
