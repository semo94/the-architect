import { GuideMeFlow } from '@/components/discover/GuideMeFlow';
import { useRouter } from 'expo-router';
import React from 'react';

export default function GuidedDiscoverScreen() {
  const router = useRouter();

  const handleComplete = () => {
    router.back();
  };

  return <GuideMeFlow onComplete={handleComplete} />;
}
