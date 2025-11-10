import { UserRepository } from './user.repository.js';
import { type User } from '../shared/database/schema.js';
import { AppError } from '../shared/middleware/error-handler.js';
import { type UpdateUserDto } from './user.schemas.js';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updatedUser = await this.userRepository.update(id, data);

    if (!updatedUser) {
      throw new AppError('Failed to update user', 500, 'UPDATE_FAILED');
    }

    return updatedUser;
  }

  sanitizeUser(user: User): Omit<User, never> {
    // Remove any sensitive fields if needed
    return user;
  }
}
