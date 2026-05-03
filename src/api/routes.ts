import { Router, Request, Response } from 'express';
import { Engine } from '../logic/engine.js';
import type { LLMDecision } from '../types/index.js';

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
      const current_allocation = portfolio_history.at(-1)?.current_allocation ?? null;
      res.json({ last_decision, portfolio_history, timestamp, cycle_count, current_allocation });
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

  router.post('/api/sense', async (_req: Request, res: Response) => {
    try {
      const data = await engine.sense();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post('/api/decide', async (req: Request, res: Response) => {
    try {
      const decision = req.body as LLMDecision;
      if (!decision || typeof decision !== 'object') {
        res.status(400).json({ error: 'Missing decision payload' });
        return;
      }
      if (!decision.sentiment || !decision.target_allocation) {
        res.status(400).json({ error: 'Decision must include sentiment and target_allocation' });
        return;
      }
      const results = await engine.decide(decision);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return router;
}
