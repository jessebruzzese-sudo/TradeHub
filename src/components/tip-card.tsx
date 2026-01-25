import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lightbulb, X } from 'lucide-react';

interface TipCardProps {
  tipKey: string;
  title?: string;
  message: string;
  variant?: 'info' | 'success' | 'warning';
}

export function TipCard({ tipKey, title, message, variant = 'info' }: TipCardProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(`tip_${tipKey}_dismissed`);
    setIsDismissed(dismissed === 'true');
  }, [tipKey]);

  const handleDismiss = () => {
    localStorage.setItem(`tip_${tipKey}_dismissed`, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  const variantStyles = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  const variantIconColor = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
  };

  const variantTextColor = {
    info: 'text-blue-900',
    success: 'text-green-900',
    warning: 'text-yellow-900',
  };

  return (
    <Alert className={`${variantStyles[variant]} mb-6`}>
      <div className="flex items-start gap-3">
        <Lightbulb className={`w-5 h-5 flex-shrink-0 mt-0.5 ${variantIconColor[variant]}`} />
        <div className="flex-1">
          {title && (
            <p className={`font-medium mb-1 ${variantTextColor[variant]}`}>
              {title}
            </p>
          )}
          <AlertDescription className={variantTextColor[variant]}>
            {message}
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Alert>
  );
}
