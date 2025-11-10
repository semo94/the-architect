import { buildApp } from './app.js';
import { env } from './modules/shared/config/env.js';

const start = async () => {
  try {
    const app = await buildApp();

    const port = env.PORT;
    const host = '0.0.0.0';

    await app.listen({ port, host });

    app.log.info(`🚀 Server listening on http://${host}:${port}`);
    app.log.info(`📝 Environment: ${env.NODE_ENV}`);
    app.log.info(`🔒 Secure cookies: ${env.SECURE_COOKIES}`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;

    for (const signal of signals) {
      process.on(signal, async () => {
        app.log.info(`Received ${signal}, closing server gracefully...`);
        await app.close();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
