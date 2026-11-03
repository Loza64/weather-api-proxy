import { createApp } from './app';
import { buildContainer } from './composition-root';
import { assertEnv, env } from './shared/config/env';
import { errorLog, serverLog, swaggerLog } from './shared/logger/logger';

const bootstrap = async (): Promise<void> => {
  assertEnv();

  const app = createApp(buildContainer());

  const server = app.listen(env.PORT, () => {
    serverLog(`Running on http://localhost:${env.PORT}`);
    swaggerLog(`Available on http://localhost:${env.PORT}/api-docs`);
  });

  const shutdown = (signal: string): void => {
    serverLog('Recibida %s, cerrando de forma ordenada...', signal);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

bootstrap().catch((err) => {
  errorLog('Failed to start the server: %O', err);
  process.exit(1);
});
