import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  backLink?: {
    href: string;
  };
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ backLink, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backLink && (
        <Link
          href={backLink.href}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-2 text-gray-600">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
