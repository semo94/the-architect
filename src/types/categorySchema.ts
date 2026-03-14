import { TopicType } from './index';

export interface SubcategorySchema {
  description: string;
  topicTypes: TopicType[];
  concepts?: string[];
  patterns?: string[];
  technologies?: string[];
  strategies?: string[];
  models?: string[];
  frameworks?: string[];
  protocols?: string[];
  practices?: string[];
  methodologies?: string[];
  architectures?: string[];
  learningPath?: 'foundational' | 'intermediate' | 'advanced';
}

export interface CategorySchema {
  description: string;
  architectureLevel: 'foundational' | 'intermediate' | 'advanced';
  subcategories: Record<string, SubcategorySchema>;
}

export type CategorySchemaMap = Record<string, CategorySchema>;
