import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRepository } from '../user/user.repository.js';
import { AuthRepository } from './auth.repository.js';
import { type User } from '../shared/database/schema.js';
import { AppError } from '../shared/middleware/error-handler.js';
import {
  generateFingerprint,
  parseExpiry,
  getExpiry,
  type JWTPayload,
  type TokenPair,
} from '../shared/utils/jwt.utils.js';
import { generateRandomToken, hashToken } from '../shared/utils/crypto.utils.js';
import { env } from '../shared/config/env.js';

export interface GitHubProfile {
  id: string;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

export class AuthService {
  private userRepository: UserRepository;
  private authRepository: AuthRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.authRepository = new AuthRepository();
  }

  async handleGitHubCallback(
    profile: GitHubProfile,
    request: FastifyRequest
  ): Promise<{ user: User; tokens: TokenPair }> {
    // Upsert user
    const user = await this.userRepository.upsertByGithubId(profile.id, {
      githubId: profile.id,
      username: profile.login,
      email: profile.email,
      displayName: profile.name,
      avatarUrl: profile.avatar_url,
    });

    // Generate tokens
    const platform = this.detectPlatform(request);
    const tokens = await this.generateTokens(user, platform, request);

    return { user, tokens };
  }

  async generateTokens(
    user: User,
    platform: 'web' | 'mobile',
    request: FastifyRequest
  ): Promise<TokenPair> {
    const fingerprint = env.ENABLE_FINGERPRINTING ? generateFingerprint(request) : undefined;

    const accessPayload: Partial<JWTPayload> = {
      sub: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email || undefined,
      platform,
      fingerprint,
    };

    const accessExpiry = getExpiry('access', platform);
    const refreshExpiry = getExpiry('refresh', platform);

    // Sign JWT tokens
    const accessToken = await request.server.jwt.sign(accessPayload, {
      expiresIn: accessExpiry,
    });

    const refreshTokenValue = generateRandomToken(64);
    const refreshTokenHash = hashToken(refreshTokenValue);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + parseExpiry(refreshExpiry) * 1000);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async refreshTokens(
    refreshTokenValue: string,
    request: FastifyRequest
  ): Promise<{ user: User; tokens: TokenPair }> {
    const tokenHash = hashToken(refreshTokenValue);

    // Find refresh token in database
    const refreshToken = await this.authRepository.findRefreshToken(tokenHash);

    if (!refreshToken) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Get user
    const user = await this.userRepository.findById(refreshToken.userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Revoke old refresh token
    await this.authRepository.revokeRefreshToken(tokenHash);

    // Generate new tokens
    const platform = this.detectPlatform(request);
    const tokens = await this.generateTokens(user, platform, request);

    return { user, tokens };
  }

  async logout(refreshTokenValue?: string, userId?: string): Promise<void> {
    if (refreshTokenValue) {
      const tokenHash = hashToken(refreshTokenValue);
      await this.authRepository.revokeRefreshToken(tokenHash);
    }

    if (userId) {
      // Optionally revoke all user tokens on logout
      // await this.authRepository.revokeAllUserTokens(userId);
    }
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.authRepository.revokeAllUserTokens(userId);
  }

  detectPlatform(request: FastifyRequest): 'web' | 'mobile' {
    const platformHeader = request.headers['x-platform'] as string | undefined;
    const query = request.query as { platform?: string } | undefined;
    const platformQuery = query?.platform;

    const platform = platformHeader || platformQuery;

    if (platform === 'mobile') return 'mobile';
    return 'web';
  }

  setTokenCookies(reply: FastifyReply, tokens: TokenPair): void {
    const cookieOptions = {
      httpOnly: true,
      secure: env.SECURE_COOKIES,
      sameSite: 'lax' as const,
      domain: env.COOKIE_DOMAIN,
      path: '/',
    };

    reply.setCookie('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: parseExpiry(getExpiry('access', 'web')),
    });

    reply.setCookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: parseExpiry(getExpiry('refresh', 'web')),
    });
  }

  clearTokenCookies(reply: FastifyReply): void {
    reply.clearCookie('access_token', {
      path: '/',
      domain: env.COOKIE_DOMAIN,
    });
    reply.clearCookie('refresh_token', {
      path: '/',
      domain: env.COOKIE_DOMAIN,
    });
  }
}
