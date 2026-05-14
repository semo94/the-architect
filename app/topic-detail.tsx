import { TopicDetailScreen } from '@/components/discover/TopicDetailScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function TopicDetailRoute() {
  const { topicId } = useLocalSearchParams<{ topicId?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!topicId) {
      router.replace('/(tabs)/topics');
    }
  }, [topicId, router]);

  if (!topicId) {
    return null;
  }

  return <TopicDetailScreen topicId={topicId} />;
}
