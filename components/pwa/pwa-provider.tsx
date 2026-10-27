'use client';

import React from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { OfflineIndicator } from './offline-indicator';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  // Register service worker on client mount
  useServiceWorker();

  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  );
}
