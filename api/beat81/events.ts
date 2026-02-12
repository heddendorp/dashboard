import { handleRoute } from '../routes';
import { withApiAuth } from '../with-auth';

export default withApiAuth(async (req, res) => {
  await handleRoute(req, res, ['beat81', 'events']);
});
