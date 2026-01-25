import { MessageSquare } from 'lucide-react';

interface EmptyMessagesProps {
  otherUserName?: string;
}

export function EmptyMessages({ otherUserName }: EmptyMessagesProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
        <p className="text-sm text-gray-600">
          {otherUserName
            ? `Start a conversation with ${otherUserName} about this job.`
            : 'Send a message to start the conversation.'}
        </p>
      </div>
    </div>
  );
}
