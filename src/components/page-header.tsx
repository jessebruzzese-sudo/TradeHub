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
  tone?: 'light' | 'dark';
}

export function PageHeader({ backLink, title, description, action, tone = 'light' }: PageHeaderProps) {
  const titleClass = tone === 'dark' ? 'text-white' : 'text-slate-900';
  const backClass = tone === 'dark' ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900';
  const descClass = tone === 'dark' ? 'text-white/70' : 'text-slate-600';
  const iconClass = tone === 'dark' ? 'text-white/80' : 'text-slate-600';

  return (
    <div className="mb-6">
      {backLink && (
        <Link
          href={backLink.href}
          className={`inline-flex items-center text-sm mb-3 transition-colors ${backClass}`}
        >
          <ArrowLeft className={`w-4 h-4 mr-1 ${iconClass}`} />
          Back to Dashboard
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className={`text-2xl sm:text-3xl font-bold ${titleClass}`}>{title}</h1>
          {description && (
            <p className={`mt-2 ${descClass}`}>{description}</p>
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
