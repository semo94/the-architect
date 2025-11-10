import { FastifyInstance } from 'fastify';
import oauth2Plugin from '@fastify/oauth2';
import { AuthController } from './auth.controller.js';
import { env } from '../shared/config/env.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new AuthController();

  // Register GitHub OAuth2
  await fastify.register(oauth2Plugin, {
    name: 'githubOAuth2',
    credentials: {
      client: {
        id: env.GITHUB_CLIENT_ID,
        secret: env.GITHUB_CLIENT_SECRET,
      },
      auth: oauth2Plugin.GITHUB_CONFIGURATION,
    },
    startRedirectPath: '/github',
    callbackUri: env.GITHUB_CALLBACK_URL,
    scope: ['user:email', 'read:user'],
  });

  // GET /auth/github - Initiate GitHub OAuth
  // This is automatically handled by @fastify/oauth2 via startRedirectPath

  // GET /auth/github/callback - GitHub OAuth callback
  fastify.get('/github/callback', async (request, reply) => {
    await controller.githubCallback(request, reply);
  });

  // POST /auth/refresh - Refresh access token
  fastify.post('/refresh', async (request, reply) => {
    await controller.refresh(request, reply);
  });

  // POST /auth/logout - Logout user
  fastify.post('/logout', {
    onRequest: [
      async (request) => {
        try {
          await request.jwtVerify();
        } catch {
          // Allow logout even if token is invalid
        }
      },
    ],
  }, async (request, reply) => {
    await controller.logout(request, reply);
  });

  // POST /auth/revoke-all - Revoke all user tokens
  fastify.post('/revoke-all', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    await controller.revokeAll(request, reply);
  });

  // GET /auth/session - Validate current session
  fastify.get('/session', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    await controller.session(request, reply);
  });
}
