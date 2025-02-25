'use client';

import { Suspense, ReactNode } from 'react';

interface ClientWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Loading component to display while the main content is loading
function DefaultLoading() {
  return (
    <div className="min-h-screen bg-[#FFF8E8] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#4A4637]">Loading...</h1>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-2 border-[#D4C9A8] overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A4637] mx-auto"></div>
            <p className="mt-4 text-[#4A4637]">Loading content...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client wrapper component with Suspense boundary
export default function ClientWrapper({ children, fallback = <DefaultLoading /> }: ClientWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
} 