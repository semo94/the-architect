import { SurpriseMeFlow } from '@/components/discover/SurpriseMeFlow';
import { useRouter } from 'expo-router';
import React from 'react';

export default function SurpriseDiscoverScreen() {
  const router = useRouter();

  const handleComplete = () => {
    router.back();
  };

  return <SurpriseMeFlow onComplete={handleComplete} />;
}
