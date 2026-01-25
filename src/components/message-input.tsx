import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { MessagingState } from '@/lib/messaging-utils';

interface MessageInputProps {
  messagingState: MessagingState;
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  isSending?: boolean;
  error?: string;
  onSuggestReply?: () => void;
  suggestLoading?: boolean;
  suggestions?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
  aiError?: string | null;
}

export function MessageInput({
  messagingState,
  messageText,
  onMessageChange,
  onSendMessage,
  isSending = false,
  error,
  onSuggestReply,
  suggestLoading = false,
  suggestions = [],
  onSelectSuggestion,
  aiError,
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messagingState.canSendMessages && !isSending) {
        onSendMessage();
      }
    }
  };

  if (messagingState.isReadOnly) {
    return (
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom z-30">
        <Alert className="bg-gray-50 border-gray-200">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <AlertDescription className="ml-2 text-sm text-gray-700">
            {messagingState.disabledReason}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom z-30">
      {error && (
        <Alert className="bg-red-50 border-red-200 mb-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <AlertDescription className="ml-2 text-sm text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}
      {aiError && (
        <Alert className="bg-red-50 border-red-200 mb-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <AlertDescription className="ml-2 text-sm text-red-700">
            {aiError}
          </AlertDescription>
        </Alert>
      )}
      {suggestions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-2">Suggested replies:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                className="bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-full px-3 py-1.5 text-sm transition-colors"
                onClick={() => onSelectSuggestion?.(suggestion)}
              >
                {suggestion.length > 60 ? `${suggestion.substring(0, 60)}...` : suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 items-end">
        {onSuggestReply && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onSuggestReply}
            disabled={suggestLoading || !messagingState.canSendMessages}
            className="min-w-[44px] min-h-[44px] flex-shrink-0"
            title="Suggest reply with AI"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        )}
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!messagingState.canSendMessages || isSending}
          maxLength={5000}
          className="flex-1 min-h-[44px]"
        />
        <Button
          onClick={onSendMessage}
          disabled={!messageText.trim() || !messagingState.canSendMessages || isSending}
          className="min-w-[44px] min-h-[44px] flex-shrink-0"
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {messageText.length}/5000 characters
      </p>
    </div>
  );
}
