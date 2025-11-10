import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from './user.service.js';
import { updateUserSchema } from './user.schemas.js';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
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
}
