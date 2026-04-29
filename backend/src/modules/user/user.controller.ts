import { FastifyReply, FastifyRequest } from 'fastify';
import { updateUserSchema } from './user.schemas.js';
import { UserService } from './user.service.js';
import { UserStatsService } from './user.stats.service.js';

export class UserController {
  private userService: UserService;
  private userStatsService: UserStatsService;

  constructor() {
    this.userService = new UserService();
    this.userStatsService = new UserStatsService();
  }

  async getCurrentUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;

    const user = await this.userService.getById(userId);
    const sanitizedUser = this.userService.sanitizeUser(user);

    reply.send({
      user: sanitizedUser,
    });
  }

  async updateCurrentUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const data = updateUserSchema.parse(request.body);

    const user = await this.userService.updateUser(userId, data);
    const sanitizedUser = this.userService.sanitizeUser(user);

    reply.send({
      user: sanitizedUser,
    });
  }

  async getCurrentUserStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user.sub;
    const statistics = await this.userStatsService.getUserStats(userId);
    const milestones = this.userStatsService.getMilestones(statistics);

    reply.send({ statistics, milestones });
  }
}
