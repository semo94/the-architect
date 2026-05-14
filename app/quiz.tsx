import { QuizScreen } from '@/components/quiz/QuizScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function QuizRoute() {
  const { topicId } = useLocalSearchParams<{ topicId?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!topicId) {
      router.replace('/(tabs)/discover');
    }
  }, [topicId, router]);

  if (!topicId) {
    return null;
  }

  return <QuizScreen topicId={topicId} />;
}
