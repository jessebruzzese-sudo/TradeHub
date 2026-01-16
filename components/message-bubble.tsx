import { Message } from '@/lib/types';
import { format } from 'date-fns';
import { Info } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

export function MessageBubble({ message, isMe }: MessageBubbleProps) {
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 max-w-md">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Info className="w-4 h-4 text-gray-500" />
            <span>{message.text}</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {format(message.createdAt, 'MMM dd, h:mm a')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-md rounded-2xl px-4 py-2 ${
          isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
          {format(message.createdAt, 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
