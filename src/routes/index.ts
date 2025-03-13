import { Router } from 'express';

import Paths from '../common/Paths';
import fileRouter from './FileRoutes';

const apiRouter = Router();

apiRouter.get('/', (req, res) => {
  res.status(200).send('Ok'); 
});

// Add routers
apiRouter.use(Paths.Files.Base, fileRouter);

export default apiRouter;





