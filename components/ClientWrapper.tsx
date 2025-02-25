'use client';

import { Suspense } from 'react';

/**
 * ClientWrapper - Wraps client components that use hooks like useSearchParams
 * in a Suspense boundary to prevent CSR bailout errors during build
 */
export default function ClientWrapper({ 
  children, 
  fallback = <div>Loading...</div>
}: { 
  children: React.ReactNode, 
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
} 