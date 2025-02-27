import { Router } from 'express';

import Paths from '../common/Paths';
import fileRouter from './FileRoutes';

const apiRouter = Router();

// Add routers
apiRouter.use(Paths.Files.Base, fileRouter);

export default apiRouter;
