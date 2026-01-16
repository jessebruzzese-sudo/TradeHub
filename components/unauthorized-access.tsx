'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';

interface UnauthorizedAccessProps {
  redirectTo: string;
  message?: string;
}

export function UnauthorizedAccess({ redirectTo, message = 'You do not have permission to access this area.' }: UnauthorizedAccessProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, redirectTo]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Not Available</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <p className="text-sm text-gray-500">Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
      </div>
    </div>
  );
}
