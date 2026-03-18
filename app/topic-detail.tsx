import { TopicDetailScreen } from '@/components/discover/TopicDetailScreen';
import { useLocalSearchParams } from 'expo-router';

export default function TopicDetailRoute() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  return <TopicDetailScreen topicId={topicId!} />;
}
