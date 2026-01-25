import { JobTimeline } from '@/lib/admin-utils';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, MessageSquare, FileText, AlertCircle } from 'lucide-react';

interface JobTimelineViewProps {
  timeline: JobTimeline[];
}

export function JobTimelineView({ timeline }: JobTimelineViewProps) {
  const getIcon = (type: JobTimeline['type']) => {
    switch (type) {
      case 'status':
        return <CheckCircle className="w-4 h-4" />;
      case 'application':
        return <FileText className="w-4 h-4" />;
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'cancellation':
        return <XCircle className="w-4 h-4" />;
      case 'completion':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getColor = (type: JobTimeline['type']) => {
    switch (type) {
      case 'status':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'application':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'message':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancellation':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'completion':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (timeline.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No timeline events</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Job Timeline
        </h3>
      </div>
      <div className="p-4">
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-4">
            {timeline.map((event, index) => (
              <div key={index} className="relative flex gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getColor(
                    event.type
                  )}`}
                >
                  {getIcon(event.type)}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{event.event}</h4>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      {event.actor && (
                        <p className="text-xs text-gray-500 mt-1">
                          By <span className="font-medium">{event.actor}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {format(event.timestamp, 'MMM dd, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
