import { handleRoute } from '../../server/routes';
import { withApiAuth } from '../../server/with-auth';

export default withApiAuth(async (req, res) => {
  await handleRoute(req, res, ['beat81', 'events']);
});
