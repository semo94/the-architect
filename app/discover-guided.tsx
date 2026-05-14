import { GuideMeFlow } from '@/components/discover/GuideMeFlow';
import { useSafeBack } from '@/hooks/useSafeBack';
import React from 'react';

export default function GuidedDiscoverScreen() {
  const safeBack = useSafeBack();

  return <GuideMeFlow onComplete={safeBack} />;
}
