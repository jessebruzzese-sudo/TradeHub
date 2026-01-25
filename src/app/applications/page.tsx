'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/messages');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Redirecting to Messages...</div>
    </div>
  );
}
