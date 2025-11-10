import type { OAuth2Namespace } from '@fastify/oauth2';
import { FastifyReply, FastifyRequest } from 'fastify';
import { refreshTokenSchema, type RefreshTokenDto } from './auth.schemas.js';
import { AuthService } from './auth.service.js';

interface AuthQuery {
  redirect_uri?: string;
  platform?: string;
}

interface LogoutBody {
  refreshToken?: string;
}

// Extend FastifyInstance to include the OAuth2 namespace
declare module 'fastify' {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async githubCallback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // OAuth2 token is already exchanged by @fastify/oauth2
    const tokenData = await request.server.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    const token = tokenData.token;

    // Fetch user profile from GitHub
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub profile');
    }

    const profile = await response.json() as import('./auth.service.js').GitHubProfile;

    // Handle authentication
    const { user, tokens } = await this.authService.handleGitHubCallback(profile, request);

    const platform = this.authService.detectPlatform(request);

    if (platform === 'mobile') {
      // For mobile: return JSON response or redirect with tokens
      const query = request.query as AuthQuery;
      const redirectUri = query.redirect_uri;

      if (redirectUri) {
        // Redirect to mobile deep link with tokens
        const url = new URL(redirectUri);
        url.searchParams.set('access_token', tokens.accessToken);
        url.searchParams.set('refresh_token', tokens.refreshToken);
        reply.redirect(url.toString());
      } else {
        // Return JSON response
        reply.send({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            githubId: user.githubId,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
        });
      }
    } else {
      // For web: set httpOnly cookies and redirect
      this.authService.setTokenCookies(reply, tokens);
      reply.redirect(process.env.WEB_CLIENT_URL || '/');
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const platform = this.authService.detectPlatform(request);

    let refreshTokenValue: string;

    if (platform === 'mobile') {
      // Get refresh token from request body
      const body = refreshTokenSchema.parse(request.body) as RefreshTokenDto;
      refreshTokenValue = body.refreshToken;
    } else {
      // Get refresh token from cookie
      const cookieValue = request.cookies.refresh_token;

      if (!cookieValue) {
        throw new Error('No refresh token provided');
      }

      refreshTokenValue = cookieValue;
    }

    const { tokens } = await this.authService.refreshTokens(refreshTokenValue, request);

    if (platform === 'mobile') {
      reply.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } else {
      this.authService.setTokenCookies(reply, tokens);
      reply.send({
        message: 'Tokens refreshed successfully',
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const platform = this.authService.detectPlatform(request);

    let refreshTokenValue: string | undefined;

    if (platform === 'mobile') {
      const body = request.body as LogoutBody;
      refreshTokenValue = body?.refreshToken;
    } else {
      refreshTokenValue = request.cookies.refresh_token;
    }

    const userId = request.user?.sub;

    await this.authService.logout(refreshTokenValue, userId);

    if (platform === 'web') {
      this.authService.clearTokenCookies(reply);
    }

    reply.send({
      message: 'Logged out successfully',
    });
  }

  async revokeAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;

    await this.authService.revokeAllTokens(userId);

    const platform = this.authService.detectPlatform(request);

    if (platform === 'web') {
      this.authService.clearTokenCookies(reply);
    }

    reply.send({
      message: 'All tokens revoked',
    });
  }

  async session(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send({
      user: request.user,
      expiresAt: new Date(request.user.exp * 1000).toISOString(),
    });
  }
}
