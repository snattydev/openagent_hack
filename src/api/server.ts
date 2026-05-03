import express, { Express } from 'express';
import cors from 'cors';
import http from 'http';
import { createRoutes } from './routes.js';
import { Engine } from '../logic/engine.js';
import { getConfig } from '../config/constants.js';

export function createApp(engine: Engine): Express {
  const app = express();
  const config = getConfig();

  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(createRoutes(engine));

  return app;
}

export function startServer(engine: Engine, port: number): http.Server {
  const app = createApp(engine);
  const server = app.listen(port);
  return server;
}
