import { eq, and, gt } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import { refreshTokens, type RefreshToken, type NewRefreshToken } from '../shared/database/schema.js';

export class AuthRepository {
  async createRefreshToken(data: NewRefreshToken): Promise<RefreshToken> {
    const result = await db.insert(refreshTokens).values(data).returning();
    return result[0];
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | undefined> {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          gt(refreshTokens.expiresAt, new Date()),
          eq(refreshTokens.revokedAt, null as any)
        )
      );
    return result[0];
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revokedAt, null as any)
        )
      );
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(refreshTokens)
      .where(gt(new Date(), refreshTokens.expiresAt));
  }
}
