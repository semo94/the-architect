import oauth2Plugin from '@fastify/oauth2';
import type { FastifyOAuth2Options, FastifyGenerateStateFunction, FastifyCheckStateFunction } from '@fastify/oauth2';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../shared/config/env.js';
import { AuthController } from './auth.controller.js';
import { generateState, OAuthStatePayload, validateState } from './utils/oauth-state.js';

// Extend FastifyRequest to include decoded OAuth state
declare module 'fastify' {
  interface FastifyRequest {
    oauthState?: OAuthStatePayload;
  }
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const controller = new AuthController();

  // Register GitHub OAuth2 with custom state management
  const oauth2Options: FastifyOAuth2Options = {
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

    // Custom state generation: encode platform and redirect URI
    generateStateFunction: (function (this: FastifyInstance, request: FastifyRequest, callback: (err: Error | null, state: string) => void): void {
      try {
        const query = request.query as { platform?: string; redirect_uri?: string };
        const platform = query.platform === 'mobile' ? 'mobile' : 'web';
        const redirectUri = query.redirect_uri;

        // Validate redirect_uri for mobile platform
        if (platform === 'mobile') {
          if (!redirectUri) {
            throw new Error('redirect_uri is required for mobile platform');
          }
          if (!redirectUri.startsWith(env.MOBILE_DEEP_LINK_SCHEME)) {
            throw new Error(`Invalid redirect_uri: must start with ${env.MOBILE_DEEP_LINK_SCHEME}`);
          }
        }

        const state = generateState(platform, redirectUri);
        callback(null, state);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate state';
        this.log.error({ error: errorMessage }, 'OAuth state generation failed');
        // Callback signature requires both error and state params
        callback(new Error(errorMessage), '');
      }
    }) as FastifyGenerateStateFunction,

    // Custom state validation: verify signature and decode platform context
    checkStateFunction: (function (this: FastifyInstance, request: FastifyRequest, callback: (err?: Error) => void): void {
      try {
        const query = request.query as { state?: string };
        const stateString = query.state;

        if (!stateString) {
          return callback(new Error('Missing state parameter'));
        }

        // Validate and decode state
        const decodedState = validateState(stateString);

        // Attach decoded state to request for controller access
        request.oauthState = decodedState;

        // State is valid - call callback with no error
        callback();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid state';
        this.log.error({ error: errorMessage }, 'OAuth state validation failed');
        callback(new Error(errorMessage));
      }
    }) as FastifyCheckStateFunction,
  };

  await fastify.register(oauth2Plugin, oauth2Options);

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
