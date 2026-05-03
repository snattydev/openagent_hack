import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Engine } from '../logic/engine.js';

const decideSchema = z.object({
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500),
  target_allocation: z.object({
    WETH: z.number().min(0).max(1),
    USDC: z.number().min(0).max(1),
  }),
  key_signals: z.array(z.string()).max(20),
});

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
      const parseResult = decideSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid decision payload', details: parseResult.error.format() });
        return;
      }
      const results = await engine.decide(parseResult.data);
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
