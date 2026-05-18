import { CHAMPIONS } from '@app/shared';
import { Router } from 'express';

export const championsRouter: Router = Router();

championsRouter.get('/', (_req, res) => {
  res.json({ champions: CHAMPIONS });
});
