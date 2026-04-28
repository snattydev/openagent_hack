import { Router, Request, Response } from 'express';
import { Engine } from '../logic/engine.js';

export function createRoutes(engine: Engine): Router {
  const router = Router();

  router.get('/api/status', (_req: Request, res: Response) => {
    try {
      const status = engine.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/api/state', (_req: Request, res: Response) => {
    try {
      const { last_decision, portfolio_history, timestamp, cycle_count } = engine.state;
      res.json({ last_decision, portfolio_history, timestamp, cycle_count });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post('/api/trigger', async (_req: Request, res: Response) => {
    try {
      const results = await engine.runCycle();
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/api/health', (_req: Request, res: Response) => {
    try {
      res.json({ status: 'ok', timestamp: Date.now() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
