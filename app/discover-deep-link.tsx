import { DiscoverDeepLinkScreen } from '@/components/discover/DiscoverDeepLinkScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function DiscoverDeepLinkRoute() {
  const { topicId, topicName } = useLocalSearchParams<{ topicId?: string; topicName?: string }>();
  const router = useRouter();

  const hasParams = Boolean(topicId || topicName);

  useEffect(() => {
    if (!hasParams) {
      router.replace('/(tabs)/discover');
    }
  }, [hasParams, router]);

  if (!hasParams) {
    return null;
  }

  return <DiscoverDeepLinkScreen topicId={topicId} topicName={topicName} />;
}
