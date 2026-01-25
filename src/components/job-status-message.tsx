import { AlertCircle, Clock, CheckCircle, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JobStatusMessageProps {
  message?: string;
  warning?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export function JobStatusMessage({ message, warning, type = 'info' }: JobStatusMessageProps) {
  if (!message && !warning) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getAlertClass = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  return (
    <div className="space-y-2">
      {message && (
        <Alert className={getAlertClass()}>
          <div className="flex items-start gap-2">
            {getIcon()}
            <AlertDescription className="flex-1">{message}</AlertDescription>
          </div>
        </Alert>
      )}
      {warning && (
        <Alert className="bg-orange-50 border-orange-200 text-orange-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <AlertDescription className="flex-1">{warning}</AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}
