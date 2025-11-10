import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { refreshTokenSchema } from './auth.schemas.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async githubCallback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // OAuth2 token is already exchanged by @fastify/oauth2
    const token = await (request as any).githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

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

    const profile = await response.json();

    // Handle authentication
    const { user, tokens } = await this.authService.handleGitHubCallback(profile, request);

    const platform = this.authService.detectPlatform(request);

    if (platform === 'mobile') {
      // For mobile: return JSON response or redirect with tokens
      const redirectUri = (request.query as any).redirect_uri;

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
      const body = refreshTokenSchema.parse(request.body);
      refreshTokenValue = body.refreshToken;
    } else {
      // Get refresh token from cookie
      refreshTokenValue = request.cookies.refresh_token;

      if (!refreshTokenValue) {
        throw new Error('No refresh token provided');
      }
    }

    const { user, tokens } = await this.authService.refreshTokens(refreshTokenValue, request);

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
      const body = request.body as any;
      refreshTokenValue = body?.refreshToken;
    } else {
      refreshTokenValue = request.cookies.refresh_token;
    }

    const userId = (request.user as any)?.sub;

    await this.authService.logout(refreshTokenValue, userId);

    if (platform === 'web') {
      this.authService.clearTokenCookies(reply);
    }

    reply.send({
      message: 'Logged out successfully',
    });
  }

  async revokeAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = (request.user as any).sub;

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
    const userId = (request.user as any).sub;
    const exp = (request.user as any).exp;

    // In a real implementation, fetch user from database
    reply.send({
      user: request.user,
      expiresAt: new Date(exp * 1000).toISOString(),
    });
  }
}
