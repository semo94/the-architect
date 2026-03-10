import type { CategorySchemaMap } from '../types/categorySchema';
import { authService } from './authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

class CategorySchemaService {
  private cached: CategorySchemaMap | null = null;

  async getSchema(forceRefresh: boolean = false): Promise<CategorySchemaMap> {
    if (!forceRefresh && this.cached) {
      return this.cached;
    }

    const response = await authService.authenticatedFetch(`${API_URL}/llm/categories`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch category schema');
    }

    const schema = (await response.json()) as CategorySchemaMap;
    this.cached = schema;
    return schema;
  }
}

export default new CategorySchemaService();
