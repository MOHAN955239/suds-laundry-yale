import { Router } from 'express';
import { authRouter } from './auth.routes';
import { machinesRouter } from './machines.routes';
import { queuesRouter } from './queues.routes';
import { usersRouter } from './users.routes';
import { favoritesRouter } from './favorites.routes';
import { notificationsRouter } from './notifications.routes';
import { achievementsRouter } from './achievements.routes';
import { statsRouter } from './stats.routes';
import { buddiesRouter } from './buddies.routes';
import { feedbackRouter } from './feedback.routes';
import { statusRouter } from './status.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/machines', machinesRouter);
apiRouter.use('/queues', queuesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/favorites', favoritesRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/achievements', achievementsRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/buddies', buddiesRouter);
apiRouter.use('/feedback', feedbackRouter);
apiRouter.use('/status', statusRouter);

apiRouter.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
