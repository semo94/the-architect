import { Topic, TopicSummary, TopicType } from '@/types';
import { z } from 'zod';
import { authService } from './authService';
import sseClient, { SSEError } from './sseService';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const FlatTopicContentSchema = z.object({
  name: z.string(),
  topicType: z.enum([
    'concepts',
    'patterns',
    'technologies',
    'strategies',
    'models',
    'frameworks',
    'protocols',
    'practices',
    'methodologies',
    'architectures',
  ]),
  category: z.string(),
  subcategory: z.string(),
  what: z.string(),
  why: z.string(),
  pro_0: z.string(),
  pro_1: z.string(),
  pro_2: z.string(),
  pro_3: z.string(),
  pro_4: z.string(),
  con_0: z.string(),
  con_1: z.string(),
  con_2: z.string(),
  con_3: z.string(),
  con_4: z.string(),
  compare_0_tech: z.string(),
  compare_0_text: z.string(),
  compare_1_tech: z.string(),
  compare_1_text: z.string(),
});

export interface TopicConstraints {
  category: string;
  subcategory: string;
  topicType: TopicType;
  learningGoal: string;
}

export interface TopicFilters {
  search?: string;
  status?: 'discovered' | 'learned' | 'dismissed' | 'all';
  topicType?: TopicType;
  category?: string;
  subcategory?: string;
  page?: number;
  limit?: number;
}

export interface TopicFacetOption {
  value: string;
  label: string;
  count?: number;
}

export interface TopicFacetsResponse {
  categories: TopicFacetOption[];
  subcategoriesByCategory: Record<string, TopicFacetOption[]>;
}

class TopicService {
  private extractJSON(text: string): any {
    let cleanedText = text.trim();

    const jsonBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1].trim();
    } else {
      const codeBlockMatch = cleanedText.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleanedText = codeBlockMatch[1].trim();
      }
    }

    return JSON.parse(cleanedText);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async streamDiscoverTopic(
    mode: 'surprise' | 'guided',
    constraints?: TopicConstraints,
    onProgress?: (partialText: string) => void
  ): Promise<{ topic: Topic; topicId: string }> {
    const headers = await this.getAuthHeaders();
    const body = {
      mode,
      constraints,
    };

    let accumulatedText = '';
    let topicId: string | null = null;

    const doRequest = () =>
      new Promise<{ topic: Topic; topicId: string }>((resolve, reject) => {
        sseClient.connect(
          `${API_URL}/topics`,
          body,
          {
            onMessage: (data) => {
              if (data?.type === 'meta' && typeof data.topicId === 'string') {
                topicId = data.topicId;
                return;
              }

              if (!data?.text) {
                return;
              }

              accumulatedText += data.text;
              onProgress?.(accumulatedText);
            },
            onError: (error) => {
              reject(error);
            },
            onComplete: () => {
              try {
                const parsed = FlatTopicContentSchema.parse(this.extractJSON(accumulatedText));
                if (!topicId) {
                  throw new Error('Topic stream did not provide topicId metadata');
                }

                resolve({
                  topic: {
                    id: topicId,
                    name: parsed.name,
                    topicType: parsed.topicType,
                    category: parsed.category,
                    subcategory: parsed.subcategory,
                    content: {
                      what: parsed.what,
                      why: parsed.why,
                      pros: [parsed.pro_0, parsed.pro_1, parsed.pro_2, parsed.pro_3, parsed.pro_4],
                      cons: [parsed.con_0, parsed.con_1, parsed.con_2, parsed.con_3, parsed.con_4],
                      compareToSimilar: [
                        { topic: parsed.compare_0_tech, comparison: parsed.compare_0_text },
                        { topic: parsed.compare_1_tech, comparison: parsed.compare_1_text },
                      ],
                    },
                    status: 'discovered',
                    discoveryMethod: mode,
                    discoveredAt: new Date().toISOString(),
                    learnedAt: null,
                  },
                  topicId,
                });
              } catch (error) {
                reject(error);
              }
            },
          },
          {
            headers,
            credentials: 'include',
          }
        );
      });

    try {
      return await doRequest();
    } catch (error) {
      if (error instanceof SSEError && error.statusCode === 401) {
        await authService.refreshAccessToken();
        const refreshedHeaders = await this.getAuthHeaders();
        Object.assign(headers, refreshedHeaders);
        return doRequest();
      }
      throw error;
    }
  }

  async discoverTopic(
    mode: 'surprise' | 'guided',
    constraints?: TopicConstraints,
    onProgress?: (partialText: string) => void
  ): Promise<{ topic: Topic; topicId: string }> {
    return this.streamDiscoverTopic(mode, constraints, onProgress);
  }

  async updateTopicStatus(
    topicId: string,
    status: 'discovered' | 'dismissed',
    discoveryMethod?: 'surprise' | 'guided'
  ): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_URL}/topics/${topicId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, discoveryMethod }),
    });

    if (!response.ok) {
      throw new Error('Failed to update topic status');
    }
  }

  async getTopics(filters?: TopicFilters): Promise<{ topics: TopicSummary[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams();

    if (filters?.search) params.set('search', filters.search);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.topicType) params.set('topicType', filters.topicType);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.subcategory) params.set('subcategory', filters.subcategory);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString();
    const response = await authService.authenticatedFetch(
      `${API_URL}/topics${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch topics');
    }

    const data = await response.json();
    return {
      topics: data.topics as TopicSummary[],
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  }

  async getTopicFacets(): Promise<TopicFacetsResponse> {
    const response = await authService.authenticatedFetch(`${API_URL}/topics/facets`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch topic facets');
    }

    return (await response.json()) as TopicFacetsResponse;
  }

  async getTopicDetail(topicId: string): Promise<Topic> {
    const response = await authService.authenticatedFetch(`${API_URL}/topics/${topicId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch topic detail');
    }

    return (await response.json()) as Topic;
  }

  async deleteTopic(topicId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_URL}/topics/${topicId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to delete topic');
    }
  }
}

export default new TopicService();
