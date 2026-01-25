import { useState } from 'react';
import { AdminNote, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { StickyNote, Plus } from 'lucide-react';

interface AdminNotesPanelProps {
  notes: AdminNote[];
  users: User[];
  onAddNote: (note: string) => void;
}

export function AdminNotesPanel({ notes, users, onAddNote }: AdminNotesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleSave = () => {
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-gray-600" />
          Admin Notes (Internal Only)
        </h3>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        )}
      </div>

      <div className="p-4">
        {isAdding && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Textarea
              placeholder="Add internal note about this user..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                Save Note
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNoteText('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 && !isAdding && (
          <p className="text-sm text-gray-500 text-center py-4">
            No admin notes for this user
          </p>
        )}

        <div className="space-y-3">
          {notes.map((note) => {
            const admin = users.find((u) => u.id === note.adminId);
            return (
              <div
                key={note.id}
                className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">{note.note}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    By <span className="font-medium">{admin?.name || 'Unknown'}</span>
                  </span>
                  <span>{format(note.createdAt, 'MMM dd, yyyy h:mm a')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
