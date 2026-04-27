import { DiscoverDeepLinkScreen } from '@/components/discover/DiscoverDeepLinkScreen';
import { useLocalSearchParams } from 'expo-router';

export default function DiscoverDeepLinkRoute() {
  const { topicId, topicName } = useLocalSearchParams<{ topicId?: string; topicName?: string }>();
  return <DiscoverDeepLinkScreen topicId={topicId} topicName={topicName} />;
}
