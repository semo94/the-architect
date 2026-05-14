import { SurpriseMeFlow } from '@/components/discover/SurpriseMeFlow';
import { useSafeBack } from '@/hooks/useSafeBack';
import React from 'react';

export default function SurpriseDiscoverScreen() {
  const safeBack = useSafeBack();

  return <SurpriseMeFlow onComplete={safeBack} />;
}
