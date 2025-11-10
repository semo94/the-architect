import { eq } from 'drizzle-orm';
import { db } from '../shared/database/client.js';
import { users, type User, type NewUser } from '../shared/database/schema.js';

export class UserRepository {
  async findById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async findByGithubId(githubId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.githubId, githubId));
    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async create(data: NewUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async upsertByGithubId(githubId: string, data: NewUser): Promise<User> {
    const existingUser = await this.findByGithubId(githubId);

    if (existingUser) {
      return (await this.update(existingUser.id, data))!;
    }

    return this.create(data);
  }
}
