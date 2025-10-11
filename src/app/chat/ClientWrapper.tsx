'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HomeContent = dynamic(() => import('./HomeContent'), { ssr: false });

export default function ClientWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}