import { QuizScreen } from '@/components/quiz/QuizScreen';
import { useLocalSearchParams } from 'expo-router';

export default function QuizRoute() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  return <QuizScreen topicId={topicId!} />;
}